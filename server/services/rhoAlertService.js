import axios from 'axios';
import pool from '../db.js';

// Configuration
const W = 15;
const THR = 50;
const LOOKBACK_DAYS = 14;
const PEEK_THRESHOLD = 80;

const PRODS = {
    C: { name: 'London Cocoa', outCode: 'LCCK26', outLbl: 'LCC May26', sprs: [{ lbl: 'K26-N26', code: 'LCCK26-N26' }, { lbl: 'N26-U26', code: 'LCCN26-U26' }, { lbl: 'U26-Z26', code: 'LCCU26-Z26' }, { lbl: 'Z26-H27', code: 'LCCZ26-H27' }, { lbl: 'H27-K27', code: 'LCCH27-K27' }, { lbl: 'K27-N27', code: 'LCCK27-N27' }, { lbl: 'N27-U27', code: 'LCCN27-U27' }, { lbl: 'U27-Z27', code: 'LCCU27-Z27' }, { lbl: 'Z27-H28', code: 'LCCZ27-H28' }] },
    CC: { name: 'NY Cocoa', outCode: 'CCK26', outLbl: 'CC May26', sprs: [{ lbl: 'K26-N26', code: 'CCK26-N26' }, { lbl: 'N26-U26', code: 'CCN26-U26' }, { lbl: 'U26-Z26', code: 'CCU26-Z26' }, { lbl: 'Z26-H27', code: 'CCZ26-H27' }, { lbl: 'H27-K27', code: 'CCH27-K27' }, { lbl: 'K27-N27', code: 'CCK27-N27' }, { lbl: 'N27-U27', code: 'CCN27-U27' }, { lbl: 'U27-Z27', code: 'CCU27-Z27' }, { lbl: 'Z27-H28', code: 'CCZ27-H28' }] },
    KC: { name: 'KC Arabica', outCode: 'KCK26', outLbl: 'KC May26', sprs: [{ lbl: 'K26-N26', code: 'KCK26-N26' }, { lbl: 'N26-U26', code: 'KCN26-U26' }, { lbl: 'U26-Z26', code: 'KCU26-Z26' }, { lbl: 'Z26-H27', code: 'KCZ26-H27' }, { lbl: 'H27-K27', code: 'KCH27-K27' }, { lbl: 'K27-N27', code: 'KCK27-N27' }, { lbl: 'N27-U27', code: 'KCN27-U27' }, { lbl: 'U27-Z27', code: 'KCU27-Z27' }, { lbl: 'Z27-H28', code: 'KCZ27-H28' }] },
    RC: { name: 'Robusta Coffee', outCode: 'LKCK26', outLbl: 'RC May26', sprs: [{ lbl: 'K26-N26', code: 'LKCK26-N26' }, { lbl: 'N26-U26', code: 'LKCN26-U26' }, { lbl: 'U26-X26', code: 'LKCU26-X26' }, { lbl: 'X26-F27', code: 'LKCX26-F27' }, { lbl: 'F27-H27', code: 'LKCF27-H27' }, { lbl: 'H27-K27', code: 'LKCH27-K27' }, { lbl: 'K27-N27', code: 'LKCK27-N27' }, { lbl: 'N27-U27', code: 'LKCN27-U27' }, { lbl: 'U27-Z27', code: 'LKCU27-Z27' }] },
    CT: { name: 'Cotton #2', outCode: 'CTK26', outLbl: 'CT May26', sprs: [{ lbl: 'K26-N26', code: 'CTK26-N26' }, { lbl: 'N26-V26', code: 'CTN26-V26' }, { lbl: 'V26-Z26', code: 'CTV26-Z26' }, { lbl: 'Z26-H27', code: 'CTZ26-H27' }, { lbl: 'H27-K27', code: 'CTH27-K27' }, { lbl: 'K27-N27', code: 'CTK27-N27' }, { lbl: 'N27-V27', code: 'CTN27-V27' }, { lbl: 'V27-Z27', code: 'CTV27-Z27' }, { lbl: 'Z27-H28', code: 'CTZ27-H28' }] },
    SB: { name: 'Raw Sugar #11', outCode: 'SGK26', outLbl: 'SB May26', sprs: [{ lbl: 'K26-N26', code: 'SGK26-N26' }, { lbl: 'N26-V26', code: 'SGN26-V26' }, { lbl: 'V26-H27', code: 'SGV26-H27' }, { lbl: 'H27-K27', code: 'SGH27-K27' }, { lbl: 'K27-N27', code: 'SGK27-N27' }, { lbl: 'N27-V27', code: 'SGN27-V27' }, { lbl: 'V27-H28', code: 'SGV27-H28' }, { lbl: 'H28-K28', code: 'SGH28-K28' }, { lbl: 'K28-N28', code: 'SGK28-N28' }] },
    W: { name: 'White Sugar', outCode: 'LSGK26', outLbl: 'W May26', sprs: [{ lbl: 'K26-Q26', code: 'LSGK26-Q26' }, { lbl: 'Q26-V26', code: 'LSGQ26-V26' }, { lbl: 'V26-Z26', code: 'LSGV26-Z26' }, { lbl: 'Z26-H27', code: 'LSGZ26-H27' }, { lbl: 'H27-K27', code: 'LSGH27-K27' }, { lbl: 'K27-Q27', code: 'LSGK27-Q27' }, { lbl: 'Q27-V27', code: 'LSGQ27-V27' }, { lbl: 'V27-Z27', code: 'LSGV27-Z27' }, { lbl: 'Z27-H28', code: 'LSGZ27-H28' }] }
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Setup Database Table
async function initRhoAlertDB() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS rho_alert_log (
            id SERIAL PRIMARY KEY,
            product TEXT NOT NULL,
            spread_label TEXT NOT NULL,
            spread_code TEXT NOT NULL,
            max_rho_14d NUMERIC(6,2),
            current_rho NUMERIC(6,2),
            alert_date DATE NOT NULL,
            sent_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(product, spread_label, alert_date)
        )
    `);
}

// Check duplication (7-day silence window)
async function isDuplicateRhoAlert(product, spreadLabel) {
    const res = await pool.query(`
        SELECT alert_date FROM rho_alert_log 
        WHERE product=$1 AND spread_label=$2 
        ORDER BY alert_date DESC LIMIT 1
    `, [product, spreadLabel]);

    if (res.rows.length === 0) return false;

    const lastDate = new Date(res.rows[0].alert_date);
    const now = new Date();
    const diffDays = (now - lastDate) / (1000 * 60 * 60 * 24);

    return diffDays < 7; // True if alerted within last 7 days
}

async function logRhoAlert(product, spreadLabel, spreadCode, maxRho, currentRho, alertDate) {
    await pool.query(`
        INSERT INTO rho_alert_log (product, spread_label, spread_code, max_rho_14d, current_rho, alert_date)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING
    `, [product, spreadLabel, spreadCode, maxRho, currentRho, alertDate]);
}

async function fetchOHLCWithRetry(code, retries = 3) {
    const token = process.env.QH_API_TOKEN;
    const url = `https://qh-api.corp.hertshtengroup.com/api/v2/ohlc/?instruments=${encodeURIComponent(code)}&interval=1D&start=1767225600&count=300`;

    for (let i = 0; i < retries; i++) {
        try {
            const resp = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
            const arr = resp.data;
            arr.sort((a, b) => a.time - b.time);

            // We only need the last ~45 calendar days to compute W=15 and lookback=14. 
            // 2026-01-01 is safe fallback, but we can compute from any sufficient past.
            return arr.map(r => ({ d: new Date(r.time).toISOString().slice(0, 10), c: r.close })).filter(r => r.d >= '2026-01-01');
        } catch (err) {
            if (err.response && err.response.status === 429) {
                console.warn(`[rhoAlert] 429 Rate Limit on ${code}. Pausing 10s...`);
                await sleep(10000);
            } else {
                if (i === retries - 1) throw err;
                await sleep(1000);
            }
        }
    }
    return [];
}

