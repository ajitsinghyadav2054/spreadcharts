const { Client } = require('pg');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

async function main() {
    try {
        await client.connect();

        const targetDate = '2015-08-25';
        const targetMarket = 'COCOA - ICE FUTURES U.S.';

        console.log(`Checking for Date: ${targetDate}, Market: "${targetMarket}"`);

        // Check if row exists
        const res = await client.query(`
        SELECT * FROM cocoa 
        WHERE market_and_exchange_names = $1
        AND as_of_date_in_form_yymmdd = $2::date
    `, [targetMarket, targetDate]);

        if (res.rows.length === 0) {
            console.log("No match found.");

            // Check date only
            const resDate = await client.query(`
            SELECT count(*) FROM cocoa 
            WHERE as_of_date_in_form_yymmdd = $1::date
        `, [targetDate]);
            console.log(`Rows with date ${targetDate}: ${resDate.rows[0].count}`);

            // Check market only
            const resMarket = await client.query(`
            SELECT count(*) FROM cocoa 
            WHERE market_and_exchange_names = $1
        `, [targetMarket]);
            console.log(`Rows with market "${targetMarket}": ${resMarket.rows[0].count}`);

            // Check fuzzy date
            // Maybe DB has 2015-08-25 00:00:00 or something? But it's date type.

        } else {
            console.log("Match found!", res.rows[0]);
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

main();
