// server/migrations/createOpeningVariationTable.js
// Run once: node server/migrations/createOpeningVariationTable.js

import pool from '../db.js';

export async function createOpeningVariationTable() {
    const sql = `
        CREATE TABLE IF NOT EXISTS opening_variation_days (
            id SERIAL PRIMARY KEY,
            trade_date DATE NOT NULL UNIQUE,

            -- Active front-month contracts for that date
            kc_contract  VARCHAR(20) NOT NULL,
            rc_contract  VARCHAR(20) NOT NULL,

            -- ─── RC Analysis (09:00–09:14 London, 1M candles) ───────────────
            rc_prev_settlement  NUMERIC(12,2),
            rc_opening_high     NUMERIC(12,2),
            rc_opening_low      NUMERIC(12,2),
            rc_tick_move        INTEGER,        -- signed ticks from prev settlement
            rc_qualifies        BOOLEAN DEFAULT false,
            rc_bias             VARCHAR(10),    -- 'long' | 'short' | null

            -- ─── KC Analysis (09:15–09:20 London, single 5M candle) ─────────
            kc_prev_settlement  NUMERIC(12,4),
            kc_opening_high     NUMERIC(12,4),
            kc_opening_low      NUMERIC(12,4),
            kc_tick_move        INTEGER,
            kc_qualifies        BOOLEAN DEFAULT false,
            kc_bias             VARCHAR(10),

            -- ─── KC Trade Setup (populated only when kc_qualifies = true) ───
            kc_stop_level       NUMERIC(12,4),
            kc_entry_price      NUMERIC(12,4),
            kc_target_price     NUMERIC(12,4),
            kc_outcome          VARCHAR(10),    -- 'win' | 'loss' | 'open'
            kc_ticks_pnl        INTEGER,        -- +20 for win, negative for loss

            computed_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_ov_trade_date  ON opening_variation_days(trade_date);
        CREATE INDEX IF NOT EXISTS idx_ov_kc_qualifies ON opening_variation_days(kc_qualifies);
        CREATE INDEX IF NOT EXISTS idx_ov_rc_qualifies ON opening_variation_days(rc_qualifies);
    `;

    await pool.query(sql);
    console.log('[OV Migration] opening_variation_days table created / already exists.');
}

// ── Allow running directly ────────────────────────────────────────────────────
if (process.argv[1] && process.argv[1].includes('createOpeningVariationTable')) {
    createOpeningVariationTable()
        .then(() => { console.log('Done.'); process.exit(0); })
        .catch(err => { console.error(err); process.exit(1); });
}
