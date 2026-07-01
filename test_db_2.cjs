const { Pool } = require('pg');

const pool = new Pool({
    connectionString: "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require",
});

async function test() {
    try {
        const { rows } = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'cocoa_london_bags'
        `);
        console.log("Columns:", rows.map(r => r.column_name));
    } catch (err) {
        console.error(err);
    }

    await pool.end();
}
test();
