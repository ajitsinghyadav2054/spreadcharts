const { Client } = require('pg');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

async function main() {
    try {
        await client.connect();
        console.log("Connected. Querying...");

        // Select dates of null rows
        // Cast date to text to ensure we see it
        const res = await client.query(`
        SELECT as_of_date_in_form_yymmdd::text, market_and_exchange_names 
        FROM cocoa 
        WHERE market_and_exchange_names ILIKE '%COCOA%' 
        AND open_interest_all IS NULL 
        LIMIT 10
    `);

        console.log(`Found ${res.rows.length} NULL rows.`);
        res.rows.forEach(r => console.log(JSON.stringify(r)));

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
        console.log("Done.");
    }
}

main();
