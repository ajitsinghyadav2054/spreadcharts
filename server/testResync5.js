import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { processRatioImage, COCOA_RATIOS_WATCH_DIR } from './services/cocoaRatiosOcrSync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function run() {
    const allFiles = fs.readdirSync(COCOA_RATIOS_WATCH_DIR)
        .filter(f => /\.(png|jpg|jpeg)$/i.test(f))
        .sort();

    // Process only first 5 images 
    const first5 = allFiles.slice(0, 5);
    console.log(`[Test Resync] Processing first 5 images:`, first5);

    for (const file of first5) {
        const fullPath = path.join(COCOA_RATIOS_WATCH_DIR, file);
        console.log(`\n[Test Resync] ─── Processing: ${file} ───`);
        const result = await processRatioImage(fullPath);
        console.log(`[Test Resync] Result:`, result);
    }

    console.log('\n[Test Resync] ✅ Done with first 5 images!');
    process.exit(0);
}

run().catch(err => {
    console.error('[Test Resync] Fatal Error:', err);
    process.exit(1);
});
