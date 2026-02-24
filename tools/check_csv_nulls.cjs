const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const CSV_FILE = path.join(__dirname, '..', 'src', 'data', 'cftc', 'f_year.csv');
const TARGET_MARKET = 'COCOA - ICE FUTURES U.S.';

async function main() {
    const stream = fs.createReadStream(CSV_FILE).pipe(csv());

    let totalCocoa = 0;
    let nullConc = 0;
    let validConc = 0;

    for await (const row of stream) {
        if (row['Market_and_Exchange_Names'] && row['Market_and_Exchange_Names'].trim() === TARGET_MARKET) {
            totalCocoa++;
            const val = row['Conc_Net_LE_8_TDR_Long_All'];

            if (val === undefined || val === null || val.trim() === '') {
                // console.log(`Empty in CSV for date: ${row['As_of_Date_In_Form_YYMMDD']}`);
                nullConc++;
            } else {
                validConc++;
            }
        }
    }

    console.log(`Total Cocoa rows in CSV: ${totalCocoa}`);
    console.log(`Valid Conc_Net: ${validConc}`);
    console.log(`Null Conc_Net: ${nullConc}`);
}

main();
