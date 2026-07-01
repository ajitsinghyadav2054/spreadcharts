// server/services/cftcAlertService.js
//
// Runs after every Friday CFTC ingestion.
// For every product × metric it:
//   1. Loads 5 years of weekly data from the DB
//   2. Computes the WoW change series
//   3. Finds / updates the 5-year ATH and ATL of those changes
//   4. Fires a Power Automate webhook if the current week breaches 80% of ATH or ATL
//   5. Deduplicates so only one alert per product/metric/direction per week

import axios from 'axios';
import pool from '../db.js';
import { CFTC_METRICS } from '../cftcMetricList.js';

const TEAMS_WEBHOOK_URL = process.env.CFTC_TEAMS_WEBHOOK_URL;
const THRESHOLD_PCT = 0.80;   // 80 %
const LOOKBACK_YEARS = 5;

// Mirrors PRODUCT_TABLES in routes.js
const PRODUCT_TABLES = {
    'COCOA': 'cocoa',
    'COFFEE C': 'coffee_c',
    'COTTON NO. 2': 'cotton_no_2',
    'SUGAR NO. 11': 'sugar_no_11',
    'CHEESE (CASH SETTLED)': 'cheese_cash_settled',
    'ROUGH RICE': 'rough_rice',
    'BUTTER (CASH SETTLED)': 'butter_cash_settled',
    'MILK CLASS III': 'milk_class_3',
    'NON FAT DRY MILK': 'non_fat_dry_milk',
    'CME MILK IV': 'cme_milk_4',
    'FRZN CONCENTRATED ORANGE JUICE': 'frzn_concentrated_orange_juice',
};

// ── Formatters ────────────────────────────────────────────────────────────────
function fmt(val) {
    if (val === null || val === undefined || isNaN(val)) return '—';
    const abs = Math.abs(val);
    const sign = val >= 0 ? '+' : '';
    if (abs >= 1_000_000) return `${sign}${(val / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${sign}${(val / 1_000).toFixed(1)}k`;
    return `${sign}${Number(val).toFixed(2)}`;
}

