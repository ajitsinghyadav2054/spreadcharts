import XLSX from 'xlsx';
import pool from '../db.js';

export const COCOA_LONDON_FILE = 'C:\\Users\\Ajit.yadav\\hertshtengroup.com\\Dinesh Chinnadurai - Cocoa\\Stocks\\LDN cocoa\\aggregate_report.xlsx';
const SHEET_NAME = 'Data';

// Map Excel column name → DB column name
const COL_MAP = {
    'valid_stocks': 'valid_stocks',
    'total_stock': 'total_stock',
    'Amsterdam': 'amsterdam',
    'Antwerp': 'antwerp',
    'Bremen': 'bremen',
    'Hamburg': 'hamburg',
    'Liverpool': 'liverpool',
    'London': 'london',
    'Rotterdam': 'rotterdam',
    'daily_valid_delta': 'daily_valid_delta',
    'daily_total_delta': 'daily_total_delta'
};

// Convert Excel serial date to YYYY-MM-DD string
function excelSerialToDate(serial) {
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
}

export async function syncCocoaLondon() {
    console.log('[CocoaLondonSync] Reading file:', COCOA_LONDON_FILE);

    const workbook = XLSX.readFile(COCOA_LONDON_FILE);
    let totalInserted = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    const sheet = workbook.Sheets[SHEET_NAME];
    if (!sheet) {
        console.error(`[CocoaLondonSync] Sheet "${SHEET_NAME}" not found!`);
        return;
    }

    const rows = XLSX.utils.sheet_to_json(sheet, { defval: 0 });
    console.log(`[CocoaLondonSync] ${rows.length} rows read from ${SHEET_NAME}`);

    const existingRes = await pool.query(`SELECT trade_date FROM cocoa_london_bags`);
    const existingDates = new Set(
        existingRes.rows.map(r => {
            const d = r.trade_date;
            return d instanceof Date ? d.toISOString().split('T')[0] : String(d).split('T')[0];
        })
    );
    console.log(`[CocoaLondonSync] ${existingDates.size} dates already in DB`);

    for (const row of rows) {
        let dateStr;
        if (typeof row.Date === 'number') {
            dateStr = excelSerialToDate(row.Date);
        } else if (row.Date instanceof Date) {
            dateStr = row.Date.toISOString().split('T')[0];
        } else if (typeof row.Date === 'string') {
            dateStr = row.Date.split('T')[0];
        } else {
            totalSkipped++;
            continue;
        }

        if (existingDates.has(dateStr)) {
            totalSkipped++;
            continue;
        }

        const dbRow = { trade_date: dateStr };
        for (const [excelCol, dbCol] of Object.entries(COL_MAP)) {
            dbRow[dbCol] = parseInt(row[excelCol] || 0, 10);
        }

        const cols = Object.keys(dbRow);
        const vals = Object.values(dbRow);
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');

        try {
            await pool.query(
                `INSERT INTO cocoa_london_bags (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT (trade_date) DO NOTHING`,
                vals
            );
            existingDates.add(dateStr);
            totalInserted++;
        } catch (err) {
            totalErrors++;
            if (totalErrors <= 3) console.error(`[CocoaLondonSync] Error on ${dateStr}:`, err.message);
        }
    }

    console.log(`[CocoaLondonSync] Done — Inserted: ${totalInserted}, Skipped: ${totalSkipped}, Errors: ${totalErrors}`);
    return { inserted: totalInserted, skipped: totalSkipped, errors: totalErrors };
}
