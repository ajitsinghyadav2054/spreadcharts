import XLSX from 'xlsx';
const file = 'C:\\\\Users\\\\Ajit.yadav\\\\hertshtengroup.com\\\\Dinesh Chinnadurai - Cocoa\\\\Stocks\\\\LDN cocoa\\\\aggregate_report.xlsx';
const wb = XLSX.readFile(file);
console.log('Sheets:', wb.SheetNames);
if (wb.SheetNames.includes('Valid Stock By Origin')) {
    const sheet = wb.Sheets['Valid Stock By Origin'];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: null });
    console.log(JSON.stringify(rows.slice(0, 31), null, 2));
} else {
    console.log('Sheet not found. Available:', wb.SheetNames);
}
