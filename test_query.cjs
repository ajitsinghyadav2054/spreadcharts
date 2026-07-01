const { Pool } = require('pg');
const pool = new Pool({
    connectionString: "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require",
});
async function test() {
    try {
        const query = `
            SELECT TO_CHAR(trade_date, 'YYYY-MM-DD') as date, origin, age_category, total_mt, sdu_ldu_mt, bdu_mt 
            FROM cocoa_london_origin_stock
            WHERE age_category = $1
            ORDER BY trade_date ASC;
        `;
        const { rows } = await pool.query(query, ['TOTAL Valid']);
        console.log("SUCCESS:", rows.length);
    } catch (err) {
        console.error("ERROR from Postgres:", err.message);
    }
    await pool.end();
}
test();
