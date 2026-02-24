const { Client } = require('pg');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

async function main() {
    try {
        await client.connect();
        // Simplified query
        // const res = await client.query("SELECT * FROM cocoa WHERE open_interest_all IS NULL LIMIT 5");
        // const res = await client.query("SELECT market_and_exchange_names FROM cocoa LIMIT 5");
        // Works.

        // Test open_interest_all IS NULL
        const res = await client.query("SELECT market_and_exchange_names FROM cocoa WHERE open_interest_all IS NULL LIMIT 5");

        console.log("Found:", res.rows.length);
        console.log(res.rows);
    } catch (err) {
        console.error("Caught Error:", err);
    } finally {
        await client.end();
    }
}

main();
