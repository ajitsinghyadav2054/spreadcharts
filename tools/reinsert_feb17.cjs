/**
 * reinsert_feb17.cjs
 * Deletes 2026-02-17 rows from all 4 tables and re-inserts with
 * the complete 188-column mapping from the live CFTC file.
 *
 * Run: node tools/reinsert_feb17.cjs
 */
require('dotenv').config({ path: './server/.env' });
const { Pool } = require('pg');
const axios = require('axios');
const { parse } = require('csv-parse/sync');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const MARKET_TO_TABLE = {
    'COFFEE C - ICE FUTURES U.S.': 'coffee_c',
    'COCOA - ICE FUTURES U.S.': 'cocoa',
    'COTTON NO. 2 - ICE FUTURES U.S.': 'cotton_no_2',
    'SUGAR NO. 11 - ICE FUTURES U.S.': 'sugar_no_11',
};

const ALL_DB_COLS = [
    'market_and_exchange_names', 'as_of_date_in_form_yymmdd', 'report_date_as_mm_dd_yyyy',
    'cftc_contract_market_code', 'cftc_market_code', 'cftc_region_code', 'cftc_commodity_code',
    'open_interest_all', 'prod_merc_positions_long_all', 'prod_merc_positions_short_all',
    'swap_positions_long_all', 'swap_positions_short_all', 'swap_positions_spread_all',
    'm_money_positions_long_all', 'm_money_positions_short_all', 'm_money_positions_spread_all',
    'other_rept_positions_long_all', 'other_rept_positions_short_all', 'other_rept_positions_spread_all',
    'tot_rept_positions_long_all', 'tot_rept_positions_short_all',
    'nonrept_positions_long_all', 'nonrept_positions_short_all',
    'open_interest_old', 'prod_merc_positions_long_old', 'prod_merc_positions_short_old',
    'swap_positions_long_old', 'swap_positions_short_old', 'swap_positions_spread_old',
    'm_money_positions_long_old', 'm_money_positions_short_old', 'm_money_positions_spread_old',
    'other_rept_positions_long_old', 'other_rept_positions_short_old', 'other_rept_positions_spread_old',
    'tot_rept_positions_long_old', 'tot_rept_positions_short_old',
    'nonrept_positions_long_old', 'nonrept_positions_short_old',
    'open_interest_other', 'prod_merc_positions_long_other', 'prod_merc_positions_short_other',
    'swap_positions_long_other', 'swap_positions_short_other', 'swap_positions_spread_other',
    'm_money_positions_long_other', 'm_money_positions_short_other', 'm_money_positions_spread_other',
    'other_rept_positions_long_other', 'other_rept_positions_short_other', 'other_rept_positions_spread_othr',
    'tot_rept_positions_long_other', 'tot_rept_positions_short_other',
    'nonrept_positions_long_other', 'nonrept_positions_short_other',
    'change_in_open_interest_all', 'change_in_prod_merc_long_all', 'change_in_prod_merc_short_all',
    'change_in_swap_long_all', 'change_in_swap_short_all', 'change_in_swap_spread_all',
    'change_in_m_money_long_all', 'change_in_m_money_short_all', 'change_in_m_money_spread_all',
    'change_in_other_rept_long_all', 'change_in_other_rept_short_all', 'change_in_other_rept_spread_all',
    'change_in_tot_rept_long_all', 'change_in_tot_rept_short_all',
    'change_in_nonrept_long_all', 'change_in_nonrept_short_all',
    'pct_of_open_interest_all', 'pct_of_oi_prod_merc_long_all', 'pct_of_oi_prod_merc_short_all',
    'pct_of_oi_swap_long_all', 'pct_of_oi_swap_short_all', 'pct_of_oi_swap_spread_all',
    'pct_of_oi_m_money_long_all', 'pct_of_oi_m_money_short_all', 'pct_of_oi_m_money_spread_all',
    'pct_of_oi_other_rept_long_all', 'pct_of_oi_other_rept_short_all', 'pct_of_oi_other_rept_spread_all',
    'pct_of_oi_tot_rept_long_all', 'pct_of_oi_tot_rept_short_all',
    'pct_of_oi_nonrept_long_all', 'pct_of_oi_nonrept_short_all',
    'pct_of_open_interest_old', 'pct_of_oi_prod_merc_long_old', 'pct_of_oi_prod_merc_short_old',
    'pct_of_oi_swap_long_old', 'pct_of_oi_swap_short_old', 'pct_of_oi_swap_spread_old',
    'pct_of_oi_m_money_long_old', 'pct_of_oi_m_money_short_old', 'pct_of_oi_m_money_spread_old',
    'pct_of_oi_other_rept_long_old', 'pct_of_oi_other_rept_short_old', 'pct_of_oi_other_rept_spread_old',
    'pct_of_oi_tot_rept_long_old', 'pct_of_oi_tot_rept_short_old',
    'pct_of_oi_nonrept_long_old', 'pct_of_oi_nonrept_short_old',
    'pct_of_open_interest_other', 'pct_of_oi_prod_merc_long_other', 'pct_of_oi_prod_merc_short_other',
    'pct_of_oi_swap_long_other', 'pct_of_oi_swap_short_other', 'pct_of_oi_swap_spread_other',
    'pct_of_oi_m_money_long_other', 'pct_of_oi_m_money_short_other', 'pct_of_oi_m_money_spread_other',
    'pct_of_oi_other_rept_long_other', 'pct_of_oi_other_rept_short_other', 'pct_of_oi_other_rept_spread_othr',
    'pct_of_oi_tot_rept_long_other', 'pct_of_oi_tot_rept_short_other',
    'pct_of_oi_nonrept_long_other', 'pct_of_oi_nonrept_short_other',
    'traders_tot_all', 'traders_prod_merc_long_all', 'traders_prod_merc_short_all',
    'traders_swap_long_all', 'traders_swap_short_all', 'traders_swap_spread_all',
    'traders_m_money_long_all', 'traders_m_money_short_all', 'traders_m_money_spread_all',
    'traders_other_rept_long_all', 'traders_other_rept_short_all', 'traders_other_rept_spread_all',
    'traders_tot_rept_long_all', 'traders_tot_rept_short_all',
    'traders_tot_old', 'traders_prod_merc_long_old', 'traders_prod_merc_short_old',
    'traders_swap_long_old', 'traders_swap_short_old', 'traders_swap_spread_old',
    'traders_m_money_long_old', 'traders_m_money_short_old', 'traders_m_money_spread_old',
    'traders_other_rept_long_old', 'traders_other_rept_short_old', 'traders_other_rept_spread_old',
    'traders_tot_rept_long_old', 'traders_tot_rept_short_old',
    'traders_tot_other', 'traders_prod_merc_long_other', 'traders_prod_merc_short_other',
    'traders_swap_long_other', 'traders_swap_spread_other',
    'traders_m_money_long_other', 'traders_m_money_short_other', 'traders_m_money_spread_other',
    'traders_other_rept_long_other', 'traders_other_rept_short_other', 'traders_other_rept_spread_other',
    'traders_tot_rept_long_other', 'traders_tot_rept_short_other',
    'conc_gross_le_4_tdr_long_all', 'conc_gross_le_4_tdr_short_all',
    'conc_gross_le_8_tdr_long_all', 'conc_gross_le_8_tdr_short_all',
    'conc_net_le_4_tdr_long_all', 'conc_net_le_4_tdr_short_all',
    'conc_net_le_8_tdr_long_all', 'conc_net_le_8_tdr_short_all',
    'conc_gross_le_4_tdr_long_old', 'conc_gross_le_4_tdr_short_old',
    'conc_gross_le_8_tdr_long_old', 'conc_gross_le_8_tdr_short_old',
    'conc_net_le_4_tdr_long_old', 'conc_net_le_4_tdr_short_old',
    'conc_net_le_8_tdr_long_old', 'conc_net_le_8_tdr_short_old',
    'conc_gross_le_4_tdr_long_other', 'conc_gross_le_4_tdr_short_other',
    'conc_gross_le_8_tdr_long_other', 'conc_gross_le_8_tdr_short_other',
    'conc_net_le_4_tdr_long_other', 'conc_net_le_4_tdr_short_other',
    'conc_net_le_8_tdr_long_other', 'conc_net_le_8_tdr_short_other',
    'contract_units', 'cftc_subgroup_code', 'futonly_or_combined', 'traders_swap_short_other',
];

