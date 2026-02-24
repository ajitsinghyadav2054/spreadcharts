const fs = require('fs');
const csv = require('csv-parser');
const { Client } = require('pg');
const path = require('path');
const { COMPLETE_COLUMN_MAPPING } = require('./complete_column_mapping.cjs');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

const TABLES_TO_PROCESS = [
    { tableName: 'coffee_c', marketName: 'COFFEE C - ICE FUTURES U.S.' },
    { tableName: 'cotton_no_2', marketName: 'COTTON NO. 2 - ICE FUTURES U.S.' },
    { tableName: 'sugar_no_11', marketName: 'SUGAR NO. 11 - ICE FUTURES U.S.' }
];

async function processFile(filePath, tableConfig) {
    const { tableName, marketName } = tableConfig;
    const fileName = path.basename(filePath);

    if (!fs.existsSync(filePath)) {
        console.log(`Skipping missing file: ${fileName}`);
        return 0;
    }

    console.log(`\nProcessing ${fileName} for ${tableName}...`);

    // Check if it's the 2006-15 file (needs special handling)
    const isOldFile = fileName.includes('2006-15.csv');

    const updates = [];

    await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv({
                mapHeaders: ({ header }) => header.trim().replace(/^\ufeff/, '')
            }))
            .on('data', (row) => {
                // Normalize row keys
                const normalizedRow = {};
                Object.keys(row).forEach(k => {
                    normalizedRow[k.trim()] = row[k];
                });

                // Find market key
                const marketKey = Object.keys(normalizedRow).find(k => k.toLowerCase().includes('market_and_exchange_names'));
                if (!marketKey) return;

                if (normalizedRow[marketKey] && normalizedRow[marketKey].trim() === marketName) {
                    // Find date key
                    const dateKey = Object.keys(normalizedRow).find(k =>
                        k.toLowerCase().includes('as_of_date_in_form_yymmdd') ||
                        k.toLowerCase().includes('report_date_as_mm_dd_yyyy')
                    );

                    const dateVal = normalizedRow[dateKey];
                    if (!dateVal) return;

                    const cleanDate = dateVal.trim();
                    let dateStr = null;

                    // Format: YYMMDD
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
                            data: normalizedRow
                        });
                    }
                }
            })
            .on('end', resolve)
            .on('error', reject);
    });

    console.log(`Found ${updates.length} rows to insert.`);

    let insertCount = 0;

    for (const update of updates) {
        const cols = [];
        const placeholders = [];
        const values = [];
        let i = 1;

        cols.push('as_of_date_in_form_yymmdd');
        placeholders.push(`$${i++}`);
        values.push(update.date);

        cols.push('market_and_exchange_names');
        placeholders.push(`$${i++}`);
        values.push(marketName);

        for (const [csvHeader, dbCol] of Object.entries(COMPLETE_COLUMN_MAPPING)) {
            // Fuzzy match header
            const rowKey = Object.keys(update.data).find(k => k.toLowerCase() === csvHeader.toLowerCase());
            let val = update.data[rowKey];

            if (val === undefined || val === null || val === '') {
                val = null;
            } else {
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
            INSERT INTO ${tableName} (${cols.join(', ')})
            VALUES (${placeholders.join(', ')})
            ON CONFLICT (market_and_exchange_names, as_of_date_in_form_yymmdd) 
            DO NOTHING
        `;

        // Since we know schema might flag missing unique constraint errors, we'll try/catch
        try {
            const res = await client.query(query, values);
            insertCount += res.rowCount;
            if (insertCount % 50 === 0) process.stdout.write('.');
        } catch (e) {
            // If ON CONFLICT fails due to missing constraint, try simple INSERT
            if (e.code === '42P10') { // invalid_on_conflict
                try {
                    // Check existence first
                    const check = await client.query(`
                        SELECT 1 FROM ${tableName} 
                        WHERE market_and_exchange_names = $1 
                        AND as_of_date_in_form_yymmdd = $2::date
                    `, [marketName, update.date]);

                    if (check.rowCount === 0) {
                        const simpleQuery = `
                            INSERT INTO ${tableName} (${cols.join(', ')})
                            VALUES (${placeholders.join(', ')})
                        `;
                        const res = await client.query(simpleQuery, values);
                        insertCount += res.rowCount;
                        if (insertCount % 50 === 0) process.stdout.write('.');
                    }
                } catch (innerE) {
                    if (insertCount < 5) console.error(`Insert error (retry): ${innerE.message}`);
                }
            } else {
                if (insertCount < 5) console.error(`Insert error: ${e.message}`);
            }
        }
    }

    console.log(`\n✓ Inserted ${insertCount} rows into ${tableName}.`);
    return insertCount;
}

async function main() {
    try {
        await client.connect();
        console.log('Connected to database.');

        const files = [
            '../2006-15.csv',
            '../csvs/2016.csv',
            '../csvs/2017.csv',
            '../csvs/2018.csv',
            '../csvs/2019.csv',
            '../csvs/2020.csv',
            '../csvs/2021.csv',
            '../csvs/2022.csv',
            '../csvs/2023.csv',
            '../csvs/2024.csv',
            '../src/data/cftc/f_year.csv' // 2025
        ];

        for (const tableConfig of TABLES_TO_PROCESS) {
            console.log(`\n\n==================================================`);
            console.log(`PROCESSING ${tableConfig.tableName.toUpperCase()}`);
            console.log(`==================================================`);

            for (const file of files) {
                await processFile(path.join(__dirname, file), tableConfig);
            }
        }

    } catch (err) {
        console.error('Fatal error:', err);
    } finally {
        await client.end();
    }
}

main();
