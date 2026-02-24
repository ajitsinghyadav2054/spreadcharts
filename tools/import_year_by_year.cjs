const fs = require('fs');
const csv = require('csv-parser');
const { Client } = require('pg');
const path = require('path');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

const TARGET_MARKET = 'COCOA - ICE FUTURES U.S.';

const COLUMN_MAPPING = {
    'Open_Interest_All': 'open_interest_all',
    'Prod_Merc_Positions_Long_ALL': 'prod_merc_positions_long_all',
    'Prod_Merc_Positions_Short_ALL': 'prod_merc_positions_short_all',
    'Swap_Positions_Long_All': 'swap_positions_long_all',
    'Swap__Positions_Short_All': 'swap_positions_short_all',
    'M_Money_Positions_Long_ALL': 'm_money_positions_long_all',
    'M_Money_Positions_Short_ALL': 'm_money_positions_short_all',
    'M_Money_Positions_Spread_ALL': 'm_money_positions_spread_all',
    'Other_Rept_Positions_Long_ALL': 'other_rept_positions_long_all',
    'Other_Rept_Positions_Short_ALL': 'other_rept_positions_short_all',
    'Other_Rept_Positions_Spread_ALL': 'other_rept_positions_spread_all',
    'Tot_Rept_Positions_Long_All': 'tot_rept_positions_long_all',
    'Tot_Rept_Positions_Short_All': 'tot_rept_positions_short_all',
    'NonRept_Positions_Long_All': 'nonrept_positions_long_all',
    'NonRept_Positions_Short_All': 'nonrept_positions_short_all',
    'Conc_Net_LE_4_TDR_Long_All': 'conc_net_le_4_tdr_long_all',
    'Conc_Net_LE_4_TDR_Short_All': 'conc_net_le_4_tdr_short_all',
    'Conc_Net_LE_8_TDR_Long_All': 'conc_net_le_8_tdr_long_all',
    'Conc_Net_LE_8_TDR_Short_All': 'conc_net_le_8_tdr_short_all'
};

async function processFile(filePath) {
    console.log(`Processing ${path.basename(filePath)}...`);
    const updates = [];

    await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv({
                mapHeaders: ({ header }) => header.trim()
            }))
            .on('data', (row) => {
                const marketKey = Object.keys(row).find(k => k.includes('Market_and_Exchange_Names'));

                let dateKey = Object.keys(row).find(k => k.includes('As_of_Date_In_Form_YYMMDD'));
                if (!dateKey) {
                    dateKey = Object.keys(row).find(k => k.includes('Report_Date_as_MM_DD_YYYY'));
                }

                if (row[marketKey] && row[marketKey].trim() === TARGET_MARKET) {
                    const dateVal = row[dateKey];
                    if (!dateVal) return;

                    const cleanDate = dateVal.trim();
                    let dateStr = null;

                    if (cleanDate.length === 6 && !cleanDate.includes('/')) {
                        const yy = cleanDate.substring(0, 2);
                        const mm = cleanDate.substring(2, 4);
                        const dd = cleanDate.substring(4, 6);
                        const year = 2000 + parseInt(yy);
                        dateStr = `${year}-${mm}-${dd}`;
                    } else if (cleanDate.includes('/')) {
                        const parts = cleanDate.split('/');
                        if (parts.length === 3) {
                            let year = parseInt(parts[2]);
                            if (year < 100) year += 2000;
                            dateStr = `${year}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
                        }
                    }

                    // Skip 2025 dates (already in DB)
                    if (dateStr && dateStr.startsWith('2025-')) {
                        return;
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
        values.push(TARGET_MARKET);

        // Add other columns
        for (const [csvHeader, dbCol] of Object.entries(COLUMN_MAPPING)) {
            const rowKey = Object.keys(update.data).find(k => k.trim() === csvHeader);
            let val = rowKey ? update.data[rowKey] : null;

            if (val === undefined || val === '') val = null;
            else val = val.replace(/,/g, '').trim();

            cols.push(dbCol);
            placeholders.push(`$${i++}`);
            values.push(val);
        }

        const query = `
            INSERT INTO cocoa (${cols.join(', ')})
            VALUES (${placeholders.join(', ')})
            ON CONFLICT (market_and_exchange_names, as_of_date_in_form_yymmdd) 
            DO NOTHING
        `;

        const res = await client.query(query, values);
        insertCount += res.rowCount;
        if (insertCount % 100 === 0) process.stdout.write('.');
    }
    console.log(`\nInserted ${insertCount} rows from ${path.basename(filePath)}.`);
}

async function main() {
    try {
        await client.connect();

        // List of files to process (excluding 2025 source which is f_year.csv for now)
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
            '../csvs/2026.csv'
        ];

        for (const file of files) {
            const fullPath = path.join(__dirname, file);
            if (fs.existsSync(fullPath)) {
                await processFile(fullPath);
            } else {
                console.log(`File not found: ${fullPath}`);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

main();
