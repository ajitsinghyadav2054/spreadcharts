const { Pool } = require('pg');

const pool = new Pool({
    connectionString: "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require",
});

async function test() {
    try {
        const query1 = `SELECT TO_CHAR(trade_date, 'YYYY-MM-DD') as report_date_as_mm_dd_yyyy, * FROM cocoa_london_bags ORDER BY trade_date ASC LIMIT 1;`;
        console.log("Testing:", query1);
        const res1 = await pool.query(query1);
        console.log("Res:", res1.rows);
    } catch (err) {
        console.error("Query 1 Error:", err.message);
    }

    try {
        const query2 = `SELECT TO_CHAR(trade_date, 'YYYY-MM-DD') as report_date_as_mm_dd_yyyy, * FROM cocoa_us_bags ORDER BY trade_date ASC LIMIT 1;`;
        console.log("Testing:", query2);
        const res2 = await pool.query(query2);
        console.log("Res:", res2.rows);
    } catch (err) {
        console.error("Query 2 Error:", err.message);
    }
    await pool.end();
}
test();
