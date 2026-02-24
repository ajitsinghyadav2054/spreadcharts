const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const CSV_FILE = path.join(__dirname, '..', '2006-15.csv');

let logged = false;

fs.createReadStream(CSV_FILE)
    .pipe(csv())
    .on('data', (row) => {
        if (!logged) {
            console.log('Keys:', Object.keys(row));
            logged = true;
        }
    });