// Pearson calculation
function pearson(x, y) {
    const pairs = [];
    for (let i = 0; i < x.length; i++) {
        if (x[i] === null || y[i] === null || isNaN(x[i]) || isNaN(y[i])) continue;
        pairs.push([x[i], y[i]]);
    }
    const n = pairs.length;
    if (n < 2) return NaN;
    const mx = pairs.reduce((s, p) => s + p[0], 0) / n, my = pairs.reduce((s, p) => s + p[1], 0) / n;
    let num = 0, dx2 = 0, dy2 = 0;
    for (const [a, b] of pairs) {
        const da = a - mx, db = b - my;
        num += da * db;
        dx2 += da * da;
        dy2 += db * db;
    }
    return (dx2 === 0 || dy2 === 0) ? 0 : num / Math.sqrt(dx2 * dy2);
}

// Rho computation
function computeRho(outArr, sprArr) {
    if (!outArr || !sprArr || outArr.length < 2 || sprArr.length < 2) return null;
    const om = {}, sm = {};
    outArr.forEach(r => om[r.d] = r.c);
    sprArr.forEach(r => sm[r.d] = r.c);
    const dates = Object.keys(om).filter(d => sm[d] !== undefined).sort();
    if (dates.length < W + 2) return null;
    const oC = dates.map(d => om[d]), sC = dates.map(d => sm[d]);
    const oR = oC.slice(1).map((c, i) => oC[i] === 0 ? null : ((c - oC[i]) / oC[i]) * 100);
    const sR = sC.slice(1).map((c, i) => sC[i] === 0 ? null : ((c - sC[i]) / sC[i]) * 100);
    const rDates = dates.slice(1);
    const rho = [];
    for (let i = W - 1; i < oR.length; i++) {
        const r = pearson(oR.slice(i - W + 1, i + 1), sR.slice(i - W + 1, i + 1));
        rho.push(isNaN(r) ? null : r * 100);
    }
    const rhoDates = rDates.slice(W - 1);
    return { dates, rhoDates, rho };
}

