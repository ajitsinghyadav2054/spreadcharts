import xlsx from 'xlsx';

const filePath = "C:\\Users\\Ajit.yadav\\hertshtengroup.com\\Dinesh Chinnadurai - Cocoa\\Arrivals\\Cocoa Arrivals-Ivory coast.xlsx";
const workbook = xlsx.readFile(filePath);

console.log("Sheet Names:", workbook.SheetNames);

const sheetName = "Ivory coast Arrivals";
if (workbook.Sheets[sheetName]) {
    const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    console.log("First 10 rows of 'Ivory coast Arrivals':");
    console.log(rawData.slice(0, 10));
} else {
    console.log("Sheet not found, parsing first sheet instead");
    const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
    console.log("First 10 rows of", workbook.SheetNames[0]);
    console.log(rawData.slice(0, 10));
}
