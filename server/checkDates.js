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
    const { rows } = await pool.query(`SELECT TO_CHAR(date, 'YYYY-MM-DD') as date, category, count(*) FROM cocoa_product_ratios GROUP BY date, category ORDER BY date`);
    rows.forEach(r => console.log(r.date, r.category, r.count));
    pool.end();
}
run();
