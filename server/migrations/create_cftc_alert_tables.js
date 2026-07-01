// server/migrations/create_cftc_alert_tables.js
// Run ONCE to create the two alert-system tables.
// node server/migrations/create_cftc_alert_tables.js

import pool from '../db.js';

async function run() {
    console.log('[Migration] Creating cftc_alert_state table...');
    await pool.query(`
        CREATE TABLE IF NOT EXISTS cftc_alert_state (
            id               SERIAL PRIMARY KEY,
            product          TEXT NOT NULL,
            metric_id        TEXT NOT NULL,
            metric_label     TEXT NOT NULL,
            ath_change       DOUBLE PRECISION,
            ath_date         DATE,
            atl_change       DOUBLE PRECISION,
            atl_date         DATE,
            last_computed_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE (product, metric_id)
        );
    `);
    console.log('[Migration] ✅ cftc_alert_state created.');

    console.log('[Migration] Creating cftc_alert_log table...');
    await pool.query(`
        CREATE TABLE IF NOT EXISTS cftc_alert_log (
            id              SERIAL PRIMARY KEY,
            product         TEXT NOT NULL,
            metric_id       TEXT NOT NULL,
            direction       TEXT NOT NULL,
            alert_date      DATE NOT NULL,
            change_value    DOUBLE PRECISION,
            threshold_value DOUBLE PRECISION,
            ath_or_atl      DOUBLE PRECISION,
            sent_at         TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE (product, metric_id, direction, alert_date)
        );
    `);
    console.log('[Migration] ✅ cftc_alert_log created.');
    console.log('[Migration] All done.');
    await pool.end();
}

run().catch(err => { console.error('[Migration] Fatal:', err.message); process.exit(1); });
