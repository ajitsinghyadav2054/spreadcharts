// server/services/iceUpdater.js
// Downloads ICE COT annual CSVs and inserts new rows into the 3 ICE tables.
// ICE CSV URL pattern: https://www.ice.com/publicdocs/futures/COTHist{YEAR}.csv
// - Has a header row (unlike CFTC which is headerless)
// - Columns are Pascal_Case — we lowercase them to match DB snake_case cols

import axios from 'axios';
import { parse } from 'csv-parse/sync';
import pool from '../db.js';

// ── Market name → DB table ───────────────────────────────────
const ICE_MARKET_TO_TABLE = {
    'ICE Cocoa Futures - ICE Futures Europe':          'ice_london_cocoa',
    'ICE White Sugar Futures - ICE Futures Europe':    'ice_white_sugar',
    'ICE Robusta Coffee Futures - ICE Futures Europe': 'ice_robusta_coffee',
};

// ── ICE CSV header → DB column name ──────────────────────────
// The ICE CSV uses Pascal_Case headers that map 1-to-1 with our DB schema.
// We build the mapping dynamically by lowercasing and normalising.
// A few special cases that differ from the simple toLower transform are listed here.
const HEADER_OVERRIDES = {
    'As_of_Date_Form_MM/DD/YYYY': 'report_date_as_mm_dd_yyyy',
    'FutOnly_or_Combined':        'futonly_or_combined',
    // Truncated column name fix
    'Pct_of_OI_Other_Rept_Spread_Othr': 'pct_of_oi_other_rept_spread_othr',
    'Other_Rept_Positions_Spread_Othr':  'other_rept_positions_spread_othr',
};

function headerToDbCol(rawHeader) {
    if (HEADER_OVERRIDES[rawHeader]) return HEADER_OVERRIDES[rawHeader];
    return rawHeader.toLowerCase();
}

// ── Type helpers (mirrors cftcUpdater) ────────────────────────
const TEXT_COLS = new Set([
    'market_and_exchange_names', 'as_of_date_in_form_yymmdd', 'report_date_as_mm_dd_yyyy',
    'cftc_contract_market_code', 'cftc_market_code', 'cftc_region_code', 'cftc_commodity_code',
    'contract_units', 'cftc_subgroup_code', 'futonly_or_combined',
]);

const FLOAT_COLS = new Set([
    'pct_of_open_interest_all','pct_of_oi_prod_merc_long_all','pct_of_oi_prod_merc_short_all',
    'pct_of_oi_swap_long_all','pct_of_oi_swap_short_all','pct_of_oi_swap_spread_all',
    'pct_of_oi_m_money_long_all','pct_of_oi_m_money_short_all','pct_of_oi_m_money_spread_all',
    'pct_of_oi_other_rept_long_all','pct_of_oi_other_rept_short_all','pct_of_oi_other_rept_spread_all',
    'pct_of_oi_tot_rept_long_all','pct_of_oi_tot_rept_short_all',
    'pct_of_oi_nonrept_long_all','pct_of_oi_nonrept_short_all',
    'pct_of_open_interest_old','pct_of_oi_prod_merc_long_old','pct_of_oi_prod_merc_short_old',
    'pct_of_oi_swap_long_old','pct_of_oi_swap_short_old','pct_of_oi_swap_spread_old',
    'pct_of_oi_m_money_long_old','pct_of_oi_m_money_short_old','pct_of_oi_m_money_spread_old',
    'pct_of_oi_other_rept_long_old','pct_of_oi_other_rept_short_old','pct_of_oi_other_rept_spread_old',
    'pct_of_oi_tot_rept_long_old','pct_of_oi_tot_rept_short_old',
    'pct_of_oi_nonrept_long_old','pct_of_oi_nonrept_short_old',
    'pct_of_open_interest_other','pct_of_oi_prod_merc_long_other','pct_of_oi_prod_merc_short_other',
    'pct_of_oi_swap_long_other','pct_of_oi_swap_short_other','pct_of_oi_swap_spread_other',
    'pct_of_oi_m_money_long_other','pct_of_oi_m_money_short_other','pct_of_oi_m_money_spread_other',
    'pct_of_oi_other_rept_long_other','pct_of_oi_other_rept_short_other','pct_of_oi_other_rept_spread_othr',
    'pct_of_oi_tot_rept_long_other','pct_of_oi_tot_rept_short_other',
    'pct_of_oi_nonrept_long_other','pct_of_oi_nonrept_short_other',
    'conc_gross_le_4_tdr_long_all','conc_gross_le_4_tdr_short_all',
    'conc_gross_le_8_tdr_long_all','conc_gross_le_8_tdr_short_all',
    'conc_net_le_4_tdr_long_all','conc_net_le_4_tdr_short_all',
    'conc_net_le_8_tdr_long_all','conc_net_le_8_tdr_short_all',
    'conc_gross_le_4_tdr_long_old','conc_gross_le_4_tdr_short_old',
    'conc_gross_le_8_tdr_long_old','conc_gross_le_8_tdr_short_old',
    'conc_net_le_4_tdr_long_old','conc_net_le_4_tdr_short_old',
    'conc_net_le_8_tdr_long_old','conc_net_le_8_tdr_short_old',
    'conc_gross_le_4_tdr_long_other','conc_gross_le_4_tdr_short_other',
    'conc_gross_le_8_tdr_long_other','conc_gross_le_8_tdr_short_other',
    'conc_net_le_4_tdr_long_other','conc_net_le_4_tdr_short_other',
    'conc_net_le_8_tdr_long_other','conc_net_le_8_tdr_short_other',
]);

