import express from 'express';
import axios from 'axios';
import pool from './db.js';
import fs from 'fs';
import path from 'path';

// OI contract groups — mirrors src/data/oiContracts.js (server-side copy)
export const OI_GROUPS = [
    // Cocoa & Softs (First Section)
    { category: 'Cocoa', code: 'C', name: 'London Cocoa', contracts: ['LCCK26', 'LCCN26', 'LCCU26', 'LCCZ26', 'LCCH27', 'LCCK27', 'LCCN27', 'LCCU27', 'LCCZ27'] },
    { category: 'Cocoa', code: 'CC', name: 'NY Cocoa', contracts: ['CCK26', 'CCN26', 'CCU26', 'CCZ26', 'CCH27', 'CCK27', 'CCN27', 'CCU27', 'CCZ27'] },
    { category: 'Cocoa', code: 'KC', name: 'KC Arabica', contracts: ['KCK26', 'KCN26', 'KCU26', 'KCZ26', 'KCH27', 'KCK27', 'KCN27', 'KCU27', 'KCZ27', 'KCH28'] },
    { category: 'Cocoa', code: 'RC', name: 'Robusta', contracts: ['LKCK26', 'LKCN26', 'LKCU26', 'LKCX26', 'LKCF27', 'LKCH27', 'LKCK27', 'LKCN27', 'LKCU27'] },
    { category: 'Cocoa', code: 'CT', name: 'Cotton', contracts: ['CTK26', 'CTN26', 'CTV26', 'CTZ26', 'CTH27', 'CTK27', 'CTN27', 'CTZ27'] },
    { category: 'Cocoa', code: 'SB', name: 'Raw Sugar', contracts: ['SGK26', 'SGN26', 'SGV26', 'SGH27', 'SGK27', 'SGN27', 'SGV27', 'SGH28', 'SGK28', 'SGN28', 'SGV28'] },
    { category: 'Cocoa', code: 'W', name: 'White Sugar', contracts: ['LSGK26', 'LSGQ26', 'LSGV26', 'LSGZ26', 'LSGH27', 'LSGK27', 'LSGQ27', 'LSGV27', 'LSGZ27', 'LSGH28', 'LSGK28', 'LSGQ28', 'LSGV28'] },

    // Other Products (Second Section)
    { category: 'Other Products', code: 'DC', name: 'Milk Class III', contracts: ['DCH26', 'DCJ26', 'DCK26', 'DCM26', 'DCN26', 'DCQ26', 'DCU26', 'DCV26', 'DCX26', 'DCZ26', 'DCF27', 'DCG27', 'DCH27', 'DCJ27', 'DCK27'] },
    { category: 'Other Products', code: 'OJ', name: 'Orange Juice', contracts: ['OJK26', 'OJN26', 'OJU26', 'OJX26', 'OJF27', 'OJH27', 'OJK27'] },
    { category: 'Other Products', code: 'CSC', name: 'Cash Settled Cheese', contracts: ['CSCH26', 'CSCJ26', 'CSCK26', 'CSCM26', 'CSCN26', 'CSCQ26', 'CSCU26', 'CSCV26', 'CSCX26', 'CSCZ26', 'CSCF27', 'CSCG27', 'CSCH27', 'CSCJ27', 'CSCK27'] },
    { category: 'Other Products', code: 'ZR', name: 'Rough Rice', contracts: ['ZRK26', 'ZRN26', 'ZRU26', 'ZRX26', 'ZRF27', 'ZRH27'] },
    { category: 'Other Products', code: 'LBR', name: 'Lumber', contracts: ['LBRK26', 'LBRN26', 'LBRU26', 'LBRX26', 'LBRF27'] },
    { category: 'Other Products', code: 'OTS', name: 'Oats', contracts: ['OTSK26', 'OTSN26', 'OTSU26', 'OTSZ26', 'OTSH27'] },
];

const router = express.Router();

