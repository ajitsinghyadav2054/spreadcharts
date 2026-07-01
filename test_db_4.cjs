const { Pool } = require('pg');
const pool = new Pool({
    connectionString: "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require",
});
async function test() {
    try {
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'cocoa_us_bags'
        `);
        console.log("Columns us:", res.rows.map(r => r.column_name));
    } catch (err) {
        console.error(err);
    }

    try {
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'cocoa_us_daily_changes'
        `);
        console.log("Columns us daily:", res.rows.map(r => r.column_name));
    } catch (err) {
        console.error(err);
    }

    try {
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'cocoa_london_daily_changes'
        `);
        console.log("Columns london daily:", res.rows.map(r => r.column_name));
    } catch (err) {
        console.error(err);
    }

    await pool.end();
}
test();
