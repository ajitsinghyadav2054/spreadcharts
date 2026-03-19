import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import pool from '../db.js';

export const COCOA_LONDON_ORIGIN_DIR = 'C:\\\\Users\\\\Ajit.yadav\\\\hertshtengroup.com\\\\Dinesh Chinnadurai - Cocoa\\\\Stocks\\\\LDN cocoa\\\\Valid Stock by Origin';

// Parse a single file
export async function syncLondonOriginFile(filePath) {
    if (!filePath.endsWith('.xlsx') || path.basename(filePath).startsWith('~')) return { skipped: 1 };

    // Only parse the origin files we care about
    if (!path.basename(filePath).startsWith('Valid_Stock')) return { skipped: 1 };

    console.log(`[LondonOriginSync] Reading: ${path.basename(filePath)}`);
    const wb = XLSX.readFile(filePath);
    const sheetName = wb.SheetNames.includes('Valid Stock By Origin') ? 'Valid Stock By Origin' : wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    if (!sheet) return { skipped: 1 };

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: null });

    let tradeDate = null;
    let originRowIdx = -1;

    for (let i = 0; i < Math.min(rows.length, 30); i++) {
        const row = rows[i];
        if (!tradeDate) {
            for (let j = 0; j < row.length; j++) {
                const val = row[j];
                if (typeof val === 'string' && val.includes('as of :')) {
                    const match = val.match(/as of :\s*(.*)/);
                    if (match) {
                        const d = new Date(match[1].trim());
                        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                        tradeDate = d.toISOString().split('T')[0];
                    }
                }
            }
        }
        if (row.includes('Origin (Group #)')) {
            originRowIdx = i;
            break;
        }
    }

    if (!tradeDate || originRowIdx === -1) {
        console.warn(`[LondonOriginSync] Could not find date or header row in ${path.basename(filePath)}. Expected 'as of :' and 'Origin (Group #)'`);
        return { skipped: 1 };
    }

    const originRow = rows[originRowIdx];
    const headerRow = rows[originRowIdx + 1];

    let currentOrigin = null;
    const colMapping = [];

    const gtIdx = headerRow.findIndex(h => typeof h === 'string' && h.includes('Grand Total'));
    if (gtIdx !== -1) {
        colMapping.push({ colIdx: gtIdx, origin: 'GRAND_TOTAL', type: 'TOTAL' });
    }

    for (let c = gtIdx + 1; c < Math.max(originRow.length, headerRow.length); c++) {
        const orgVal = originRow[c];
        if (typeof orgVal === 'string' && orgVal.trim().length > 0) {
            const m = orgVal.match(/([A-Za-z]+)/);
            currentOrigin = m ? m[1].toUpperCase() : orgVal.trim();
        }

        const headVal = headerRow[c];
        if (typeof headVal === 'string') {
            if (headVal.includes('SDUs, LDUs')) {
                colMapping.push({ colIdx: c, origin: currentOrigin, type: 'SDU' });
            } else if (headVal.includes('BDUs')) {
                colMapping.push({ colIdx: c, origin: currentOrigin, type: 'BDU' });
            }
        }
    }

    const client = await pool.connect();
    let totalInserted = 0;

    try {
        await client.query('BEGIN');

        const ageColIdx = gtIdx !== -1 ? gtIdx - 1 : 2;

        for (let i = originRowIdx + 2; i < rows.length; i++) {
            const row = rows[i];
            const ageCategoryVal = row[ageColIdx];
            const ageCategory = ageCategoryVal !== null && ageCategoryVal !== undefined ? String(ageCategoryVal).trim() : null;

            if (!ageCategory || ageCategory === '') continue;
            if (ageCategory.includes('Legend')) break;

            const originsData = {};

            for (const map of colMapping) {
                const val = parseFloat(row[map.colIdx]) || 0;
                if (!originsData[map.origin]) originsData[map.origin] = { sdu: 0, bdu: 0, total: 0 };

                if (map.type === 'SDU') originsData[map.origin].sdu = val;
                if (map.type === 'BDU') originsData[map.origin].bdu = val;
                if (map.type === 'TOTAL') originsData[map.origin].total = val;
            }

            // Insert records
            for (const [origin, data] of Object.entries(originsData)) {
                let totalMt = data.total;
                if (origin !== 'GRAND_TOTAL') {
                    totalMt = data.sdu + data.bdu;
                }

                // Skip completely zero rows for storage saving unless it's Grand Total or TOTAL age 
                if (data.sdu === 0 && data.bdu === 0 && totalMt === 0 && !ageCategory.includes('TOTAL Valid') && origin !== 'GRAND_TOTAL') {
                    continue;
                }

                await client.query(`
                    INSERT INTO cocoa_london_origin_stock 
                    (trade_date, age_category, origin, sdu_ldu_mt, bdu_mt, total_mt)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (trade_date, age_category, origin) 
                    DO UPDATE SET sdu_ldu_mt = EXCLUDED.sdu_ldu_mt, bdu_mt = EXCLUDED.bdu_mt, total_mt = EXCLUDED.total_mt
                `, [tradeDate, ageCategory, origin, data.sdu, data.bdu, totalMt]);

                totalInserted++;
            }
        }
        await client.query('COMMIT');
        console.log(`[LondonOriginSync] Synced ${totalInserted} records for ${tradeDate}`);
        return { inserted: totalInserted };
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(`[LondonOriginSync] Error syncing file: ${e.message}`);
        return { errors: 1 };
    } finally {
        client.release();
    }
}

export async function syncAllLondonOrigins() {
    console.log('[LondonOriginSync] Starting bulk sync pipeline...');
    let totalFiles = 0;
    try {
        const files = fs.readdirSync(COCOA_LONDON_ORIGIN_DIR);
        for (const file of files) {
            if (file.endsWith('.xlsx') && !file.startsWith('~')) {
                await syncLondonOriginFile(path.join(COCOA_LONDON_ORIGIN_DIR, file));
                totalFiles++;
            }
        }
    } catch (e) {
        console.error(`[LondonOriginSync] Directory error: ${e.message}`);
    }
    console.log(`[LondonOriginSync] Bulk sync completed for ${totalFiles} files.`);
}
