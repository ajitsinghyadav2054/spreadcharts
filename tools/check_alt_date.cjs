const { Client } = require('pg');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

async function main() {
    try {
        await client.connect();

        // Check report_date for rows with null as_of_date
        const res = await client.query(`
        SELECT report_date_as_mm_dd_yyyy, as_of_date_in_form_yymmdd 
        FROM cocoa 
        WHERE as_of_date_in_form_yymmdd IS NULL 
        LIMIT 5
    `);
        console.log("Dates:");
        console.log(res.rows);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

main();