// Map product display names to table names
const PRODUCT_TABLES = {
    'COCOA': 'cocoa',
    'COFFEE C': 'coffee_c',
    'COTTON NO. 2': 'cotton_no_2',
    'SUGAR NO. 11': 'sugar_no_11',
    'CHEESE (CASH SETTLED)': 'cheese_cash_settled',
    'ROUGH RICE': 'rough_rice',
    'BUTTER (CASH SETTLED)': 'butter_cash_settled',
    'MILK CLASS III': 'milk_class_3',
    'NON FAT DRY MILK': 'non_fat_dry_milk',
    'CME MILK IV': 'cme_milk_4',
    'FRZN CONCENTRATED ORANGE JUICE': 'frzn_concentrated_orange_juice'
};

// GET /api/cftc-data
router.get('/cftc-data', async (req, res) => {
    try {
        const {
            market,
            limit = 100,
            offset = 0
        } = req.query;

        console.log(`[Backend] GET /cftc-data market=${market} limit=${limit} offset=${offset}`);

        if (!market) {
            return res.status(400).json({ success: false, error: 'Market parameter is required' });
        }

        const tableName = PRODUCT_TABLES[market];
        if (!tableName) {
            return res.status(400).json({ success: false, error: 'Invalid market' });
        }

        let queryText = `SELECT * FROM ${tableName} ORDER BY report_date_as_mm_dd_yyyy DESC LIMIT $1 OFFSET $2`;
        const { rows } = await pool.query(queryText, [limit, offset]);

        res.json({
            success: true,
            count: rows.length,
            data: rows
        });

    } catch (error) {
        console.error('Error executing query', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            details: error.message
        });
    }
});

