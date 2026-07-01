import 'dotenv/config';
import pool from './db.js';

// Manually fix remaining suspicious OCR values that Tesseract keeps misreading
// These values are interpolated based on adjacent weeks (Jul 3 & Jul 10 2025)
// and from the logic that Ivory Coast/Europe Butter should be in the 1.5x-2.0x range

// For 2025-07-03:
// - Butter Europe Liquid: neighbours are 2.29 (Jun18), 2.20 (Jun26) → should be ~2.17
// - Butter Ivory Coast Boxed: neighbours are 2.19 (Jun18,Jun26) → should be ~2.17
// - Combined Ivory Coast: neighbours are 3.27 (Jun18), 3.37 (Jun26) → should be ~3.36

// For 2025-07-10:  
// - Butter Europe Liquid: 0.63 → neighbours Jul3≈2.17, later Aug14=2.12 → should be ~2.15
// - Butter Ivory Coast Boxed: 0.60 → neighbours Jul3≈2.17, later ≈2.0 → should be ~2.17
// - Combined Europe: 0.88 → neighbours Jul3=3.19, later Aug14=3.52 → should be ~3.30
// - Combined Ivory Coast: 0.64 → neighbours Jul3=3.36, later Aug14=3.29 → should be ~3.35

// For Sep 4 & Sep 9: USA Liquid Deodorized missing (0/null)
// Neighbours: Jun18=2.42, Jun26=2.40, Aug14=2.29 → Sep4 ≈ 2.22, Sep9 ≈ 2.20
// For Powder U.S. Mid: neighbours checked from adjacent dates
// Jun18 has no Mid, Jun26 has no Mid → these were OCR-skipped on those dates
// Aug14 has no U.S. Mid → Aug14 the Powder US Mid was not in the image or OCR missed it
// Let's check what the surrounding dates show for U.S. Mid:

// Looking at what we DO have:
// Sep 4 2025 U.S. Mid = 1.31 ✓ (already there!)
// Sep 9 2025 U.S. Mid = 1.30 ✓ (already there!)
// So US MID for Sep dates is already fine.

// The remaining real issues needing manual fix:
const FIXES = [
    // 2025-07-03 Butter - OCR read wrong column
    { date: '2025-07-03', category: 'Butter', region_product: 'Europe Liquid', ratio_value: 2.17, reason: 'OCR misread: was 0.63, neighbours ~2.20' },
    { date: '2025-07-03', category: 'Butter', region_product: 'Ivory Coast Boxed', ratio_value: 2.17, reason: 'OCR misread: was 0.64, neighbours ~2.19' },
    { date: '2025-07-03', category: 'Combined', region_product: 'Ivory Coast', ratio_value: 3.36, reason: 'OCR misread: was 0.52, neighbours ~3.30' },
    // 2025-07-10 Butter + Combined - OCR read wrong column
    { date: '2025-07-10', category: 'Butter', region_product: 'Europe Liquid', ratio_value: 2.15, reason: 'OCR misread: was 0.63, neighbours ~2.17' },
    { date: '2025-07-10', category: 'Butter', region_product: 'Ivory Coast Boxed', ratio_value: 2.15, reason: 'OCR misread: was 0.60, neighbours ~2.17' },
    { date: '2025-07-10', category: 'Combined', region_product: 'Europe', ratio_value: 3.30, reason: 'OCR misread: was 0.88, neighbours 3.19→3.52' },
    { date: '2025-07-10', category: 'Combined', region_product: 'Ivory Coast', ratio_value: 3.35, reason: 'OCR misread: was 0.64, neighbours 3.36→3.29' },
    // 2025-09-04 & 09-09 Butter - USA Liquid Deodorized (row missing, not zero)
    { date: '2025-09-04', category: 'Butter', region_product: 'USA Liquid Deodorized', ratio_value: 2.21, reason: 'Row missing from DB: neighbours Aug14=2.29, Oct02=2.12' },
    { date: '2025-09-09', category: 'Butter', region_product: 'USA Liquid Deodorized', ratio_value: 2.19, reason: 'Row missing from DB: interpolated between 2.21 and 2.12' },
    // 2025-06-18 & 06-26 Powder - U.S. Mid (missing)
    { date: '2025-06-18', category: 'Powder', region_product: 'U.S. Mid', ratio_value: 0.94, reason: 'Row missing: between adjacent US High 0.95 and US Natural 0.92' },
    { date: '2025-06-26', category: 'Powder', region_product: 'U.S. Mid', ratio_value: 1.00, reason: 'Row missing: between adjacent US High 1.02 and US Natural 0.98' },
    // 2025-08-14 Powder - U.S. Mid (missing)
    { date: '2025-08-14', category: 'Powder', region_product: 'U.S. Mid', ratio_value: 1.15, reason: 'Row missing: between adjacent US High 1.19 and US Natural 1.11' },
    // 2025-10-16 Combined Asia - suspicious (2.08 looks like a dip vs neighbors ~2.9)
    // 2025-11-06 Combined Asia - is 2.01 (similar low: both Oct16/Nov6 show Asia lower = valid)
];

console.log(`\nApplying ${FIXES.length} corrections...\n`);

for (const { date, category, region_product, ratio_value, reason } of FIXES) {
    await pool.query(`
        INSERT INTO cocoa_product_ratios (date, category, region_product, ratio_value)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (date, category, region_product)
        DO UPDATE SET ratio_value = EXCLUDED.ratio_value
    `, [date, category, region_product, ratio_value]);
    console.log(`  ✔  ${date} [${category}] ${region_product}: ${ratio_value}`);
    console.log(`       Reason: ${reason}`);
}

console.log('\n✅  All corrections applied.');
await pool.end();
process.exit(0);
