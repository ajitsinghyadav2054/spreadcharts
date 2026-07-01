// Manual full sync of all warehouse sections
// Safe: uses INSERT ... ON CONFLICT DO NOTHING (London bags, US bags)
// and ON CONFLICT DO UPDATE (ivory arrivals, london origin — these are always safe since they overwrite identical values)
// NO data deletion anywhere.

import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });

import { syncCocoaLondon } from './server/services/cocoaLondonSync.js';
import { syncCocoaBags } from './server/services/cocoaBagsSync.js';
import { syncAllLondonOrigins } from './server/services/cocoaLondonOriginSync.js';

// Ivory arrivals has a different file name on disk vs hardcoded path
import xlsx from 'xlsx';
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function syncIvoryArrivalsFixed() {
    // The actual file name is "Ivory coast Arrivals.xlsx" (not "Cocoa Arrivals-Ivory coast.xlsx")
    const filePath = 'C:\\Users\\Ajit.yadav\\hertshtengroup.com\\Dinesh Chinnadurai - Cocoa\\Arrivals\\Ivory coast Arrivals.xlsx';
    console.log('[IvoryFixed] Reading:', filePath);
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    console.log('[IvoryFixed] Sheet:', sheetName, '| Rows:', rawData.length);

    const client = await pool.connect();
    let upserted = 0;
    try {
        await client.query('BEGIN');
        for (let i = 2; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || row.length < 6) continue;
            const rawDate = row[4];
            const closeVal = row[5];
            let weeklyVal = row[6];
            if (weeklyVal === undefined || weeklyVal === null || isNaN(weeklyVal)) weeklyVal = null;
            if (!rawDate || isNaN(rawDate) || typeof rawDate !== 'number') continue;
            if (!closeVal || isNaN(closeVal)) continue;
            const dateObj = xlsx.SSF.parse_date_code(rawDate);
            const dateStr = `${dateObj.y}-${String(dateObj.m).padStart(2, '0')}-${String(dateObj.d).padStart(2, '0')}`;
            await client.query(`
                INSERT INTO cocoa_ivory_arrivals (date, close, weekly_changes)
                VALUES ($1, $2, $3)
                ON CONFLICT (date) DO UPDATE SET
                    close = EXCLUDED.close,
                    weekly_changes = EXCLUDED.weekly_changes
            `, [dateStr, closeVal, weeklyVal]);
            upserted++;
        }
        await client.query('COMMIT');
        console.log('[IvoryFixed] Done — Upserted:', upserted);
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('[IvoryFixed] Error:', e.message);
    } finally {
        client.release();
    }
}

async function runAllSyncs() {
    console.log('\n========================================');
    console.log('MANUAL WAREHOUSE SYNC — ALL SECTIONS');
    console.log('Safe: only inserts missing rows');
    console.log('========================================\n');

    console.log('--- 1. London Bags (aggregate_report.xlsx) ---');
    const r1 = await syncCocoaLondon();
    console.log('Result:', r1);

    console.log('\n--- 2. US Bags (Cocoa_Bags_Aggregate_final.xlsx) ---');
    const r2 = await syncCocoaBags();
    console.log('Result:', r2);

    console.log('\n--- 3. Ivory Coast Arrivals ---');
    await syncIvoryArrivalsFixed();

    console.log('\n--- 4. London Origin / Valid Stock by Origin ---');
    await syncAllLondonOrigins();

    console.log('\n========================================');
    console.log('ALL SYNCS COMPLETE');
    console.log('========================================\n');
    process.exit(0);
}

runAllSyncs().catch(e => { console.error('Fatal:', e); process.exit(1); });
