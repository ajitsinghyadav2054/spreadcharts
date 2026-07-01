// server/migrations/createOvDataTables.js
// Creates the raw data storage tables for Opening Variation
// Run on startup (idempotent — safe to run repeatedly)

import pool from '../db.js';

export async function createOvDataTables() {
    await pool.query(`
        -- ─── Raw settlement prices from /api/dailymarketdata/ ──────────────────
        -- One row per (contract, date).  trade_date = the settlement date itself
        -- (i.e. "what was the close on this date" — used as previous-day settlement
        --  when looking at the following trading day's opening move).
        CREATE TABLE IF NOT EXISTS ov_settlements (
            id              SERIAL PRIMARY KEY,
            trade_date      DATE         NOT NULL,
            qhcode          VARCHAR(20)  NOT NULL,
            settlement_price NUMERIC(12,4) NOT NULL,
            fetched_at      TIMESTAMPTZ  DEFAULT NOW(),
            UNIQUE(trade_date, qhcode)
        );

        CREATE INDEX IF NOT EXISTS idx_ovs_date    ON ov_settlements(trade_date);
        CREATE INDEX IF NOT EXISTS idx_ovs_qhcode  ON ov_settlements(qhcode);

        -- ─── Raw intraday OHLC candles from /api/v2/ohlc/ ─────────────────────
        -- Stores both:
        --   KC contracts  — 5M candles covering 09:15→18:30 London time
        --   RC contracts  — 1M candles covering 09:00→09:15 London time (opening window only)
        --
        -- candle_time is stored in UTC (TIMESTAMPTZ).
        -- The API returns time in milliseconds; we convert to ISO before insert.
        CREATE TABLE IF NOT EXISTS ov_candles (
            id            SERIAL PRIMARY KEY,
            qhcode        VARCHAR(20)  NOT NULL,
            interval_type VARCHAR(5)   NOT NULL,  -- '1M' or '5M'
            candle_time   TIMESTAMPTZ  NOT NULL,
            open          NUMERIC(12,4),
            high          NUMERIC(12,4),
            low           NUMERIC(12,4),
            close         NUMERIC(12,4),
            volume        INTEGER,
            fetched_at    TIMESTAMPTZ  DEFAULT NOW(),
            UNIQUE(qhcode, interval_type, candle_time)
        );

        CREATE INDEX IF NOT EXISTS idx_ovc_qhcode_time
            ON ov_candles(qhcode, candle_time);
        CREATE INDEX IF NOT EXISTS idx_ovc_qhcode_interval_time
            ON ov_candles(qhcode, interval_type, candle_time);
    `);

    console.log('[OV] ov_settlements + ov_candles tables ready.');
}

// Allow direct execution: node server/migrations/createOvDataTables.js
if (process.argv[1]?.includes('createOvDataTables')) {
    createOvDataTables()
        .then(() => { console.log('Done.'); process.exit(0); })
        .catch(err  => { console.error(err); process.exit(1); });
}
