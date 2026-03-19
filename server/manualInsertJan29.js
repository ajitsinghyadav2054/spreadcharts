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

const DATE = '2026-01-29';

const MANUAL_DATA = [
    // ══ Liquor ══
    [DATE, 'Liquor', 'Europe Liquid Liquor', 1.46],
    [DATE, 'Liquor', 'Ivory Coast Boxed Liquor', 1.35],
    [DATE, 'Liquor', 'Ghana Boxed Liquor', 1.37],
    [DATE, 'Liquor', 'Africa Boxed Liquor', 1.59],

    // ══ Butter ══
    [DATE, 'Butter', 'Europe Liquid', 1.90],
    [DATE, 'Butter', 'Ivory Coast Boxed', 1.62],
    [DATE, 'Butter', 'Ghana Boxed', 1.65],
    [DATE, 'Butter', 'Asia Natural', 1.77],
    [DATE, 'Butter', 'Asia Deodorized', 1.78],
    [DATE, 'Butter', 'African Blocks', 1.87],
    [DATE, 'Butter', 'USA Liquid Natural', 1.89],
    [DATE, 'Butter', 'USA Liquid Deodorized', 1.94],

    // ══ Powder ══
    [DATE, 'Powder', 'Europe Powder', 1.82],
    [DATE, 'Powder', 'Ivory Coast Cake', 1.35],
    [DATE, 'Powder', 'Ghana Cake', 1.27],
    [DATE, 'Powder', 'Asia Natural Powder', 1.38],
    [DATE, 'Powder', 'U.S. Natural', 1.75],
    [DATE, 'Powder', 'U.S. Mid', 1.85],
    [DATE, 'Powder', 'U.S. High', 1.98],
    [DATE, 'Powder', 'European High', 2.29],

    // ══ Combined ══
    [DATE, 'Combined', 'Europe', 3.72],
    [DATE, 'Combined', 'Ivory Coast', 2.97],
    [DATE, 'Combined', 'Ghana', 2.92],
    [DATE, 'Combined', 'Asia', 3.15],
    [DATE, 'Combined', 'United States', 3.64]
];

async function run() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Delete all existing data for exactly 2026-01-29
        const { rowCount } = await client.query(`
            DELETE FROM cocoa_product_ratios 
            WHERE date = $1
        `, [DATE]);
        console.log(`[Manual Insert Jan 29] ✅ Deleted ${rowCount} older rows for ${DATE}.`);

        // 2. Insert the manually verified values
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
        console.log(`[Manual Insert Jan 29] ✅ Successfully inserted all ${inserted} exact rows from image!`);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error applying fixes:', err);
    } finally {
        client.release();
        pool.end();
    }
}
run();
