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

const UPDATES = [
    // [date, category, region_product, proper_ratio]
    ['2025-11-06', 'Combined', 'Asia', 2.79]
];

async function run() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (const [date, category, product, val] of UPDATES) {
            console.log(`Updating ${date} | ${category} | ${product} -> ${val}`);

            // Delete existing
            await client.query(`
                DELETE FROM cocoa_product_ratios 
                WHERE date = $1 AND category = $2 AND region_product = $3
            `, [date, category, product]);

            // Insert correct
            await client.query(`
                INSERT INTO cocoa_product_ratios (date, category, region_product, ratio_value)
                VALUES ($1, $2, $3, $4)
            `, [date, category, product, val]);
        }

        await client.query('COMMIT');
        console.log('\n[Manual Fix] ✅ 11-06-2025 Combined Asia updated correctly!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error applying fixes:', err);
    } finally {
        client.release();
        pool.end();
    }
}
run();
