const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const CSV_FILE = path.join(__dirname, '..', '2006-15.csv');

const marketCounts = {};

fs.createReadStream(CSV_FILE)
    .pipe(csv({
        mapHeaders: ({ header }) => header.trim().replace(/^\ufeff/, '')
    }))
    .on('data', (row) => {
        // Find market key
        const marketKey = Object.keys(row).find(k => k.toLowerCase().includes('market_and_exchange_names'));
        if (marketKey && row[marketKey]) {
            const m = row[marketKey].trim();
            marketCounts[m] = (marketCounts[m] || 0) + 1;
        }
    })
    .on('end', () => {
        console.log('=== MARKET NAMES IN 2006-15.CSV ===');
        Object.keys(marketCounts).sort().forEach(m => {
            if (m.includes('COCOA') || m.includes('COFFEE') || m.includes('COTTON') || m.includes('SUGAR')) {
                console.log(`${m}: ${marketCounts[m]} rows`);
            }
        });
    });
