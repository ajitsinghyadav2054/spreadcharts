const { Pool } = require('pg');
const pool = new Pool({
    connectionString: "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require",
});
async function test() {
    try {
        const res = await pool.query(`SELECT DISTINCT age_category FROM cocoa_london_origin_stock ORDER BY age_category`);
        console.log("age_categories:", res.rows.map(r => r.age_category));
        const res2 = await pool.query(`SELECT DISTINCT origin FROM cocoa_london_origin_stock ORDER BY origin`);
        console.log("origins:", res2.rows.map(r => r.origin));
    } catch (err) { console.error(err.message); }
    await pool.end();
}
test();
