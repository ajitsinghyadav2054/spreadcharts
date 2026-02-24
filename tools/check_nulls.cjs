const { Client } = require('pg');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

async function main() {
    try {
        await client.connect();
        const res = await client.query("SELECT * FROM cocoa WHERE market_and_exchange_names LIKE '%COCOA%' AND open_interest_all IS NULL LIMIT 1");
        if (res.rows.length === 0) {
            console.log("No NULL rows found for COCOA.");
        } else {
            console.log("Found NULL row:", res.rows[0]);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

main();
