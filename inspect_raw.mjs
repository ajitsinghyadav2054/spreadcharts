import XLSX from 'xlsx';

// Read the Excel to get the ACTUAL raw values for ECU on a known date
const file = 'C:\\Users\\Ajit.yadav\\hertshtengroup.com\\Dinesh Chinnadurai - Cocoa\\Stocks\\LDN cocoa\\Valid Stock by Origin\\Valid_Stock_By_Origin_CCO_2026-01-30-23-30-41.xlsx';
const wb = XLSX.readFile(file);
const sheet = wb.Sheets['Valid Stock By Origin'] || wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: null });

let originRowIdx = -1;
for (let i = 0; i < rows.length; i++) {
    if (rows[i].includes('Origin (Group #)')) { originRowIdx = i; break; }
}

const originRow = rows[originRowIdx];
const headerRow = rows[originRowIdx + 1];

// Build mapping
const gtIdx = headerRow.findIndex(h => typeof h === 'string' && h.includes('Grand Total'));
const colMapping = [];
if (gtIdx !== -1) colMapping.push({ colIdx: gtIdx, origin: 'GRAND_TOTAL', type: 'TOTAL' });

let currentOrigin = null;
for (let c = gtIdx + 1; c < Math.max(originRow.length, headerRow.length); c++) {
    const orgVal = originRow[c];
    if (typeof orgVal === 'string' && orgVal.trim().length > 0) {
        const m = orgVal.match(/([A-Za-z]+)/);
        currentOrigin = m ? m[1].toUpperCase() : orgVal.trim();
    }
    const headVal = headerRow[c];
    if (typeof headVal === 'string') {
        if (headVal.includes('SDUs, LDUs')) colMapping.push({ colIdx: c, origin: currentOrigin, type: 'SDU' });
        else if (headVal.includes('BDUs')) colMapping.push({ colIdx: c, origin: currentOrigin, type: 'BDU' });
    }
}

// Print the ECU, CAM, NIG mappings
const ecuMaps = colMapping.filter(m => ['ECU', 'CAM', 'NIG', 'GRAND_TOTAL'].includes(m.origin));
console.log('\n=== Column mapping for key origins ===');
ecuMaps.forEach(m => {
    console.log(`  origin=${m.origin}, type=${m.type}, colIdx=${m.colIdx}, header="${headerRow[m.colIdx]}"`);
});

// Now read TOTAL Valid row and print ECU, CAM raw values
const ageColIdx = gtIdx !== -1 ? gtIdx - 1 : 2;
console.log(`\n=== Data rows (ageColIdx=${ageColIdx}, first 10 rows) ===`);
for (let i = originRowIdx + 2; i < Math.min(originRowIdx + 25, rows.length); i++) {
    const row = rows[i];
    const age = row[ageColIdx] !== null ? String(row[ageColIdx]).trim() : null;
    if (!age) continue;
    if (age.includes('Legend')) break;

    // Get ECU, CAM values
    const ecuSduCol = colMapping.find(m => m.origin === 'ECU' && m.type === 'SDU')?.colIdx;
    const ecuBduCol = colMapping.find(m => m.origin === 'ECU' && m.type === 'BDU')?.colIdx;
    const camSduCol = colMapping.find(m => m.origin === 'CAM' && m.type === 'SDU')?.colIdx;
    const camBduCol = colMapping.find(m => m.origin === 'CAM' && m.type === 'BDU')?.colIdx;
    const gtTotalCol = colMapping.find(m => m.origin === 'GRAND_TOTAL')?.colIdx;

    console.log(`  age="${age}" | ECU_SDU(col${ecuSduCol})=${row[ecuSduCol]} | ECU_BDU(col${ecuBduCol})=${row[ecuBduCol]} | CAM_SDU(col${camSduCol})=${row[camSduCol]} | CAM_BDU(col${camBduCol})=${row[camBduCol]} | GT_TOTAL(col${gtTotalCol})=${row[gtTotalCol]}`);
}
