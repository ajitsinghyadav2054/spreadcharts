/**
 * fix_all_null_rows.cjs
 *
 * Comprehensive fix:
 * 1. Deletes all bad NULL rows (cftc_contract_market_code IS NULL) from all 4 tables
 * 2. Fetches BOTH the current file (f_disagg.txt) AND the 2026 historical zip
 *    to get data for 2026-02-10 and 2026-02-17
 * 3. Re-inserts with the COMPLETE 188-column mapping
 *
 * Run: node tools/fix_all_null_rows.cjs
 */

require('dotenv').config({ path: './server/.env' });
const { Pool } = require('pg');
const axios = require('axios');
const { parse } = require('csv-parse/sync');
const AdmZip = require('adm-zip');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const MARKET_TO_TABLE = {
    'COFFEE C - ICE FUTURES U.S.': 'coffee_c',
    'COCOA - ICE FUTURES U.S.': 'cocoa',
    'COTTON NO. 2 - ICE FUTURES U.S.': 'cotton_no_2',
    'SUGAR NO. 11 - ICE FUTURES U.S.': 'sugar_no_11',
};

// ── Complete 188-column mapping (CSV positional index → DB column name) ──────
// DB columns in ordinal order (matching the CSV columns in order):
const ALL_DB_COLS = [
    'market_and_exchange_names',        // 0
    'as_of_date_in_form_yymmdd',        // 1
    'report_date_as_mm_dd_yyyy',        // 2
    'cftc_contract_market_code',        // 3
    'cftc_market_code',                 // 4
    'cftc_region_code',                 // 5
    'cftc_commodity_code',              // 6
    'open_interest_all',                // 7
    'prod_merc_positions_long_all',     // 8
    'prod_merc_positions_short_all',    // 9
    'swap_positions_long_all',          // 10
    'swap_positions_short_all',         // 11
    'swap_positions_spread_all',        // 12
    'm_money_positions_long_all',       // 13
    'm_money_positions_short_all',      // 14
    'm_money_positions_spread_all',     // 15
    'other_rept_positions_long_all',    // 16
    'other_rept_positions_short_all',   // 17
    'other_rept_positions_spread_all',  // 18
    'tot_rept_positions_long_all',      // 19
    'tot_rept_positions_short_all',     // 20
    'nonrept_positions_long_all',       // 21
    'nonrept_positions_short_all',      // 22
    'open_interest_old',                // 23
    'prod_merc_positions_long_old',     // 24
    'prod_merc_positions_short_old',    // 25
    'swap_positions_long_old',          // 26
    'swap_positions_short_old',         // 27
    'swap_positions_spread_old',        // 28
    'm_money_positions_long_old',       // 29
    'm_money_positions_short_old',      // 30
    'm_money_positions_spread_old',     // 31
    'other_rept_positions_long_old',    // 32
    'other_rept_positions_short_old',   // 33
    'other_rept_positions_spread_old',  // 34
    'tot_rept_positions_long_old',      // 35
    'tot_rept_positions_short_old',     // 36
    'nonrept_positions_long_old',       // 37
    'nonrept_positions_short_old',      // 38
    'open_interest_other',              // 39
    'prod_merc_positions_long_other',   // 40
    'prod_merc_positions_short_other',  // 41
    'swap_positions_long_other',        // 42
    'swap_positions_short_other',       // 43
    'swap_positions_spread_other',      // 44
    'm_money_positions_long_other',     // 45
    'm_money_positions_short_other',    // 46
    'm_money_positions_spread_other',   // 47
    'other_rept_positions_long_other',  // 48
    'other_rept_positions_short_other', // 49
    'other_rept_positions_spread_othr', // 50
    'tot_rept_positions_long_other',    // 51
    'tot_rept_positions_short_other',   // 52
    'nonrept_positions_long_other',     // 53
    'nonrept_positions_short_other',    // 54
    'change_in_open_interest_all',      // 55
    'change_in_prod_merc_long_all',     // 56
    'change_in_prod_merc_short_all',    // 57
    'change_in_swap_long_all',          // 58
    'change_in_swap_short_all',         // 59
    'change_in_swap_spread_all',        // 60
    'change_in_m_money_long_all',       // 61
    'change_in_m_money_short_all',      // 62
    'change_in_m_money_spread_all',     // 63
    'change_in_other_rept_long_all',    // 64
    'change_in_other_rept_short_all',   // 65
    'change_in_other_rept_spread_all',  // 66
    'change_in_tot_rept_long_all',      // 67
    'change_in_tot_rept_short_all',     // 68
    'change_in_nonrept_long_all',       // 69
    'change_in_nonrept_short_all',      // 70
    'pct_of_open_interest_all',         // 71
    'pct_of_oi_prod_merc_long_all',     // 72
    'pct_of_oi_prod_merc_short_all',    // 73
    'pct_of_oi_swap_long_all',          // 74
    'pct_of_oi_swap_short_all',         // 75
    'pct_of_oi_swap_spread_all',        // 76
    'pct_of_oi_m_money_long_all',       // 77
    'pct_of_oi_m_money_short_all',      // 78
    'pct_of_oi_m_money_spread_all',     // 79
    'pct_of_oi_other_rept_long_all',    // 80
    'pct_of_oi_other_rept_short_all',   // 81
    'pct_of_oi_other_rept_spread_all',  // 82
    'pct_of_oi_tot_rept_long_all',      // 83
    'pct_of_oi_tot_rept_short_all',     // 84
    'pct_of_oi_nonrept_long_all',       // 85
    'pct_of_oi_nonrept_short_all',      // 86
    'pct_of_open_interest_old',         // 87
    'pct_of_oi_prod_merc_long_old',     // 88
    'pct_of_oi_prod_merc_short_old',    // 89
    'pct_of_oi_swap_long_old',          // 90
    'pct_of_oi_swap_short_old',         // 91
    'pct_of_oi_swap_spread_old',        // 92
    'pct_of_oi_m_money_long_old',       // 93
    'pct_of_oi_m_money_short_old',      // 94
    'pct_of_oi_m_money_spread_old',     // 95
    'pct_of_oi_other_rept_long_old',    // 96
    'pct_of_oi_other_rept_short_old',   // 97
    'pct_of_oi_other_rept_spread_old',  // 98
    'pct_of_oi_tot_rept_long_old',      // 99
    'pct_of_oi_tot_rept_short_old',     // 100
    'pct_of_oi_nonrept_long_old',       // 101
    'pct_of_oi_nonrept_short_old',      // 102
    'pct_of_open_interest_other',       // 103
    'pct_of_oi_prod_merc_long_other',   // 104
    'pct_of_oi_prod_merc_short_other',  // 105
    'pct_of_oi_swap_long_other',        // 106
    'pct_of_oi_swap_short_other',       // 107
    'pct_of_oi_swap_spread_other',      // 108
    'pct_of_oi_m_money_long_other',     // 109
    'pct_of_oi_m_money_short_other',    // 110
    'pct_of_oi_m_money_spread_other',   // 111
    'pct_of_oi_other_rept_long_other',  // 112
    'pct_of_oi_other_rept_short_other', // 113
    'pct_of_oi_other_rept_spread_othr', // 114
    'pct_of_oi_tot_rept_long_other',    // 115
    'pct_of_oi_tot_rept_short_other',   // 116
    'pct_of_oi_nonrept_long_other',     // 117
    'pct_of_oi_nonrept_short_other',    // 118
    'traders_tot_all',                  // 119
    'traders_prod_merc_long_all',       // 120
    'traders_prod_merc_short_all',      // 121
    'traders_swap_long_all',            // 122
    'traders_swap_short_all',           // 123
    'traders_swap_spread_all',          // 124
    'traders_m_money_long_all',         // 125
    'traders_m_money_short_all',        // 126
    'traders_m_money_spread_all',       // 127
    'traders_other_rept_long_all',      // 128
    'traders_other_rept_short_all',     // 129
    'traders_other_rept_spread_all',    // 130
    'traders_tot_rept_long_all',        // 131
    'traders_tot_rept_short_all',       // 132
    'traders_tot_old',                  // 133
    'traders_prod_merc_long_old',       // 134
    'traders_prod_merc_short_old',      // 135
    'traders_swap_long_old',            // 136
    'traders_swap_short_old',           // 137
    'traders_swap_spread_old',          // 138
    'traders_m_money_long_old',         // 139
    'traders_m_money_short_old',        // 140
    'traders_m_money_spread_old',       // 141
    'traders_other_rept_long_old',      // 142
    'traders_other_rept_short_old',     // 143
    'traders_other_rept_spread_old',    // 144
    'traders_tot_rept_long_old',        // 145
    'traders_tot_rept_short_old',       // 146
    'traders_tot_other',                // 147
    'traders_prod_merc_long_other',     // 148
    'traders_prod_merc_short_other',    // 149
    'traders_swap_long_other',          // 150
    'traders_swap_spread_other',        // 151
    'traders_m_money_long_other',       // 152
    'traders_m_money_short_other',      // 153
    'traders_m_money_spread_other',     // 154
    'traders_other_rept_long_other',    // 155
    'traders_other_rept_short_other',   // 156
    'traders_other_rept_spread_other',  // 157
    'traders_tot_rept_long_other',      // 158
    'traders_tot_rept_short_other',     // 159
    'conc_gross_le_4_tdr_long_all',     // 160
    'conc_gross_le_4_tdr_short_all',    // 161
    'conc_gross_le_8_tdr_long_all',     // 162
    'conc_gross_le_8_tdr_short_all',    // 163
    'conc_net_le_4_tdr_long_all',       // 164
    'conc_net_le_4_tdr_short_all',      // 165
    'conc_net_le_8_tdr_long_all',       // 166
    'conc_net_le_8_tdr_short_all',      // 167
    'conc_gross_le_4_tdr_long_old',     // 168
    'conc_gross_le_4_tdr_short_old',    // 169
    'conc_gross_le_8_tdr_long_old',     // 170
    'conc_gross_le_8_tdr_short_old',    // 171
    'conc_net_le_4_tdr_long_old',       // 172
    'conc_net_le_4_tdr_short_old',      // 173
    'conc_net_le_8_tdr_long_old',       // 174
    'conc_net_le_8_tdr_short_old',      // 175
    'conc_gross_le_4_tdr_long_other',   // 176
    'conc_gross_le_4_tdr_short_other',  // 177
    'conc_gross_le_8_tdr_long_other',   // 178
    'conc_gross_le_8_tdr_short_other',  // 179
    'conc_net_le_4_tdr_long_other',     // 180
    'conc_net_le_4_tdr_short_other',    // 181
    'conc_net_le_8_tdr_long_other',     // 182
    'conc_net_le_8_tdr_short_other',    // 183
    'contract_units',                   // 184
    'cftc_subgroup_code',               // 185
    'futonly_or_combined',              // 186
    'traders_swap_short_other',         // 187
];

