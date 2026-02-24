const { Client } = require('pg');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

async function main() {
    try {
        await client.connect();

        const res = await client.query(`
        SELECT EXTRACT(YEAR FROM as_of_date_in_form_yymmdd) as year, count(*) 
        FROM cocoa 
        GROUP BY year 
        ORDER BY year
    `);
        console.log("Year distribution:");
        console.log(res.rows);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

main();
