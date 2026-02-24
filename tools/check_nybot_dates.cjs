const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const CSV_FILE = path.join(__dirname, '..', '2006-15.csv');

const dates = [];

fs.createReadStream(CSV_FILE)
    .pipe(csv({
        mapHeaders: ({ header }) => header.trim().replace(/^\ufeff/, '')
    }))
    .on('data', (row) => {
        const marketKey = Object.keys(row).find(k => k.includes('Market_and_Exchange_Names'));
        if (row[marketKey] === 'COCOA - NEW YORK BOARD OF TRADE') {
            const dateKey = Object.keys(row).find(k => k.includes('As_of_Date_In_Form_YYMMDD'));
            dates.push(row[dateKey]);
        }
    })
    .on('end', () => {
        dates.sort();
        console.log('Date range for COCOA - NEW YORK BOARD OF TRADE:');
        console.log('First:', dates[0]);
        console.log('Last:', dates[dates.length - 1]);
        console.log('Total:', dates.length);
    });
