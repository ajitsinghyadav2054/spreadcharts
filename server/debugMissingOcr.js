import Tesseract from 'tesseract.js';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const WATCH_DIR = "C:\\Users\\Ajit.yadav\\hertshtengroup.com\\Dinesh Chinnadurai - Cocoa\\Product Ratios Images";

async function verify(filename, searchString) {
    const imgPath = path.join(WATCH_DIR, filename);
    const { data: { text } } = await Tesseract.recognize(imgPath, 'eng');
    const lines = text.split('\n');
    for (const line of lines) {
        if (line.toLowerCase().includes(searchString.toLowerCase())) {
            console.log(`[${filename}] Found line: ${line}`);
        }
    }
}

async function run() {
    await verify('10-02-2025.png', 'Ghana Boxed');
    await verify('06-18-2025.png', 'U.S. Mid');
    await verify('06-26-2025.png', 'U.S. Mid');
    console.log("Done");
}
run();