// GET /api/products — return available product names
router.get('/products', async (req, res) => {
    try {
        const products = Object.keys(PRODUCT_TABLES).sort();
        console.log('[Backend] Returning products:', products);
        res.json({ success: true, data: products });
    } catch (error) {
        console.error('Error fetching products', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/ohlc-proxy — proxy for external OHLC API
router.get('/ohlc-proxy', async (req, res) => {
    try {
        const { instrument, interval = '1D', count = 200 } = req.query;
        if (!instrument) {
            return res.status(400).json({ success: false, error: 'Instrument is required' });
        }

        // External API URL (Updated as per user requirement)
        const apiUrl = `https://qh-api.corp.hertshtengroup.com/api/ohlc/`;

        // Forward request
        const response = await axios.get(apiUrl, {
            params: {
                products: instrument,
                timeIntervals: interval,
                // Note: 'count' is not shown in the new endpoint screenshot, 
                // but we keep it in the backend logic for now if it's supported as an extra param.
                // If it's not supported, the API will likely just ignore it.
                count,
            },
            headers: {
                'Authorization': `Bearer ${process.env.QH_API_TOKEN}`,
                'Accept': 'application/json'
            }
        });

        res.json({ success: true, data: response.data });
    } catch (error) {
        console.error('Error in OHLC proxy:', error.message);
        if (error.response) {
            res.status(error.response.status).json({ success: false, error: error.response.data });
        } else {
            res.status(500).json({ success: false, error: 'Failed to fetch external data' });
        }
    }
});

// GET /api/columns — get columns from one of the product tables
router.get('/columns', async (req, res) => {
    try {
        // Use coffee_c as the template for columns
        const { rows } = await pool.query(
            `SELECT column_name FROM information_schema.columns 
             WHERE table_name = 'coffee_c' 
             ORDER BY ordinal_position`
        );

        const EXCLUDE = new Set([
            'id', 'market_and_exchange_names', 'as_of_date_in_form_yymmdd',
            'report_date_as_mm_dd_yyyy', 'cftc_contract_market_code',
            'cftc_market_code', 'cftc_region_code', 'cftc_commodity_code',
            'contract_units', 'cftc_subgroup_code', 'futonly_or_combined'
        ]);

        const columns = rows
            .map(r => r.column_name)
            .filter(name => !EXCLUDE.has(name))
            .map(name => ({
                id: name,
                name: name
                    .split('_')
                    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' '),
            }));

        res.json({ success: true, data: columns });
    } catch (error) {
        console.error('Error fetching columns', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/v2/ohlc — proxy for V2 OHLC API
router.get('/v2/ohlc', async (req, res) => {
    try {
        const { instruments, interval = '1D', count = 50, start, end } = req.query;

        if (!instruments) {
            return res.status(400).json({ success: false, error: 'Instruments parameter is required' });
        }

        console.log(`[Backend] Proxying v2 OHLC request for: ${instruments} (${interval})`);

        // External API URL (V2)
        // Adjust domain if needed based on environment
        const apiDomain = 'https://qh-api.corp.hertshtengroup.com';
        const apiUrl = `${apiDomain}/api/v2/ohlc/`;

        const params = {
            instruments,
            interval,
            count
        };

        if (start) params.start = start;
        if (end) params.end = end;

        const token = process.env.QH_API_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // fallback
        const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

        const response = await axios.get(apiUrl, {
            params,
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json'
            }
        });

        // The v2 API returns the data directly, so we just forward it
        res.json(response.data);

    } catch (error) {
        console.error('Error in V2 OHLC proxy:', error.message);
        if (error.response) {
            console.error('External API Response:', error.response.data);
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ success: false, error: 'Failed to fetch external data' });
        }
    }
});

// ══ Cocoa Backend Custom SpreadCharts Endpoints ══

router.get('/cocoa-bags', async (req, res) => {
    try {
        const { table } = req.query;
        if (!['cocoa_us_bags', 'cocoa_us_daily_changes', 'cocoa_london_bags', 'cocoa_london_daily_changes'].includes(table)) {
            return res.status(400).json({ error: 'Invalid table' });
        }
        const { rows } = await pool.query(`SELECT TO_CHAR(trade_date, 'YYYY-MM-DD') as report_date_as_mm_dd_yyyy, * FROM ${table} ORDER BY trade_date ASC`);
        res.json({ success: true, count: rows.length, data: rows });
    } catch (err) {
        console.error('[/cocoa-bags] ERROR:', err.message);
        res.status(500).json({ error: err.message });
    }
});

router.get('/cocoa-london-origin', async (req, res) => {
    try {
        const { ageCategory = 'TOTAL Valid', metric = 'total_mt' } = req.query;
        const query = `
            SELECT TO_CHAR(trade_date, 'YYYY-MM-DD') as date, origin, age_category, total_mt, sdu_ldu_mt, bdu_mt 
            FROM cocoa_london_origin_stock
            WHERE age_category = $1
            ORDER BY trade_date ASC;
        `;
        console.log("EXEC QUERY:", query, "WITH ARGS:", [ageCategory]);
        const { rows } = await pool.query(query, [ageCategory]);
        const pivM = new Map();
        for (const r of rows) {
            if (!pivM.has(r.date)) pivM.set(r.date, { report_date_as_mm_dd_yyyy: r.date });
            // Add mapped variable dynamic based on what was requested
            pivM.get(r.date)[r.origin] = parseFloat(r[metric]);
        }
        const data = Array.from(pivM.values()).sort((a, b) => a.report_date_as_mm_dd_yyyy.localeCompare(b.report_date_as_mm_dd_yyyy));
        res.json({ success: true, count: data.length, data });
    } catch (err) {
        console.error('[/cocoa-london-origin] ERROR:', err.message);
        res.status(500).json({ error: err.message });
    }
});

router.get('/cocoa-arrivals/ivory', async (req, res) => {
    try {
        const query = `SELECT TO_CHAR(date, 'YYYY-MM-DD') as trade_date, close, weekly_changes FROM cocoa_ivory_arrivals ORDER BY date ASC;`;
        const { rows } = await pool.query(query);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/cocoa-product-ratios', async (req, res) => {
    try {
        const { category = 'Combined' } = req.query;
        const query = `SELECT TO_CHAR(date, 'YYYY-MM-DD') as date, region_product, ratio_value as close FROM cocoa_product_ratios WHERE category = $1 ORDER BY date ASC;`;
        const { rows } = await pool.query(query, [category]);
        const pivotedMap = new Map();
        for (const row of rows) {
            if (!pivotedMap.has(row.date)) pivotedMap.set(row.date, { trade_date: row.date });
            pivotedMap.get(row.date)[row.region_product] = parseFloat(row.close) || null;
        }
        const formattedResult = Array.from(pivotedMap.values()).sort((a, b) => a.trade_date.localeCompare(b.trade_date));
        res.json({ success: true, data: formattedResult });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ══ OI Screener — Open Interest daily change per contract ══
// Strategy: Sequential requests (1 per second) to avoid rate-limiting.
// Data is served instantly from disk-backed cache; background refresh runs when stale.

const CACHE_FILE = path.join(process.cwd(), 'server', 'oi_cache.json');
const CACHE_MAX_AGE_MS = 25 * 60 * 1000;  // Serve stale after 25 min → trigger bg refresh
const REQUEST_DELAY_MS = 1100;             // 1.1 s between API calls → stays well under rate limit
const API_TIMEOUT_MS = 8000;

let oiCache = { data: null, timestamp: 0, isUpdating: false };

// Boot: restore last known good data from disk immediately
if (fs.existsSync(CACHE_FILE)) {
    try {
        const saved = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
        oiCache.data = saved.data;
        oiCache.timestamp = saved.timestamp || 0;
        console.log(`[OI] Restored cache from disk (dated ${new Date(oiCache.timestamp).toLocaleString()})`);
    } catch (e) {
        console.error('[OI] Could not parse oi_cache.json:', e.message);
    }
}

// Sequential fetcher — one contract at a time, 1.1 s apart
export async function updateOiScreenerCache() {
    if (oiCache.isUpdating) {
        console.log('[OI] Update already in progress — skipping.');
        return false;
    }
    oiCache.isUpdating = true;

    try {
        const apiDomain = 'https://qh-api.corp.hertshtengroup.com';
        const token = process.env.QH_API_TOKEN || '';
        const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - 7); // 7-day window handles weekends + holidays
        const fmt = (d) => d.toISOString().split('T')[0];
        const start = fmt(startDate);
        const end = fmt(today);

        // Build flat list of all contracts with their group index
        const allContracts = [];
        OI_GROUPS.forEach((group, gi) => {
            group.contracts.forEach(qhcode => allContracts.push({ qhcode, gi }));
        });

        console.log(`[OI] Sequential fetch starting: ${allContracts.length} contracts, ~${Math.ceil(allContracts.length * REQUEST_DELAY_MS / 60000)} min estimated`);

        const results = []; // indexed same as allContracts

        for (let i = 0; i < allContracts.length; i++) {
            const { qhcode, gi } = allContracts[i];
            try {
                const resp = await axios.get(`${apiDomain}/api/dailymarketdata/`, {
                    params: { qhcode, start_date: start, end_date: end, fields: 'oi,datetime' },
                    headers: { Authorization: authHeader, Accept: 'application/json' },
                    timeout: API_TIMEOUT_MS,
                });
                results.push({ status: 'fulfilled', value: resp, qhcode, gi });
            } catch (err) {
                const status = err.response?.status;
                console.warn(`[OI]   ${qhcode} → ${status ?? err.message}`);
                results.push({ status: 'rejected', reason: err, qhcode, gi });
                // On rate-limit (429) add an extra back-off pause
                if (status === 429) {
                    console.warn('[OI] 429 received — pausing 10 s before continuing...');
                    await new Promise(r => setTimeout(r, 10000));
                }
            }

            // Regular pacing delay (skip after last item)
            if (i < allContracts.length - 1) {
                await new Promise(r => setTimeout(r, REQUEST_DELAY_MS));
            }
        }

        // Build grouped response from results
        let dataDate = null;
        const groupedResults = OI_GROUPS.map(g => ({ ...g, contracts: [], net: 0, totalOI: 0 }));

        results.forEach(result => {
            const { qhcode, gi } = result;
            const group = groupedResults[gi];

            if (result.status === 'rejected') {
                // Fall back to previous cache for this contract
                const prevContract = oiCache.data?.groups?.[gi]?.contracts?.find(c => c.qhcode === qhcode);
                group.contracts.push(prevContract ?? { qhcode, change: null, oi: null });
                if (prevContract?.oi) { group.totalOI += prevContract.oi; group.net += (prevContract.change ?? 0); }
                return;
            }

            const apiResults = result.value?.data?.results;
            if (!Array.isArray(apiResults) || apiResults.length === 0) {
                const prevContract = oiCache.data?.groups?.[gi]?.contracts?.find(c => c.qhcode === qhcode);
                group.contracts.push(prevContract ?? { qhcode, change: null, oi: null });
                if (prevContract?.oi) { group.totalOI += prevContract.oi; group.net += (prevContract.change ?? 0); }
                return;
            }

            const sorted = [...apiResults].sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
            const nonNull = sorted.filter(r => r.oi !== null && r.oi !== undefined);

            if (nonNull.length < 2) {
                const oi = nonNull[0]?.oi ?? null;
                group.contracts.push({ qhcode, change: null, oi });
                if (oi) group.totalOI += oi;
                return;
            }

            const currentOI = nonNull[0].oi;
            const change = currentOI - nonNull[1].oi;
            const currentDate = nonNull[0].datetime.split('T')[0];
            if (!dataDate || currentDate > dataDate) dataDate = currentDate;

            group.contracts.push({ qhcode, change, oi: currentOI });
            group.net += change;
            group.totalOI += currentOI;
        });

        // Persist only if we got at least some live data
        const hasLiveData = groupedResults.some(g => g.contracts.some(c => c.oi !== null));
        if (hasLiveData) {
            const responseData = { dataDate: dataDate || end, groups: groupedResults };
            oiCache.data = responseData;
            oiCache.timestamp = Date.now();
            fs.writeFileSync(CACHE_FILE, JSON.stringify({ data: oiCache.data, timestamp: oiCache.timestamp }));
            console.log(`[OI] ✅ Cache updated & saved to disk. dataDate=${responseData.dataDate}`);
            return true;
        } else {
            console.warn('[OI] ⚠️ No live data retrieved — disk cache preserved unchanged.');
            return false;
        }

    } catch (err) {
        console.error('[OI] Fatal error during fetch:', err.message);
        return false;
    } finally {
        oiCache.isUpdating = false;
    }
}

// GET /api/oi-screener
// Always returns instantly from cache; triggers background refresh when stale (>25 min).
router.get('/oi-screener', async (req, res) => {
    try {
        const isStale = Date.now() - oiCache.timestamp > CACHE_MAX_AGE_MS;

        // First ever boot with no cache — must block for initial data
        if (!oiCache.data) {
            console.log('[OI] No cache found — running first-time fetch (this may take ~2 min)...');
            await updateOiScreenerCache();
            if (!oiCache.data) {
                return res.status(503).json({
                    success: false,
                    error: 'Data temporarily unavailable. Initial fetch failed — please try again in a minute.'
                });
            }
        } else if (isStale && !oiCache.isUpdating) {
            // Stale but we have data — serve immediately, refresh quietly in background
            console.log('[OI] Cache stale — serving existing data and refreshing in background...');
            updateOiScreenerCache(); // fire & forget
        }

        return res.json({ success: true, fromCache: true, ...oiCache.data });

    } catch (err) {
        console.error('[OI Screener] Error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ══ Historic OI Dashboard Data ══
router.get('/historic-oi', async (req, res) => {
    try {
        const { product, range = '180D' } = req.query;
        if (!product) return res.status(400).json({ error: 'product required (e.g. C, CC, KC)' });

        let dateFilter = "trade_date >= CURRENT_DATE - INTERVAL '180 days'";
        if (range === '30D') dateFilter = "trade_date >= CURRENT_DATE - INTERVAL '30 days'";
        if (range === '90D') dateFilter = "trade_date >= CURRENT_DATE - INTERVAL '90 days'";
        if (range === 'ALL') dateFilter = "1=1"; // all time

        const isAllCocoa = product === 'ALL_COCOA';
        const query = `
            SELECT TO_CHAR(trade_date, 'YYYY-MM-DD') as date, qhcode, oi, close_price
            FROM historic_open_interest
            WHERE group_code ${isAllCocoa ? "IN ('C', 'CC')" : "= $1"} AND ${dateFilter}
            ORDER BY trade_date ASC;
        `;

        const { rows } = await pool.query(query, isAllCocoa ? [] : [product]);

        // Process data for the frontend
        const totalOiMap = new Map(); // Date -> Total OI
        const contractCurves = new Map(); // Date -> { qh1: oi, qh2: oi }

        rows.forEach(row => {
            const { date, qhcode, oi } = row;

            // Sum Total OI
            if (!totalOiMap.has(date)) totalOiMap.set(date, 0);
            totalOiMap.set(date, totalOiMap.get(date) + oi);

            // Structure individual curves
            if (!contractCurves.has(date)) contractCurves.set(date, { date });
            contractCurves.get(date)[qhcode] = oi;
        });

        // Convert maps to sorted arrays
        let dates = Array.from(totalOiMap.keys()).sort();

        // Smart Data Quality Enforcement:
        // Only suppress the latest date if a *significant* contract from the previous day is missing.
        // A "significant" contract is one that held >5% of the previous day's total OI.
        //
        // This distinguishes two scenarios:
        //   (A) Expired contract (e.g. LCCK26 on May 14): by the time it expires, its OI share
        //       is tiny (<5%), so we allow the date through — correct behaviour.
        //   (B) Incomplete daily sync (e.g. background updater stalled mid-run): a major front-month
        //       contract would be missing entirely, its share is >5%, so we suppress the date.
        //
        // This means contract expirations will never block chart updates.
        if (dates.length >= 2) {
            const lastDate = dates[dates.length - 1];
            const prevDate = dates[dates.length - 2];

            const prevContracts = contractCurves.get(prevDate);
            const lastContracts = contractCurves.get(lastDate);
            const prevTotal = totalOiMap.get(prevDate) || 1;

            let missingSignificantOi = false;
            Object.keys(prevContracts).forEach(k => {
                if (k === 'date') return;
                if (lastContracts[k] === undefined) {
                    const prevOi = Number(prevContracts[k]) || 0;
                    const share = prevOi / prevTotal;
                    if (share > 0.05) {
                        console.log(`[Historic OI] Significant contract missing on ${lastDate}: ${k} had ${(share * 100).toFixed(1)}% of previous-day OI — suppressing date.`);
                        missingSignificantOi = true;
                    } else {
                        console.log(`[Historic OI] Contract ${k} absent on ${lastDate} (${(share * 100).toFixed(1)}% of OI) — treating as normal expiry, keeping date.`);
                    }
                }
            });

            if (missingSignificantOi) {
                dates.pop();
                totalOiMap.delete(lastDate);
                contractCurves.delete(lastDate);
            }
        }

        const totalOiSeries = [];
        const dailyChangeSeries = [];

        for (let i = 0; i < dates.length; i++) {
            const date = dates[i];
            const currentTotal = totalOiMap.get(date);

            totalOiSeries.push({ date, totalOI: currentTotal });

            if (i > 0) {
                const prevDate = dates[i - 1];
                const prevCurves = contractCurves.get(prevDate);
                const currCurves = contractCurves.get(date);

                // Compute daily change using ONLY contracts present on BOTH days.
                // This excludes expired contracts (e.g. LCCK26, CCK26) whose OI drops
                // to zero purely because they expired — not because of real market activity.
                // Without this, a contract expiry on day N artificially inflates the
                // negative daily change by the full OI of that contract.
                let comparablePrev = 0;
                let comparableCurr = 0;
                Object.keys(currCurves).forEach(k => {
                    if (k === 'date') return;
                    if (prevCurves[k] !== undefined) {
                        comparablePrev += Number(prevCurves[k]) || 0;
                        comparableCurr += Number(currCurves[k]) || 0;
                    }
                });

                dailyChangeSeries.push({ date, change: comparableCurr - comparablePrev });
            }
        }

        const individualCurvesSeries = Array.from(contractCurves.values()).sort((a, b) => a.date.localeCompare(b.date));

        res.json({
            success: true,
            data: {
                totalOiSeries,
                dailyChangeSeries,
                individualCurvesSeries
            }
        });
    } catch (err) {
        console.error('[Historic OI] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ══ ICE COT Routes ══

const ICE_PRODUCT_TABLES = {
    'LONDON COCOA':    'ice_london_cocoa',
    'WHITE SUGAR':     'ice_white_sugar',
    'ROBUSTA COFFEE':  'ice_robusta_coffee',
};

// GET /api/ice-data?market=LONDON+COCOA&limit=500
router.get('/ice-data', async (req, res) => {
    try {
        const { market, limit = 500 } = req.query;
        if (!market) return res.status(400).json({ success: false, error: 'market param required' });
        const tableName = ICE_PRODUCT_TABLES[market.toUpperCase()];
        if (!tableName) return res.status(400).json({ success: false, error: 'Invalid ICE market' });
        const { rows } = await pool.query(
            `SELECT * FROM ${tableName} ORDER BY report_date_as_mm_dd_yyyy DESC LIMIT $1`,
            [limit]
        );
        res.json({ success: true, count: rows.length, data: rows });
    } catch (err) {
        console.error('[/ice-data] ERROR:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/ice-products  → ['LONDON COCOA', 'WHITE SUGAR', 'ROBUSTA COFFEE']
router.get('/ice-products', (_req, res) => {
    res.json({ success: true, data: Object.keys(ICE_PRODUCT_TABLES) });
});

// POST /api/ice-backfill  — one-time historical backfill trigger
router.post('/ice-backfill', async (_req, res) => {
    console.log('[Manual] ICE backfill triggered via API');
    try {
        const { backfillIceData } = await import('./services/iceUpdater.js');
        res.json({ success: true, message: 'Backfill started — check server logs.' });
        // Run after response is sent so the HTTP req doesn't time out
        backfillIceData().then(r => console.log('[ICE Backfill] Result:', r));
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── Opening Variation ──────────────────────────────────────────────────────

// GET /api/opening-variation
// ?filter=all|kc|rc|both|kc_and_rc_same_dir
router.get('/opening-variation', async (req, res) => {
    try {
        const { filter = 'all' } = req.query;

        let whereClause = '';
        if (filter === 'kc')               whereClause = 'WHERE kc_qualifies = true';
        else if (filter === 'rc')          whereClause = 'WHERE rc_qualifies = true';
        else if (filter === 'both')        whereClause = 'WHERE kc_qualifies = true AND rc_qualifies = true';
        else if (filter === 'same_dir')    whereClause = 'WHERE kc_qualifies = true AND rc_qualifies = true AND kc_bias = rc_bias';

        const { rows } = await pool.query(`
            SELECT
                trade_date::text,
                kc_contract, rc_contract,
                rc_prev_settlement, rc_opening_high, rc_opening_low,
                rc_tick_move, rc_qualifies, rc_bias,
                kc_prev_settlement, kc_opening_high, kc_opening_low,
                kc_tick_move, kc_qualifies, kc_bias,
                kc_stop_level, kc_entry_price, kc_target_price,
                kc_outcome, kc_ticks_pnl, kc_max_ticks
            FROM opening_variation_days
            ${whereClause}
            ORDER BY trade_date DESC
        `);

        res.json({ success: true, count: rows.length, data: rows });
    } catch (err) {
        console.error('[OV] GET /opening-variation error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/opening-variation/backfill  — kick off historical backfill (ingest + compute)
router.post('/opening-variation/backfill', async (req, res) => {
    console.log('[Manual] Opening Variation backfill triggered via API');
    res.json({ success: true, message: 'Backfill started — fetches raw data from API then computes. Watch server logs.' });
    const { backfillOpeningVariation } = await import('./services/openingVariationService.js');
    backfillOpeningVariation().catch(err => console.error('[OV] Backfill error:', err.message));
});

// POST /api/opening-variation/recompute  — re-derive stats from stored raw data (no API calls)
router.post('/opening-variation/recompute', async (req, res) => {
    console.log('[Manual] Opening Variation recompute triggered via API');
    res.json({ success: true, message: 'Recompute started — reads from DB only, zero API calls. Watch server logs.' });
    const { recomputeAll } = await import('./services/openingVariationService.js');
    recomputeAll().catch(err => console.error('[OV] Recompute error:', err.message));
});

export default router;

