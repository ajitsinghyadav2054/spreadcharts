/**
 * fix_null_rows.cjs
 *
 * One-time cleanup: deletes bad NULL rows (those inserted with the wrong column
 * mapping) from all 4 tables, then re-fetches the CFTC file and re-inserts
 * those dates with the correct mapping.
 *
 * Run with: node tools/fix_null_rows.cjs
 */
require('dotenv').config({ path: './server/.env' });
const { Pool } = require('pg');
const axios = require('axios');
const { parse } = require('csv-parse/sync');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const CFTC_URL = 'https://www.cftc.gov/dea/newcot/f_disagg.txt';

const MARKET_TO_TABLE = {
    'COFFEE C - ICE FUTURES U.S.': 'coffee_c',
    'COCOA - ICE FUTURES U.S.': 'cocoa',
    'COTTON NO. 2 - ICE FUTURES U.S.': 'cotton_no_2',
    'SUGAR NO. 11 - ICE FUTURES U.S.': 'sugar_no_11',
};

const TEXT_COLS = new Set([
    'market_and_exchange_names', 'as_of_date_in_form_yymmdd',
    'report_date_as_mm_dd_yyyy', 'cftc_contract_market_code',
    'cftc_market_code', 'cftc_region_code', 'cftc_commodity_code',
]);

const COLUMN_MAP = {
    0: 'market_and_exchange_names',
    1: 'as_of_date_in_form_yymmdd',
    2: 'report_date_as_mm_dd_yyyy',
    3: 'cftc_contract_market_code',
    4: 'cftc_market_code',
    5: 'cftc_region_code',
    6: 'cftc_commodity_code',
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
    22: 'nonrept_positions_short_all',
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

async function main() {
    try {
        // ── Step 1: Delete rows where cftc_contract_market_code IS NULL ─────
        console.log('\n=== Step 1: Deleting bad NULL rows from all tables ===');
        for (const [market, table] of Object.entries(MARKET_TO_TABLE)) {
            const res = await pool.query(
                `DELETE FROM ${table} WHERE cftc_contract_market_code IS NULL RETURNING report_date_as_mm_dd_yyyy`
            );
            if (res.rowCount > 0) {
                const dates = res.rows.map(r => {
                    const d = r.report_date_as_mm_dd_yyyy;
                    return d ? new Date(d).toISOString().split('T')[0] : 'unknown';
                });
                console.log(`  [${table}] Deleted ${res.rowCount} bad row(s) for dates: ${dates.join(', ')}`);
            } else {
                console.log(`  [${table}] No bad rows found — already clean.`);
            }
        }

        // ── Step 2: Re-fetch CFTC data ───────────────────────────────────────
        console.log('\n=== Step 2: Re-fetching CFTC data from CFTC.gov ===');
        const response = await axios.get(CFTC_URL);
        const records = parse(response.data, {
            columns: false,
            skip_empty_lines: true,
            relax_column_count: true,
            trim: true,
        });
        console.log(`  Parsed ${records.length} records from file.`);

        // ── Step 3: Re-insert with correct mapping ───────────────────────────
        console.log('\n=== Step 3: Re-inserting with correct column mapping ===');

        // Load existing dates again (post-delete)
        const existingDates = {};
        for (const table of Object.values(MARKET_TO_TABLE)) {
            const res = await pool.query(
                `SELECT report_date_as_mm_dd_yyyy FROM ${table} ORDER BY report_date_as_mm_dd_yyyy DESC LIMIT 200`
            );
            existingDates[table] = new Set(res.rows.map(r => {
                const d = new Date(r.report_date_as_mm_dd_yyyy);
                return d.toISOString().split('T')[0];
            }));
        }

        let inserted = 0;
        let skipped = 0;

        for (const row of records) {
            const marketName = row[0];
            if (!marketName) continue;

            const tableName = MARKET_TO_TABLE[marketName.trim()];
            if (!tableName) continue;

            const data = {};
            let hasError = false;

            for (const [idx, dbCol] of Object.entries(COLUMN_MAP)) {
                let val = row[Number(idx)];

                if (dbCol === 'report_date_as_mm_dd_yyyy') {
                    if (!val || String(val).trim().length < 6) val = row[1];
                    val = normalizeDate(val);
                    if (!val) { hasError = true; break; }

                } else if (dbCol === 'as_of_date_in_form_yymmdd') {
                    val = val ? String(val).trim() : null;

                } else if (TEXT_COLS.has(dbCol)) {
                    val = val ? String(val).trim() : null;

                } else {
                    const cleaned = val ? String(val).replace(/[, ]/g, '') : '';
                    val = cleaned !== '' && !isNaN(cleaned) ? parseInt(cleaned, 10) : null;
                }

                data[dbCol] = val;
            }

            if (hasError || !data.report_date_as_mm_dd_yyyy) continue;

            if (existingDates[tableName].has(data.report_date_as_mm_dd_yyyy)) {
                skipped++;
                continue;
            }

            // Insert
            const cols = Object.keys(data);
            const values = Object.values(data);
            const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');

            await pool.query(
                `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders})`,
                values
            );

            existingDates[tableName].add(data.report_date_as_mm_dd_yyyy);
            inserted++;
            console.log(`  [${tableName}] Inserted: ${marketName.trim()} → ${data.report_date_as_mm_dd_yyyy}`);
        }

        console.log(`\n✅ Done. Inserted: ${inserted}  Skipped (already exist): ${skipped}`);

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
    }
}

main();
