const { Client } = require('pg');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

async function main() {
    try {
        await client.connect();

        const tables = ['cocoa', 'coffee_c', 'cotton_no_2', 'sugar_no_11'];

        for (const table of tables) {
            console.log(`\n=== ${table.toUpperCase()} ===`);

            // Check for nulls in key columns
            const res = await client.query(`
            SELECT 
                COUNT(*) as total_rows,
                COUNT(conc_net_le_8_tdr_long_all) as non_null_conc,
                COUNT(*) - COUNT(conc_net_le_8_tdr_long_all) as null_conc
            FROM ${table}
            WHERE EXTRACT(YEAR FROM as_of_date_in_form_yymmdd) = 2026
        `);
            console.log('2026 Data:', res.rows[0]);

            // Show a sample row
            const sample = await client.query(`
            SELECT 
                as_of_date_in_form_yymmdd,
                open_interest_all,
                conc_net_le_8_tdr_long_all,
                conc_net_le_8_tdr_short_all
            FROM ${table}
            WHERE EXTRACT(YEAR FROM as_of_date_in_form_yymmdd) = 2026
            LIMIT 1
        `);
            console.log('Sample row:', sample.rows[0]);
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

main();
