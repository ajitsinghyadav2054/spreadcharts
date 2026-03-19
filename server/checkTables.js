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
    const { rows } = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`);
    console.log("Tables:", rows.map(r => r.table_name));
    pool.end();
}
run();
