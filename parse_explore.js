import XLSX from 'xlsx';

const file = 'C:\\\\Users\\\\Ajit.yadav\\\\hertshtengroup.com\\\\Dinesh Chinnadurai - Cocoa\\\\Stocks\\\\LDN cocoa\\\\Valid Stock by Origin\\\\Valid_Stock_By_Origin_CCO_2026-01-30-23-30-41.xlsx';
const wb = XLSX.readFile(file);
const sheet = wb.Sheets['Valid Stock By Origin'] || wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: null });

// 1. Find date
let tradeDate = null;
for (const row of rows) {
    for (let j = 0; j < row.length; j++) {
        const val = row[j];
        if (typeof val === 'string' && val.includes('as of :')) {
            const match = val.match(/as of :\s*(.*)/);
            if (match) {
                // Parse 30-Jan-2026
                const dateStr = match[1].trim();
                const d = new Date(dateStr);
                d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                tradeDate = d.toISOString().split('T')[0];
            }
        }
    }
    if (tradeDate) break;
}

console.log('Parsed Date:', tradeDate);

// 2. Find Origin Row
let originRowIdx = -1;
for (let i = 0; i < rows.length; i++) {
    if (rows[i].includes('Origin (Group #)')) {
        originRowIdx = i;
        break;
    }
}

if (originRowIdx !== -1) {
    const originRow = rows[originRowIdx];
    const headerRow = rows[originRowIdx + 1];

    // Parse mapping
    let currentOrigin = null;
    const colMapping = []; // Array of { colIdx, origin, type: 'SDU'|'BDU'|'GRAND' }

    // Check column 3 for Grand Total
    const gtIdx = headerRow.findIndex(h => typeof h === 'string' && h.includes('Grand Total'));
    if (gtIdx !== -1) {
        colMapping.push({ colIdx: gtIdx, origin: 'GRAND_TOTAL', type: 'TOTAL' });
    }

    for (let c = gtIdx + 1; c < Math.max(originRow.length, headerRow.length); c++) {
        const orgVal = originRow[c];
        if (typeof orgVal === 'string' && orgVal.trim().length > 0) {
            // Extract code like "CAM" from "CAM (1)"
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

    console.log('Mapping:', colMapping);

    // 3. Read data rows
    const startDataIdx = originRowIdx + 2;
    for (let i = startDataIdx; i < rows.length; i++) {
        const row = rows[i];
        const ageCategory = row[2] ? String(row[2]).trim() : null; // "Months Since Graded" is at index 2

        if (!ageCategory) continue;
        if (ageCategory.includes('Legend')) break; // End of table

        const rowData = { ageCategory, origins: {} };

        for (const map of colMapping) {
            const val = parseFloat(row[map.colIdx]) || 0;
            if (!rowData.origins[map.origin]) rowData.origins[map.origin] = { sdu: 0, bdu: 0, total: 0 };

            if (map.type === 'SDU') rowData.origins[map.origin].sdu = val;
            if (map.type === 'BDU') rowData.origins[map.origin].bdu = val;
            if (map.type === 'TOTAL') rowData.origins[map.origin].total = val;
        }

        console.log(JSON.stringify(rowData).substring(0, 150) + '...');
    }
}
