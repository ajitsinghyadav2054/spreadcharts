// server/services/cocoaBagsSync.js
// Reads Cocoa_Bags_Aggregate_final.xlsx (Daily_Aggregate sheet)
// and UPSERTs rows into cocoa_us_bags table.
// Safe to run multiple times — skips dates already in DB.

import XLSX from 'xlsx';
import pool from '../db.js';

export const COCOA_BAGS_FILE = 'C:\\Users\\Ajit.yadav\\hertshtengroup.com\\Dinesh Chinnadurai - Cocoa\\Stocks\\US cocoa\\Cocoa_Bags_Aggregate_final.xlsx';

const SYNC_CONFIGS = [
    { sheetName: 'Daily_Aggregate', tableName: 'cocoa_us_bags' },
    { sheetName: 'Daily_Changes', tableName: 'cocoa_us_daily_changes' }
];

// Convert Excel serial date to YYYY-MM-DD string
function excelSerialToDate(serial) {
    // Excel serial day 1 = Jan 1, 1900 (with extra leap-year bug day built in)
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
}

// Map Excel column name → DB column name
const COL_MAP = {
    'Arriba (Ecuador)  Group B': 'arriba_ecuador_grp_b',
    'Cameroon  Group B': 'cameroon_grp_b',
    'Colombia  Group B': 'colombia_grp_b',
    'Ecuador  Group B': 'ecuador_grp_b',
    'Ghana  Group A': 'ghana_grp_a',
    'Ghana  Group B': 'ghana_grp_b',
    'Grenada  Group B': 'grenada_grp_b',
    'Haiti  Group C': 'haiti_grp_c',
    'Hispaniolas  Group B': 'hispaniolas_grp_b',
    'Indonesia  Group B': 'indonesia_grp_b',
    'Ivory Coast  Group A': 'ivory_coast_grp_a',
    'Ivory Coast  Group B': 'ivory_coast_grp_b',
    'Ivory Coast  Group C': 'ivory_coast_grp_c',
    'New Guinea  Group B': 'new_guinea_grp_b',
    'New Guinea  Group C': 'new_guinea_grp_c',
    'Nicaragua  Group B': 'nicaragua_grp_b',
    'Nigeria  Group A': 'nigeria_grp_a',
    'Nigeria  Group B': 'nigeria_grp_b',
    'Nigeria  Group C': 'nigeria_grp_c',
    'Panama  Group B': 'panama_grp_b',
    'Papua New Guinea  Group B': 'papua_new_guinea_grp_b',
    'Papua New Guinea  Group C': 'papua_new_guinea_grp_c',
    'Peru  Group B': 'peru_grp_b',
    'Sanchez  Group B': 'sanchez_grp_b',
    'Tanzania  Group B': 'tanzania_grp_b',
    'Tanzania  Group C': 'tanzania_grp_c',
    'Venezuela  Group B': 'venezuela_grp_b',
    'Total Bags': 'total_bags',
};

export async function syncCocoaBags() {
    console.log('[CocoaSync] Reading file:', COCOA_BAGS_FILE);

    const workbook = XLSX.readFile(COCOA_BAGS_FILE);
    let totalInserted = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const { sheetName, tableName } of SYNC_CONFIGS) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) {
            console.error(`[CocoaSync] Sheet "${sheetName}" not found!`);
            continue;
        }

        const rows = XLSX.utils.sheet_to_json(sheet, { defval: 0 });
        console.log(`[CocoaSync] ${rows.length} rows read from ${sheetName}`);

        const existingRes = await pool.query(`SELECT trade_date FROM ${tableName}`);
        const existingDates = new Set(
            existingRes.rows.map(r => {
                const d = r.trade_date;
                return d instanceof Date ? d.toISOString().split('T')[0] : String(d).split('T')[0];
            })
        );
        console.log(`[CocoaSync] ${existingDates.size} dates already in ${tableName}`);

        let inserted = 0;
        let skipped = 0;
        let errors = 0;

        for (const row of rows) {
            let dateStr;
            if (typeof row.Date === 'number') {
                const date = new Date(Math.round((row.Date - 25569) * 86400 * 1000));
                dateStr = date.toISOString().split('T')[0];
            } else if (row.Date instanceof Date) {
                dateStr = row.Date.toISOString().split('T')[0];
            } else if (typeof row.Date === 'string') {
                dateStr = row.Date.split('T')[0];
            } else {
                skipped++;
                continue;
            }

            if (existingDates.has(dateStr)) {
                skipped++;
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
                    `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT (trade_date) DO NOTHING`,
                    vals
                );
                existingDates.add(dateStr);
                inserted++;
            } catch (err) {
                errors++;
                if (errors <= 3) console.error(`[CocoaSync] Error on ${dateStr} for ${tableName}:`, err.message);
            }
        }

        console.log(`[CocoaSync] ${tableName} Done — Inserted: ${inserted}, Skipped: ${skipped}, Errors: ${errors}`);
        totalInserted += inserted;
        totalSkipped += skipped;
        totalErrors += errors;
    }

    return { inserted: totalInserted, skipped: totalSkipped, errors: totalErrors };
}
