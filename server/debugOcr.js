import Tesseract from 'tesseract.js';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const WATCH_DIR = "C:\\Users\\Ajit.yadav\\hertshtengroup.com\\Dinesh Chinnadurai - Cocoa\\Product Ratios Images";

const MAPPINGS = {
    'Liquor': ['Europe Liquid Liquor', 'Ivory Coast Boxed Liquor', 'Ghana Boxed Liquor', 'Africa Boxed Liquor'],
    'Butter': ['Europe Liquid', 'Ivory Coast Boxed', 'Ghana Boxed', 'Asia Natural', 'Asia Deodorized', 'African Blocks', 'USA Liquid Natural', 'USA Liquid Deodorized'],
    'Powder': ['Europe Powder', 'Ivory Coast Cake', 'Ghana Cake', 'Asia Natural Powder', 'U.S. Natural', 'U.S. Mid', 'U.S. High', 'European High'],
    'Combined': ['Europe', 'Ivory Coast', 'Ghana', 'Asia', 'United States']
};

async function debugImage(filename) {
    const imgPath = path.join(WATCH_DIR, filename);
    console.log(`\n${'='.repeat(70)}`);
    console.log(`OCR DEBUG: ${filename}`);
    console.log('='.repeat(70));

    const { data: { text } } = await Tesseract.recognize(imgPath, 'eng');
    const lines = text.split('\n');

    let currentCategory = null;

    for (const line of lines) {
        const cleanLine = line.trim();
        if (!cleanLine) continue;

        // Track category headers
        if (cleanLine.match(/(^|\s+)Liquor/i)) currentCategory = 'Liquor';
        if (cleanLine.match(/(^|\s+)Butter/i)) currentCategory = 'Butter';
        if (cleanLine.match(/(^|\s+)Powder/i)) currentCategory = 'Powder';
        if (cleanLine.match(/(^|\s+)Combined/i)) currentCategory = 'Combined';

        for (const [catName, regions] of Object.entries(MAPPINGS)) {
            for (const region of regions) {
                const safeRegexStr = '^' + region.replace(/\./g, '\\.?').replace(/\s+/g, '\\s+') + '.*';
                const safeRegex = new RegExp(safeRegexStr, 'i');
                if (safeRegex.test(cleanLine)) {
                    const allNums = (cleanLine.match(/\b(\d+[\.,]\d+)\b/g) || []);
                    const ratioNums = allNums
                        .map(n => parseFloat(n.replace(',', '.')))
                        .filter(n => !isNaN(n) && n >= 0.5);

                    const picked = ratioNums.length >= 1 ? ratioNums[ratioNums.length - 1] : '❌ NONE';

                    console.log(`\n  [${catName}] ${region}`);
                    console.log(`    Raw OCR line : "${cleanLine}"`);
                    console.log(`    All numbers  : [${allNums.join(', ')}]`);
                    console.log(`    Valid ratios : [${ratioNums.join(', ')}]`);
                    console.log(`    → PICKED VALUE: ${picked}`);
                }
            }
        }
    }
}

// Test on 3 different images - an early one, a mid-year one, and a recent one
const testImages = ['01-02-2025.png', '06-05-2025.png', '01-15-2026.png'];

for (const img of testImages) {
    await debugImage(img);
}

console.log('\n\n✅ Debug done!');
process.exit(0);
