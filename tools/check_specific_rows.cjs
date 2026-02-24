const { Client } = require('pg');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

async function main() {
    try {
        await client.connect();

        console.log('=== CHECKING LAST 10 ROWS OF COCOA ===');
        const res = await client.query(`
        SELECT 
            id,
            as_of_date_in_form_yymmdd,
            open_interest_all,
            prod_merc_positions_long_all,
            swap_positions_long_all,
            conc_net_le_8_tdr_long_all
        FROM cocoa
        ORDER BY id DESC
        LIMIT 10
    `);

        res.rows.forEach((row, idx) => {
            const hasNulls = Object.values(row).some(v => v === null);
            console.log(`Row ${idx + 1} (ID: ${row.id}): ${hasNulls ? 'HAS NULLS' : 'OK'}`);
            if (hasNulls) {
                console.log(row);
            }
        });

        console.log('\n=== ROWS 54-57 BY ID ===');
        // Get rows with IDs around the 54-57 range
        const res2 = await client.query(`
        SELECT * FROM cocoa ORDER BY id LIMIT 10 OFFSET 47
    `);
        console.log(`Found ${res2.rows.length} rows`);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

main();
