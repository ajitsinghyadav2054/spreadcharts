const { Client } = require('pg');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

async function main() {
    try {
        await client.connect();

        console.log("Deleting data for years other than 2025...");

        const res = await client.query(`
        DELETE FROM cocoa 
        WHERE EXTRACT(YEAR FROM as_of_date_in_form_yymmdd) != 2025
    `);

        console.log(`Deleted ${res.rowCount} rows.`);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

main();
