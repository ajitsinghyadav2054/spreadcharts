import pool from './db.js';

async function createTable() {
    try {
        const query = `
            CREATE TABLE IF NOT EXISTS historic_open_interest (
                id SERIAL PRIMARY KEY,
                trade_date DATE NOT NULL,
                group_code VARCHAR(10) NOT NULL,
                qhcode VARCHAR(20) NOT NULL,
                oi INTEGER,
                close_price NUMERIC,
                volume INTEGER,
                UNIQUE(trade_date, qhcode)
            );
            
            CREATE INDEX IF NOT EXISTS idx_historic_oi_group ON historic_open_interest(group_code);
            CREATE INDEX IF NOT EXISTS idx_historic_oi_date ON historic_open_interest(trade_date);
            CREATE INDEX IF NOT EXISTS idx_historic_oi_qhcode ON historic_open_interest(qhcode);
        `;

        await pool.query(query);
        console.log("✅ Successfully created 'historic_open_interest' table and indexes!");
    } catch (err) {
        console.error("❌ Error creating table:", err.message);
    } finally {
        pool.end();
    }
}

createTable();
