import 'dotenv/config';
import pool from './db.js';

// Exact values from screenshots provided by user
const FIXES = [

    // ── 2025-07-03 (Screenshot 1) ──
    // Butter — OCR read the Change column values (0.63) instead of the 3-Jul Ratio column
    { date: '2025-07-03', category: 'Butter', region_product: 'Europe Liquid', ratio_value: 1.57 },
    { date: '2025-07-03', category: 'Butter', region_product: 'Ivory Coast Boxed', ratio_value: 1.55 },
    // Combined — OCR read Change column instead of 3-Jul Ratio column
    { date: '2025-07-03', category: 'Combined', region_product: 'Asia', ratio_value: 3.01 },
    { date: '2025-07-03', category: 'Combined', region_product: 'Ivory Coast', ratio_value: 2.85 },

    // ── 2025-07-10 (Screenshot 2) ──
    // Butter — OCR misread Change column again
    { date: '2025-07-10', category: 'Butter', region_product: 'Europe Liquid', ratio_value: 2.20 },
    { date: '2025-07-10', category: 'Butter', region_product: 'Ivory Coast Boxed', ratio_value: 2.15 },
    // Combined — OCR read Change column values
    { date: '2025-07-10', category: 'Combined', region_product: 'Europe', ratio_value: 3.84 },
    { date: '2025-07-10', category: 'Combined', region_product: 'Asia', ratio_value: 3.03 },
    { date: '2025-07-10', category: 'Combined', region_product: 'Ivory Coast', ratio_value: 3.48 },

    // ── 2025-10-16 (Screenshot 3) ──
    // Combined Asia — DB has 2.08, screenshot shows 2.95
    { date: '2025-10-16', category: 'Combined', region_product: 'Asia', ratio_value: 2.95 },

    // ── 2025-11-06 (Screenshot 4) ──
    // Combined Asia — DB has 2.01, screenshot shows 2.79
    { date: '2025-11-06', category: 'Combined', region_product: 'Asia', ratio_value: 2.79 },
];

console.log(`Applying ${FIXES.length} precise corrections from screenshots...\n`);

for (const { date, category, region_product, ratio_value } of FIXES) {
    // Get existing value first for logging
    const { rows } = await pool.query(
        "SELECT ratio_value FROM cocoa_product_ratios WHERE date=$1 AND category=$2 AND region_product=$3",
        [date, category, region_product]
    );
    const existing = rows[0]?.ratio_value ?? 'N/A';

    await pool.query(`
        INSERT INTO cocoa_product_ratios (date, category, region_product, ratio_value)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (date, category, region_product)
        DO UPDATE SET ratio_value = EXCLUDED.ratio_value
    `, [date, category, region_product, ratio_value]);

    console.log(`  ✔  ${date} [${category}] ${region_product}: ${existing} → ${ratio_value}`);
}

console.log('\n✅  All corrections applied from screenshots.');
await pool.end();
process.exit(0);
