const { Client } = require('pg');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

async function main() {
    try {
        await client.connect();

        console.log('=== ROW COUNT BY TABLE ===');
        const tables = ['cocoa', 'coffee_c', 'cotton_no_2', 'sugar_no_11'];

        for (const table of tables) {
            const res = await client.query(`
            SELECT 
                COUNT(*) as total,
                MIN(as_of_date_in_form_yymmdd) as min_date,
                MAX(as_of_date_in_form_yymmdd) as max_date
            FROM ${table}
        `);
            console.log(`${table}:`, res.rows[0]);
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

main();
