const fs = require('fs');
const csv = require('csv-parser');
const { Client } = require('pg');
const path = require('path');
const { COMPLETE_COLUMN_MAPPING } = require('./complete_column_mapping.cjs');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

const TABLE_NAME = 'cocoa';
const MARKET_NAME = 'COCOA - ICE FUTURES U.S.';

async function processFile(filePath, year) {
    console.log(`\n=== Processing ${path.basename(filePath)} (${year}) ===`);

    const updates = [];

    await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                if (row['Market_and_Exchange_Names'] && row['Market_and_Exchange_Names'].trim() === MARKET_NAME) {
                    const dateVal = row['As_of_Date_In_Form_YYMMDD'] || row['Report_Date_as_MM_DD_YYYY'];
                    if (!dateVal) return;

                    const cleanDate = dateVal.trim();
                    let dateStr = null;

                    // Format: YYMMDD (e.g., "150825")
                    if (cleanDate.length === 6 && !cleanDate.includes('/')) {
                        const yy = cleanDate.substring(0, 2);
                        const mm = cleanDate.substring(2, 4);
                        const dd = cleanDate.substring(4, 6);
                        const fullYear = 2000 + parseInt(yy);
                        dateStr = `${fullYear}-${mm}-${dd}`;
                    }
                    // Format: MM/DD/YYYY
                    else if (cleanDate.includes('/')) {
                        const parts = cleanDate.split('/');
                        if (parts.length === 3) {
                            let fullYear = parseInt(parts[2]);
                            if (fullYear < 100) fullYear += 2000;
                            dateStr = `${fullYear}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
                        }
                    }

                    if (dateStr) {
                        updates.push({
                            date: dateStr,
                            data: row
                        });
                    }
                }
            })
            .on('end', resolve)
            .on('error', reject);
    });

    console.log(`Found ${updates.length} rows for ${MARKET_NAME}`);

    let insertCount = 0;
    let errorCount = 0;

    for (const update of updates) {
        const cols = [];
        const placeholders = [];
        const values = [];
        let i = 1;

        // Add Date and Market
        cols.push('as_of_date_in_form_yymmdd');
        placeholders.push(`$${i++}`);
        values.push(update.date);

        cols.push('market_and_exchange_names');
        placeholders.push(`$${i++}`);
        values.push(MARKET_NAME);

        // Add ALL columns from the complete mapping
        for (const [csvHeader, dbCol] of Object.entries(COMPLETE_COLUMN_MAPPING)) {
            let val = update.data[csvHeader];

            if (val === undefined || val === null || val === '') {
                val = null;
            } else {
                // Handle date format for Report_Date_as_MM_DD_YYYY
                if (csvHeader === 'Report_Date_as_MM_DD_YYYY' && val.includes('/')) {
                    const parts = val.split('/');
                    if (parts.length === 3) {
                        let fullYear = parseInt(parts[2]);
                        if (fullYear < 100) fullYear += 2000;
                        val = `${fullYear}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
                    }
                } else {
                    val = val.replace(/,/g, '').trim();
                }
            }

            cols.push(dbCol);
            placeholders.push(`$${i++}`);
            values.push(val);
        }

        const query = `
            INSERT INTO ${TABLE_NAME} (${cols.join(', ')})
            VALUES (${placeholders.join(', ')})
        `;

        try {
            const res = await client.query(query, values);
            insertCount += res.rowCount;
            if (insertCount % 50 === 0) process.stdout.write('.');
        } catch (e) {
            errorCount++;
            if (errorCount <= 3) {
                console.error(`\nError inserting row ${update.date}: ${e.message}`);
            }
        }
    }

    console.log(`\n✓ Inserted ${insertCount} rows (${errorCount} errors)`);
    return insertCount;
}

async function main() {
    try {
        await client.connect();
        console.log('Connected to database.');
        console.log(`Target: ${TABLE_NAME} table, ${MARKET_NAME}\n`);

        // List of CSV files to process
        const files = [
            { path: '../2006-15.csv', year: '2006-2015' },
            { path: '../csvs/2016.csv', year: '2016' },
            { path: '../csvs/2017.csv', year: '2017' },
            { path: '../csvs/2018.csv', year: '2018' },
            { path: '../csvs/2019.csv', year: '2019' },
            { path: '../csvs/2020.csv', year: '2020' },
            { path: '../csvs/2021.csv', year: '2021' },
            { path: '../csvs/2022.csv', year: '2022' },
            { path: '../csvs/2023.csv', year: '2023' },
            { path: '../csvs/2024.csv', year: '2024' }
        ];

        let totalInserted = 0;

        for (const file of files) {
            const fullPath = path.join(__dirname, file.path);
            if (fs.existsSync(fullPath)) {
                const count = await processFile(fullPath, file.year);
                totalInserted += count;
            } else {
                console.log(`\n⚠ File not found: ${fullPath}`);
            }
        }

        console.log(`\n${'='.repeat(50)}`);
        console.log(`✓ COMPLETE! Total rows inserted: ${totalInserted}`);
        console.log(`${'='.repeat(50)}`);

    } catch (err) {
        console.error('Fatal error:', err);
    } finally {
        await client.end();
    }
}

main();