// Columns that are text (not numeric)
const TEXT_COLS = new Set([
    'market_and_exchange_names', 'as_of_date_in_form_yymmdd', 'report_date_as_mm_dd_yyyy',
    'cftc_contract_market_code', 'cftc_market_code', 'cftc_region_code', 'cftc_commodity_code',
    'contract_units', 'cftc_subgroup_code', 'futonly_or_combined',
]);

// Columns that are decimal/float (percentage, concentration)
const FLOAT_COLS = new Set([
    'pct_of_open_interest_all', 'pct_of_oi_prod_merc_long_all', 'pct_of_oi_prod_merc_short_all',
    'pct_of_oi_swap_long_all', 'pct_of_oi_swap_short_all', 'pct_of_oi_swap_spread_all',
    'pct_of_oi_m_money_long_all', 'pct_of_oi_m_money_short_all', 'pct_of_oi_m_money_spread_all',
    'pct_of_oi_other_rept_long_all', 'pct_of_oi_other_rept_short_all', 'pct_of_oi_other_rept_spread_all',
    'pct_of_oi_tot_rept_long_all', 'pct_of_oi_tot_rept_short_all', 'pct_of_oi_nonrept_long_all',
    'pct_of_oi_nonrept_short_all',
    'pct_of_open_interest_old', 'pct_of_oi_prod_merc_long_old', 'pct_of_oi_prod_merc_short_old',
    'pct_of_oi_swap_long_old', 'pct_of_oi_swap_short_old', 'pct_of_oi_swap_spread_old',
    'pct_of_oi_m_money_long_old', 'pct_of_oi_m_money_short_old', 'pct_of_oi_m_money_spread_old',
    'pct_of_oi_other_rept_long_old', 'pct_of_oi_other_rept_short_old', 'pct_of_oi_other_rept_spread_old',
    'pct_of_oi_tot_rept_long_old', 'pct_of_oi_tot_rept_short_old', 'pct_of_oi_nonrept_long_old',
    'pct_of_oi_nonrept_short_old',
    'pct_of_open_interest_other', 'pct_of_oi_prod_merc_long_other', 'pct_of_oi_prod_merc_short_other',
    'pct_of_oi_swap_long_other', 'pct_of_oi_swap_short_other', 'pct_of_oi_swap_spread_other',
    'pct_of_oi_m_money_long_other', 'pct_of_oi_m_money_short_other', 'pct_of_oi_m_money_spread_other',
    'pct_of_oi_other_rept_long_other', 'pct_of_oi_other_rept_short_other', 'pct_of_oi_other_rept_spread_othr',
    'pct_of_oi_tot_rept_long_other', 'pct_of_oi_tot_rept_short_other', 'pct_of_oi_nonrept_long_other',
    'pct_of_oi_nonrept_short_other',
    'conc_gross_le_4_tdr_long_all', 'conc_gross_le_4_tdr_short_all', 'conc_gross_le_8_tdr_long_all',
    'conc_gross_le_8_tdr_short_all', 'conc_net_le_4_tdr_long_all', 'conc_net_le_4_tdr_short_all',
    'conc_net_le_8_tdr_long_all', 'conc_net_le_8_tdr_short_all',
    'conc_gross_le_4_tdr_long_old', 'conc_gross_le_4_tdr_short_old', 'conc_gross_le_8_tdr_long_old',
    'conc_gross_le_8_tdr_short_old', 'conc_net_le_4_tdr_long_old', 'conc_net_le_4_tdr_short_old',
    'conc_net_le_8_tdr_long_old', 'conc_net_le_8_tdr_short_old',
    'conc_gross_le_4_tdr_long_other', 'conc_gross_le_4_tdr_short_other', 'conc_gross_le_8_tdr_long_other',
    'conc_gross_le_8_tdr_short_other', 'conc_net_le_4_tdr_long_other', 'conc_net_le_4_tdr_short_other',
    'conc_net_le_8_tdr_long_other', 'conc_net_le_8_tdr_short_other',
]);

