import pg from 'pg';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { processRatioImage } from './services/cocoaRatiosOcrSync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    await pool.query("DELETE FROM cocoa_product_ratios WHERE date = '2026-03-18'");
    console.log('Cleaned bad dates');
    const res = await processRatioImage('C:\\\\Users\\\\Ajit.yadav\\\\hertshtengroup.com\\\\Dinesh Chinnadurai - Cocoa\\\\Product Ratios Images\\\\26dec2024.png');
    console.log(res);
    await pool.end();
}
run();
