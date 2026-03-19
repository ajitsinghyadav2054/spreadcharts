import pool from './server/db.js';
(async () => {
    try {
        const res = await pool.query("SELECT MAX(bremen) as max_b, MIN(bremen) as min_b, MAX(liverpool) as max_liv, MIN(liverpool) as min_liv, MAX(london) as max_lon, MIN(london) as min_lon FROM cocoa_london_bags");
        console.log('Bags:', res.rows[0]);

        const res2 = await pool.query("SELECT MAX(bremen) as max_b, MIN(bremen) as min_b, MAX(liverpool) as max_liv, MIN(liverpool) as min_liv, MAX(london) as max_lon, MIN(london) as min_lon FROM cocoa_london_daily_changes");
        console.log('Daily:', res2.rows[0]);
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
})();