function normalizeDate(val) {
    if (!val) return null;
    const str = String(val).trim();
    if (str.match(/^\d{4}-\d{2}-\d{2}/)) return str.substring(0, 10);
    if (str.match(/^\d{6}$/)) return `20${str.substring(0, 2)}-${str.substring(2, 4)}-${str.substring(4, 6)}`;
    return null;
}

function parseRow(row) {
    const data = {};
    for (let i = 0; i < ALL_DB_COLS.length; i++) {
        const dbCol = ALL_DB_COLS[i];
        let val = row[i];

        if (dbCol === 'report_date_as_mm_dd_yyyy') {
            if (!val || String(val).trim().length < 6) val = row[1];
            val = normalizeDate(val);
            if (!val) return null; // skip this row

        } else if (TEXT_COLS.has(dbCol)) {
            val = val ? String(val).trim() : null;

        } else if (FLOAT_COLS.has(dbCol)) {
            const cleaned = val ? String(val).replace(/[, ]/g, '') : '';
            val = cleaned !== '' && !isNaN(cleaned) ? parseFloat(cleaned) : null;

        } else {
            // Integer numeric column
            const cleaned = val ? String(val).replace(/[, ]/g, '') : '';
            val = cleaned !== '' && !isNaN(cleaned) ? parseInt(cleaned, 10) : null;
        }

        data[dbCol] = val;
    }
    return data;
}

