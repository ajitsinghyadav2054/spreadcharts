import Tesseract from 'tesseract.js';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Use basic matching mapping
const MAPPINGS = {
    'Liquor': ['Europe Liquid Liquor', 'Ivory Coast Boxed Liquor', 'Ghana Boxed Liquor', 'Africa Boxed Liquor'],
    'Butter': ['Europe Liquid', 'Ivory Coast Boxed', 'Ghana Boxed', 'Asia Natural', 'Asia Deodorized', 'African Blocks', 'USA Liquid Natural', 'USA Liquid Deodorized'],
    'Powder': ['Europe Powder', 'Ivory Coast Cake', 'Ghana Cake', 'Asia Natural Powder', 'U.S. Natural', 'U.S. Mid', 'U.S. High', 'European High'],
    'Combined': ['Europe', 'Ivory Coast', 'Ghana', 'Asia', 'United States']
};

export const COCOA_RATIOS_WATCH_DIR = "C:\\Users\\Ajit.yadav\\hertshtengroup.com\\Dinesh Chinnadurai - Cocoa\\Product Ratios Images";

export async function processRatioImage(imagePath) {
    if (!fs.existsSync(imagePath)) {
        console.error(`[Choc Ratios OCR] File not found: ${imagePath}`);
        return null;
    }

    console.log(`[Choc Ratios OCR] Starting Tesseract image processing for: ${path.basename(imagePath)}`);
    console.log(`[Choc Ratios OCR] This might take between 5 to 10 seconds locally...`);

    try {
        const client = await pool.connect();
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS cocoa_product_ratios (
                    id SERIAL PRIMARY KEY,
                    date DATE NOT NULL,
                    category VARCHAR(50) NOT NULL,
                    region_product VARCHAR(100) NOT NULL,
                    ratio_value NUMERIC,
                    UNIQUE(date, category, region_product)
                )
            `);
        } finally {
            client.release();
        }

        const { data: { text } } = await Tesseract.recognize(imagePath, 'eng');
        const lines = text.split('\n');

        // Date parsing Priority: 1. Filename (01-16-2025.png), 2. OCR text, 3. File modified time
        let dateStr = new Date(fs.statSync(imagePath).mtime).toISOString().split('T')[0];

        const baseName = path.basename(imagePath);
        const fileDateMatch = baseName.match(/(\d{1,2})-(\d{1,2})-(\d{3,4})/);
        if (fileDateMatch) {
            const [, m, d, y] = fileDateMatch;
            let fullYear = parseInt(y);
            if (fullYear < 1000) fullYear = 2025; // Fallback for typos like 205.png
            dateStr = `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        } else {
            const dateMatch = text.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})[^0-9\s]*,?\s+(\d{4})/i);
            if (dateMatch) {
                const parsedDate = new Date(`${dateMatch[1]} ${dateMatch[2]}, ${dateMatch[3]}`);
                if (!isNaN(parsedDate)) dateStr = parsedDate.toISOString().split('T')[0];
            }
        }

        const dbClient = await pool.connect();
        let currentCategory = null;
        let count = 0;

        await dbClient.query('BEGIN');

        try {
            for (const line of lines) {
                const cleanLine = line.trim();
                if (!cleanLine) continue;

                // Determine category from headers
                // Some headers might have noise before or after it, e.g. "Butter Incoterms..."
                if (cleanLine.match(/(^|\s+)Liquor/i)) currentCategory = 'Liquor';
                if (cleanLine.match(/(^|\s+)Butter/i)) currentCategory = 'Butter';
                if (cleanLine.match(/(^|\s+)Powder/i)) currentCategory = 'Powder';
                if (cleanLine.match(/(^|\s+)Combined/i)) currentCategory = 'Combined';

                for (const [catName, regions] of Object.entries(MAPPINGS)) {
                    if (currentCategory && currentCategory !== catName) continue;
                    for (const region of regions) {
                        // Fix exact string escape regex
                        const safeRegexStr = '^' + region.replace(/\./g, '\\.?').replace(/\s+/g, '\\s+') + '.*';
                        const safeRegex = new RegExp(safeRegexStr, 'i');
                        if (safeRegex.test(cleanLine)) {
                            // ── Strip currency price columns before extracting numbers ──
                            // The images contain £/€/$ price columns at the end of each row
                            // e.g. "Europe Liquid ex fctry LDN 1.95 1.95 - | £ 7,118 € 8,209 $ 9,531"
                            // These must be removed before parsing, otherwise they corrupt the ratio extraction.
                            // Strategy: cut the line at the first occurrence of | or £ or € or $
                            let lineToParse = cleanLine
                                .replace(/\|.*$/, '')          // cut at pipe |
                                .replace(/[£€$].*$/, '')        // cut at any currency symbol
                                .trim();

                            // Extract ALL decimal numbers from the cleaned line
                            const allNums = lineToParse.match(/\b(\d+[\.,]\d+)\b/g) || [];

                            // Filter to valid ratio range (0.5 to 9.99)
                            // - Lower bound 0.5: excludes tiny "Change" values (0.04, 0.02...)
                            // - Upper bound 9.99: safety net for any remaining outlier
                            const ratioNums = allNums
                                .map(n => parseFloat(n.replace(',', '.')))
                                .filter(n => !isNaN(n) && n >= 0.5 && n < 10);

                            if (ratioNums.length >= 1) {
                                // The LAST valid ratio number is the "Current Week" value
                                // For 2-column rows: [prev, current] → last = current ✓
                                // For 3-column rows: [prev, current, change(< 0.5, filtered)] → last = current ✓
                                const val = ratioNums[ratioNums.length - 1];
                                await dbClient.query(`
                                    INSERT INTO cocoa_product_ratios (date, category, region_product, ratio_value)
                                    VALUES ($1, $2, $3, $4)
                                    ON CONFLICT (date, category, region_product) DO NOTHING
                                `, [dateStr, catName, region, val]);
                                count++;
                                console.log(`  → [${catName}] ${region}: ${val}  (parsed from: "${lineToParse}")`);
                            } else {
                                console.warn(`  ⚠ No valid ratio found for [${catName}] ${region} | line: "${lineToParse}"`);
                            }
                            break;
                        }
                    }
                }
            }
            await dbClient.query('COMMIT');
            console.log(`[Choc Ratios OCR] Extracted Date: ${dateStr}. Parsed and synced ${count} rows!`);
        } catch (err) {
            await dbClient.query('ROLLBACK');
            throw err;
        } finally {
            dbClient.release();
        }

        return { success: true, count, date: dateStr };
    } catch (err) {
        console.error(`[Choc Ratios OCR] Tesseract Error:`, err);
        return { success: false, error: err.message };
    }
}
