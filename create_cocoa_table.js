import pool from './server/db.js';

await pool.query(`
    CREATE TABLE IF NOT EXISTS cocoa_us_bags (
      id                        SERIAL PRIMARY KEY,
      trade_date                DATE NOT NULL UNIQUE,
      arriba_ecuador_grp_b      INTEGER DEFAULT 0,
      cameroon_grp_b            INTEGER DEFAULT 0,
      colombia_grp_b            INTEGER DEFAULT 0,
      ecuador_grp_b             INTEGER DEFAULT 0,
      ghana_grp_a               INTEGER DEFAULT 0,
      ghana_grp_b               INTEGER DEFAULT 0,
      grenada_grp_b             INTEGER DEFAULT 0,
      haiti_grp_c               INTEGER DEFAULT 0,
      hispaniolas_grp_b         INTEGER DEFAULT 0,
      indonesia_grp_b           INTEGER DEFAULT 0,
      ivory_coast_grp_a         INTEGER DEFAULT 0,
      ivory_coast_grp_b         INTEGER DEFAULT 0,
      ivory_coast_grp_c         INTEGER DEFAULT 0,
      new_guinea_grp_b          INTEGER DEFAULT 0,
      new_guinea_grp_c          INTEGER DEFAULT 0,
      nicaragua_grp_b           INTEGER DEFAULT 0,
      nigeria_grp_a             INTEGER DEFAULT 0,
      nigeria_grp_b             INTEGER DEFAULT 0,
      nigeria_grp_c             INTEGER DEFAULT 0,
      panama_grp_b              INTEGER DEFAULT 0,
      papua_new_guinea_grp_b    INTEGER DEFAULT 0,
      papua_new_guinea_grp_c    INTEGER DEFAULT 0,
      peru_grp_b                INTEGER DEFAULT 0,
      sanchez_grp_b             INTEGER DEFAULT 0,
      tanzania_grp_b            INTEGER DEFAULT 0,
      tanzania_grp_c            INTEGER DEFAULT 0,
      venezuela_grp_b           INTEGER DEFAULT 0,
      total_bags                INTEGER DEFAULT 0,
      created_at                TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_cocoa_us_bags_date ON cocoa_us_bags (trade_date DESC);
`);

console.log('✅ Table cocoa_us_bags created successfully!');
process.exit(0);
