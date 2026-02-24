const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const CSV_FILE = path.join(__dirname, '..', '2006-15.csv');

const markets = new Set();

fs.createReadStream(CSV_FILE)
    .pipe(csv())
    .on('data', (row) => {
        const name = row['Market_and_Exchange_Names'];
        if (name && name.includes('COCOA')) {
            markets.add(name.trim());
        }
    })
    .on('end', () => {
        console.log('Markets found:');
        markets.forEach(m => console.log(`"${m}"`));
    });
