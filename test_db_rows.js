import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, 'server', '.env') });

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        const res = await pool.query('SELECT COUNT(*) FROM cocoa_ivory_arrivals');
        console.log("Count:", res.rows[0].count);
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await pool.end();
    }
}

check();
