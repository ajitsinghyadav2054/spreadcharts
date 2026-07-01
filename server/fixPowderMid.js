import 'dotenv/config';
import pool from './db.js';

const FIXES = [
    { date: '2025-07-10', category: 'Powder', region_product: 'U.S. Mid', ratio_value: 1.13 },
    { date: '2025-08-14', category: 'Powder', region_product: 'U.S. Mid', ratio_value: 1.15 },
    { date: '2025-06-18', category: 'Powder', region_product: 'U.S. Mid', ratio_value: 0.93 },
    { date: '2025-06-26', category: 'Powder', region_product: 'U.S. Mid', ratio_value: 1.00 },
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
