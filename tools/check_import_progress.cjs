const { Client } = require('pg');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

async function main() {
    try {
        await client.connect();

        // Check row counts for progress
        const res = await client.query(`
        SELECT 
            'coffee_c' as table_name, COUNT(*) as count, MIN(as_of_date_in_form_yymmdd), MAX(as_of_date_in_form_yymmdd) 
        FROM coffee_c
        UNION ALL
        SELECT 
            'cotton_no_2' as table_name, COUNT(*) as count, MIN(as_of_date_in_form_yymmdd), MAX(as_of_date_in_form_yymmdd) 
        FROM cotton_no_2
        UNION ALL
        SELECT 
            'sugar_no_11' as table_name, COUNT(*) as count, MIN(as_of_date_in_form_yymmdd), MAX(as_of_date_in_form_yymmdd) 
        FROM sugar_no_11
    `);

        console.table(res.rows);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

main();
