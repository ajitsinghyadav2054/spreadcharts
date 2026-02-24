const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const CSV_FILE = path.join(__dirname, '..', '2006-15.csv');

const matches = new Set();

fs.createReadStream(CSV_FILE)
    .pipe(csv())
    .on('data', (row) => {
        const name = row['Market_and_Exchange_Names'];
        if (name && name.toUpperCase().includes('COCOA')) {
            matches.add(name.trim());
        }
    })
    .on('end', () => {
        console.log('Matches:');
        matches.forEach(m => console.log(m));
    });