async function insertRows(records, existingDates) {
    let inserted = 0;
    let skipped = 0;

    for (const row of records) {
        const marketName = row[0];
        if (!marketName) continue;

        const tableName = MARKET_TO_TABLE[marketName.trim()];
        if (!tableName) continue;

        const data = parseRow(row);
        if (!data || !data.report_date_as_mm_dd_yyyy) continue;

        if (existingDates[tableName].has(data.report_date_as_mm_dd_yyyy)) {
            skipped++;
            continue;
        }

        const cols = Object.keys(data);
        const values = Object.values(data);
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');

        try {
            await pool.query(
                `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders})`,
                values
            );
            existingDates[tableName].add(data.report_date_as_mm_dd_yyyy);
            inserted++;
            console.log(`  ✅ [${tableName}] Inserted: ${data.report_date_as_mm_dd_yyyy}`);
        } catch (err) {
            console.error(`  ❌ [${tableName}] Insert error on ${data.report_date_as_mm_dd_yyyy}: ${err.message}`);
        }
    }
    return { inserted, skipped };
}

async function main() {
    try {
        // ── Step 1: Delete all bad NULL rows ─────────────────────────────────
        console.log('\n=== Step 1: Deleting bad NULL rows ===');
        for (const [, table] of Object.entries(MARKET_TO_TABLE)) {
            const res = await pool.query(
                `DELETE FROM ${table} WHERE cftc_contract_market_code IS NULL RETURNING report_date_as_mm_dd_yyyy`
            );
            if (res.rowCount > 0) {
                const dates = res.rows.map(r => r.report_date_as_mm_dd_yyyy
                    ? new Date(r.report_date_as_mm_dd_yyyy).toISOString().split('T')[0] : 'no-date');
                console.log(`  [${table}] Deleted ${res.rowCount} rows: ${dates.join(', ')}`);
            } else {
                console.log(`  [${table}] No bad rows found.`);
            }
        }

        // ── Load existing dates ───────────────────────────────────────────────
        const existingDates = {};
        for (const table of Object.values(MARKET_TO_TABLE)) {
            const res = await pool.query(`SELECT report_date_as_mm_dd_yyyy FROM ${table}`);
            existingDates[table] = new Set(res.rows.map(r =>
                new Date(r.report_date_as_mm_dd_yyyy).toISOString().split('T')[0]
            ));
        }

        // ── Step 2: Fetch and process the 2026 historical zip ────────────────
        console.log('\n=== Step 2: Fetching 2026 historical zip from CFTC ===');
        let totalInserted = 0;
        let totalSkipped = 0;

        try {
            const zipRes = await axios.get(
                'https://www.cftc.gov/files/dea/history/fut_disagg_txt_2026.zip',
                { responseType: 'arraybuffer', timeout: 30000 }
            );
            const zip = new AdmZip(Buffer.from(zipRes.data));
            const entries = zip.getEntries();
            console.log(`  Zip contains ${entries.length} files.`);

            for (const entry of entries) {
                if (!entry.entryName.toLowerCase().endsWith('.txt')) continue;
                console.log(`  Processing: ${entry.entryName}`);
                const content = entry.getData().toString('utf8');
                const records = parse(content, {
                    columns: false, skip_empty_lines: true,
                    relax_column_count: true, trim: true,
                });
                console.log(`    Parsed ${records.length} records.`);
                const { inserted, skipped } = await insertRows(records, existingDates);
                totalInserted += inserted;
                totalSkipped += skipped;
            }
        } catch (zipErr) {
            console.warn(`  ⚠️  Could not fetch zip: ${zipErr.message}`);
            console.warn('  Will fall back to current file only.');
        }

        // ── Step 3: Fetch current CFTC file (latest week) ───────────────────
        console.log('\n=== Step 3: Fetching current CFTC file (latest week) ===');
        const curRes = await axios.get('https://www.cftc.gov/dea/newcot/f_disagg.txt', { timeout: 30000 });
        const curRecords = parse(curRes.data, {
            columns: false, skip_empty_lines: true,
            relax_column_count: true, trim: true,
        });
        console.log(`  Parsed ${curRecords.length} records.`);
        const { inserted: ins2, skipped: sk2 } = await insertRows(curRecords, existingDates);
        totalInserted += ins2;
        totalSkipped += sk2;

        console.log(`\n✅ All done. Total inserted: ${totalInserted} | Skipped (already exist): ${totalSkipped}`);

    } catch (err) {
        console.error('❌ Fatal error:', err.message);
    } finally {
        await pool.end();
    }
}

main();
