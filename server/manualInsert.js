import pg from 'pg';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// ── Values manually read from each source image ──────────────────────────────
// Format: [date, category, region_product, ratio_value]
// Current-week column value taken directly by eye from the shared images.
const MANUAL_DATA = [

    // ══ February 5th, 2026 (file: 02-02-2026.png — image title says 5-Feb) ══
    ['2026-02-05', 'Liquor', 'Europe Liquid Liquor', 1.46],
    ['2026-02-05', 'Liquor', 'Ivory Coast Boxed Liquor', 1.35],
    ['2026-02-05', 'Liquor', 'Ghana Boxed Liquor', 1.37],
    ['2026-02-05', 'Liquor', 'Africa Boxed Liquor', 1.54],
    ['2026-02-05', 'Butter', 'Europe Liquid', 1.86],
    ['2026-02-05', 'Butter', 'Ivory Coast Boxed', 1.61],
    ['2026-02-05', 'Butter', 'Ghana Boxed', 1.64],
    ['2026-02-05', 'Butter', 'Asia Natural', 1.76],
    ['2026-02-05', 'Butter', 'Asia Deodorized', 1.77],
    ['2026-02-05', 'Butter', 'African Blocks', 1.87],
    ['2026-02-05', 'Butter', 'USA Liquid Natural', 1.90],
    ['2026-02-05', 'Butter', 'USA Liquid Deodorized', 1.95],
    ['2026-02-05', 'Powder', 'Europe Powder', 1.63],
    ['2026-02-05', 'Powder', 'Ivory Coast Cake', 1.29],
    ['2026-02-05', 'Powder', 'Ghana Cake', 1.21],
    ['2026-02-05', 'Powder', 'Asia Natural Powder', 1.34],
    ['2026-02-05', 'Powder', 'U.S. Natural', 1.69],
    ['2026-02-05', 'Powder', 'U.S. Mid', 1.78],
    ['2026-02-05', 'Powder', 'U.S. High', 1.86],
    ['2026-02-05', 'Powder', 'European High', 2.11],
    ['2026-02-05', 'Combined', 'Europe', 3.49],
    ['2026-02-05', 'Combined', 'Ivory Coast', 2.90],
    ['2026-02-05', 'Combined', 'Ghana', 2.85],
    ['2026-02-05', 'Combined', 'Asia', 3.10],
    ['2026-02-05', 'Combined', 'United States', 3.59],

    // ══ February 12th, 2026 ══
    ['2026-02-12', 'Liquor', 'Europe Liquid Liquor', 1.46],
    ['2026-02-12', 'Liquor', 'Ivory Coast Boxed Liquor', 1.35],
    ['2026-02-12', 'Liquor', 'Ghana Boxed Liquor', 1.35],
    ['2026-02-12', 'Liquor', 'Africa Boxed Liquor', 1.54],
    ['2026-02-12', 'Butter', 'Europe Liquid', 1.86],
    ['2026-02-12', 'Butter', 'Ivory Coast Boxed', 1.61],
    ['2026-02-12', 'Butter', 'Ghana Boxed', 1.64],
    ['2026-02-12', 'Butter', 'Asia Natural', 1.73],
    ['2026-02-12', 'Butter', 'Asia Deodorized', 1.74],
    ['2026-02-12', 'Butter', 'African Blocks', 1.86],
    ['2026-02-12', 'Butter', 'USA Liquid Natural', 1.90],
    ['2026-02-12', 'Butter', 'USA Liquid Deodorized', 1.95],
    ['2026-02-12', 'Powder', 'Europe Powder', 1.92],
    ['2026-02-12', 'Powder', 'Ivory Coast Cake', 1.51],
    ['2026-02-12', 'Powder', 'Ghana Cake', 1.42],
    ['2026-02-12', 'Powder', 'Asia Natural Powder', 1.53],
    ['2026-02-12', 'Powder', 'U.S. Natural', 1.94],
    ['2026-02-12', 'Powder', 'U.S. Mid', 2.00],
    ['2026-02-12', 'Powder', 'U.S. High', 2.12],
    ['2026-02-12', 'Powder', 'European High', 2.45],
    ['2026-02-12', 'Combined', 'Europe', 3.78],
    ['2026-02-12', 'Combined', 'Ivory Coast', 3.12],
    ['2026-02-12', 'Combined', 'Ghana', 3.06],
    ['2026-02-12', 'Combined', 'Asia', 3.26],
    ['2026-02-12', 'Combined', 'United States', 3.84],

    // ══ February 19th, 2026 ══
    ['2026-02-19', 'Liquor', 'Europe Liquid Liquor', 1.46],
    ['2026-02-19', 'Liquor', 'Ivory Coast Boxed Liquor', 1.35],
    ['2026-02-19', 'Liquor', 'Ghana Boxed Liquor', 1.35],
    ['2026-02-19', 'Liquor', 'Africa Boxed Liquor', 1.54],
    ['2026-02-19', 'Butter', 'Europe Liquid', 1.86],
    ['2026-02-19', 'Butter', 'Ivory Coast Boxed', 1.61],
    ['2026-02-19', 'Butter', 'Ghana Boxed', 1.64],
    ['2026-02-19', 'Butter', 'Asia Natural', 1.73],
    ['2026-02-19', 'Butter', 'Asia Deodorized', 1.74],
    ['2026-02-19', 'Butter', 'African Blocks', 1.86],
    ['2026-02-19', 'Butter', 'USA Liquid Natural', 1.90],
    ['2026-02-19', 'Butter', 'USA Liquid Deodorized', 1.95],
    ['2026-02-19', 'Powder', 'Europe Powder', 2.38],
    ['2026-02-19', 'Powder', 'Ivory Coast Cake', 1.83],
    ['2026-02-19', 'Powder', 'Ghana Cake', 1.74],
    ['2026-02-19', 'Powder', 'Asia Natural Powder', 1.89],
    ['2026-02-19', 'Powder', 'U.S. Natural', 2.27],
    ['2026-02-19', 'Powder', 'U.S. Mid', 2.31],
    ['2026-02-19', 'Powder', 'U.S. High', 2.49],
    ['2026-02-19', 'Powder', 'European High', 2.91],
    ['2026-02-19', 'Combined', 'Europe', 4.24],
    ['2026-02-19', 'Combined', 'Ivory Coast', 3.44],
    ['2026-02-19', 'Combined', 'Ghana', 3.38],
    ['2026-02-19', 'Combined', 'Asia', 3.62],
    ['2026-02-19', 'Combined', 'United States', 4.17],

    // ══ February 26th, 2026 ══
    ['2026-02-26', 'Liquor', 'Europe Liquid Liquor', 1.48],
    ['2026-02-26', 'Liquor', 'Ivory Coast Boxed Liquor', 1.35],
    ['2026-02-26', 'Liquor', 'Ghana Boxed Liquor', 1.35],
    ['2026-02-26', 'Liquor', 'Africa Boxed Liquor', 1.54],
    ['2026-02-26', 'Butter', 'Europe Liquid', 1.85],
    ['2026-02-26', 'Butter', 'Ivory Coast Boxed', 1.61],
    ['2026-02-26', 'Butter', 'Ghana Boxed', 1.64],
    ['2026-02-26', 'Butter', 'Asia Natural', 1.71],
    ['2026-02-26', 'Butter', 'Asia Deodorized', 1.73],
    ['2026-02-26', 'Butter', 'African Blocks', 1.85],
    ['2026-02-26', 'Butter', 'USA Liquid Natural', 1.90],
    ['2026-02-26', 'Butter', 'USA Liquid Deodorized', 1.95],
    ['2026-02-26', 'Powder', 'Europe Powder', 2.34],
    ['2026-02-26', 'Powder', 'Ivory Coast Cake', 1.82],
    ['2026-02-26', 'Powder', 'Ghana Cake', 1.73],
    ['2026-02-26', 'Powder', 'Asia Natural Powder', 1.82],
    ['2026-02-26', 'Powder', 'U.S. Natural', 2.23],
    ['2026-02-26', 'Powder', 'U.S. Mid', 2.27],
    ['2026-02-26', 'Powder', 'U.S. High', 2.45],
    ['2026-02-26', 'Powder', 'European High', 2.90],
    ['2026-02-26', 'Combined', 'Europe', 4.19],
    ['2026-02-26', 'Combined', 'Ivory Coast', 3.43],
    ['2026-02-26', 'Combined', 'Ghana', 3.37],
    ['2026-02-26', 'Combined', 'Asia', 3.53],
    ['2026-02-26', 'Combined', 'United States', 4.13],

    // ══ March 12th, 2026 ══
    ['2026-03-12', 'Liquor', 'Europe Liquid Liquor', 1.49],
    ['2026-03-12', 'Liquor', 'Ivory Coast Boxed Liquor', 1.35],
    ['2026-03-12', 'Liquor', 'Ghana Boxed Liquor', 1.36],
    ['2026-03-12', 'Liquor', 'Africa Boxed Liquor', 1.49],
    ['2026-03-12', 'Butter', 'Europe Liquid', 1.82],
    ['2026-03-12', 'Butter', 'Ivory Coast Boxed', 1.60],
    ['2026-03-12', 'Butter', 'Ghana Boxed', 1.65],
    ['2026-03-12', 'Butter', 'Asia Natural', 1.70],
    ['2026-03-12', 'Butter', 'Asia Deodorized', 1.72],
    ['2026-03-12', 'Butter', 'African Blocks', 1.85],
    ['2026-03-12', 'Butter', 'USA Liquid Natural', 1.90],
    ['2026-03-12', 'Butter', 'USA Liquid Deodorized', 1.95],
    ['2026-03-12', 'Powder', 'Europe Powder', 1.96],
    ['2026-03-12', 'Powder', 'Ivory Coast Cake', 1.52],
    ['2026-03-12', 'Powder', 'Ghana Cake', 1.40],
    ['2026-03-12', 'Powder', 'Asia Natural Powder', 1.61],
    ['2026-03-12', 'Powder', 'U.S. Natural', 1.97],
    ['2026-03-12', 'Powder', 'U.S. Mid', 2.03],
    ['2026-03-12', 'Powder', 'U.S. High', 2.14],
    ['2026-03-12', 'Powder', 'European High', 2.68],
    ['2026-03-12', 'Combined', 'Europe', 3.78],
    ['2026-03-12', 'Combined', 'Ivory Coast', 3.12],
    ['2026-03-12', 'Combined', 'Ghana', 3.05],
    ['2026-03-12', 'Combined', 'Asia', 3.31],
    ['2026-03-12', 'Combined', 'United States', 3.87],
];

