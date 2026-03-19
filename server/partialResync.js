import pg from 'pg';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { processRatioImage, COCOA_RATIOS_WATCH_DIR } from './services/cocoaRatiosOcrSync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const CUTOFF_DATE = '2026-01-22'; // Delete this date AND everything after

async function run() {
    // Step 1: Delete all data from cutoff date onwards
    const client = await pool.connect();
    try {
        const { rowCount } = await client.query(
            `DELETE FROM cocoa_product_ratios WHERE date >= $1`,
            [CUTOFF_DATE]
        );
        console.log(`[Partial Resync] ✅ Deleted ${rowCount} rows from ${CUTOFF_DATE} onwards.`);

        const { rows } = await client.query(`SELECT TO_CHAR(MAX(date),'YYYY-MM-DD') as last_date FROM cocoa_product_ratios`);
        console.log(`[Partial Resync] Latest date remaining in DB: ${rows[0].last_date}`);
    } finally {
        client.release();
    }

    // Step 2: Find all images from 2026-01-22 onwards
    const allFiles = fs.readdirSync(COCOA_RATIOS_WATCH_DIR)
        .filter(f => /\.(png|jpg|jpeg)$/i.test(f))
        .sort();

    // Filter to only images with date >= 2026-01-22 using filename (MM-DD-YYYY format)
    const filesToProcess = allFiles.filter(f => {
        const m = f.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
        if (!m) return false;
        const [, mo, d, y] = m;
        const dateStr = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
        return dateStr >= CUTOFF_DATE;
    });

    console.log(`\n[Partial Resync] Found ${filesToProcess.length} images to re-process:`);
    filesToProcess.forEach(f => console.log(`  - ${f}`));
    console.log('');

    // Step 3: Re-process each image sequentially
    for (const file of filesToProcess) {
        const fullPath = path.join(COCOA_RATIOS_WATCH_DIR, file);
        console.log(`\n[Partial Resync] Processing: ${file}`);
        const result = await processRatioImage(fullPath);
        console.log(`[Partial Resync] Result: ${JSON.stringify(result)}`);
    }

    console.log('\n[Partial Resync] ✅ All done! All images from 2026-01-22 onwards re-inserted.');
    pool.end();
    process.exit(0);
}

run().catch(err => {
    console.error('[Partial Resync] Fatal Error:', err);
    process.exit(1);
});