// Columns present in the ICE CSV that have no matching DB column — skip them
const SKIP_COLS = new Set([
    'market_and_exchange_names', // stored separately; not a DB col in ICE tables
    'as_of_date_in_form_yymmdd',
    'cftc_subgroup_code',
    'cftc_contract_market_code',
    'cftc_market_code',
    'cftc_region_code',
    'cftc_commodity_code',
]);

// DB columns that DO exist in the ICE tables (must match createIceTables.js schema)
const VALID_DB_COLS = new Set([
    'report_date_as_mm_dd_yyyy',
    'market_and_exchange_names',
    'as_of_date_in_form_yymmdd',
    'cftc_contract_market_code','cftc_market_code','cftc_region_code','cftc_commodity_code',
    'open_interest_all','prod_merc_positions_long_all','prod_merc_positions_short_all',
    'swap_positions_long_all','swap_positions_short_all','swap_positions_spread_all',
    'm_money_positions_long_all','m_money_positions_short_all','m_money_positions_spread_all',
    'other_rept_positions_long_all','other_rept_positions_short_all','other_rept_positions_spread_all',
    'tot_rept_positions_long_all','tot_rept_positions_short_all',
    'nonrept_positions_long_all','nonrept_positions_short_all',
    'open_interest_old','prod_merc_positions_long_old','prod_merc_positions_short_old',
    'swap_positions_long_old','swap_positions_short_old','swap_positions_spread_old',
    'm_money_positions_long_old','m_money_positions_short_old','m_money_positions_spread_old',
    'other_rept_positions_long_old','other_rept_positions_short_old','other_rept_positions_spread_old',
    'tot_rept_positions_long_old','tot_rept_positions_short_old',
    'nonrept_positions_long_old','nonrept_positions_short_old',
    'open_interest_other','prod_merc_positions_long_other','prod_merc_positions_short_other',
    'swap_positions_long_other','swap_positions_short_other','swap_positions_spread_other',
    'm_money_positions_long_other','m_money_positions_short_other','m_money_positions_spread_other',
    'other_rept_positions_long_other','other_rept_positions_short_other','other_rept_positions_spread_othr',
    'tot_rept_positions_long_other','tot_rept_positions_short_other',
    'nonrept_positions_long_other','nonrept_positions_short_other',
    'change_in_open_interest_all','change_in_prod_merc_long_all','change_in_prod_merc_short_all',
    'change_in_swap_long_all','change_in_swap_short_all','change_in_swap_spread_all',
    'change_in_m_money_long_all','change_in_m_money_short_all','change_in_m_money_spread_all',
    'change_in_other_rept_long_all','change_in_other_rept_short_all','change_in_other_rept_spread_all',
    'change_in_tot_rept_long_all','change_in_tot_rept_short_all',
    'change_in_nonrept_long_all','change_in_nonrept_short_all',
    'pct_of_open_interest_all','pct_of_oi_prod_merc_long_all','pct_of_oi_prod_merc_short_all',
    'pct_of_oi_swap_long_all','pct_of_oi_swap_short_all','pct_of_oi_swap_spread_all',
    'pct_of_oi_m_money_long_all','pct_of_oi_m_money_short_all','pct_of_oi_m_money_spread_all',
    'pct_of_oi_other_rept_long_all','pct_of_oi_other_rept_short_all','pct_of_oi_other_rept_spread_all',
    'pct_of_oi_tot_rept_long_all','pct_of_oi_tot_rept_short_all',
    'pct_of_oi_nonrept_long_all','pct_of_oi_nonrept_short_all',
    'pct_of_open_interest_old','pct_of_oi_prod_merc_long_old','pct_of_oi_prod_merc_short_old',
    'pct_of_oi_swap_long_old','pct_of_oi_swap_short_old','pct_of_oi_swap_spread_old',
    'pct_of_oi_m_money_long_old','pct_of_oi_m_money_short_old','pct_of_oi_m_money_spread_old',
    'pct_of_oi_other_rept_long_old','pct_of_oi_other_rept_short_old','pct_of_oi_other_rept_spread_old',
    'pct_of_oi_tot_rept_long_old','pct_of_oi_tot_rept_short_old',
    'pct_of_oi_nonrept_long_old','pct_of_oi_nonrept_short_old',
    'pct_of_open_interest_other','pct_of_oi_prod_merc_long_other','pct_of_oi_prod_merc_short_other',
    'pct_of_oi_swap_long_other','pct_of_oi_swap_short_other','pct_of_oi_swap_spread_other',
    'pct_of_oi_m_money_long_other','pct_of_oi_m_money_short_other','pct_of_oi_m_money_spread_other',
    'pct_of_oi_other_rept_long_other','pct_of_oi_other_rept_short_other','pct_of_oi_other_rept_spread_othr',
    'pct_of_oi_tot_rept_long_other','pct_of_oi_tot_rept_short_other',
    'pct_of_oi_nonrept_long_other','pct_of_oi_nonrept_short_other',
    'traders_tot_all','traders_prod_merc_long_all','traders_prod_merc_short_all',
    'traders_swap_long_all','traders_swap_short_all','traders_swap_spread_all',
    'traders_m_money_long_all','traders_m_money_short_all','traders_m_money_spread_all',
    'traders_other_rept_long_all','traders_other_rept_short_all','traders_other_rept_spread_all',
    'traders_tot_rept_long_all','traders_tot_rept_short_all',
    'traders_tot_old','traders_prod_merc_long_old','traders_prod_merc_short_old',
    'traders_swap_long_old','traders_swap_short_old','traders_swap_spread_old',
    'traders_m_money_long_old','traders_m_money_short_old','traders_m_money_spread_old',
    'traders_other_rept_long_old','traders_other_rept_short_old','traders_other_rept_spread_old',
    'traders_tot_rept_long_old','traders_tot_rept_short_old',
    'traders_tot_other','traders_prod_merc_long_other','traders_prod_merc_short_other',
    'traders_swap_long_other','traders_swap_spread_other',
    'traders_m_money_long_other','traders_m_money_short_other','traders_m_money_spread_other',
    'traders_other_rept_long_other','traders_other_rept_short_other','traders_other_rept_spread_other',
    'traders_tot_rept_long_other','traders_tot_rept_short_other',
    'conc_gross_le_4_tdr_long_all','conc_gross_le_4_tdr_short_all',
    'conc_gross_le_8_tdr_long_all','conc_gross_le_8_tdr_short_all',
    'conc_net_le_4_tdr_long_all','conc_net_le_4_tdr_short_all',
    'conc_net_le_8_tdr_long_all','conc_net_le_8_tdr_short_all',
    'conc_gross_le_4_tdr_long_old','conc_gross_le_4_tdr_short_old',
    'conc_gross_le_8_tdr_long_old','conc_gross_le_8_tdr_short_old',
    'conc_net_le_4_tdr_long_old','conc_net_le_4_tdr_short_old',
    'conc_net_le_8_tdr_long_old','conc_net_le_8_tdr_short_old',
    'conc_gross_le_4_tdr_long_other','conc_gross_le_4_tdr_short_other',
    'conc_gross_le_8_tdr_long_other','conc_gross_le_8_tdr_short_other',
    'conc_net_le_4_tdr_long_other','conc_net_le_4_tdr_short_other',
    'conc_net_le_8_tdr_long_other','conc_net_le_8_tdr_short_other',
    'contract_units','futonly_or_combined',
]);

