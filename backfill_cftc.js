import axios from 'axios';
import AdmZip from 'adm-zip';
import { parse } from 'csv-parse/sync';
import pool from './server/db.js';
import { MARKET_TO_TABLE, parseRow } from './server/services/cftcUpdater.js';

// Define the specific years to backfill (from 2006 to current year)
const START_YEAR = 2006;
const END_YEAR = new Date().getFullYear();

async function initTables() {
    const products = Object.values(MARKET_TO_TABLE);
    console.log('[Setup] Ensuring all tables exist for products:', products.join(', '));
    for (const table of products) {
        // We use coffee_c as the template. It's safe since all tables have exactly the same columns.
        await pool.query(`CREATE TABLE IF NOT EXISTS ${table} (LIKE coffee_c INCLUDING ALL);`);
    }
}

async function backfillYear(year) {
    const zipUrl = `https://www.cftc.gov/files/dea/history/fut_disagg_txt_${year}.zip`;
    console.log(`[Backfill] Downloading data for year ${year}...`);

    try {
        const response = await axios.get(zipUrl, { responseType: 'arraybuffer', timeout: 60000 });
        const zip = new AdmZip(response.data);

        let targetFile = `f_year.txt`;
        if (year <= 2010 && !zip.getEntry(targetFile)) {
            // In very old zips, the file could be named dynamically. Check first valid txt
            const entries = zip.getEntries();
            const txtEntry = entries.find(e => e.entryName.endsWith('.txt'));
            if (txtEntry) targetFile = txtEntry.entryName;
        }

        const zipEntry = zip.getEntry(targetFile);
        if (!zipEntry) {
            console.warn(`[Backfill] Could not find ${targetFile} in zip for year ${year}.`);
            return;
        }

        const csvData = zipEntry.getData().toString('utf8');
        const records = parse(csvData, {
            columns: false,
            skip_empty_lines: true,
            relax_column_count: true,
            trim: true,
        });

        console.log(`[Backfill] Year ${year} extracted: ${records.length} records. Processing...`);

        // Cache existing dates (to avoid inserting duplicates and making it idempotent)
        const existingDates = {};
        for (const table of Object.values(MARKET_TO_TABLE)) {
            const res = await pool.query(
                `SELECT report_date_as_mm_dd_yyyy FROM ${table} WHERE report_date_as_mm_dd_yyyy >= '${year}-01-01' AND report_date_as_mm_dd_yyyy <= '${year}-12-31'`
            );
            existingDates[table] = new Set(
                res.rows.map(r => {
                    const dbVal = r.report_date_as_mm_dd_yyyy;
                    if (dbVal instanceof Date) return dbVal.toISOString().split('T')[0];
                    if (typeof dbVal === 'string') return dbVal.split('T')[0];
                    return dbVal;
                })
            );
        }

        let insertedCount = 0;
        let skippedCount = 0;

        for (const row of records) {
            const marketName = row[0];
            if (!marketName) continue;

            // Normalize spacing/quotes in market name just in case
            const cleanedName = marketName.trim();
            const tableName = MARKET_TO_TABLE[cleanedName];
            if (!tableName) continue; // Only process our specified markets

            const data = parseRow(row);
            if (!data || !data.report_date_as_mm_dd_yyyy) continue;

            // Skip if we already have it
            if (existingDates[tableName].has(data.report_date_as_mm_dd_yyyy)) {
                skippedCount++;
                continue;
            }

            // Insert into the proper table
            try {
                const cols = Object.keys(data);
                const values = Object.values(data);
                const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
                await pool.query(
                    `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders})`,
                    values
                );
                existingDates[tableName].add(data.report_date_as_mm_dd_yyyy);
                insertedCount++;
            } catch (err) {
                console.error(`[Backfill] DB Error for ${cleanedName} on ${data.report_date_as_mm_dd_yyyy}: ${err.message}`);
            }
        }
        console.log(`[Backfill] Year ${year} Complete: Inserted ${insertedCount}, Skipped ${skippedCount}.`);
    } catch (err) {
        if (err.response && err.response.status === 404) {
            console.warn(`[Backfill] Year ${year} not found (404). Moving to next.`);
        } else {
            console.error(`[Backfill] Error fetching/parsing year ${year}:`, err.message);
        }
    }
}

async function run() {
    await initTables();

    for (let year = START_YEAR; year <= END_YEAR; year++) {
        await backfillYear(year);
    }

    console.log('[Backfill] Process completed.');
    process.exit(0);
}

run();
