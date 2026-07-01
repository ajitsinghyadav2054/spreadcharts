// server/backfill_cftc_alert_state.js
// Run ONCE after the migration to seed cftc_alert_state with the real 5-year ATH/ATL
// from all existing historical data in the DB.
//
// Usage:  node server/backfill_cftc_alert_state.js

import pool from './db.js';
import { CFTC_METRICS } from './cftcMetricList.js';

const LOOKBACK_YEARS = 5;

const PRODUCT_TABLES = {
    'COCOA':                           'cocoa',
    'COFFEE C':                        'coffee_c',
    'COTTON NO. 2':                    'cotton_no_2',
    'SUGAR NO. 11':                    'sugar_no_11',
    'CHEESE (CASH SETTLED)':           'cheese_cash_settled',
    'ROUGH RICE':                      'rough_rice',
    'BUTTER (CASH SETTLED)':           'butter_cash_settled',
    'MILK CLASS III':                  'milk_class_3',
    'NON FAT DRY MILK':                'non_fat_dry_milk',
    'CME MILK IV':                     'cme_milk_4',
    'FRZN CONCENTRATED ORANGE JUICE':  'frzn_concentrated_orange_juice',
};

function normaliseDate(val) {
    if (!val) return null;
    if (val instanceof Date) return val.toISOString().split('T')[0];
    return String(val).split('T')[0];
}

async function backfill() {
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - LOOKBACK_YEARS);
    const cutoff = fiveYearsAgo.toISOString().split('T')[0];

    console.log(`[Backfill] Computing 5-year ATH/ATL for all products from ${cutoff} to today.`);
    console.log(`[Backfill] ${CFTC_METRICS.length} metrics × ${Object.keys(PRODUCT_TABLES).length} products\n`);

    let totalInserted = 0;
    let totalSkipped  = 0;

    for (const [product, table] of Object.entries(PRODUCT_TABLES)) {
        console.log(`[Backfill] ── ${product} (${table}) ──`);

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
            console.error(`  ❌ DB error: ${err.message}`);
            continue;
        }

        if (rows.length < 2) {
            console.log(`  ⚠️  Only ${rows.length} row(s) found — skipping.`);
            continue;
        }

        console.log(`  ${rows.length} rows found.`);

        for (const metric of CFTC_METRICS) {
            let athChange = -Infinity, athDate = null;
            let atlChange =  Infinity, atlDate = null;
            let validPoints = 0;

            for (let i = 1; i < rows.length; i++) {
                const cv = metric.getValue(rows[i]);
                const pv = metric.getValue(rows[i - 1]);
                if (cv === null || pv === null || isNaN(cv) || isNaN(pv)) continue;

                const ch   = cv - pv;
                const date = normaliseDate(rows[i].report_date_as_mm_dd_yyyy);
                validPoints++;

                if (ch > athChange) { athChange = ch; athDate = date; }
                if (ch < atlChange) { atlChange = ch; atlDate = date; }
            }

            if (!isFinite(athChange) || !isFinite(atlChange) || validPoints < 2) {
                totalSkipped++;
                continue;
            }

            try {
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
                    [product, metric.id, metric.label, athChange, athDate, atlChange, atlDate]
                );
                totalInserted++;
            } catch (err) {
                console.error(`  ❌ Insert error for ${metric.id}: ${err.message}`);
            }
        }

        console.log(`  ✅ Done.\n`);
    }

    console.log(`[Backfill] ════════════════════════════════`);
    console.log(`[Backfill] Inserted/Updated : ${totalInserted}`);
    console.log(`[Backfill] Skipped (no data): ${totalSkipped}`);
    console.log(`[Backfill] Complete!`);

    await pool.end();
}

backfill().catch(err => {
    console.error('[Backfill] Fatal error:', err.message);
    process.exit(1);
});