function normalizeDate(val) {
    if (!val) return null;
    const s = String(val).trim();
    // MM/DD/YYYY → YYYY-MM-DD
    const mdY = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdY) return `${mdY[3]}-${mdY[1].padStart(2,'0')}-${mdY[2].padStart(2,'0')}`;
    if (s.match(/^\d{4}-\d{2}-\d{2}/)) return s.substring(0, 10);
    return null;
}

function coerceValue(dbCol, rawVal) {
    const s = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';
    if (dbCol === 'report_date_as_mm_dd_yyyy') return normalizeDate(s);
    if (TEXT_COLS.has(dbCol)) return s !== '' ? s : null;
    if (FLOAT_COLS.has(dbCol)) {
        const c = s.replace(/[, ]/g, '');
        return c !== '' && !isNaN(c) ? parseFloat(c) : null;
    }
    // Integer
    const c = s.replace(/[, ]/g, '');
    return c !== '' && !isNaN(c) ? parseInt(c, 10) : null;
}

// ── Parse one ICE CSV record (object with raw header keys) ──────
function parseRecord(rawRecord) {
    const data = {};
    for (const [rawHeader, rawVal] of Object.entries(rawRecord)) {
        const dbCol = headerToDbCol(rawHeader.trim());
        if (!VALID_DB_COLS.has(dbCol)) continue;
        data[dbCol] = coerceValue(dbCol, rawVal);
    }
    // Validate required primary key
    if (!data.report_date_as_mm_dd_yyyy) return null;
    return data;
}

