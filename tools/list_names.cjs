const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const CSV_FILE = path.join(__dirname, '..', '2006-15.csv');

const names = new Set();

fs.createReadStream(CSV_FILE)
    .pipe(csv())
    .on('data', (row) => {
        if (names.size < 20) {
            names.add(row['Market_and_Exchange_Names']);
        }
    })
    .on('end', () => {
        console.log('Names:');
        names.forEach(n => console.log(`"${n}"`));
    });
