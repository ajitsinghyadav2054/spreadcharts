const { Client } = require('pg');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

async function main() {
    try {
        await client.connect();

        console.log('=== ROW COUNT BY YEAR FOR COCOA ===');
        const res = await client.query(`
        SELECT 
            EXTRACT(YEAR FROM as_of_date_in_form_yymmdd) as year,
            COUNT(*) as total_rows
        FROM cocoa
        GROUP BY year
        ORDER BY year
    `);

        console.table(res.rows);

        // Check for nulls in key columns
        console.log('\n=== NULL CHECK FOR KEY COLUMNS ===');
        const nullCheck = await client.query(`
        SELECT 
            COUNT(*) as total_rows,
            COUNT(open_interest_all) as open_interest_all_count,
            COUNT(conc_net_le_8_tdr_long_all) as conc_net_le_8_tdr_long_all_count
        FROM cocoa
    `);
        console.table(nullCheck.rows);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

main();
