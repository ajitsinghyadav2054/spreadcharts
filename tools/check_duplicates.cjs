const { Client } = require('pg');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

async function main() {
    try {
        await client.connect();

        const res = await client.query(`
        SELECT as_of_date_in_form_yymmdd, count(*) 
        FROM cocoa 
        WHERE market_and_exchange_names = 'COCOA - ICE FUTURES U.S.'
        GROUP BY as_of_date_in_form_yymmdd
        HAVING count(*) > 1
        LIMIT 10
    `);
        console.log("Duplicates by date:");
        console.log(res.rows);

        // Check total rows
        const resTotal = await client.query(`
        SELECT count(*) 
        FROM cocoa 
        WHERE market_and_exchange_names = 'COCOA - ICE FUTURES U.S.'
    `);
        console.log("Total rows:", resTotal.rows[0].count);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

main();
