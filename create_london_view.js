import pool from './server/db.js';

await pool.query(`
    CREATE OR REPLACE VIEW cocoa_london_daily_changes AS
    SELECT 
        trade_date,
        COALESCE(valid_stocks - LAG(valid_stocks) OVER (ORDER BY trade_date ASC), 0) AS valid_stocks,
        COALESCE(total_stock - LAG(total_stock) OVER (ORDER BY trade_date ASC), 0) AS total_stock,
        COALESCE(amsterdam - LAG(amsterdam) OVER (ORDER BY trade_date ASC), 0) AS amsterdam,
        COALESCE(antwerp - LAG(antwerp) OVER (ORDER BY trade_date ASC), 0) AS antwerp,
        COALESCE(bremen - LAG(bremen) OVER (ORDER BY trade_date ASC), 0) AS bremen,
        COALESCE(hamburg - LAG(hamburg) OVER (ORDER BY trade_date ASC), 0) AS hamburg,
        COALESCE(liverpool - LAG(liverpool) OVER (ORDER BY trade_date ASC), 0) AS liverpool,
        COALESCE(london - LAG(london) OVER (ORDER BY trade_date ASC), 0) AS london,
        COALESCE(rotterdam - LAG(rotterdam) OVER (ORDER BY trade_date ASC), 0) AS rotterdam,
        COALESCE(dfb - LAG(dfb) OVER (ORDER BY trade_date ASC), 0) AS dfb,
        COALESCE(nts - LAG(nts) OVER (ORDER BY trade_date ASC), 0) AS nts,
        COALESCE(regrade - LAG(regrade) OVER (ORDER BY trade_date ASC), 0) AS regrade,
        COALESCE(take_ups - LAG(take_ups) OVER (ORDER BY trade_date ASC), 0) AS take_ups,
        COALESCE(to_perpetual - LAG(to_perpetual) OVER (ORDER BY trade_date ASC), 0) AS to_perpetual
    FROM cocoa_london_bags;
`);

console.log('✅ View cocoa_london_daily_changes created successfully!');
process.exit(0);
