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

async function run() {
    const client = await pool.connect();
    try {
        const queries = [
            // Butter: USA Liquid Deodorized on 04-09-2025 and 09-09-2025
            `SELECT date, category, region_product, ratio_value FROM cocoa_product_ratios WHERE date IN ('2025-09-04', '2025-09-09') AND region_product = 'USA Liquid Deodorized'`,

            // Liquor: Ghana Boxed Liquor on 02-10-2025
            `SELECT date, category, region_product, ratio_value FROM cocoa_product_ratios WHERE date = '2025-10-02' AND region_product = 'Ghana Boxed Liquor'`,

            // Combined: Asia on 05-05-2025, 05-06-2025? and 16-10-2025
            `SELECT date, category, region_product, ratio_value FROM cocoa_product_ratios WHERE date IN ('2025-05-05', '2025-06-05', '2025-10-16') AND region_product = 'Asia' AND category = 'Combined'`,

            // Powder: U.S. Mid on 14-08-2025, 26-06-2026, 18-06-2026
            `SELECT date, category, region_product, ratio_value FROM cocoa_product_ratios WHERE date IN ('2025-08-14', '2026-06-26', '2026-06-18') AND region_product = 'U.S. Mid'`
        ];

        for (const q of queries) {
            const { rows } = await client.query(q);
            console.log(rows);
        }
    } finally {
        client.release();
        pool.end();
    }
}
run();
