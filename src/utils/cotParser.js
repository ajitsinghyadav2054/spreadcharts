
import { COT_METRICS } from '../data/constants';

// CSV Column Mapping to Internal Metric IDs
export const CSV_MAPPING = {
    'Open_Interest_All': 'Open_Interest_All',
    'Prod_Merc_Positions_Long_All': 'Producer_Long_All',
    'Prod_Merc_Positions_Short_All': 'Producer_Short_All',
    'Swap_Positions_Long_All': 'Swap_Long_All',
    'Swap__Positions_Short_All': 'Swap_Short_All', // Note double underscore in CSV
    'Swap__Positions_Spread_All': 'Swap_Spread_All',
    'M_Money_Positions_Long_All': 'Managed_Money_Long_All',
    'M_Money_Positions_Short_All': 'Managed_Money_Short_All',
    'M_Money_Positions_Spread_All': 'Managed_Money_Spread_All',
    'Other_Rept_Positions_Long_All': 'Other_Rept_Long_All',
    'Other_Rept_Positions_Short_All': 'Other_Rept_Short_All',
    'Other_Rept_Positions_Spread_All': 'Other_Rept_Spread_All',
    'Tot_Rept_Positions_Long_All': 'Tot_Rept_Long_All',
    'Tot_Rept_Positions_Short_All': 'Tot_Rept_Short_All',
    'NonRept_Positions_Long_All': 'NonRept_Long_All',
    'NonRept_Positions_Short_All': 'NonRept_Short_All'
};

export function parseCOTData(csvText) {
    const lines = csvText.trim().split('\n');
    console.log(`[COT Parser] Starting parse. Input length: ${csvText.length}, Lines: ${lines.length}`);

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

    // Create map: Product -> Metric -> Data[]
    const dataMap = {};
    const productsSet = new Set();
    const instrumentsList = [];

    // Identify column indices
    const colIndices = {};
    Object.keys(CSV_MAPPING).forEach(csvCol => {
        const idx = headers.indexOf(csvCol);
        if (idx !== -1) colIndices[csvCol] = idx;
    });

    const dateIdx = headers.indexOf('Report_Date_as_YYYY-MM-DD');
    const nameIdx = headers.indexOf('Market_and_Exchange_Names');

    if (dateIdx === -1 || nameIdx === -1) {
        console.error("Critical columns missing in COT CSV");
        return { dataMap, instrumentsList: [] };
    }

    // Process rows
    let processedCount = 0;
    for (let i = 1; i < lines.length; i++) {
        try {
            // Handle potential CSV quoting issues (simplified)
            // Assuming standard CSV where names might be quoted
            const rowStr = lines[i];
            if (!rowStr) continue;

            // Simple regex split for CSV handling quotes
            const row = rowStr.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
            // The above regex is imperfect for complex CSVs but robust enough for this specific file structure
            // Actually, a simpler split matches the file better as it is standard CSV
            // Let's use a standard split but join quotes if needed.
            // Given the file view, it looks like standard CSV.
            // "WHEAT-SRW - CHICAGO BOARD OF TRADE",260203,...

            // Better split logic considering quotes
            const parts = [];
            let current = '';
            let inQuotes = false;
            for (let char of rowStr) {
                if (char === '"') inQuotes = !inQuotes;
                else if (char === ',' && !inQuotes) {
                    parts.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            parts.push(current.trim());

            if (parts.length < headers.length) continue;

            const rawName = parts[nameIdx].replace(/"/g, '');
            // Clean name (e.g. "WHEAT-SRW - CHICAGO BOARD OF TRADE" -> "WHEAT-SRW")
            // Or keep full name? Dashboard uses "SOYBEAN OIL".
            // File has "SOYBEANS - CHICAGO BOARD OF TRADE".
            // We need to normalize or map these names.
            // For now, let's use the FULL NAME from the file as the ID to avoid mismatches.
            const productName = rawName.split(' - ')[0].trim();

            const dateStr = parts[dateIdx];
            const dateParts = dateStr.split('-');
            const time = new Date(`${dateStr}T00:00:00Z`).getTime() / 1000;

            if (!dataMap[productName]) {
                dataMap[productName] = {};
                productsSet.add(productName);
                if (productName.includes('SOYBEAN OIL')) {
                    console.log(`[COT Parser] FOUND PRODUCT: ${productName}`);
                }
            }

            // Iterate relevant metrics
            Object.entries(CSV_MAPPING).forEach(([csvCol, internalId]) => {
                const idx = colIndices[csvCol];
                if (idx === undefined) return;

                const valStr = parts[idx];
                const value = parseFloat(valStr);

                if (!isNaN(value)) {
                    if (!dataMap[productName][internalId]) {
                        dataMap[productName][internalId] = [];
                    }
                    dataMap[productName][internalId].push({ time, value });
                }
            });
            processedCount++;
        } catch (err) {
            console.error(`[COT Parser] Error in row ${i}:`, err);
        }
    }
    console.log(`[COT Parser] Finished. Parsed ${processedCount} rows.`);

    // Sort data by time
    Object.keys(dataMap).forEach(prod => {
        Object.keys(dataMap[prod]).forEach(metric => {
            dataMap[prod][metric].sort((a, b) => a.time - b.time);
        });
    });

    // Generate Instruments List
    productsSet.forEach(product => {
        // Use default COT_METRICS to generate list, but ensure data exists?
        // Actually, we should only list what we found.
        Object.values(CSV_MAPPING).forEach(metricId => {
            // Find matching display name from original COT_METRICS constant
            const metricDef = COT_METRICS.find(m => m.id === metricId);
            const metricName = metricDef ? metricDef.name : metricId;

            instrumentsList.push({
                id: `${product}-${metricId}`,
                name: `${product} ${metricName}`,
                type: 'cot',
                category: product
            });
        });
    });

    return { dataMap, instrumentsList };
}