// Adaptive Card structure
function createRhoAdaptiveCard(chunkAlerts, currentChunk, totalChunks, runDateStr) {
    const items = [];
    items.push({
        "type": "ColumnSet",
        "separator": true,
        "columns": [
            { "type": "Column", "width": "15%", "items": [{ "type": "TextBlock", "text": "Product", "weight": "bolder", "size": "small" }] },
            { "type": "Column", "width": "30%", "items": [{ "type": "TextBlock", "text": "Spread", "weight": "bolder", "size": "small" }] },
            { "type": "Column", "width": "25%", "items": [{ "type": "TextBlock", "text": "Peak Rho (14d)", "weight": "bolder", "size": "small" }] },
            { "type": "Column", "width": "30%", "items": [{ "type": "TextBlock", "text": "Current Rho", "weight": "bolder", "size": "small" }] }
        ]
    });

    chunkAlerts.forEach(alert => {
        items.push({
            "type": "ColumnSet",
            "spacing": "small",
            "columns": [
                { "type": "Column", "width": "15%", "items": [{ "type": "TextBlock", "text": alert.product, "size": "small", "isSubtle": true }] },
                { "type": "Column", "width": "30%", "items": [{ "type": "TextBlock", "text": alert.spreadLabel, "size": "small", "weight": "bolder" }] },
                { "type": "Column", "width": "25%", "items": [{ "type": "TextBlock", "text": `🟢 ${alert.maxRho.toFixed(1)}`, "size": "small", "color": "good" }] },
                { "type": "Column", "width": "30%", "items": [{ "type": "TextBlock", "text": `🔴 ${alert.currentRho.toFixed(1)} ← BREAK`, "size": "small", "color": "attention", "weight": "bolder" }] }
            ]
        });
    });

    return {
        "type": "message",
        "attachments": [{
            "contentType": "application/vnd.microsoft.card.adaptive",
            "contentUrl": null,
            "content": {
                "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                "type": "AdaptiveCard",
                "version": "1.4",
                "body": [
                    {
                        "type": "Container",
                        "items": [
                            {
                                "type": "TextBlock",
                                "size": "Medium",
                                "weight": "Bolder",
                                "text": `🔻 RHO BREAK ALERTS(Part ${currentChunk} / ${totalChunks})`,
                                "color": "Attention"
                            },
                            {
                                "type": "TextBlock",
                                "text": `Date: ** ${runDateStr} ** | Total breaks: ** ${chunkAlerts.length} ** `,
                                "size": "Small",
                                "isSubtle": true,
                                "wrap": true
                            }
                        ]
                    },
                    {
                        "type": "Container",
                        "items": items
                    }
                ]
            }
        }]
    };
}

