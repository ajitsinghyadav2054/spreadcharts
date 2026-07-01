const { Pool } = require('pg');

const pool = new Pool({
    connectionString: "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require",
});

async function test() {
    try {
        const { rows } = await pool.query(`SELECT TO_CHAR(date, 'YYYY-MM-DD') as report_date_as_mm_dd_yyyy, * FROM cocoa_london_daily_changes ORDER BY date ASC LIMIT 5`);
        console.log("cocoa_london_daily_changes works:", rows.length);
    } catch (err) {
        console.error("ERROR running cocoa_london_daily_changes:", err.message);
    }

    try {
        const { rows } = await pool.query(`SELECT TO_CHAR(date, 'YYYY-MM-DD') as report_date_as_mm_dd_yyyy, * FROM cocoa_london_bags ORDER BY date ASC LIMIT 5`);
        console.log("cocoa_london_bags works:", rows.length);
    } catch (err) {
        console.error("ERROR running cocoa_london_bags:", err.message);
    }

    await pool.end();
}
test();
