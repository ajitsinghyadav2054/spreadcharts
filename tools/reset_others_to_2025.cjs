const fs = require('fs');
const csv = require('csv-parser');
const { Client } = require('pg');
const path = require('path');
const { COMPLETE_COLUMN_MAPPING } = require('./complete_column_mapping.cjs');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

const TABLES = [
    { tableName: 'coffee_c', marketName: 'COFFEE C - ICE FUTURES U.S.' },
    { tableName: 'cotton_no_2', marketName: 'COTTON NO. 2 - ICE FUTURES U.S.' },
    { tableName: 'sugar_no_11', marketName: 'SUGAR NO. 11 - ICE FUTURES U.S.' }
];

const SOURCE_2025 = path.join(__dirname, '..', 'src', 'data', 'cftc', 'f_year.csv');

async function import2025Only(config) {
    const { tableName, marketName } = config;
    console.log(`\n=== RESETTING ${tableName} TO 2025 DATA ONLY ===`);

    // 1. Clear the table
    await client.query(`TRUNCATE TABLE ${tableName}`);
    console.log(`Table truncated (all data removed).`);

    // 2. Import *only* 2025
    const updates = [];

    await new Promise((resolve, reject) => {
        fs.createReadStream(SOURCE_2025)
            .pipe(csv({
                mapHeaders: ({ header }) => header.trim().replace(/^\ufeff/, '')
            }))
            .on('data', (row) => {
                const normalizedRow = {};
                Object.keys(row).forEach(k => normalizedRow[k.trim()] = row[k]);

                // Match Market
                const marketKey = Object.keys(normalizedRow).find(k => k.toLowerCase().includes('market_and_exchange_names'));
                if (!marketKey || (normalizedRow[marketKey] || '').trim() !== marketName) return;

                // Match Date
                const dateKey = Object.keys(normalizedRow).find(k => k.toLowerCase().includes('as_of_date_in_form_yymmdd'));
                const dateVal = normalizedRow[dateKey];
                if (!dateVal) return;

                // Parse date
                const cleanDate = dateVal.trim();
                let dateStr = null;
                if (cleanDate.length === 6) {
                    const yy = cleanDate.substring(0, 2);
                    const mm = cleanDate.substring(2, 4);
                    const dd = cleanDate.substring(4, 6);
                    dateStr = `${2000 + parseInt(yy)}-${mm}-${dd}`;
                }

                if (dateStr) {
                    updates.push({ date: dateStr, data: normalizedRow });
                }
            })
            .on('end', resolve)
            .on('error', reject);
    });

    console.log(`Found ${updates.length} rows for 2025.`);

    let inserted = 0;
    for (const update of updates) {
        const cols = [];
        const placeholders = [];
        const values = [];
        let i = 1;

        // Manual Map Date & Market
        cols.push('as_of_date_in_form_yymmdd');
        placeholders.push(`$${i++}`);
        values.push(update.date);

        cols.push('market_and_exchange_names');
        placeholders.push(`$${i++}`);
        values.push(marketName);

        // Map other columns
        for (const [csvHeader, dbCol] of Object.entries(COMPLETE_COLUMN_MAPPING)) {
            const rowKey = Object.keys(update.data).find(k => k.toLowerCase() === csvHeader.toLowerCase());
            let val = update.data[rowKey];

            if (val === undefined || val === null || val === '') val = null;
            else val = val.replace(/,/g, '').trim();

            cols.push(dbCol);
            placeholders.push(`$${i++}`);
            values.push(val);
        }

        const query = `INSERT INTO ${tableName} (${cols.join(',')}) VALUES (${placeholders.join(',')})`;
        await client.query(query, values);
        inserted++;
    }

    console.log(`✓ successfully restored ${inserted} rows for 2025.`);
}

async function main() {
    try {
        await client.connect();

        for (const t of TABLES) {
            await import2025Only(t);
        }

        console.log('\n=== FINAL ROW COUNTS ===');
        for (const t of TABLES) {
            const res = await client.query(`SELECT COUNT(*) FROM ${t.tableName}`);
            console.log(`${t.tableName}: ${res.rows[0].count} rows`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

main();
