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

        // Check if 2006-2015 data already exists
        const check = await client.query(`
            SELECT COUNT(*) 
            FROM ${TABLE_NAME} 
            WHERE market_and_exchange_names = $1 
            AND EXTRACT(YEAR FROM as_of_date_in_form_yymmdd) BETWEEN 2006 AND 2015
        `, [MARKET_NAME]);

        const existingCount = parseInt(check.rows[0].count);
        console.log(`Existing 2006-2015 rows: ${existingCount}`);

        if (existingCount > 0) {
            console.log('Deleting existing data to ensure clean import...');
            await client.query(`
                DELETE FROM ${TABLE_NAME} 
                WHERE market_and_exchange_names = $1 
                AND EXTRACT(YEAR FROM as_of_date_in_form_yymmdd) BETWEEN 2006 AND 2015
            `, [MARKET_NAME]);
            console.log('Deleted existing rows.');
        }

        console.log(`Importing 2006-2015 data from ${path.basename(CSV_FILE)}...`);

        const updates = [];

        await new Promise((resolve, reject) => {
            fs.createReadStream(CSV_FILE)
                .pipe(csv())
                .on('data', (row) => {
                    // Normalize keys to handle BOM/whitespace
                    const normalizedRow = {};
                    Object.keys(row).forEach(k => {
                        normalizedRow[k.trim().replace(/^\ufeff/, '')] = row[k];
                    });

                    const marketKey = Object.keys(normalizedRow).find(k => k.includes('Market_and_Exchange_Names'));
                    if (!marketKey) return;

                    if (normalizedRow[marketKey] && normalizedRow[marketKey].trim() === MARKET_NAME) {
                        const dateKey = Object.keys(normalizedRow).find(k => k.includes('As_of_Date_In_Form_YYMMDD'));
                        const dateVal = normalizedRow[dateKey];

                        if (!dateVal) return;

                        const cleanDate = dateVal.trim();
                        let dateStr = null;

                        // Format: YYMMDD
                        if (cleanDate.length === 6) {
                            const yy = cleanDate.substring(0, 2);
                            const mm = cleanDate.substring(2, 4);
                            const dd = cleanDate.substring(4, 6);
                            const fullYear = 2000 + parseInt(yy);
                            dateStr = `${fullYear}-${mm}-${dd}`;

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
            values.push(MARKET_NAME);

            for (const [csvHeader, dbCol] of Object.entries(COMPLETE_COLUMN_MAPPING)) {
                // Fuzzy match header
                const rowKey = Object.keys(update.data).find(k => k.toLowerCase() === csvHeader.toLowerCase());
                let val = update.data[rowKey];

                if (val === undefined || val === null || val === '') {
                    val = null;
                } else {
                    val = val.replace(/,/g, '').trim();
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
                if (insertCount < 5) console.error(`Insert error: ${e.message}`);
            }
        }

        console.log(`\n✓ Inserted ${insertCount} rows.`);

    } catch (err) {
        console.error('Fatal error:', err);
    } finally {
        await client.end();
    }
}

main();
