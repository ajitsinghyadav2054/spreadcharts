const { Client } = require('pg');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

async function main() {
    try {
        await client.connect();

        console.log('=== CLEANING SUGAR_NO_11: DELETING ALL EXCEPT 2025 ===');
        const del = await client.query(`
            DELETE FROM sugar_no_11 
            WHERE EXTRACT(YEAR FROM as_of_date_in_form_yymmdd) != 2025
        `);
        console.log(`Deleted ${del.rowCount} rows.`);

        const count = await client.query(`SELECT COUNT(*) FROM sugar_no_11`);
        console.log(`Final count for sugar_no_11: ${count.rows[0].count} (Should be ~52)`);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

main();
