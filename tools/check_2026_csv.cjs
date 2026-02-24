const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const CSV_FILE = path.join(__dirname, '..', 'csvs', '2026.csv');

let count = 0;
fs.createReadStream(CSV_FILE)
    .pipe(csv())
    .on('data', (row) => {
        if (count < 2) {
            console.log('Row keys:', Object.keys(row).slice(0, 10));
            console.log('Sample row:', row);
            count++;
        }
    })
    .on('end', () => {
        console.log('Done');
    });
