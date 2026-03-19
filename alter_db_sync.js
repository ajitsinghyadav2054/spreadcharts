import pool from './server/db.js';
import { syncCocoaLondon } from './server/services/cocoaLondonSync.js';

(async () => {
    try {
        console.log('Dropping existing columns...');
        await pool.query(`ALTER TABLE cocoa_london_bags DROP COLUMN IF EXISTS dfb CASCADE;`);
        await pool.query(`ALTER TABLE cocoa_london_bags DROP COLUMN IF EXISTS nts CASCADE;`);
        await pool.query(`ALTER TABLE cocoa_london_bags DROP COLUMN IF EXISTS regrade CASCADE;`);
        await pool.query(`ALTER TABLE cocoa_london_bags DROP COLUMN IF EXISTS take_ups CASCADE;`);
        await pool.query(`ALTER TABLE cocoa_london_bags DROP COLUMN IF EXISTS to_perpetual CASCADE;`);

        console.log('Adding new columns...');
        await pool.query(`ALTER TABLE cocoa_london_bags ADD COLUMN IF NOT EXISTS daily_valid_delta INTEGER DEFAULT 0;`);
        await pool.query(`ALTER TABLE cocoa_london_bags ADD COLUMN IF NOT EXISTS daily_total_delta INTEGER DEFAULT 0;`);

        console.log('Updating view...');
        await pool.query(`DROP VIEW IF EXISTS cocoa_london_daily_changes`);
        await pool.query(`
            CREATE VIEW cocoa_london_daily_changes AS
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
                daily_valid_delta,
                daily_total_delta
            FROM cocoa_london_bags;
        `);
        console.log('Done DB structure!');

        // Truncate and re-sync to get the latest data correctly filled
        console.log('Clearing table for re-sync...');
        await pool.query('TRUNCATE TABLE cocoa_london_bags CASCADE;');
        await syncCocoaLondon();

    } catch (err) {
        console.error('Error:', err.message);
    }
    process.exit(0);
})();
