const { Client } = require('pg');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

async function main() {
    try {
        await client.connect();
        // Check various columns for NULL
        const columns = [
            'open_interest_all',
            'prod_merc_positions_long_all',
            'conc_net_le_8_tdr_long_all'
        ];

        for (const col of columns) {
            const res = await client.query(`SELECT count(*) FROM cocoa WHERE ${col} IS NULL`);
            console.log(`${col} NULL count:`, res.rows[0].count);
        }

    } catch (err) {
        console.error("Caught Error:", err);
    } finally {
        await client.end();
    }
}

main();
