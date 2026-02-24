const fs = require('fs');
const csv = require('csv-parser');
const { Client } = require('pg');
const path = require('path');
const { COMPLETE_COLUMN_MAPPING } = require('./complete_column_mapping.cjs');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

const TABLE_NAME = 'coffee_c';
const MARKET_NAME = 'COFFEE C - ICE FUTURES U.S.';

async function processFile(filePath) {
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
                if (!marketKey || (normalizedRow[marketKey] || '').trim() !== MARKET_NAME) return;

                const dateKey = Object.keys(normalizedRow).find(k => k.toLowerCase().includes('as_of_date_in_form_yymmdd') || k.toLowerCase().includes('report_date_as_mm_dd_yyyy'));
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

                if (dateStr && !dateStr.startsWith('2025')) {
                    updates.push({ date: dateStr, data: normalizedRow });
                }
            })
            .on('end', resolve)
            .on('error', reject);
    });

    let count = 0;
    for (const update of updates) {
        const cols = ['as_of_date_in_form_yymmdd', 'market_and_exchange_names'];
        const vals = [update.date, MARKET_NAME];
        let p = 3;

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
        const query = `INSERT INTO ${TABLE_NAME} (${cols.join(',')}) VALUES (${placeholders.join(',')})`;

        try {
            await client.query(query, vals);
            count++;
        } catch (e) {
            if (count < 1) console.error(e.message);
        }
    }
    return count;
}

async function main() {
    try {
        await client.connect();

        // 1. DELETE non-2025
        console.log(`Deleting non-2025 data from ${TABLE_NAME}...`);
        const del = await client.query(`DELETE FROM ${TABLE_NAME} WHERE EXTRACT(YEAR FROM as_of_date_in_form_yymmdd) != 2025`);
        console.log(`Deleted ${del.rowCount} rows.`);

        // Verify count
        const verify = await client.query(`SELECT COUNT(*) FROM ${TABLE_NAME}`);
        console.log(`Rows remaining (should be ~52): ${verify.rows[0].count}`);

        // 2. IMPORT
        const files = [
            '../2006-15.csv',
            '../csvs/2016.csv', '../csvs/2017.csv', '../csvs/2018.csv', '../csvs/2019.csv',
            '../csvs/2020.csv', '../csvs/2021.csv', '../csvs/2022.csv', '../csvs/2023.csv',
            '../csvs/2024.csv', '../csvs/2026.csv'
        ];

        let total = 0;
        for (const f of files) {
            console.log(`Processing ${f}...`);
            total += await processFile(path.join(__dirname, f));
        }
        console.log(`Total inserted: ${total}`);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

main();