const TEXT_COLS = new Set([
    'market_and_exchange_names', 'as_of_date_in_form_yymmdd', 'report_date_as_mm_dd_yyyy',
    'cftc_contract_market_code', 'cftc_market_code', 'cftc_region_code', 'cftc_commodity_code',
    'contract_units', 'cftc_subgroup_code', 'futonly_or_combined',
]);

const FLOAT_COLS = new Set([
    'pct_of_open_interest_all', 'pct_of_oi_prod_merc_long_all', 'pct_of_oi_prod_merc_short_all',
    'pct_of_oi_swap_long_all', 'pct_of_oi_swap_short_all', 'pct_of_oi_swap_spread_all',
    'pct_of_oi_m_money_long_all', 'pct_of_oi_m_money_short_all', 'pct_of_oi_m_money_spread_all',
    'pct_of_oi_other_rept_long_all', 'pct_of_oi_other_rept_short_all', 'pct_of_oi_other_rept_spread_all',
    'pct_of_oi_tot_rept_long_all', 'pct_of_oi_tot_rept_short_all',
    'pct_of_oi_nonrept_long_all', 'pct_of_oi_nonrept_short_all',
    'pct_of_open_interest_old', 'pct_of_oi_prod_merc_long_old', 'pct_of_oi_prod_merc_short_old',
    'pct_of_oi_swap_long_old', 'pct_of_oi_swap_short_old', 'pct_of_oi_swap_spread_old',
    'pct_of_oi_m_money_long_old', 'pct_of_oi_m_money_short_old', 'pct_of_oi_m_money_spread_old',
    'pct_of_oi_other_rept_long_old', 'pct_of_oi_other_rept_short_old', 'pct_of_oi_other_rept_spread_old',
    'pct_of_oi_tot_rept_long_old', 'pct_of_oi_tot_rept_short_old',
    'pct_of_oi_nonrept_long_old', 'pct_of_oi_nonrept_short_old',
    'pct_of_open_interest_other', 'pct_of_oi_prod_merc_long_other', 'pct_of_oi_prod_merc_short_other',
    'pct_of_oi_swap_long_other', 'pct_of_oi_swap_short_other', 'pct_of_oi_swap_spread_other',
    'pct_of_oi_m_money_long_other', 'pct_of_oi_m_money_short_other', 'pct_of_oi_m_money_spread_other',
    'pct_of_oi_other_rept_long_other', 'pct_of_oi_other_rept_short_other', 'pct_of_oi_other_rept_spread_othr',
    'pct_of_oi_tot_rept_long_other', 'pct_of_oi_tot_rept_short_other',
    'pct_of_oi_nonrept_long_other', 'pct_of_oi_nonrept_short_other',
    'conc_gross_le_4_tdr_long_all', 'conc_gross_le_4_tdr_short_all', 'conc_gross_le_8_tdr_long_all', 'conc_gross_le_8_tdr_short_all',
    'conc_net_le_4_tdr_long_all', 'conc_net_le_4_tdr_short_all', 'conc_net_le_8_tdr_long_all', 'conc_net_le_8_tdr_short_all',
    'conc_gross_le_4_tdr_long_old', 'conc_gross_le_4_tdr_short_old', 'conc_gross_le_8_tdr_long_old', 'conc_gross_le_8_tdr_short_old',
    'conc_net_le_4_tdr_long_old', 'conc_net_le_4_tdr_short_old', 'conc_net_le_8_tdr_long_old', 'conc_net_le_8_tdr_short_old',
    'conc_gross_le_4_tdr_long_other', 'conc_gross_le_4_tdr_short_other', 'conc_gross_le_8_tdr_long_other', 'conc_gross_le_8_tdr_short_other',
    'conc_net_le_4_tdr_long_other', 'conc_net_le_4_tdr_short_other', 'conc_net_le_8_tdr_long_other', 'conc_net_le_8_tdr_short_other',
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
            if (!val) return null;
        } else if (TEXT_COLS.has(dbCol)) {
            val = val !== undefined && val !== '' ? String(val).trim() : null;
        } else if (FLOAT_COLS.has(dbCol)) {
            const c = val ? String(val).replace(/[, ]/g, '') : '';
            val = c !== '' && !isNaN(c) ? parseFloat(c) : null;
        } else {
            const c = val ? String(val).replace(/[, ]/g, '') : '';
            val = c !== '' && !isNaN(c) ? parseInt(c, 10) : null;
        }
        data[dbCol] = val;
    }
    return data;
}

