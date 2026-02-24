const { Client } = require('pg');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

async function main() {
    try {
        await client.connect();

        console.log('=== CHECKING FOR DUPLICATES IN COFFEE_C ===');

        // Check for duplicate dates
        const res = await client.query(`
        SELECT as_of_date_in_form_yymmdd, COUNT(*) 
        FROM coffee_c 
        GROUP BY as_of_date_in_form_yymmdd 
        HAVING COUNT(*) > 1
        ORDER BY as_of_date_in_form_yymmdd DESC
        LIMIT 10
    `);

        if (res.rows.length > 0) {
            console.log(`Found ${res.rows.length} dates with duplicates! User was right.`);
            res.rows.forEach(r => console.log(`${r.as_of_date_in_form_yymmdd.toISOString().split('T')[0]}: ${r.count} rows`));
        } else {
            console.log('✓ No duplicate dates found. The data is unique.');

            // Count rows by year to see where the bulk is
            const yearCounts = await client.query(`
            SELECT EXTRACT(YEAR FROM as_of_date_in_form_yymmdd) as year, COUNT(*) 
            FROM coffee_c 
            GROUP BY year 
            ORDER BY year
        `);
            console.table(yearCounts.rows);
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

main();
