const { Client } = require('pg');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

async function main() {
    try {
        await client.connect();
        const res = await client.query(`
            SELECT MAX(as_of_date_in_form_yymmdd) as max_date FROM cocoa
        `);
        console.log(`Latest Cocoa Date: ${res.rows[0].max_date}`);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

main();
