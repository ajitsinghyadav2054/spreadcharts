const { Client } = require('pg');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

async function main() {
    try {
        await client.connect();

        const res = await client.query(`
        SELECT min(as_of_date_in_form_yymmdd), max(as_of_date_in_form_yymmdd) 
        FROM cocoa 
        WHERE market_and_exchange_names = 'COCOA - ICE FUTURES U.S.'
    `);
        console.log("Date Range:", res.rows[0]);

        // List 5 random dates
        const res2 = await client.query(`
        SELECT as_of_date_in_form_yymmdd 
        FROM cocoa 
        WHERE market_and_exchange_names = 'COCOA - ICE FUTURES U.S.'
        LIMIT 5
    `);
        console.log("Sample dates:", res2.rows.map(r => r.as_of_date_in_form_yymmdd));

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

main();
