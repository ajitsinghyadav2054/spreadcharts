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
        await client.query('TRUNCATE TABLE cocoa_product_ratios RESTART IDENTITY');
        console.log('[Wipe] ✅ All data deleted from cocoa_product_ratios table.');
        const { rows } = await pool.query('SELECT COUNT(*) FROM cocoa_product_ratios');
        console.log('[Wipe] Rows remaining:', rows[0].count);
    } finally {
        client.release();
        pool.end();
    }
}
run();
