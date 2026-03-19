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

const MANUAL_DATA = [
    // ══ July 3rd, 2025 ══
    ['2025-07-03', 'Butter', 'Europe Liquid', 1.57],
    ['2025-07-03', 'Butter', 'Ivory Coast Boxed', 1.55],
    ['2025-07-03', 'Butter', 'Ghana Boxed', 1.63],
    ['2025-07-03', 'Butter', 'Asia Natural', 2.00],
    ['2025-07-03', 'Butter', 'Asia Deodorized', 2.05],
    ['2025-07-03', 'Butter', 'African Blocks', 2.25],
    ['2025-07-03', 'Butter', 'USA Liquid Natural', 2.28],
    ['2025-07-03', 'Butter', 'USA Liquid Deodorized', 2.33],
    ['2025-07-03', 'Powder', 'Europe Powder', 1.62],
    ['2025-07-03', 'Powder', 'Ivory Coast Cake', 1.30],
    ['2025-07-03', 'Powder', 'Ghana Cake', 1.33],
    ['2025-07-03', 'Powder', 'Asia Natural Powder', 1.01],
    ['2025-07-03', 'Powder', 'U.S. Natural', 1.10],
    ['2025-07-03', 'Powder', 'U.S. Mid', 1.12],
    ['2025-07-03', 'Powder', 'U.S. High', 1.14],
    ['2025-07-03', 'Powder', 'European High', 1.16],
    ['2025-07-03', 'Combined', 'Europe', 3.19],
    ['2025-07-03', 'Combined', 'Ivory Coast', 2.85],
    ['2025-07-03', 'Combined', 'Ghana', 2.96],
    ['2025-07-03', 'Combined', 'Asia', 3.01],
    ['2025-07-03', 'Combined', 'United States', 3.38],

    // ══ July 10th, 2025 ══
    ['2025-07-10', 'Butter', 'Europe Liquid', 2.20],
    ['2025-07-10', 'Butter', 'Ivory Coast Boxed', 2.15],
    ['2025-07-10', 'Butter', 'Ghana Boxed', 2.06],
    ['2025-07-10', 'Butter', 'Asia Natural', 2.00],
    ['2025-07-10', 'Butter', 'Asia Deodorized', 2.05],
    ['2025-07-10', 'Butter', 'African Blocks', 2.23],
    ['2025-07-10', 'Butter', 'USA Liquid Natural', 2.26],
    ['2025-07-10', 'Butter', 'USA Liquid Deodorized', 2.31],
    ['2025-07-10', 'Powder', 'Europe Powder', 1.64],
    ['2025-07-10', 'Powder', 'Ivory Coast Cake', 1.33],
    ['2025-07-10', 'Powder', 'Ghana Cake', 1.36],
    ['2025-07-10', 'Powder', 'Asia Natural Powder', 1.03],
    ['2025-07-10', 'Powder', 'U.S. Natural', 1.10],
    ['2025-07-10', 'Powder', 'U.S. Mid', 1.13],
    ['2025-07-10', 'Powder', 'U.S. High', 1.19],
    ['2025-07-10', 'Powder', 'European High', 1.26],
    ['2025-07-10', 'Combined', 'Europe', 3.84],
    ['2025-07-10', 'Combined', 'Ivory Coast', 3.48],
    ['2025-07-10', 'Combined', 'Ghana', 3.42],
    ['2025-07-10', 'Combined', 'Asia', 3.03],
    ['2025-07-10', 'Combined', 'United States', 3.36],

    // ══ July 17th, 2025 ══
    ['2025-07-17', 'Butter', 'Europe Liquid', 2.16],
    ['2025-07-17', 'Butter', 'Ivory Coast Boxed', 2.13],
    ['2025-07-17', 'Butter', 'Ghana Boxed', 2.04],
    ['2025-07-17', 'Butter', 'Asia Natural', 2.00],
    ['2025-07-17', 'Butter', 'Asia Deodorized', 2.05],
    ['2025-07-17', 'Butter', 'African Blocks', 2.23],
    ['2025-07-17', 'Butter', 'USA Liquid Natural', 2.26],
    ['2025-07-17', 'Butter', 'USA Liquid Deodorized', 2.31],
    ['2025-07-17', 'Powder', 'Europe Powder', 1.77],
    ['2025-07-17', 'Powder', 'Ivory Coast Cake', 1.48],
    ['2025-07-17', 'Powder', 'Ghana Cake', 1.51],
    ['2025-07-17', 'Powder', 'Asia Natural Powder', 1.15],
    ['2025-07-17', 'Powder', 'U.S. Natural', 1.21],
    ['2025-07-17', 'Powder', 'U.S. Mid', 1.24],
    ['2025-07-17', 'Powder', 'U.S. High', 1.32],
    ['2025-07-17', 'Powder', 'European High', 1.39],
    ['2025-07-17', 'Combined', 'Europe', 3.93],
    ['2025-07-17', 'Combined', 'Ivory Coast', 3.61],
    ['2025-07-17', 'Combined', 'Ghana', 3.55],
    ['2025-07-17', 'Combined', 'Asia', 3.15],
    ['2025-07-17', 'Combined', 'United States', 3.47],

    // ══ July 24th, 2025 ══
    ['2025-07-24', 'Butter', 'Europe Liquid', 2.16],
    ['2025-07-24', 'Butter', 'Ivory Coast Boxed', 2.03],
    ['2025-07-24', 'Butter', 'Ghana Boxed', 1.96],
    ['2025-07-24', 'Butter', 'Asia Natural', 2.00],
    ['2025-07-24', 'Butter', 'Asia Deodorized', 2.05],
    ['2025-07-24', 'Butter', 'African Blocks', 2.18],
    ['2025-07-24', 'Butter', 'USA Liquid Natural', 2.26],
    ['2025-07-24', 'Butter', 'USA Liquid Deodorized', 2.31],
    ['2025-07-24', 'Powder', 'Europe Powder', 1.59],
    ['2025-07-24', 'Powder', 'Ivory Coast Cake', 1.34],
    ['2025-07-24', 'Powder', 'Ghana Cake', 1.36],
    ['2025-07-24', 'Powder', 'Asia Natural Powder', 1.03],
    ['2025-07-24', 'Powder', 'U.S. Natural', 1.09],
    ['2025-07-24', 'Powder', 'U.S. Mid', 1.13],
    ['2025-07-24', 'Powder', 'U.S. High', 1.20],
    ['2025-07-24', 'Powder', 'European High', 1.25],
    ['2025-07-24', 'Combined', 'Europe', 3.75],
    ['2025-07-24', 'Combined', 'Ivory Coast', 3.37],
    ['2025-07-24', 'Combined', 'Ghana', 3.32],
    ['2025-07-24', 'Combined', 'Asia', 3.03],
    ['2025-07-24', 'Combined', 'United States', 3.35],

    // ══ July 31st, 2025 ══
    ['2025-07-31', 'Butter', 'Europe Liquid', 2.16],
    ['2025-07-31', 'Butter', 'Ivory Coast Boxed', 2.03],
    ['2025-07-31', 'Butter', 'Ghana Boxed', 1.91],
    ['2025-07-31', 'Butter', 'Asia Natural', 2.00],
    ['2025-07-31', 'Butter', 'Asia Deodorized', 2.05],
    ['2025-07-31', 'Butter', 'African Blocks', 2.15],
    ['2025-07-31', 'Butter', 'USA Liquid Natural', 2.23],
    ['2025-07-31', 'Butter', 'USA Liquid Deodorized', 2.29],
    ['2025-07-31', 'Powder', 'Europe Powder', 1.45],
    ['2025-07-31', 'Powder', 'Ivory Coast Cake', 1.25],
    ['2025-07-31', 'Powder', 'Ghana Cake', 1.28],
    ['2025-07-31', 'Powder', 'Asia Natural Powder', 0.99],
    ['2025-07-31', 'Powder', 'U.S. Natural', 1.08],
    ['2025-07-31', 'Powder', 'U.S. Mid', 1.11],
    ['2025-07-31', 'Powder', 'U.S. High', 1.15],
    ['2025-07-31', 'Powder', 'European High', 1.20],
    ['2025-07-31', 'Combined', 'Europe', 3.61],
    ['2025-07-31', 'Combined', 'Ivory Coast', 3.28],
    ['2025-07-31', 'Combined', 'Ghana', 3.19],
    ['2025-07-31', 'Combined', 'Asia', 2.99],
    ['2025-07-31', 'Combined', 'United States', 3.31]
];