async function run() {
    const client = await pool.connect();
    try {
        // Step 1: Delete all wrong data from Jan 29, 2026 onwards
        const { rowCount } = await client.query(
            `DELETE FROM cocoa_product_ratios WHERE date >= '2026-01-29'`
        );
        console.log(`[Manual Insert] ✅ Deleted ${rowCount} bad rows (2026-01-29 onwards).`);

        // Step 2: Insert all manually-verified values
        await client.query('BEGIN');
        let inserted = 0;
        for (const [date, category, region_product, ratio_value] of MANUAL_DATA) {
            await client.query(
                `INSERT INTO cocoa_product_ratios (date, category, region_product, ratio_value)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (date, category, region_product) DO UPDATE SET ratio_value = EXCLUDED.ratio_value`,
                [date, category, region_product, ratio_value]
            );
            inserted++;
            console.log(`  ✓ ${date} | ${category.padEnd(8)} | ${region_product.padEnd(28)} | ${ratio_value}`);
        }
        await client.query('COMMIT');

        console.log(`\n[Manual Insert] ✅ Successfully inserted ${inserted} rows.`);

        // Step 3: Verify final counts per date
        const { rows } = await client.query(
            `SELECT TO_CHAR(date,'YYYY-MM-DD') as date, count(*) FROM cocoa_product_ratios 
             WHERE date >= '2026-01-22' GROUP BY date ORDER BY date`
        );
        console.log('\n[Manual Insert] DB summary from Jan 22 onwards:');
        rows.forEach(r => console.log(`  ${r.date}: ${r.count} rows`));

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[Manual Insert] Error:', err);
    } finally {
        client.release();
        pool.end();
    }
}

run();
