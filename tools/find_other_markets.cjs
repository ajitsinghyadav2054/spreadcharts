const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const CSV_FILE = path.join(__dirname, '..', 'csvs', '2026.csv');

const markets = new Set();

fs.createReadStream(CSV_FILE)
    .pipe(csv())
    .on('data', (row) => {
        const name = row['Market_and_Exchange_Names'] ? row['Market_and_Exchange_Names'].trim() : '';
        if (name.includes('COFFEE') || name.includes('COTTON') || name.includes('SUGAR')) {
            markets.add(name);
        }
    })
    .on('end', () => {
        console.log('Markets found:');
        markets.forEach(m => console.log(m));
    });
