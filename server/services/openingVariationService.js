// server/services/openingVariationService.js
//
// Two-phase architecture:
//
//  PHASE 1 — INGEST  (hits external API once, stores everything in DB)
//    ingestDay(dateStr)      → fetches settlements + candles for one day
//    backfillIngest()        → runs ingestDay for every unprocessed date since 2026-01-01
//
//  PHASE 2 — COMPUTE  (reads purely from DB, zero API calls)
//    computeDay(dateStr)     → derives KC/RC stats and outcome from stored candles
//    recomputeAll()          → re-derives stats for all ingested days (e.g. after rule change)
//
//  COMBINED
//    updateOpeningVariation() → ingest + compute for today (called by daily cron)
//
// ─── Business rules ───────────────────────────────────────────────────────────
//   KC Arabica (QH prefix: KC)
//     - Open: 09:15 London  |  Close: 18:30 London
//     - Observation window: single 5M candle 09:15–09:20 London
//     - Threshold: ±40 ticks from prev-day settlement  (1 tick = 0.05 c/lb)
//     - Stored candles: 5M, full day 09:15 → 18:30
//
//   RC Robusta (QH prefix: LKC)
//     - Open: 09:00 London  |  Close: 17:30 London
//     - Observation window: 1M candles 09:00–09:14 London
//     - Threshold: ±30 ticks from prev-day settlement  (1 tick = $1/tonne)
//     - Stored candles: 1M, opening window 09:00 → 09:15 only
//
//   Trade setup (KC only, mean-reversion):
//     - If KC opened UP  ≥ 40 ticks → SHORT  (stop = opening high,  target = entry − 20t)
//     - If KC opened DOWN ≥ 40 ticks → LONG   (stop = opening low,   target = entry + 20t)
//     - Outcome determined by scanning 5M candles from 09:20 to 18:30
//
// ─── Front-month rollover schedule (user-specified) ──────────────────────────
//   01 Jan 2026 → 20 Feb 2026  : March contract  (KCH26 / LKCH26)
//   20 Feb 2026 → 20 Apr 2026  : May   contract  (KCK26 / LKCK26)
//   20 Apr 2026 → present      : July  contract  (KCN26 / LKCN26)
// ─────────────────────────────────────────────────────────────────────────────

import axios from 'axios';
import pool  from '../db.js';

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────
const API_DOMAIN         = 'https://qh-api.corp.hertshtengroup.com';
const KC_TICK_SIZE       = 0.05;   // cents/lb  per tick
const RC_TICK_SIZE       = 1.0;    // USD/tonne per tick
const KC_THRESHOLD_TICKS = 40;
const RC_THRESHOLD_TICKS = 30;
const TARGET_TICKS       = 20;
const BACKFILL_START     = '2026-01-01';

// ──────────────────────────────────────────────────────────────────────────────
// Front-month rollover tables
// ──────────────────────────────────────────────────────────────────────────────
const KC_SCHEDULE = [
    { from: '2026-01-01', to: '2026-02-20', contract: 'KCH26'  },
    { from: '2026-02-20', to: '2026-04-20', contract: 'KCK26'  },
    { from: '2026-04-20', to: '2099-01-01', contract: 'KCN26'  },
];
const RC_SCHEDULE = [
    { from: '2026-01-01', to: '2026-02-20', contract: 'LKCH26' },
    { from: '2026-02-20', to: '2026-04-20', contract: 'LKCK26' },
    { from: '2026-04-20', to: '2099-01-01', contract: 'LKCN26' },
];

function getContract(dateStr, schedule) {
    for (const e of schedule) {
        if (dateStr >= e.from && dateStr < e.to) return e.contract;
    }
    return null;
}

// ──────────────────────────────────────────────────────────────────────────────
// London BST / GMT helpers
// ──────────────────────────────────────────────────────────────────────────────
function lastSundayOf(year, month0) {
    const d = new Date(Date.UTC(year, month0 + 1, 0));
    while (d.getUTCDay() !== 0) d.setUTCDate(d.getUTCDate() - 1);
    return d;
}

function isBST(date) {
    const y = date.getUTCFullYear();
    return date >= lastSundayOf(y, 2) && date < lastSundayOf(y, 9);
}

/** London local time → Unix seconds (UTC).
 * Note: The external API stores and returns all candle timestamps in fixed UTC hours
 * (RC opens at 09:00 UTC, KC opens at 09:15 UTC all year round), so we do NOT adjust for BST.
 */
