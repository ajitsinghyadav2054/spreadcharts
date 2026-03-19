import pool from './server/db.js';

(async () => {
    try {
        const res = await pool.query(`SELECT DISTINCT trade_date FROM cocoa_london_origin_stock ORDER BY trade_date ASC;`);
        console.log(res.rows.map(r => r.trade_date));
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
})();