async function sendRhoAlertsToTeams(masterAlerts) {
    const webhookUrl = process.env.CFTC_TEAMS_WEBHOOK_URL;
    if (!webhookUrl) {
        console.error('[rhoAlert] Error: CFTC_TEAMS_WEBHOOK_URL is not set.');
        return;
    }

    if (masterAlerts.length === 0) {
        console.log('[rhoAlert] No valid rho breaks detected today. Nothing to send.');
        return;
    }

    const maxItemsPerCard = 25;
    const chunks = [];
    for (let i = 0; i < masterAlerts.length; i += maxItemsPerCard) {
        chunks.push(masterAlerts.slice(i, i + maxItemsPerCard));
    }

    const runDateStr = new Date().toISOString().slice(0, 10);
    console.log(`[rhoAlert] Sending ${masterAlerts.length} total alerts in ${chunks.length} card(s)...`);

    for (let i = 0; i < chunks.length; i++) {
        const payload = createRhoAdaptiveCard(chunks[i], i + 1, chunks.length, runDateStr);
        try {
            await axios.post(webhookUrl, payload, { headers: { 'Content-Type': 'application/json' } });
            console.log(`[rhoAlert] Successfully sent card ${i + 1} / ${chunks.length} to Teams.`);
            await sleep(2000); // safety gap
        } catch (webhookErr) {
            console.error(`[rhoAlert] Failed to send card ${i + 1} / ${chunks.length}: `, webhookErr.message);
        }
    }
}

export async function runRhoAlertCheck() {
    console.log('[rhoAlert] Starting daily Rho Monitor Break scan...');
    await initRhoAlertDB();

    const alertsToFire = [];
    const todayStr = new Date().toISOString().slice(0, 10);

    for (const [prodKey, prodConfig] of Object.entries(PRODS)) {
        console.log(`[rhoAlert] Scanning ${prodKey}(${prodConfig.name})...`);

        let outArr = null;
        try {
            outArr = await fetchOHLCWithRetry(prodConfig.outCode);
            await sleep(1100);
        } catch (e) {
            console.error(`[rhoAlert] Failed to fetch outright ${prodConfig.outCode}: ${e.message}`);
            continue;
        }

        if (!outArr || outArr.length < 2) continue;

        for (const spr of prodConfig.sprs) {
            try {
                const sprArr = await fetchOHLCWithRetry(spr.code);
                await sleep(1100);

                const res = computeRho(outArr, sprArr);
                if (!res) continue;

                const { rho, rhoDates } = res;
                if (rho.length < LOOKBACK_DAYS) continue;

                // Slice last 14 array indices regardless of date (closest to what we logically want)
                const last14Rhos = rho.slice(-LOOKBACK_DAYS).filter(v => v !== null);
                if (last14Rhos.length === 0) continue;

                const currentRho = last14Rhos[last14Rhos.length - 1];
                const maxRho14d = Math.max(...last14Rhos);

                if (maxRho14d >= PEEK_THRESHOLD && currentRho <= THR) {
                    const isDup = await isDuplicateRhoAlert(prodKey, spr.lbl);

                    if (!isDup) {
                        alertsToFire.push({
                            product: prodKey,
                            spreadLabel: spr.lbl,
                            spreadCode: spr.code,
                            maxRho: maxRho14d,
                            currentRho: currentRho,
                        });

                        // Log to prevent future dupes in coming days
                        await logRhoAlert(prodKey, spr.lbl, spr.code, maxRho14d, currentRho, todayStr);
                    } else {
                        console.log(`[rhoAlert] Ignored valid break for ${prodKey} ${spr.lbl} (suppressed by 7 - day cooldown)`);
                    }
                }
            } catch (sprErr) {
                console.error(`[rhoAlert] Failed to process ${spr.code}: ${sprErr.message} `);
            }
        }
    }

    console.log(`[rhoAlert] Scan complete.Found ${alertsToFire.length} new breaks.`);
    await sendRhoAlertsToTeams(alertsToFire);
}