function londonToUnix(utcDate, hh, mm) {
    return Math.floor(new Date(Date.UTC(
        utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate(),
        hh, mm, 0, 0,
    )).getTime() / 1000);
}

/** Unix seconds → JS Date (for DB queries) */
const unixToDate = s => new Date(s * 1000);

// ──────────────────────────────────────────────────────────────────────────────
// Date utilities
// ──────────────────────────────────────────────────────────────────────────────
const isWeekend  = s => { const d = new Date(s + 'T00:00:00Z').getUTCDay(); return d === 0 || d === 6; };
const sleep      = ms => new Promise(r => setTimeout(r, ms));

function prevBizDay(dateStr) {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - 1);
    while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().split('T')[0];
}

function allDates(start, end) {
    const out = [];
    const d   = new Date(start + 'T00:00:00Z');
    const e   = new Date(end   + 'T00:00:00Z');
    while (d < e) { out.push(d.toISOString().split('T')[0]); d.setUTCDate(d.getUTCDate() + 1); }
    return out;
}

const toTicks = (diff, tickSize) => Math.round(diff / tickSize);

// ──────────────────────────────────────────────────────────────────────────────
// External API calls  (only used during Phase 1 ingestion)
// ──────────────────────────────────────────────────────────────────────────────
function authHeader() {
    const t = process.env.QH_API_TOKEN || '';
    return t.startsWith('Bearer ') ? t : `Bearer ${t}`;
}

async function apiFetchSettlement(qhcode, prevDateStr) {
    try {
        const end   = new Date(prevDateStr + 'T00:00:00Z');
        const start = new Date(end); start.setUTCDate(start.getUTCDate() - 7);

        const resp = await axios.get(`${API_DOMAIN}/api/dailymarketdata/`, {
            params: {
                qhcode,
                start:  start.toISOString().split('T')[0],
                end:    prevDateStr,
                fields: 'close,datetime',
                limit:  10,
            },
            headers: { Authorization: authHeader(), Accept: 'application/json' },
            timeout: 20000,
        });

        const rows = (resp.data?.results || [])
            .filter(r => r.close != null)
            .sort((a, b) => new Date(b.datetime) - new Date(a.datetime));

        return rows.length > 0
            ? { date: rows[0].datetime.slice(0, 10), price: parseFloat(rows[0].close) }
            : null;
    } catch (err) {
        console.error(`[OV Ingest] settlement ${qhcode}@${prevDateStr}: ${err.message}`);
        return null;
    }
}

