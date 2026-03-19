import XLSX from 'xlsx';

const file = 'C:\\Users\\Ajit.yadav\\hertshtengroup.com\\Dinesh Chinnadurai - Cocoa\\Stocks\\LDN cocoa\\Valid Stock by Origin\\Valid_Stock_By_Origin_CCO_2026-01-30-23-30-41.xlsx';
const wb = XLSX.readFile(file);
const sheet = wb.Sheets['Valid Stock By Origin'] || wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: null });

// Find origin row
let originRowIdx = -1;
for (let i = 0; i < rows.length; i++) {
    if (rows[i].includes('Origin (Group #)')) {
        originRowIdx = i;
        break;
    }
}

const originRow = rows[originRowIdx];
const headerRow = rows[originRowIdx + 1];

// Print out the first 30 columns of both rows to see the structure
console.log('\n=== Origin Row (first 30 cols) ===');
for (let i = 0; i < 30; i++) {
    if (originRow[i] !== null) console.log(`  col[${i}]: "${originRow[i]}"`);
}

console.log('\n=== Header Row (first 30 cols) ===');
for (let i = 0; i < 30; i++) {
    if (headerRow[i] !== null) console.log(`  col[${i}]: "${headerRow[i]}"`);
}

// Also print first data row to cross-check
const dataRow = rows[originRowIdx + 2];
console.log('\n=== First data row (first 30 cols) ===');
for (let i = 0; i < 30; i++) {
    if (dataRow && dataRow[i] !== null) console.log(`  col[${i}]: ${dataRow[i]}`);
}
