const axios = require('axios');
const { Client } = require('pg');
const { parse } = require('csv-parse/sync'); // Ensure csv-parse is available, or use custom parser

// Database connection
const DATABASE_URL = "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({
    connectionString: DATABASE_URL,
});

const CFTC_URL = 'https://www.cftc.gov/dea/newcot/f_disagg.txt';

const MARKET_TO_TABLE = {
    'COFFEE C - ICE FUTURES U.S.': 'coffee_c',
    'COCOA - ICE FUTURES U.S.': 'cocoa',
    'COTTON NO. 2 - ICE FUTURES U.S.': 'cotton_no_2',
    'SUGAR NO. 11 - ICE FUTURES U.S.': 'sugar_no_11'
};

const COLUMN_MAP = {
    0: 'market_and_exchange_names',
    2: 'report_date_as_mm_dd_yyyy',
    7: 'open_interest_all',
    8: 'prod_merc_positions_long_all',
    9: 'prod_merc_positions_short_all',
    10: 'swap_positions_long_all',
    11: 'swap_positions_short_all',
    12: 'swap_positions_spread_all',
    13: 'm_money_positions_long_all',
    14: 'm_money_positions_short_all',
    15: 'm_money_positions_spread_all',
    16: 'other_rept_positions_long_all',
    17: 'other_rept_positions_short_all',
    18: 'other_rept_positions_spread_all',
    19: 'tot_rept_positions_long_all',
    20: 'tot_rept_positions_short_all',
    21: 'nonrept_positions_long_all',
    22: 'nonrept_positions_short_all'
};

function normalizeDate(val) {
    if (!val) return null;
    const str = String(val).trim();
    if (str.match(/^\d{4}-\d{2}-\d{2}/)) return str.substring(0, 10);
    if (str.match(/^\d{6}$/)) {
        return `20${str.substring(0, 2)}-${str.substring(2, 4)}-${str.substring(4, 6)}`;
    }
    return null;
}

async function updateMarketData() {
    console.log('[Updater] Starting CFTC data fetch...');

    try {
        await client.connect();
        console.log('Connected to DB.');

        // 1. Fetch Data
        console.log(`[Updater] Fetching from ${CFTC_URL}...`);
        const response = await axios.get(CFTC_URL);
        const csvData = response.data;

        // 2. Parse CSV
        // Simple manual parse since csv-parse might not be installed or ESM
        // The file is comma separated, quoted strings?
        // CFTC text file is usually comma separated, quoted strings.

        const lines = csvData.split('\n');
        console.log(`[Updater] Downloaded ${lines.length} lines.`);

        let newCount = 0;
        let skipped = 0;

        for (const line of lines) {
            if (!line.trim()) continue;

            // Simple split by comma, ignoring quotes (CFTC format is usually simple)
            // But to be safe, we should respect quotes.
            // Start simple: strict split only if no quotes.
            const row = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            if (!row) continue;

            // Clean quotes
            const cleanRow = row.map(c => c.replace(/^"|"$/g, '').trim());

            const marketName = cleanRow[0];
            if (!marketName) continue;

            const tableName = MARKET_TO_TABLE[marketName.trim()];
            if (!tableName) continue;

            // Extract Data
            const data = {};
            let hasError = false;

            for (const [idx, dbCol] of Object.entries(COLUMN_MAP)) {
                let val = cleanRow[idx];

                if (dbCol === 'report_date_as_mm_dd_yyyy') {
                    if (!val || val.length < 6) val = cleanRow[1]; // Fallback
                    val = normalizeDate(val);
                    if (!val) hasError = true;
                }
                data[dbCol] = val;
            }

            if (hasError || !data.report_date_as_mm_dd_yyyy) continue;

            // Check Duplicate by querying DB
            const check = await client.query(
                `SELECT 1 FROM ${tableName} WHERE report_date_as_mm_dd_yyyy = $1::date`,
                [data.report_date_as_mm_dd_yyyy]
            );

            if (check.rowCount > 0) {
                skipped++;
                continue;
            }

            // Insert
            try {
                const cols = Object.keys(data);
                const values = Object.values(data);
                const placeHolders = cols.map((_, i) => `$${i + 1}`).join(', ');

                await client.query(
                    `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${placeHolders})`,
                    values
                );

                console.log(`[Updater] Inserted new record for ${marketName} on ${data.report_date_as_mm_dd_yyyy}`);
                newCount++;
            } catch (err) {
                console.error(`[Updater] Insert Error for ${marketName}: ${err.message}`);
            }
        }

        console.log(`[Updater] Update complete. ${newCount} new records inserted. ${skipped} duplicates skipped.`);

    } catch (err) {
        console.error('[Updater] Failed to update:', err.message);
    } finally {
        await client.end();
    }
}

updateMarketData();
