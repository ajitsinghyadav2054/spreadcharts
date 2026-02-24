const { Client } = require('pg');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

async function main() {
    try {
        await client.connect();

        // Check Cotton status
        const res = await client.query(`
        SELECT 
            'cotton_no_2' as table, 
            COUNT(*) as total_rows,
            MIN(EXTRACT(YEAR FROM as_of_date_in_form_yymmdd)) as min_year,
            MAX(EXTRACT(YEAR FROM as_of_date_in_form_yymmdd)) as max_year
        FROM cotton_no_2
    `);

        console.table(res.rows);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

main();
