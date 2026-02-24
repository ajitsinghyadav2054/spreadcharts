const { Client } = require('pg');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

async function main() {
    try {
        await client.connect();

        const res = await client.query(`
        SELECT market_and_exchange_names, count(*) 
        FROM cocoa 
        WHERE conc_net_le_8_tdr_long_all IS NULL 
        GROUP BY market_and_exchange_names
    `);
        console.log("NULLs by market:");
        console.log(res.rows);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

main();
