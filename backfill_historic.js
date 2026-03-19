import axios from 'axios';
import AdmZip from 'adm-zip';
import { parse } from 'csv-parse/sync';
import pool from './server/db.js';
import { MARKET_TO_TABLE, parseRow } from './server/services/cftcUpdater.js';

// The CFTC provides a combined zip covering 2006-2016 for disaggregated data
const HIST_URL = 'https://www.cftc.gov/files/dea/history/fut_disagg_txt_hist_2006_2016.zip';

async function processRecords(records, description) {
    // Cache ALL existing dates for all tables upfront (no year filter - full check)
    console.log(`[Backfill] Building existing-date cache...`);
    const existingDates = {};
    for (const table of Object.values(MARKET_TO_TABLE)) {
        const res = await pool.query(
            `SELECT report_date_as_mm_dd_yyyy FROM ${table}`
        );
        existingDates[table] = new Set(
            res.rows.map(r => {
                const dbVal = r.report_date_as_mm_dd_yyyy;
                if (dbVal instanceof Date) return dbVal.toISOString().split('T')[0];
                if (typeof dbVal === 'string') return dbVal.split('T')[0];
                return dbVal;
            })
        );
        console.log(`  ${table}: ${existingDates[table].size} existing dates`);
    }

    let insertedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const row of records) {
        const marketName = row[0];
        if (!marketName) continue;

        const cleanedName = marketName.trim();
        const tableName = MARKET_TO_TABLE[cleanedName];
        if (!tableName) continue; // Only process our specified markets

        const data = parseRow(row);
        if (!data || !data.report_date_as_mm_dd_yyyy) continue;

        // Skip if already in DB
        if (existingDates[tableName].has(data.report_date_as_mm_dd_yyyy)) {
            skippedCount++;
            continue;
        }

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
            if (insertedCount % 50 === 0) {
                console.log(`  [Progress] ${insertedCount} inserted so far...`);
            }
        } catch (err) {
            errorCount++;
            if (errorCount <= 5) {
                console.error(`  [Error] ${cleanedName} on ${data.report_date_as_mm_dd_yyyy}: ${err.message}`);
            }
        }
    }

    console.log(`[Done] ${description}: Inserted ${insertedCount}, Skipped ${skippedCount}, Errors ${errorCount}`);
}

async function run() {
    console.log(`[Backfill] Downloading combined historical file (2006-2016)...`);
    console.log(`  URL: ${HIST_URL}`);

    const response = await axios.get(HIST_URL, {
        responseType: 'arraybuffer',
        timeout: 300000,  // 5 minutes
        onDownloadProgress: (p) => {
            if (p.total) {
                const pct = Math.round((p.loaded / p.total) * 100);
                if (pct % 10 === 0) process.stdout.write(`\r  Download: ${pct}%`);
            }
        }
    });

    console.log(`\n[Backfill] Downloaded ${(response.data.length / 1024 / 1024).toFixed(1)} MB. Extracting...`);

    const zip = new AdmZip(response.data);
    const entries = zip.getEntries();
    console.log(`[Backfill] Files in zip: ${entries.map(e => e.entryName).join(', ')}`);

    let allRecords = [];

    for (const entry of entries) {
        if (entry.entryName.endsWith('.txt') || entry.entryName.endsWith('.csv')) {
            console.log(`[Backfill] Parsing: ${entry.entryName} (${(entry.header.size / 1024 / 1024).toFixed(1)} MB)`);
            const csvData = entry.getData().toString('utf8');
            const records = parse(csvData, {
                columns: false,
                skip_empty_lines: true,
                relax_column_count: true,
                trim: true,
            });
            console.log(`  → ${records.length} records extracted`);
            allRecords = allRecords.concat(records);
        }
    }

    console.log(`[Backfill] Total records to process: ${allRecords.length}`);
    await processRecords(allRecords, '2006-2016 historical file');

    console.log('[Backfill] Completed! Verifying final counts...');
    const tables = Object.values(MARKET_TO_TABLE);
    for (const t of tables) {
        const r = await pool.query(`SELECT count(*) FROM ${t}`);
        console.log(`  ${t}: ${r.rows[0].count} rows total`);
    }

    process.exit(0);
}

run().catch(err => {
    console.error('[Fatal]', err.message);
    process.exit(1);
});
