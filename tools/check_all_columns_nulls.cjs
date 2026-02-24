const { Client } = require('pg');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

async function main() {
    try {
        await client.connect();

        console.log('=== CHECKING ALL COLUMNS FOR NULLS IN COCOA ===');

        // Get column names
        const colRes = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'cocoa'
        ORDER BY ordinal_position
    `);

        const columns = colRes.rows.map(r => r.column_name);
        console.log(`Total columns: ${columns.length}`);
        console.log('Columns:', columns.join(', '));

        // Check for nulls in each column
        console.log('\n=== NULL COUNT PER COLUMN ===');
        for (const col of columns) {
            const res = await client.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(${col}) as non_null,
                COUNT(*) - COUNT(${col}) as null_count
            FROM cocoa
        `);
            const nullCount = parseInt(res.rows[0].null_count);
            if (nullCount > 0) {
                console.log(`${col}: ${nullCount} nulls`);
            }
        }

        console.log('\n=== SAMPLE ROW WITH ALL COLUMNS ===');
        const sample = await client.query(`SELECT * FROM cocoa LIMIT 1`);
        console.log('Column count:', Object.keys(sample.rows[0]).length);

        // Show which columns are null
        const row = sample.rows[0];
        const nullCols = Object.keys(row).filter(k => row[k] === null);
        console.log('Null columns in sample row:', nullCols.length > 0 ? nullCols : 'NONE');

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

main();
