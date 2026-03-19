import XLSX from 'xlsx';

const file = 'C:\\\\Users\\\\Ajit.yadav\\\\hertshtengroup.com\\\\Dinesh Chinnadurai - Cocoa\\\\Stocks\\\\LDN cocoa\\\\Valid Stock by Origin\\\\Valid_Stock_By_Origin_CCO_2024-09-30-23-30-51.xlsx';
const wb = XLSX.readFile(file);
const sheetName = wb.SheetNames.includes('Valid Stock By Origin') ? 'Valid Stock By Origin' : wb.SheetNames[0];
const sheet = wb.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: null });

console.log('Row 7:', rows[7]);
console.log('Row 8:', rows[8]);
console.log('Row 9:', rows[9]);
console.log('Row 10:', rows[10]);
