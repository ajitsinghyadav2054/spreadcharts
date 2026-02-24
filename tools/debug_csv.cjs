const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const CSV_FILE = path.join(__dirname, '..', '2006-15.csv');

let count = 0;
fs.createReadStream(CSV_FILE)
    .pipe(csv())
    .on('data', (row) => {
        if (count < 5) {
            console.log(JSON.stringify(row, null, 2));
        }
        count++;
    })
    .on('end', () => {
        console.log(`Total rows: ${count}`);
    });
