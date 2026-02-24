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
const CSV_FILE = path.join(__dirname, '..', '2006-15.csv');

async function main() {
    try {
        await client.connect();
        console.log('Connected to database.');
        console.log(`Importing 2006-2015 data for ${MARKET_NAME} into ${TABLE_NAME}...`);

        const updates = [];

        await new Promise((resolve, reject) => {
            fs.createReadStream(CSV_FILE)
                .pipe(csv({
                    mapHeaders: ({ header }) => header.trim().replace(/^\ufeff/, '') // Remove BOM and trim
                }))
                .on('data', (row) => {
                    // Find market key dynamically
                    const marketKey = Object.keys(row).find(k => k.toLowerCase().includes('market_and_exchange_names'));
                    if (!marketKey) return;

                    const rowMarket = row[marketKey];
                    if (rowMarket && rowMarket.trim() === MARKET_NAME) {

                        // Find date key dynamically
                        const dateKey = Object.keys(row).find(k => k.toLowerCase().includes('as_of_date_in_form_yymmdd') || k.toLowerCase().includes('report_date_as_mm_dd_yyyy'));
                        const dateVal = row[dateKey];

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
                                data: row
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

            // Add Date and Market
            cols.push('as_of_date_in_form_yymmdd');
            placeholders.push(`$${i++}`);
            values.push(update.date);

            cols.push('market_and_exchange_names');
            placeholders.push(`$${i++}`);
            values.push(MARKET_NAME);

            // Add ALL columns from mapping
            for (const [csvHeader, dbCol] of Object.entries(COMPLETE_COLUMN_MAPPING)) {
                // Find matching key in row (case-insensitive)
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
                INSERT INTO ${TABLE_NAME} (${cols.join(', ')})
                VALUES (${placeholders.join(', ')})
                ON CONFLICT (market_and_exchange_names, as_of_date_in_form_yymmdd) 
                DO NOTHING
            `;

            try {
                const res = await client.query(query, values);
                insertCount += res.rowCount;
                if (insertCount % 50 === 0) process.stdout.write('.');
            } catch (e) {
                if (insertCount < 5) console.error(`Insert error: ${e.message}`);
            }
        }

        console.log(`\n✓ Inserted ${insertCount} rows from 2006-15.csv`);

    } catch (err) {
        console.error('Fatal error:', err);
    } finally {
        await client.end();
    }
}

main();
