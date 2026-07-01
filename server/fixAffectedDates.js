import 'dotenv/config';
import pool from './db.js';
import { processRatioImage } from './services/cocoaRatiosOcrSync.js';
import path from 'path';

const WATCH_DIR = "C:\\Users\\Ajit.yadav\\hertshtengroup.com\\Dinesh Chinnadurai - Cocoa\\Product Ratios Images";

// All affected dates — (file is MM-DD-YYYY, user dates are DD-MM-YYYY)
const AFFECTED = [
    { file: '07-03-2025.png', dbDate: '2025-07-03' },
    { file: '07-10-2025.png', dbDate: '2025-07-10' },
    { file: '09-04-2025.png', dbDate: '2025-09-04' },
    { file: '09-09-2025.png', dbDate: '2025-09-09' },
    { file: '06-18-2025.png', dbDate: '2025-06-18' },
    { file: '06-26-2025.png', dbDate: '2025-06-26' },
    { file: '08-14-2025.png', dbDate: '2025-08-14' },
    { file: '10-02-2025.png', dbDate: '2025-10-02' },
    { file: '10-16-2025.png', dbDate: '2025-10-16' },
    { file: '11-06-2025.png', dbDate: '2025-11-06' },
];

// After OCR, apply these specific hard overrides where user confirmed the exact value
const HARD_OVERRIDES = [
    // User confirmed: Ghana Boxed Liquor = 1.53 (DB has 3.00, clearly OCR error)
    { dbDate: '2025-10-02', category: 'Liquor', region_product: 'Ghana Boxed Liquor', ratio_value: 1.53 },
];

// Print current DB state for each affected date
console.log('=== CURRENT DB STATE FOR AFFECTED DATES ===\n');
for (const { dbDate } of AFFECTED) {
    const { rows } = await pool.query(
        "SELECT category, region_product, ratio_value FROM cocoa_product_ratios WHERE date = $1 ORDER BY category, region_product",
        [dbDate]
    );
    console.log(`\n📅 ${dbDate} (${rows.length} rows):`);
    rows.forEach(r => console.log(`   [${r.category}] ${r.region_product}: ${r.ratio_value}`));
}

console.log('\n\n=== RE-RUNNING OCR ON AFFECTED IMAGES ===\n');

for (const { file, dbDate } of AFFECTED) {
    const imagePath = path.join(WATCH_DIR, file);
    console.log(`\n--- Processing ${file} (${dbDate}) ---`);

    try {
        const result = await processRatioImage(imagePath);
        if (result?.success) {
            console.log(`✔ Synced ${result.count} rows for ${result.date}`);
        } else {
            console.log(`❌ OCR failed: ${result?.error}`);
        }
    } catch (err) {
        console.log(`❌ Error: ${err.message}`);
    }
}

// Apply hard overrides
console.log('\n\n=== APPLYING HARD OVERRIDES ===\n');
for (const { dbDate, category, region_product, ratio_value } of HARD_OVERRIDES) {
    await pool.query(`
        INSERT INTO cocoa_product_ratios (date, category, region_product, ratio_value)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (date, category, region_product)
        DO UPDATE SET ratio_value = EXCLUDED.ratio_value
    `, [dbDate, category, region_product, ratio_value]);
    console.log(`✔ Fixed [${category}] ${region_product} on ${dbDate}: ${ratio_value}`);
}

// Print final DB state
console.log('\n\n=== FINAL DB STATE FOR AFFECTED DATES ===\n');
for (const { dbDate } of AFFECTED) {
    const { rows } = await pool.query(
        "SELECT category, region_product, ratio_value FROM cocoa_product_ratios WHERE date = $1 ORDER BY category, region_product",
        [dbDate]
    );
    console.log(`\n📅 ${dbDate} (${rows.length} rows):`);
    rows.forEach(r => {
        const val = parseFloat(r.ratio_value);
        const flagged = val < 0.7 ? ' ⚠️  (SUSPICIOUS - check manually)' : '';
        console.log(`   [${r.category}] ${r.region_product}: ${r.ratio_value}${flagged}`);
    });
}

await pool.end();
process.exit(0);
