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
    if (!fs.existsSync(filePath)) return 0;

    const updates = [];

    await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv({
                mapHeaders: ({ header }) => header.trim().replace(/^\ufeff/, '')
            }))
            .on('data', (row) => {
                const normalizedRow = {};
                Object.keys(row).forEach(k => normalizedRow[k.trim()] = row[k]);

                const marketKey = Object.keys(normalizedRow).find(k => k.toLowerCase().includes('market_and_exchange_names'));
                if (!marketKey || (normalizedRow[marketKey] || '').trim() !== marketName) return;

                const dateKey = Object.keys(normalizedRow).find(k =>
                    k.toLowerCase().includes('as_of_date_in_form_yymmdd') ||
                    k.toLowerCase().includes('report_date_as_mm_dd_yyyy')
                );

                const dateVal = normalizedRow[dateKey];
                if (!dateVal) return;

                const cleanDate = dateVal.trim();
                let dateStr = null;

                if (cleanDate.length === 6 && !cleanDate.includes('/')) {
                    const yy = cleanDate.substring(0, 2);
                    const mm = cleanDate.substring(2, 4);
                    const dd = cleanDate.substring(4, 6);
                    dateStr = `${2000 + parseInt(yy)}-${mm}-${dd}`;
                } else if (cleanDate.includes('/')) {
                    const parts = cleanDate.split('/');
                    if (parts.length === 3) {
                        let y = parseInt(parts[2]);
                        if (y < 100) y += 2000;
                        dateStr = `${y}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
                    }
                }

                if (dateStr) {
                    updates.push({ date: dateStr, data: normalizedRow });
                }
            })
            .on('end', resolve)
            .on('error', reject);
    });

    let count = 0;
    for (const update of updates) {
        const cols = ['as_of_date_in_form_yymmdd', 'market_and_exchange_names'];
        const vals = [update.date, marketName];

        for (const [csvHeader, dbCol] of Object.entries(COMPLETE_COLUMN_MAPPING)) {
            const rowKey = Object.keys(update.data).find(k => k.toLowerCase() === csvHeader.toLowerCase());
            let val = update.data[rowKey];
            if (val === undefined || val === null || val === '') val = null;
            else if (csvHeader === 'Report_Date_as_MM_DD_YYYY' && val.includes('/')) {
                const parts = val.split('/');
                if (parts.length === 3) val = `${2000 + parseInt(parts[2])}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
            } else val = val.replace(/,/g, '').trim();

            cols.push(dbCol);
            vals.push(val);
        }

        const placeholders = vals.map((_, i) => `$${i + 1}`);
        const query = `INSERT INTO ${tableName} (${cols.join(',')}) VALUES (${placeholders.join(',')})`;

        try {
            await client.query(query, vals);
            count++;
        } catch (e) {
            // Ignore errors (duplicate key etc if any)
        }
    }
    return count;
}

async function main() {
    try {
        await client.connect();

        // CSV Files: 2025 (f_year), 2006-24 (history), 2026.
        const files = [
            '../src/data/cftc/f_year.csv', // 2025 source
            '../2006-15.csv',
            '../csvs/2016.csv', '../csvs/2017.csv', '../csvs/2018.csv', '../csvs/2019.csv',
            '../csvs/2020.csv', '../csvs/2021.csv', '../csvs/2022.csv', '../csvs/2023.csv',
            '../csvs/2024.csv',
            '../csvs/2026.csv'
        ];

        for (const config of TABLES_TO_PROCESS) {
            console.log(`\n=== PURGING & REBUILDING ${config.tableName} ===`);

            // 1. TRUNCATE
            await client.query(`TRUNCATE TABLE ${config.tableName}`);
            console.log(`Truncated table.`);

            // 2. IMPORT ALL
            let total = 0;
            for (const f of files) {
                const c = await processFile(path.join(__dirname, f), config);
                total += c;
                process.stdout.write(`Imported ${c} rows from ${path.basename(f)}\n`);
            }
            console.log(`Total rows in ${config.tableName}: ${total}`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

main();
