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

async function createTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS cocoa_ivory_arrivals (
                date DATE PRIMARY KEY,
                close NUMERIC,
                weekly_changes NUMERIC
            );
        `);
        console.log("cocoa_ivory_arrivals table created successfully.");
    } catch (err) {
        console.error("Error creating table:", err);
    } finally {
        await pool.end();
    }
}

createTable();
