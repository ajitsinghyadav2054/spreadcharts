const { Client } = require('pg');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

async function main() {
    try {
        await client.connect();

        console.log('=== FIXING COFFEE: DELETING ALL EXCEPT 2025 ===');
        const del = await client.query(`
            DELETE FROM coffee_c 
            WHERE EXTRACT(YEAR FROM as_of_date_in_form_yymmdd) != 2025
        `);
        console.log(`Deleted ${del.rowCount} rows.`);

        const count = await client.query(`SELECT COUNT(*) FROM coffee_c`);
        console.log(`Final count for coffee_c: ${count.rows[0].count} (Should be ~52)`);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

main();
