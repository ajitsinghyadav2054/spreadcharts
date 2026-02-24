const { Client } = require('pg');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

async function main() {
    try {
        await client.connect();

        console.log('=== FINAL DATABASE STATUS REPORT ===\n');

        const tables = ['cocoa', 'coffee_c', 'cotton_no_2', 'sugar_no_11'];

        for (const table of tables) {
            // Count and Range
            const res = await client.query(`
                SELECT 
                    COUNT(*) as total_rows,
                    MIN(EXTRACT(YEAR FROM as_of_date_in_form_yymmdd)) as min_year,
                    MAX(EXTRACT(YEAR FROM as_of_date_in_form_yymmdd)) as max_year
                FROM ${table}
            `);

            // Check 2026 nulls in a key mapped column (e.g. Conc_Net_LE_8_TDR_Long_All)
            const nullCheck = await client.query(`
                SELECT COUNT(*) as null_count
                FROM ${table}
                WHERE EXTRACT(YEAR FROM as_of_date_in_form_yymmdd) = 2026
                AND conc_net_le_8_tdr_long_all IS NULL
            `);

            console.log(`${table.toUpperCase()}:`);
            console.log(`  Total Rows: ${res.rows[0].total_rows}`);
            console.log(`  Year Range: ${res.rows[0].min_year} - ${res.rows[0].max_year}`);
            console.log(`  Nulls in 2026 (Concentration Cols): ${nullCheck.rows[0].null_count}`);
            console.log('-----------------------------------');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

main();
