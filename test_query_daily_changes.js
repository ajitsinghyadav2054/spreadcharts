import pool from './server/db.js';

async function test() {
    try {
        const a = await pool.query("SELECT COUNT(*) as count FROM cocoa_us_daily_changes WHERE total_bags > 100000");
        console.log("Daily changes > 100k count: ", a.rows);
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
test();
