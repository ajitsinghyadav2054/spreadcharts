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
    { tableName: 'cocoa', marketName: 'COCOA - ICE FUTURES U.S.' },
    { tableName: 'coffee_c', marketName: 'COFFEE C - ICE FUTURES U.S.' },
    { tableName: 'cotton_no_2', marketName: 'COTTON NO. 2 - ICE FUTURES U.S.' },
    { tableName: 'sugar_no_11', marketName: 'SUGAR NO. 11 - ICE FUTURES U.S.' }
];

async function processTable(config) {
    const { tableName, marketName } = config;
    console.log(`\n=== Processing table: ${tableName} ===`);

    // 1. Delete 2026 data
    console.log(`Deleting 2026 data...`);
    const deleteRes = await client.query(`
        DELETE FROM ${tableName} 
        WHERE EXTRACT(YEAR FROM as_of_date_in_form_yymmdd) = 2026
    `);
    console.log(`Deleted ${deleteRes.rowCount} rows.`);

    // 2. Import 2026 data with ALL columns
    const filePath = path.join(__dirname, '..', 'csvs', '2026.csv');
    console.log(`Importing 2026 data...`);

    const updates = [];

    await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                if (row['Market_and_Exchange_Names'] && row['Market_and_Exchange_Names'].trim() === marketName) {
                    const dateVal = row['As_of_Date_In_Form_YYMMDD'];
                    if (!dateVal) return;

                    const cleanDate = dateVal.trim();
                    let dateStr = null;

                    if (cleanDate.length === 6 && !cleanDate.includes('/')) {
                        const yy = cleanDate.substring(0, 2);
                        const mm = cleanDate.substring(2, 4);
                        const dd = cleanDate.substring(4, 6);
                        const year = 2000 + parseInt(yy);
                        dateStr = `${year}-${mm}-${dd}`;
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
        values.push(marketName);

        // Add ALL other columns from the mapping
        for (const [csvHeader, dbCol] of Object.entries(COMPLETE_COLUMN_MAPPING)) {
            let val = update.data[csvHeader];

            if (val === undefined || val === null || val === '') {
                val = null;
            } else {
                // Handle date format for Report_Date_as_MM_DD_YYYY
                if (csvHeader === 'Report_Date_as_MM_DD_YYYY' && val.includes('/')) {
                    const parts = val.split('/');
                    if (parts.length === 3) {
                        let year = parseInt(parts[2]);
                        if (year < 100) year += 2000;
                        val = `${year}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
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
        `;

        try {
            const res = await client.query(query, values);
            insertCount += res.rowCount;
        } catch (e) {
            console.error(`Error inserting row ${update.date}: ${e.message}`);
            console.error('Query:', query.substring(0, 200));
        }
    }
    console.log(`✓ Inserted ${insertCount} rows with ALL columns.`);
}

async function main() {
    try {
        await client.connect();
        console.log('Connected to database.\n');

        for (const config of TABLES_TO_PROCESS) {
            await processTable(config);
        }

        console.log('\n✓ All tables processed successfully!');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

main();
