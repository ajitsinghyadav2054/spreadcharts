import xlsx from 'xlsx';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

export const COCOA_IVORY_ARRIVALS_FILE = "C:\\Users\\Ajit.yadav\\hertshtengroup.com\\Dinesh Chinnadurai - Cocoa\\Arrivals\\Ivory coast Arrivals.xlsx";

export async function syncIvoryArrivals() {
    console.log('[Ivory Arrivals] Starting sync from Excel...');
    try {
        console.log('[Ivory Arrivals] Reading Excel file... path:', COCOA_IVORY_ARRIVALS_FILE);
        const workbook = xlsx.readFile(COCOA_IVORY_ARRIVALS_FILE);
        console.log('[Ivory Arrivals] Excel file read successfully.');

        const sheetName = "Ivory coast Arrivals";
        const sheet = workbook.Sheets[sheetName] || workbook.Sheets[workbook.SheetNames[0]];
        const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        console.log('[Ivory Arrivals] Parsed sheet data. Rows:', rawData.length);

        console.log('[Ivory Arrivals] Connecting to database...');
        const client = await pool.connect();
        console.log('[Ivory Arrivals] Connected to database.');

        try {
            await client.query('BEGIN');

            const values = [];
            const params = [];
            let count = 0;

            for (let i = 2; i < rawData.length; i++) {
                const row = rawData[i];
                if (!row || row.length < 6) continue;

                const rawDate = row[4];
                const closeVal = row[5];
                let weeklyVal = row[6];

                if (weeklyVal === undefined || weeklyVal === null || isNaN(weeklyVal)) {
                    weeklyVal = null;
                }

                if (!rawDate || isNaN(rawDate) || typeof rawDate !== 'number') continue;

                const dateObj = xlsx.SSF.parse_date_code(rawDate);
                const dateStr = `${dateObj.y}-${String(dateObj.m).padStart(2, '0')}-${String(dateObj.d).padStart(2, '0')}`;

                if (!closeVal || isNaN(closeVal)) continue;

                count++;
                const pIndex = params.length;
                values.push(`($${pIndex + 1}, $${pIndex + 2}, $${pIndex + 3})`);
                params.push(dateStr, closeVal, weeklyVal);
            }

            if (values.length > 0) {
                console.log(`[Ivory Arrivals] Executing bulk upsert for ${count} rows...`);
                // Batch insert chunking to handle parameter limits safely
                const chunkSize = 1000;
                for (let i = 0; i < values.length; i += chunkSize) {
                    const chunkValues = values.slice(i, i + chunkSize);
                    // Params need to be re-indexed for the chunk
                    const chunkParams = params.slice(i * 3, (i + chunkSize) * 3);

                    const rewrittenValues = chunkValues.map((v, idx) => {
                        const baseIdx = idx * 3;
                        return `($${baseIdx + 1}, $${baseIdx + 2}, $${baseIdx + 3})`;
                    });

                    await client.query(`
                        INSERT INTO cocoa_ivory_arrivals (date, close, weekly_changes)
                        VALUES ${rewrittenValues.join(',')}
                        ON CONFLICT (date) DO UPDATE SET
                            close = EXCLUDED.close,
                            weekly_changes = EXCLUDED.weekly_changes
                    `, chunkParams);
                }
            }

            await client.query('COMMIT');
            console.log(`[Ivory Arrivals] Sync complete! Upserted ${count} records.`);
            return { success: true, count };
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('[Ivory Arrivals] Error during sync:', err);
        return { success: false, error: err.message };
    }
}
