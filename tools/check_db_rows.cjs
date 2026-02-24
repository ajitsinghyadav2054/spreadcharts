const { Client } = require('pg');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

async function main() {
    try {
        await client.connect();

        // Check cocoa table for all rows
        console.log('=== COCOA TABLE - ALL ROWS ===');
        const res = await client.query(`
        SELECT 
            id,
            as_of_date_in_form_yymmdd,
            market_and_exchange_names,
            open_interest_all,
            conc_net_le_8_tdr_long_all,
            conc_net_le_8_tdr_short_all,
            prod_merc_positions_long_all,
            swap_positions_long_all
        FROM cocoa
        ORDER BY as_of_date_in_form_yymmdd DESC
        LIMIT 10
    `);

        console.log(`Total rows returned: ${res.rows.length}`);
        res.rows.forEach((row, idx) => {
            console.log(`\nRow ${idx + 1}:`);
            console.log(row);
        });

        // Count nulls
        const nullCheck = await client.query(`
        SELECT 
            COUNT(*) as total,
            COUNT(open_interest_all) as has_open_interest,
            COUNT(conc_net_le_8_tdr_long_all) as has_conc_long,
            COUNT(prod_merc_positions_long_all) as has_prod_merc
        FROM cocoa
    `);
        console.log('\n=== NULL COUNT ===');
        console.log(nullCheck.rows[0]);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

main();
