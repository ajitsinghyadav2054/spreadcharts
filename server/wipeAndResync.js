import pg from 'pg';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { processRatioImage } from './services/cocoaRatiosOcrSync.js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const DIR = "C:\\\\Users\\\\Ajit.yadav\\\\hertshtengroup.com\\\\Dinesh Chinnadurai - Cocoa\\\\Product Ratios Images";

async function run() {
    try {
        console.log('[Resync] Deleting all existing data in cocoa_product_ratios...');
        await pool.query("TRUNCATE TABLE cocoa_product_ratios;");
        console.log('[Resync] Table cleared successfully.');

        const files = fs.readdirSync(DIR);
        const images = files.filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'));

        console.log(`[Resync] Found ${images.length} images. Starting OCR queue...`);

        for (const img of images) {
            const fullPath = path.join(DIR, img);
            console.log(`[Resync] Processing ${img}...`);
            const res = await processRatioImage(fullPath);
            console.log(`[Resync] Done ${img}:`, res);
        }

        console.log('[Resync] Complete re-entry finished successfully!');
    } catch (err) {
        console.error('[Resync Error]', err);
    } finally {
        await pool.end();
    }
}

run();