function fmtRaw(val) {
    // Same but no sign prefix — for plain text body
    if (val === null || val === undefined || isNaN(val)) return '—';
    const abs = Math.abs(val);
    if (abs >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${(val / 1_000).toFixed(1)}k`;
    return `${Number(val).toFixed(2)}`;
}

// ── Entry point ───────────────────────────────────────────────────────────────
export async function runCftcAlertCheck() {
    console.log('[CftcAlert] ── Starting 5-year ATH/ATL alert check ──');

    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - LOOKBACK_YEARS);
    const cutoff = fiveYearsAgo.toISOString().split('T')[0];

    // Accumulate ALL alerts from ALL products into one global list
    const allAlerts = [];
    let overallReportDate = null;

    for (const [product, table] of Object.entries(PRODUCT_TABLES)) {
        console.log(`[CftcAlert] Processing product: ${product}`);

        let rows;
        try {
            const result = await pool.query(
                `SELECT * FROM ${table}
                 WHERE report_date_as_mm_dd_yyyy >= $1
                 ORDER BY report_date_as_mm_dd_yyyy ASC`,
                [cutoff]
            );
            rows = result.rows;
        } catch (err) {
            console.error(`[CftcAlert] DB error for ${product}: ${err.message}`);
            continue;
        }

        if (rows.length < 2) continue;

        const currentRow = rows[rows.length - 1];
        const prevRow = rows[rows.length - 2];
        const reportDate = normaliseDate(currentRow.report_date_as_mm_dd_yyyy);
        if (!overallReportDate) overallReportDate = reportDate;

        for (const metric of CFTC_METRICS) {
            try {
                const triggered = await processMetric({
                    product, metric, rows, currentRow, prevRow, reportDate,
                });
                if (triggered && triggered.length > 0) {
                    for (const t of triggered) allAlerts.push({ product, reportDate, ...t });
                }
            } catch (err) {
                console.error(`[CftcAlert]   Error on ${metric.id}: ${err.message}`);
            }
        }
    }

    // Send exactly ONE card for all products combined
    if (allAlerts.length > 0) {
        const success = await sendCombinedAlert(overallReportDate, allAlerts);
        if (success) {
            for (const a of allAlerts) {
                if (a.isDummy) continue; // Do NOT log dummy rows to DB
                await logAlert(a.product, a.metric.id, a.direction, a.reportDate,
                    a.currentChange, a.threshold, a.extreme);
            }
        }
    } else {
        console.log('[CftcAlert] No threshold breaches this week — no alert sent.');
    }

    console.log(`[CftcAlert] ── Check complete. ${allAlerts.length} metric(s) alerted. ──`);
}


// ── Per-metric processing ─────────────────────────────────────────────────────
async function processMetric({ product, metric, rows, currentRow, prevRow, reportDate }) {
    const currentVal = metric.getValue(currentRow);
    const prevVal = metric.getValue(prevRow);
    if (currentVal === null || prevVal === null || isNaN(currentVal) || isNaN(prevVal)) return null;

    const currentChange = currentVal - prevVal;

    let athChange = -Infinity, athDate = null;
    let atlChange = Infinity, atlDate = null;

    for (let i = 1; i < rows.length; i++) {
        const cv = metric.getValue(rows[i]);
        const pv = metric.getValue(rows[i - 1]);
        if (cv === null || pv === null || isNaN(cv) || isNaN(pv)) continue;
        const ch = cv - pv;
        const date = normaliseDate(rows[i].report_date_as_mm_dd_yyyy);
        if (ch > athChange) { athChange = ch; athDate = date; }
        if (ch < atlChange) { atlChange = ch; atlDate = date; }
    }

    if (!isFinite(athChange) || !isFinite(atlChange)) return null;

    const existing = await pool.query(
        `SELECT ath_change, ath_date, atl_change, atl_date
         FROM cftc_alert_state
         WHERE product = $1 AND metric_id = $2`,
        [product, metric.id]
    );

    let storedAth = existing.rows[0]?.ath_change ?? athChange;
    let storedAthDate = existing.rows[0]?.ath_date ?? athDate;
    let storedAtl = existing.rows[0]?.atl_change ?? atlChange;
    let storedAtlDate = existing.rows[0]?.atl_date ?? atlDate;

    const newAth = Math.max(storedAth, athChange);
    const newAthDate = newAth !== storedAth ? athDate : storedAthDate;
    const newAtl = Math.min(storedAtl, atlChange);
    const newAtlDate = newAtl !== storedAtl ? atlDate : storedAtlDate;

    const athUpdated = newAth !== storedAth;
    const atlUpdated = newAtl !== storedAtl;

    await pool.query(
        `INSERT INTO cftc_alert_state
             (product, metric_id, metric_label, ath_change, ath_date, atl_change, atl_date, last_computed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (product, metric_id) DO UPDATE SET
             ath_change       = EXCLUDED.ath_change,
             ath_date         = EXCLUDED.ath_date,
             atl_change       = EXCLUDED.atl_change,
             atl_date         = EXCLUDED.atl_date,
             last_computed_at = NOW()`,
        [product, metric.id, metric.label, newAth, newAthDate, newAtl, newAtlDate]
    );

    const athThreshold = newAth * THRESHOLD_PCT;
    const atlThreshold = newAtl * THRESHOLD_PCT;
    const breachHigh = newAth > 0 && currentChange >= athThreshold;
    const breachLow = newAtl < 0 && currentChange <= atlThreshold;

    const triggered = [];

    if (breachHigh) {
        const alreadySent = await isDuplicate(product, metric.id, 'HIGH', reportDate);
        if (!alreadySent) {
            triggered.push({
                metric, direction: 'HIGH',
                currentChange, threshold: athThreshold, extreme: newAth,
                extremeDate: newAthDate, athUpdated, atlUpdated: false
            });
        }
    }

    if (breachLow) {
        const alreadySent = await isDuplicate(product, metric.id, 'LOW', reportDate);
        if (!alreadySent) {
            triggered.push({
                metric, direction: 'LOW',
                currentChange, threshold: atlThreshold, extreme: newAtl,
                extremeDate: newAtlDate, athUpdated: false, atlUpdated
            });
        }
    }

    return triggered;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function normaliseDate(val) {
    if (!val) return null;
    if (val instanceof Date) return val.toISOString().split('T')[0];
    return String(val).split('T')[0];
}

async function isDuplicate(product, metricId, direction, alertDate) {
    const res = await pool.query(
        `SELECT 1 FROM cftc_alert_log
         WHERE product=$1 AND metric_id=$2 AND direction=$3 AND alert_date=$4`,
        [product, metricId, direction, alertDate]
    );
    return res.rows.length > 0;
}

async function logAlert(product, metricId, direction, alertDate, changeValue, threshold, extreme) {
    await pool.query(
        `INSERT INTO cftc_alert_log
             (product, metric_id, direction, alert_date, change_value, threshold_value, ath_or_atl)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (product, metric_id, direction, alert_date) DO NOTHING`,
        [product, metricId, direction, alertDate, changeValue, threshold, extreme]
    );
}

// ── Single global Teams card ──────────────────────────────────────────────────
// Sends ONE card containing ALL alerts from every product.
// Each row shows: Product | Metric | Change | 🔺/🔻
async function sendCombinedAlert(reportDate, allAlerts) {
    if (!TEAMS_WEBHOOK_URL) {
        console.warn('[CftcAlert] CFTC_TEAMS_WEBHOOK_URL not configured — alert skipped.');
        return false;
    }

    const realAlertsCount = allAlerts.filter(a => !a.isDummy).length;
    const CHUNK_SIZE = 25; // Max alerts per card to stay under 28KB limit
    const totalChunks = Math.ceil(allAlerts.length / CHUNK_SIZE);

    for (let i = 0; i < totalChunks; i++) {
        const chunk = allAlerts.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        const partLabel = totalChunks > 1 ? ` (Part ${i + 1}/${totalChunks})` : '';

        const bodyElements = [
            {
                type: 'TextBlock',
                text: `🚨 CFTC EXTREME CHANGE ALERTS${partLabel}`,
                weight: 'Bolder',
                size: 'ExtraLarge',
                color: 'Attention',
                wrap: true,
            },
            {
                type: 'TextBlock',
                text: `Report Date: **${reportDate ?? 'N/A'}**  |  Total alerts: **${realAlertsCount}**`,
                wrap: true,
                spacing: 'Small',
                isSubtle: true,
            },
            {
                type: 'TextBlock',
                text: '---',
                spacing: 'Small',
            },
            {
                type: 'ColumnSet',
                spacing: 'Small',
                columns: [
                    { type: 'Column', width: 'auto', items: [{ type: 'TextBlock', text: 'Product', weight: 'Bolder', size: 'Small' }] },
                    { type: 'Column', width: 'stretch', items: [{ type: 'TextBlock', text: 'Metric', weight: 'Bolder', size: 'Small' }] },
                    { type: 'Column', width: 'auto', items: [{ type: 'TextBlock', text: 'Last Week', weight: 'Bolder', size: 'Small', horizontalAlignment: 'Right' }] },
                    { type: 'Column', width: 'auto', items: [{ type: 'TextBlock', text: 'ATH/ATL Change', weight: 'Bolder', size: 'Small', horizontalAlignment: 'Right' }] },
                ]
            },
        ];

        for (const a of chunk) {
            const isHigh = a.direction === 'HIGH';
            const icon = isHigh ? '🔺' : '🔻';
            const color = isHigh ? 'Good' : 'Attention';
            const product = a.product ?? '';

            bodyElements.push({
                type: 'ColumnSet',
                spacing: 'None',
                columns: [
                    {
                        type: 'Column', width: 'auto',
                        items: [{ type: 'TextBlock', text: product, size: 'Small' }]
                    },
                    {
                        type: 'Column', width: 'stretch',
                        items: [{ type: 'TextBlock', text: a.metric.label, size: 'Small', wrap: true }]
                    },
                    {
                        type: 'Column', width: 'auto',
                        items: [{
                            type: 'TextBlock',
                            text: fmt(a.currentChange),
                            size: 'Small',
                            color: color,
                            weight: 'Bolder',
                            horizontalAlignment: 'Right',
                        }]
                    },
                    {
                        type: 'Column', width: 'auto',
                        items: [{
                            type: 'TextBlock',
                            text: `${icon} ${fmtRaw(a.extreme)}`,
                            size: 'Small',
                            color: color,
                            weight: 'Bolder',
                            horizontalAlignment: 'Right',
                        }]
                    },
                ]
            });
        }

        const payload = {
            type: 'message',
            attachments: [{
                contentType: 'application/vnd.microsoft.card.adaptive',
                content: {
                    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
                    type: 'AdaptiveCard',
                    version: '1.4',
                    msteams: { width: 'Full' },
                    body: bodyElements,
                }
            }]
        };

        const payloadStr = JSON.stringify(payload);
        console.log(`[CftcAlert] Sending chunk ${i + 1}/${totalChunks} | Size: ${(payloadStr.length / 1024).toFixed(2)} KB`);

        try {
            await axios.post(TEAMS_WEBHOOK_URL, payload, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 15000,
            });
            console.log(`[CftcAlert] ✅ Chunk ${i + 1} sent.`);
        } catch (err) {
            const status = err.response?.status;
            const body = JSON.stringify(err.response?.data || {});
            console.error(`[CftcAlert] ❌ Webhook POST failed for chunk ${i + 1} [${status}]: ${err.message} — ${body}`);
            return false;
        }
    }
    return true;
}