const TARGET_DATES = ['2025-07-03', '2025-07-10', '2025-07-17', '2025-07-24', '2025-07-31'];

async function run() {
    const client = await pool.connect();
    try {
        // Step 1: Delete all existing data for these exact 5 dates
        const placeholders = TARGET_DATES.map((_, i) => `$${i + 1}`).join(', ');
        const { rowCount } = await client.query(
            `DELETE FROM cocoa_product_ratios WHERE date IN (${placeholders})`,
            TARGET_DATES
        );
        console.log(`[Manual Insert July] ✅ Deleted ${rowCount} older rows for July dates.`);

        // Step 2: Insert manually verified values
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
        }
        await client.query('COMMIT');

        console.log(`[Manual Insert July] ✅ Successfully inserted ${inserted} corrected rows.`);

        // Step 3: Verify the counts to make sure we didn't touch anything else
        const { rows } = await client.query(`
            SELECT TO_CHAR(date, 'YYYY-MM-DD') as date, count(*) 
            FROM cocoa_product_ratios 
            WHERE date IN (${placeholders}) 
            GROUP BY date ORDER BY date
        `, TARGET_DATES);

        console.log('\n[Manual Insert July] DB rows confirmed:');
        rows.forEach(r => console.log(`  ${r.date}: ${r.count} rows`));

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[Manual Insert July] Error:', err);
    } finally {
        client.release();
        pool.end();
    }
}

run();
