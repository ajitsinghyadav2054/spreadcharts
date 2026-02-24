const fs = require('fs');
const csv = require('csv-parser');
const { Client } = require('pg');
const path = require('path');

const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

// Use f_year.csv which has 2025 data
const CSV_FILE = path.join(__dirname, '..', 'src', 'data', 'cftc', 'f_year.csv');

const TARGET_MARKET = 'COCOA - ICE FUTURES U.S.';

// Mapping based on f_year.csv headers
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

async function main() {
    try {
        await client.connect();
        console.log('Connected to DB');

        const updates = [];

        console.log('Reading CSV...');
        const stream = fs.createReadStream(CSV_FILE).pipe(csv({
            mapHeaders: ({ header }) => header.trim()
        }));

        for await (const row of stream) {
            const marketKey = Object.keys(row).find(k => k.includes('Market_and_Exchange_Names'));
            const dateKey = Object.keys(row).find(k => k.includes('As_of_Date_In_Form_YYMMDD'));

            if (row[marketKey] && row[marketKey].trim() === TARGET_MARKET) {
                const dateVal = row[dateKey]; // e.g. "251230"
                if (!dateVal) continue;

                const cleanDate = dateVal.trim();
                let dateStr = null;
                if (cleanDate.length === 6) {
                    const yy = cleanDate.substring(0, 2);
                    const mm = cleanDate.substring(2, 4);
                    const dd = cleanDate.substring(4, 6);
                    const year = 2000 + parseInt(yy);
                    dateStr = `${year}-${mm}-${dd}`;
                } else {
                    console.log(`Skipping invalid date: ${cleanDate}`);
                    continue;
                }

                updates.push({
                    date: dateStr, // YYYY-MM-DD
                    data: row
                });
            }
        }
        console.log(`Found ${updates.length} rows in CSV for ${TARGET_MARKET}`);

        let updateCount = 0;
        let checked = 0;

        for (const update of updates) {
            checked++;
            const setClauses = [];
            const values = [];
            let i = 1;

            for (const [csvHeader, dbCol] of Object.entries(COLUMN_MAPPING)) {
                const rowKey = Object.keys(update.data).find(k => k.trim() === csvHeader);

                let val = update.data[rowKey];
                if (val === undefined || val === '') val = null;
                else val = val.replace(/,/g, '').trim();

                setClauses.push(`${dbCol} = $${i}`);
                values.push(val);
                i++;
            }

            values.push(update.date); // YYYY-MM-DD string
            values.push(TARGET_MARKET);

            const query = `
                UPDATE cocoa 
                SET ${setClauses.join(', ')}
                WHERE as_of_date_in_form_yymmdd = $${i}::date 
                AND market_and_exchange_names = $${i + 1}
            `;

            const res = await client.query(query, values);
            if (res.rowCount > 0) {
                updateCount += res.rowCount;
                if (updateCount % 10 === 0) process.stdout.write('.');
            }
        }

        console.log(`\nChecked ${checked} CSV rows against DB. Updated ${updateCount} rows.`);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

main();
