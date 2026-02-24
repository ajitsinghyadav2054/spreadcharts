const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const CSV_FILE = path.join(__dirname, '..', '2006-15.csv');

let count = 0;
fs.createReadStream(CSV_FILE)
    .pipe(csv())
    .on('data', (row) => {
        if (count < 1) {
            console.log('Headers in 2006-15.csv:');
            Object.keys(row).forEach((k, i) => console.log(`${i + 1}. ${k}`));

            console.log('\nSample Row (Market Name):', row['Market_and_Exchange_Names']);
            count++;
        }
    });
