const { Client } = require('pg');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

async function main() {
    try {
        await client.connect();

        console.log("Updating NULL dates from report_date...");

        const res = await client.query(`
        UPDATE cocoa 
        SET as_of_date_in_form_yymmdd = report_date_as_mm_dd_yyyy 
        WHERE as_of_date_in_form_yymmdd IS NULL 
        AND report_date_as_mm_dd_yyyy IS NOT NULL
    `);

        console.log(`Updated ${res.rowCount} rows.`);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

main();
