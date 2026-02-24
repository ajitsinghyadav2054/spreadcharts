const fs = require('fs');
const csv = require('csv-parser');
const { Client } = require('pg');
const path = require('path');
const { COMPLETE_COLUMN_MAPPING } = require('./complete_column_mapping.cjs');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

const HISTORICAL_MAPPINGS = [
    {
        oldName: 'COCOA - NEW YORK BOARD OF TRADE',
        targetTable: 'cocoa',
        targetMarketName: 'COCOA - ICE FUTURES U.S.'
    },
    {
        oldName: 'COFFEE C - NEW YORK BOARD OF TRADE',
        targetTable: 'coffee_c',
        targetMarketName: 'COFFEE C - ICE FUTURES U.S.'
    },
    {
        oldName: 'COTTON NO. 2 - NEW YORK BOARD OF TRADE',
        targetTable: 'cotton_no_2',
        targetMarketName: 'COTTON NO. 2 - ICE FUTURES U.S.'
    },
    {
        oldName: 'SUGAR NO. 11 - NEW YORK BOARD OF TRADE',
        targetTable: 'sugar_no_11',
        targetMarketName: 'SUGAR NO. 11 - ICE FUTURES U.S.'
    }
];

const CSV_FILE = path.join(__dirname, '..', '2006-15.csv');

async function importHistory() {
    console.log('=== IMPORTING MISSING 2006-2007 DATA (NYBOT) ===');

    const updates = [];

    await new Promise((resolve, reject) => {
        fs.createReadStream(CSV_FILE)
            .pipe(csv({
                mapHeaders: ({ header }) => header.trim().replace(/^\ufeff/, '')
            }))
            .on('data', (row) => {
                const normalizedRow = {};
                Object.keys(row).forEach(k => normalizedRow[k.trim()] = row[k]);

                const marketKey = Object.keys(normalizedRow).find(k => k.includes('Market_and_Exchange_Names'));
                const marketName = normalizedRow[marketKey];

                // Check if this row matches any of our historical targets
                const target = HISTORICAL_MAPPINGS.find(m => m.oldName === marketName);

                if (target) {
                    const dateKey = Object.keys(normalizedRow).find(k => k.includes('As_of_Date_In_Form_YYMMDD'));
                    const dateVal = normalizedRow[dateKey];
                    if (!dateVal) return;

                    const cleanDate = dateVal.trim();
                    let dateStr = null;
                    if (cleanDate.length === 6) {
                        const yy = cleanDate.substring(0, 2);
                        const mm = cleanDate.substring(2, 4);
                        const dd = cleanDate.substring(4, 6);
                        dateStr = `${2000 + parseInt(yy)}-${mm}-${dd}`;
                    }

                    if (dateStr) {
                        updates.push({
                            date: dateStr,
                            data: normalizedRow,
                            config: target
                        });
                    }
                }
            })
            .on('end', resolve)
            .on('error', reject);
    });

    console.log(`Found ${updates.length} historical rows to insert.`);

    let insertedInfo = {};

    for (const update of updates) {
        const { targetTable, targetMarketName } = update.config;

        const cols = ['as_of_date_in_form_yymmdd', 'market_and_exchange_names'];
        const vals = [update.date, targetMarketName]; // Use CURRENT market name for continuity

        for (const [csvHeader, dbCol] of Object.entries(COMPLETE_COLUMN_MAPPING)) {
            const rowKey = Object.keys(update.data).find(k => k.toLowerCase() === csvHeader.toLowerCase());
            let val = update.data[rowKey];
            if (val === undefined || val === null || val === '') val = null;
            else val = val.replace(/,/g, '').trim();

            cols.push(dbCol);
            vals.push(val);
        }

        const placeholders = vals.map((_, i) => `$${i + 1}`);
        const query = `
            INSERT INTO ${targetTable} (${cols.join(',')}) 
            VALUES (${placeholders.join(',')})
            ON CONFLICT (market_and_exchange_names, as_of_date_in_form_yymmdd) 
            DO NOTHING
        `;

        try {
            const res = await client.query(query, vals);
            if (res.rowCount > 0) {
                insertedInfo[targetTable] = (insertedInfo[targetTable] || 0) + 1;
            }
        } catch (e) {
            if (e.code === '42P10') { // invalid on conflict? (missing constraint)
                // Just insert without CONFLICT clause if older table schema
                try {
                    const simpleQuery = `INSERT INTO ${targetTable} (${cols.join(',')}) VALUES (${placeholders.join(',')})`;
                    await client.query(simpleQuery, vals);
                    insertedInfo[targetTable] = (insertedInfo[targetTable] || 0) + 1;
                } catch (inner) { }
            }
        }
    }

    console.log('\nImport Summary (Rows Added):');
    console.table(insertedInfo);
}

async function main() {
    try {
        await client.connect();
        await importHistory();
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

main();
