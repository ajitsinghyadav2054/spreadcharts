import 'dotenv/config';
import pool from './db.js';

const FIXES = [
    { date: '2025-09-04', category: 'Butter', region_product: 'USA Liquid Deodorized', ratio_value: 2.21 },
    { date: '2025-09-09', category: 'Butter', region_product: 'USA Liquid Deodorized', ratio_value: 2.14 },
];

for (const { date, category, region_product, ratio_value } of FIXES) {
    await pool.query(`
        INSERT INTO cocoa_product_ratios (date, category, region_product, ratio_value)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (date, category, region_product)
        DO UPDATE SET ratio_value = EXCLUDED.ratio_value
    `, [date, category, region_product, ratio_value]);
    console.log(`✔  ${date} [${category}] ${region_product}: → ${ratio_value}`);
}

console.log('\n✅  Done.');
await pool.end();
process.exit(0);
