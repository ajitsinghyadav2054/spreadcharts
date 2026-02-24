const { Client } = require('pg');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

async function main() {
    try {
        await client.connect();

        const res = await client.query(`
        SELECT * FROM cocoa 
        WHERE as_of_date_in_form_yymmdd IS NULL 
        LIMIT 1
    `);
        console.log("Sample NULL date row:");
        console.log(res.rows[0]);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

main();
