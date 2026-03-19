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
    const { rows } = await pool.query(`SELECT TO_CHAR(date, 'YYYY-MM-DD') as date, region_product, ratio_value as close FROM cocoa_product_ratios WHERE category = 'Butter' AND date >= '2025-09-09' AND date <= '2026-01-08' ORDER BY date ASC;`);
    console.log("Returned rows:", rows.length);
    console.log(rows.slice(0, 3));
    pool.end();
}
run();
