const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const CSV_FILE = path.join(__dirname, '..', 'csvs', '2026.csv');

fs.createReadStream(CSV_FILE)
    .pipe(csv())
    .on('data', (row) => {
        console.log('Total columns in CSV:', Object.keys(row).length);
        console.log('\nAll column names:');
        Object.keys(row).forEach((key, idx) => {
            console.log(`${idx + 1}. ${key}`);
        });
        process.exit(0);
    });