async function apiFetchCandles(instrument, interval, startUnix, endUnix) {
    try {
        // API rule: only two of {start, end, count} may be provided at once.
        // When we have both start + end we omit count entirely.
        const resp = await axios.get(`${API_DOMAIN}/api/v2/ohlc/`, {
            params: { instruments: instrument, interval, start: startUnix, end: endUnix },
            headers: { Authorization: authHeader(), Accept: 'application/json' },
            timeout: 25000,
        });
        const data = resp.data;
        if (Array.isArray(data)) return data;
        if (data?.[instrument] && Array.isArray(data[instrument])) return data[instrument];
        const keys = Object.keys(data || {});
        if (keys.length && Array.isArray(data[keys[0]])) return data[keys[0]];
        return [];
    } catch (err) {
        console.error(`[OV Ingest] candles ${instrument} ${interval}: ${err.message}`);
        return [];
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// DB writers  (Phase 1)
// ──────────────────────────────────────────────────────────────────────────────
async function dbStoreSettlement(tradeDate, qhcode, price) {
    await pool.query(`
        INSERT INTO ov_settlements (trade_date, qhcode, settlement_price)
        VALUES ($1, $2, $3)
        ON CONFLICT (trade_date, qhcode)
        DO UPDATE SET settlement_price = EXCLUDED.settlement_price, fetched_at = NOW()
    `, [tradeDate, qhcode, price]);
}

async function dbStoreCandles(qhcode, intervalType, candles) {
    if (candles.length === 0) return;
    // Batch insert in groups of 100
    const BATCH = 100;
    for (let i = 0; i < candles.length; i += BATCH) {
        const batch = candles.slice(i, i + BATCH);
        const values = batch.map((c, idx) => {
            const base = idx * 7;
            return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7})`;
        }).join(',');
        const params = batch.flatMap(c => [
            qhcode,
            intervalType,
            new Date(c.time).toISOString(),  // candle.time is already in ms
            c.open, c.high, c.low, c.close,
        ]);
        await pool.query(`
            INSERT INTO ov_candles (qhcode, interval_type, candle_time, open, high, low, close)
            VALUES ${values}
            ON CONFLICT (qhcode, interval_type, candle_time) DO NOTHING
        `, params);
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// DB readers  (Phase 2)
// ──────────────────────────────────────────────────────────────────────────────
async function dbGetSettlement(qhcode, tradeDate) {
    const { rows } = await pool.query(
        `SELECT settlement_price FROM ov_settlements WHERE qhcode = $1 AND trade_date = $2`,
        [qhcode, tradeDate],
    );
    return rows.length > 0 ? parseFloat(rows[0].settlement_price) : null;
}

async function dbGetCandles(qhcode, intervalType, startDate, endDate) {
    const { rows } = await pool.query(`
        SELECT candle_time, open, high, low, close, volume
        FROM ov_candles
        WHERE qhcode = $1 AND interval_type = $2
          AND candle_time >= $3 AND candle_time < $4
        ORDER BY candle_time ASC
    `, [qhcode, intervalType, startDate.toISOString(), endDate.toISOString()]);
    return rows;
}

// ──────────────────────────────────────────────────────────────────────────────
// Check whether a day's raw data is already ingested
// ──────────────────────────────────────────────────────────────────────────────
async function isIngested(dateStr) {
    const date = new Date(dateStr + 'T00:00:00Z');
    const prevDate = prevBizDay(dateStr);
    const kcContract = getContract(dateStr, KC_SCHEDULE);
    const rcContract = getContract(dateStr, RC_SCHEDULE);

    const { rows } = await pool.query(`
        SELECT COUNT(*) as cnt FROM ov_settlements
        WHERE trade_date = $1 AND qhcode = ANY($2)
    `, [prevDate, [kcContract, rcContract]]);

    return parseInt(rows[0].cnt) >= 1; // at least one settlement stored
}

// ──────────────────────────────────────────────────────────────────────────────
// PHASE 1 — INGEST one day
// ──────────────────────────────────────────────────────────────────────────────
export async function ingestDay(dateStr) {
    if (isWeekend(dateStr)) return null;

    const date       = new Date(dateStr + 'T00:00:00Z');
    const prevDate   = prevBizDay(dateStr);
    const kcContract = getContract(dateStr, KC_SCHEDULE);
    const rcContract = getContract(dateStr, RC_SCHEDULE);
    if (!kcContract || !rcContract) return null;

    // 1. Settlements for both contracts (from previous business day)
    const [kcSett, rcSett] = await Promise.all([
        apiFetchSettlement(kcContract, prevDate),
        apiFetchSettlement(rcContract, prevDate),
    ]);
    await sleep(300);

    if (!kcSett && !rcSett) {
        console.log(`[OV Ingest] ${dateStr}: no settlement data — likely holiday, skipping`);
        return null;
    }

    if (kcSett) await dbStoreSettlement(kcSett.date, kcContract, kcSett.price);
    if (rcSett) await dbStoreSettlement(rcSett.date, rcContract, rcSett.price);

    // 2. KC: 5-minute candles for the full trading day (09:15 → 18:30 London)
    if (kcSett) {
        const start = londonToUnix(date, 9, 15);
        const end   = londonToUnix(date, 18, 31);
        const candles = await apiFetchCandles(kcContract, '5M', start, end);
        await sleep(350);
        await dbStoreCandles(kcContract, '5M', candles);
        console.log(`[OV Ingest] ${dateStr}: KC ${candles.length} 5M candles stored`);
    }

    // 3. RC: 1-minute candles for the opening window only (09:00 → 09:15 London)
    if (rcSett) {
        const start = londonToUnix(date, 9, 0);
        const end   = londonToUnix(date, 9, 15);
        const candles = await apiFetchCandles(rcContract, '1M', start, end);
        await sleep(350);
        await dbStoreCandles(rcContract, '1M', candles);
        console.log(`[OV Ingest] ${dateStr}: RC ${candles.length} 1M candles stored`);
    }

    return { dateStr, kcContract, rcContract, hasKc: !!kcSett, hasRc: !!rcSett };
}

// ──────────────────────────────────────────────────────────────────────────────
// PHASE 2 — COMPUTE one day from stored DB data (NO external API calls)
// ──────────────────────────────────────────────────────────────────────────────
export async function computeDay(dateStr) {
    if (isWeekend(dateStr)) return null;

    const date       = new Date(dateStr + 'T00:00:00Z');
    const prevDate   = prevBizDay(dateStr);
    const kcContract = getContract(dateStr, KC_SCHEDULE);
    const rcContract = getContract(dateStr, RC_SCHEDULE);
    if (!kcContract || !rcContract) return null;

    // Read settlements from DB
    const [kcSettlement, rcSettlement] = await Promise.all([
        dbGetSettlement(kcContract, prevDate),
        dbGetSettlement(rcContract, prevDate),
    ]);

    // Skip holidays/incomplete days where settlement is missing for either product
    if (!kcSettlement || !rcSettlement) return null;

    // RC Candles
    const rcStart = unixToDate(londonToUnix(date, 9, 0));
    const rcEnd   = unixToDate(londonToUnix(date, 9, 15));
    const rcCandles = await dbGetCandles(rcContract, '1M', rcStart, rcEnd);

    // KC Opening Candles (09:15→09:20 London)
    const kcOpenStart = unixToDate(londonToUnix(date, 9, 15));
    const kcOpenEnd   = unixToDate(londonToUnix(date, 9, 21));
    const kcOpenCandles = await dbGetCandles(kcContract, '5M', kcOpenStart, kcOpenEnd);

    // Skip if either product does not have opening candles to prevent nulls in DB
    if (rcCandles.length === 0 || kcOpenCandles.length === 0) return null;

    // ── RC Analysis ────────────────────────────────────────────────────────
    const rcPrevSett = rcSettlement;
    const rcHigh = Math.max(...rcCandles.map(c => parseFloat(c.high)));
    const rcLow  = Math.min(...rcCandles.map(c => parseFloat(c.low)));

    const upTicks   = toTicks(rcHigh - rcSettlement, RC_TICK_SIZE);
    const downTicks = toTicks(rcSettlement - rcLow,   RC_TICK_SIZE);

    const rcTickMove = upTicks >= downTicks ? upTicks : -downTicks;

    // New business rule: qualify only if tick movement is strictly inside [-29, 29]
    let rcQualifies = false;
    let rcBias = 'none';
    if (rcTickMove > -30 && rcTickMove < 30) {
        rcQualifies = true;
        if (rcTickMove > 0) {
            rcBias = 'short';
        } else if (rcTickMove < 0) {
            rcBias = 'long';
        } else {
            rcBias = 'neutral';
        }
    }

    // ── KC Analysis ────────────────────────────────────────────────────────
    const kcPrevSett = kcSettlement;
    const kcHigh  = Math.max(...kcOpenCandles.map(c => parseFloat(c.high)));
    const kcLow   = Math.min(...kcOpenCandles.map(c => parseFloat(c.low)));

    const kcUpTicks   = toTicks(kcHigh - kcSettlement, KC_TICK_SIZE);
    const kcDownTicks = toTicks(kcSettlement - kcLow,   KC_TICK_SIZE);

    let kcTickMove = kcUpTicks >= kcDownTicks ? kcUpTicks : -kcDownTicks;
    let kcQualifies = false;
    let kcBias = 'none';
    let kcStop = null;
    let kcEntry = null;
    let kcTarget = null;
    let kcOutcome = 'none';
    let kcPnl = null;

    const ENTRY_TICKS = 8;

    // Always pre-calculate stop, entry, and target based on Option B (8 Ticks off extreme)
    // so that none of these values are ever null in the database
    if (kcTickMove >= 0) {
        kcStop   = kcHigh;
        kcEntry  = kcHigh - (ENTRY_TICKS * KC_TICK_SIZE);
        kcTarget = kcEntry - (TARGET_TICKS * KC_TICK_SIZE);
    } else {
        kcStop   = kcLow;
        kcEntry  = kcLow + (ENTRY_TICKS * KC_TICK_SIZE);
        kcTarget = kcEntry + (TARGET_TICKS * KC_TICK_SIZE);
    }

    if (kcUpTicks >= KC_THRESHOLD_TICKS) {
        kcTickMove = kcUpTicks;
        kcQualifies = true;
        kcBias = 'short';
    } else if (kcDownTicks >= KC_THRESHOLD_TICKS) {
        kcTickMove = -kcDownTicks;
        kcQualifies = true;
        kcBias = 'long';
    }

    // ── Outcome scan using stored post-9:20 candles ─────────────────
    let kcMaxTicks = null;
    if (kcQualifies) {
        kcMaxTicks = 0;
        const postStart = unixToDate(londonToUnix(date, 9, 20));
        const postEnd   = unixToDate(londonToUnix(date, 18, 31));
        const postCandles = await dbGetCandles(kcContract, '5M', postStart, postEnd);

        kcOutcome = 'open';
        let stopHit = false;
        let entryHit = false;

        for (const c of postCandles) {
            const hi = parseFloat(c.high);
            const lo = parseFloat(c.low);

            if (kcBias === 'long') {
                // If not in the trade yet, check if this candle dips down to our limit order
                if (!entryHit) {
                    if (lo <= kcEntry) {
                        entryHit = true; // We got filled!
                    }
                }

                // If we are now in the trade, track max ticks and stop loss
                if (entryHit) {
                    if (hi > kcEntry) {
                        const favTicks = toTicks(hi - kcEntry, KC_TICK_SIZE);
                        kcMaxTicks = Math.max(kcMaxTicks, favTicks);
                    }
                    if (lo <= kcStop) {
                        stopHit = true;
                        break;
                    }
                }
            } else { // short
                // If not in the trade yet, check if this candle rallies up to our limit order
                if (!entryHit) {
                    if (hi >= kcEntry) {
                        entryHit = true; // We got filled!
                    }
                }

                // If we are now in the trade, track max ticks and stop loss
                if (entryHit) {
                    if (lo < kcEntry) {
                        const favTicks = toTicks(kcEntry - lo, KC_TICK_SIZE);
                        kcMaxTicks = Math.max(kcMaxTicks, favTicks);
                    }
                    if (hi >= kcStop) {
                        stopHit = true;
                        break;
                    }
                }
            }
        }

        // Determine outcome:
        if (!entryHit) {
            kcOutcome = 'none';
            kcPnl = 0;
            kcMaxTicks = null;
        } else if (kcMaxTicks >= TARGET_TICKS) {
            kcOutcome = 'win';
            kcPnl = TARGET_TICKS;
        } else if (stopHit) {
            kcOutcome = 'loss';
            kcPnl = -Math.abs(toTicks(kcBias === 'long' ? kcEntry - kcStop : kcStop - kcEntry, KC_TICK_SIZE));
        } else {
            // Did not hit target and did not hit stop (remained open at close)
            kcOutcome = 'open';
            kcPnl = 0;
        }
    }

    const result = {
        trade_date: dateStr,
        kc_contract: kcContract, rc_contract: rcContract,
        rc_prev_settlement: rcPrevSett, rc_opening_high: rcHigh,  rc_opening_low: rcLow,
        rc_tick_move: rcTickMove, rc_qualifies: rcQualifies, rc_bias: rcBias,
        kc_prev_settlement: kcPrevSett, kc_opening_high: kcHigh,  kc_opening_low: kcLow,
        kc_tick_move: kcTickMove, kc_qualifies: kcQualifies, kc_bias: kcBias,
        kc_stop_level: kcStop, kc_entry_price: kcEntry, kc_target_price: kcTarget,
        kc_outcome: kcOutcome, kc_ticks_pnl: kcPnl, kc_max_ticks: kcMaxTicks,
    };

    await dbSaveResult(result);
    return result;
}

// ──────────────────────────────────────────────────────────────────────────────
// DB writer for computed results
// ──────────────────────────────────────────────────────────────────────────────
async function dbSaveResult(r) {
    await pool.query(`
        INSERT INTO opening_variation_days (
            trade_date, kc_contract, rc_contract,
            rc_prev_settlement, rc_opening_high, rc_opening_low, rc_tick_move, rc_qualifies, rc_bias,
            kc_prev_settlement, kc_opening_high, kc_opening_low, kc_tick_move, kc_qualifies, kc_bias,
            kc_stop_level, kc_entry_price, kc_target_price, kc_outcome, kc_ticks_pnl, kc_max_ticks,
            computed_at
        ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,NOW()
        )
        ON CONFLICT (trade_date) DO UPDATE SET
            kc_contract=$2, rc_contract=$3,
            rc_prev_settlement=$4, rc_opening_high=$5,  rc_opening_low=$6,
            rc_tick_move=$7,  rc_qualifies=$8,  rc_bias=$9,
            kc_prev_settlement=$10,kc_opening_high=$11, kc_opening_low=$12,
            kc_tick_move=$13, kc_qualifies=$14, kc_bias=$15,
            kc_stop_level=$16, kc_entry_price=$17, kc_target_price=$18,
            kc_outcome=$19, kc_ticks_pnl=$20, kc_max_ticks=$21,
            computed_at=NOW()
    `, [
        r.trade_date, r.kc_contract, r.rc_contract,
        r.rc_prev_settlement, r.rc_opening_high, r.rc_opening_low,
        r.rc_tick_move, r.rc_qualifies, r.rc_bias,
        r.kc_prev_settlement, r.kc_opening_high, r.kc_opening_low,
        r.kc_tick_move, r.kc_qualifies, r.kc_bias,
        r.kc_stop_level, r.kc_entry_price, r.kc_target_price,
        r.kc_outcome, r.kc_ticks_pnl, r.kc_max_ticks,
    ]);
}

// ──────────────────────────────────────────────────────────────────────────────
// Bulk operations
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Historical backfill: ingest ALL missing days from 2026-01-01 to today,
 * then compute results from the stored data.
 * Each day makes ~3 API calls with pacing delays.
 */
export async function backfillOpeningVariation() {
    const today = new Date().toISOString().split('T')[0];
    const dates = allDates(BACKFILL_START, today).filter(d => !isWeekend(d));

    // Find already-ingested days
    const { rows } = await pool.query(
        `SELECT DISTINCT trade_date::text FROM ov_settlements WHERE trade_date >= '2026-01-01'`
    );
    // Settlements are keyed by prev-day date, so map forward one biz day
    // Simpler: check opening_variation_days for already-computed days
    const { rows: computed } = await pool.query(
        `SELECT trade_date::text FROM opening_variation_days`
    );
    const alreadyDone = new Set(computed.map(r => r.trade_date.slice(0, 10)));
    const toProcess = dates.filter(d => !alreadyDone.has(d));

    console.log(`[OV] Backfill: ${toProcess.length} days to process (${dates.length - toProcess.length} already done)`);

    let ingested = 0, computed2 = 0;
    for (const dateStr of toProcess) {
        try {
            // Phase 1: ingest raw data
            const ingestResult = await ingestDay(dateStr);
            if (!ingestResult) { console.log(`[OV] ${dateStr}: skipped (holiday)`); continue; }
            ingested++;
            await sleep(200); // small pause between ingest and compute

            // Phase 2: compute from stored data
            const result = await computeDay(dateStr);
            if (result) {
                computed2++;
                const sig = result.kc_qualifies
                    ? `KC ${result.kc_bias?.toUpperCase()} ${result.kc_tick_move}t → ${result.kc_outcome || '?'}`
                    : 'no KC signal';
                console.log(`[OV] ${dateStr}: ${sig}`);
            }
        } catch (err) {
            console.error(`[OV] ${dateStr} ERROR: ${err.message}`);
        }
        await sleep(500); // pacing between days
    }

    console.log(`[OV] Backfill complete: ${ingested} ingested, ${computed2} computed`);
    return { ingested, computed: computed2 };
}

/**
 * Re-compute all days that have raw data but need stats refreshed
 * (e.g. after changing thresholds or fixing a bug in the logic).
 * Zero API calls — reads purely from ov_settlements + ov_candles.
 */
export async function recomputeAll() {
    const today = new Date().toISOString().split('T')[0];
    const dates = allDates(BACKFILL_START, today).filter(d => !isWeekend(d));

    console.log(`[OV] Re-computing all ${dates.length} days from stored data…`);
    let count = 0;
    for (const dateStr of dates) {
        try {
            const result = await computeDay(dateStr);
            if (result) count++;
        } catch (err) {
            console.error(`[OV] recompute ${dateStr}: ${err.message}`);
        }
    }
    console.log(`[OV] Re-compute done: ${count} days updated`);
    return count;
}

/**
 * Daily update (called by cron after market close ~19:05).
 * Ingests today's data then immediately computes results.
 */
export async function updateOpeningVariation() {
    const now = new Date();
    if (now.getUTCDay() === 0 || now.getUTCDay() === 6) return;

    const dateStr = now.toISOString().split('T')[0];
    console.log(`[OV] Daily update: ingesting ${dateStr}…`);

    const ingestResult = await ingestDay(dateStr);
    if (!ingestResult) { console.log(`[OV] ${dateStr}: nothing to ingest`); return; }

    await sleep(500);
    const result = await computeDay(dateStr);
    if (result) {
        console.log(`[OV] ${dateStr}: KC ${result.kc_qualifies ? result.kc_outcome : 'no signal'}`);
    }
}