async function main() {
    // Step 1: Delete 2026-02-17 from all tables
    console.log('\n=== Deleting 2026-02-17 rows from all tables ===');
    for (const [, table] of Object.entries(MARKET_TO_TABLE)) {
        const res = await pool.query(
            `DELETE FROM ${table} WHERE report_date_as_mm_dd_yyyy = '2026-02-17' RETURNING id`
        );
        console.log(`  [${table}] Deleted ${res.rowCount} row(s)`);
    }

    // Step 2: Fetch CFTC current file
    console.log('\n=== Fetching CFTC file ===');
    const resp = await axios.get('https://www.cftc.gov/dea/newcot/f_disagg.txt', { timeout: 30000 });
    const records = parse(resp.data, {
        columns: false, skip_empty_lines: true, relax_column_count: true, trim: true
    });
    console.log(`  Parsed ${records.length} records.`);

    // Step 3: Insert with full 188-col mapping
    console.log('\n=== Re-inserting 2026-02-17 with 188-column mapping ===');
    let inserted = 0;
    for (const row of records) {
        const marketName = row[0];
        if (!marketName) continue;
        const tableName = MARKET_TO_TABLE[marketName.trim()];
        if (!tableName) continue;

        const data = parseRow(row);
        if (!data || !data.report_date_as_mm_dd_yyyy) continue;
        if (data.report_date_as_mm_dd_yyyy !== '2026-02-17') continue; // only Feb 17

        const cols = Object.keys(data);
        const values = Object.values(data);
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');

        await pool.query(
            `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders})`,
            values
        );
        inserted++;
        const nullCount = values.filter(v => v === null).length;
        console.log(`  ✅ [${tableName}] Inserted ${data.report_date_as_mm_dd_yyyy} | cols=${cols.length} | nulls=${nullCount}`);
    }

    // Step 4: Verify
    console.log('\n=== Verification ===');
    for (const [, table] of Object.entries(MARKET_TO_TABLE)) {
        const res = await pool.query(
            `SELECT report_date_as_mm_dd_yyyy, cftc_contract_market_code, open_interest_all,
                    (SELECT COUNT(*) FROM (
                        SELECT unnest(ARRAY[
                            cftc_contract_market_code::text, cftc_market_code,
                            cftc_region_code, open_interest_all::text
                        ]) AS v
                    ) t WHERE v IS NULL) AS null_key_cols
             FROM ${table} WHERE report_date_as_mm_dd_yyyy = '2026-02-17'`
        );
        if (res.rows.length === 0) {
            console.log(`  [${table}] ⚠️  No row for 2026-02-17`);
        } else {
            const r = res.rows[0];
            console.log(`  [${table}] contract=${r.cftc_contract_market_code} | oi=${r.open_interest_all} | null_key_cols=${r.null_key_cols}`);
        }
    }

    console.log(`\n✅ Done. Total inserted: ${inserted}`);
    await pool.end();
}

main().catch(e => { console.error('FATAL:', e.message); pool.end(); });