// ── Fetch & parse one year's CSV ────────────────────────────────
async function fetchIceYear(year) {
    const url = `https://www.ice.com/publicdocs/futures/COTHist${year}.csv`;
    console.log(`[ICE] Fetching ${url}...`);
    const response = await axios.get(url, {
        timeout: 60000,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SpreadCharts/1.0)' },
    });
    const records = parse(response.data, {
        columns: true,            // ICE CSV has a header row
        skip_empty_lines: true,
        relax_column_count: true,
        trim: true,
    });
    console.log(`[ICE] ${year}: ${records.length} raw records`);
    return records;
}

// ── Insert new records for one table ────────────────────────────
async function insertRecords(tableName, records, existingDates) {
    let inserted = 0;
    let skipped = 0;
    for (const data of records) {
        const dateKey = data.report_date_as_mm_dd_yyyy;
        if (existingDates.has(dateKey)) { skipped++; continue; }
        try {
            const cols = Object.keys(data);
            const vals = Object.values(data);
            const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
            await pool.query(
                `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT (report_date_as_mm_dd_yyyy) DO NOTHING`,
                vals
            );
            existingDates.add(dateKey);
            inserted++;
        } catch (err) {
            console.error(`[ICE] DB insert error ${tableName} @ ${dateKey}: ${err.message}`);
        }
    }
    return { inserted, skipped };
}

// ── Load existing dates from DB for all 3 tables ─────────────────
async function loadExistingDates() {
    const existing = {};
    for (const table of Object.values(ICE_MARKET_TO_TABLE)) {
        const res = await pool.query(
            `SELECT report_date_as_mm_dd_yyyy FROM ${table} ORDER BY report_date_as_mm_dd_yyyy DESC`
        );
        existing[table] = new Set(res.rows.map(r => {
            const v = r.report_date_as_mm_dd_yyyy;
            return v instanceof Date ? v.toISOString().split('T')[0] : String(v).split('T')[0];
        }));
    }
    return existing;
}

// ── Process one year's records for all 3 markets ─────────────────
async function processYear(year, existingDates) {
    let records;
    try {
        records = await fetchIceYear(year);
    } catch (err) {
        console.error(`[ICE] Failed to fetch ${year}: ${err.message}`);
        return;
    }

    // Bucket by market → only FutOnly rows
    const buckets = {};
    for (const tableName of Object.values(ICE_MARKET_TO_TABLE)) buckets[tableName] = [];

    for (const rawRecord of records) {
        const marketName = String(rawRecord['Market_and_Exchange_Names'] || '').trim();
        const futOnly = String(rawRecord['FutOnly_or_Combined'] || '').trim();
        if (futOnly.toLowerCase() !== 'futonly') continue;

        const tableName = ICE_MARKET_TO_TABLE[marketName];
        if (!tableName) continue;

        const data = parseRecord(rawRecord);
        if (!data) continue;

        // Store market name in the data for reference
        data.market_and_exchange_names = marketName;
        buckets[tableName].push(data);
    }

    // Insert per table
    for (const [tableName, tableRecords] of Object.entries(buckets)) {
        if (tableRecords.length === 0) continue;
        const { inserted, skipped } = await insertRecords(tableName, tableRecords, existingDates[tableName]);
        console.log(`[ICE] ${year} ${tableName}: +${inserted} inserted, ${skipped} skipped`);
    }
}

// ── Main: update current year only (daily cron) ──────────────────
export async function updateIceData() {
    console.log('[ICE Updater] Starting incremental ICE COT update...');
    try {
        const existingDates = await loadExistingDates();
        const currentYear = new Date().getFullYear();
        await processYear(currentYear, existingDates);
        console.log('[ICE Updater] Done.');
        return { success: true };
    } catch (err) {
        console.error('[ICE Updater] Fatal error:', err.message);
        return { success: false, error: err.message };
    }
}

// ── Backfill: fetch all years from 2011 to today ─────────────────
export async function backfillIceData() {
    console.log('[ICE Backfill] Starting full historical backfill 2011 → present...');
    const existingDates = await loadExistingDates();
    const currentYear = new Date().getFullYear();
    let totalInserted = 0;

    for (let year = 2011; year <= currentYear; year++) {
        const before = Object.values(existingDates).reduce((a, s) => a + s.size, 0);
        await processYear(year, existingDates);
        const after = Object.values(existingDates).reduce((a, s) => a + s.size, 0);
        totalInserted += after - before;
    }

    console.log(`[ICE Backfill] Complete. Total rows inserted: ${totalInserted}`);
    return { success: true, totalInserted };
}
