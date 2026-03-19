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
    ['2025-09-04', 'Butter', 'USA Liquid Deodorized', 2.21], // from Sept 4 image
    ['2025-09-09', 'Butter', 'USA Liquid Deodorized', 2.14], // from Sept 9 image
    ['2025-10-02', 'Liquor', 'Ghana Boxed Liquor', 1.53], // raw OCR: 4.53 1.53 (3.00)
    ['2025-06-05', 'Combined', 'Asia', 2.92], // from "May 15" image giving 5-Jun values
    ['2025-10-16', 'Combined', 'Asia', 2.95], // from Oct 16 image
    ['2025-08-14', 'Powder', 'U.S. Mid', 1.15], // from Aug 14 image
    ['2025-06-18', 'Powder', 'U.S. Mid', 0.93], // raw OCR: 0.95 0.93 (0.01)
    ['2025-06-26', 'Powder', 'U.S. Mid', 1.00]  // raw OCR: 1.03 1.00 (0.03)
];

async function run() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (const [date, category, product, val] of UPDATES) {
            console.log(`Updating ${date} | ${category} | ${product} -> ${val}`);

            // First, delete any existing row for this exact combo just in case
            await client.query(`
                DELETE FROM cocoa_product_ratios 
                WHERE date = $1 AND category = $2 AND region_product = $3
            `, [date, category, product]);

            // Then insert the correct value
            await client.query(`
                INSERT INTO cocoa_product_ratios (date, category, region_product, ratio_value)
                VALUES ($1, $2, $3, $4)
            `, [date, category, product, val]);
        }

        // Just in case the user meant actual 05-08-2025 (May 8) since they typed "05-05-2025"
        // Let's delete the Combined Asia entry for 2025-05-08 and 2025-05-01 so they don't see a random bad spike there if there was one.
        // Wait, actually I will only update exactly the dates verified.

        await client.query('COMMIT');
        console.log('\n[Manual Fix] ✅ All specified dates updated correctly!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error applying fixes:', err);
    } finally {
        client.release();
        pool.end();
    }
}
run();
