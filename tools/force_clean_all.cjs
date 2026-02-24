const { Client } = require('pg');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

async function cleanTable(tableName) {
    console.log(`\n=== Cleaning ${tableName} ===`);

    // 1. Delete non-2025
    const del = await client.query(`
        DELETE FROM ${tableName} 
        WHERE EXTRACT(YEAR FROM as_of_date_in_form_yymmdd) != 2025
    `);
    console.log(`Deleted ${del.rowCount} non-2025 rows.`);

    // 2. Remove duplicates in 2025 (keep only one per date)
    // We use ctid to identify duplicate rows
    const dedup = await client.query(`
        DELETE FROM ${tableName} a USING (
            SELECT MIN(ctid) as ctid, as_of_date_in_form_yymmdd
            FROM ${tableName} 
            WHERE EXTRACT(YEAR FROM as_of_date_in_form_yymmdd) = 2025
            GROUP BY as_of_date_in_form_yymmdd HAVING COUNT(*) > 1
        ) b
        WHERE a.as_of_date_in_form_yymmdd = b.as_of_date_in_form_yymmdd 
        AND a.ctid <> b.ctid
    `);
    console.log(`Deleted ${dedup.rowCount} duplicate 2025 rows.`);

    // 3. Verify count
    const res = await client.query(`SELECT COUNT(*) FROM ${tableName}`);
    console.log(`Final Row Count: ${res.rows[0].count} (Should be ~52)`);
}

async function main() {
    try {
        await client.connect();

        await cleanTable('coffee_c');
        await cleanTable('cotton_no_2');
        await cleanTable('sugar_no_11');

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

main();
