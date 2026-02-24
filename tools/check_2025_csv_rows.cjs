const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const CSV_FILE = path.join(__dirname, '..', 'src', 'data', 'cftc', 'f_year.csv');
const MARKET_NAME = 'COFFEE C - ICE FUTURES U.S.';

let count = 0;
fs.createReadStream(CSV_FILE)
    .pipe(csv())
    .on('data', (row) => {
        const m = row['Market_and_Exchange_Names'];
        if (m && m.trim() === MARKET_NAME) {
            count++;
        }
    })
    .on('end', () => {
        console.log(`Rows for ${MARKET_NAME} in f_year.csv: ${count}`);
    });
