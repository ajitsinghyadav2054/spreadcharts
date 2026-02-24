const { Client } = require('pg');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

async function main() {
    try {
        await client.connect();

        console.log('=== CHECKING 2026 DATA FOR NULLS IN COCOA ===\n');

        // Get column names
        const colRes = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'cocoa'
        AND column_name NOT IN ('id', 'market_and_exchange_names', 'as_of_date_in_form_yymmdd')
        ORDER BY ordinal_position
    `);

        const columns = colRes.rows.map(r => r.column_name);

        // Check for nulls in 2026 data only
        let nullColumns = [];
        for (const col of columns) {
            const res = await client.query(`
            SELECT COUNT(*) - COUNT(${col}) as null_count
            FROM cocoa
            WHERE EXTRACT(YEAR FROM as_of_date_in_form_yymmdd) = 2026
        `);
            const nullCount = parseInt(res.rows[0].null_count);
            if (nullCount > 0) {
                nullColumns.push({ column: col, nulls: nullCount });
            }
        }

        if (nullColumns.length === 0) {
            console.log('✓ NO NULL VALUES FOUND IN 2026 DATA!');
        } else {
            console.log(`Found ${nullColumns.length} columns with nulls:`);
            nullColumns.forEach(c => console.log(`  - ${c.column}: ${c.nulls} nulls`));
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

main();
