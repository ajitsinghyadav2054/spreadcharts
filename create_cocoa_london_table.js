import pool from './server/db.js';

await pool.query(`
    CREATE TABLE IF NOT EXISTS cocoa_london_bags (
      id                        SERIAL PRIMARY KEY,
      trade_date                DATE NOT NULL UNIQUE,
      valid_stocks              INTEGER DEFAULT 0,
      total_stock               INTEGER DEFAULT 0,
      amsterdam                 INTEGER DEFAULT 0,
      antwerp                   INTEGER DEFAULT 0,
      bremen                    INTEGER DEFAULT 0,
      hamburg                   INTEGER DEFAULT 0,
      liverpool                 INTEGER DEFAULT 0,
      london                    INTEGER DEFAULT 0,
      rotterdam                 INTEGER DEFAULT 0,
      dfb                       INTEGER DEFAULT 0,
      nts                       INTEGER DEFAULT 0,
      regrade                   INTEGER DEFAULT 0,
      take_ups                  INTEGER DEFAULT 0,
      to_perpetual              INTEGER DEFAULT 0,
      created_at                TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_cocoa_london_bags_date ON cocoa_london_bags (trade_date DESC);
`);

console.log('✅ Table cocoa_london_bags created successfully!');
process.exit(0);
