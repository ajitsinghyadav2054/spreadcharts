import express from 'express';
import axios from 'axios';
import pool from './db.js';

// OI contract groups — mirrors src/data/oiContracts.js (server-side copy)
const OI_GROUPS = [
    { code: 'C', name: 'London Cocoa', contracts: ['LCCK26', 'LCCN26', 'LCCU26', 'LCCZ26', 'LCCH27', 'LCCK27', 'LCCN27', 'LCCU27', 'LCCZ27'] },
    { code: 'CC', name: 'NY Cocoa', contracts: ['CCK26', 'CCN26', 'CCU26', 'CCZ26', 'CCH27', 'CCK27', 'CCN27', 'CCU27', 'CCZ27'] },
    { code: 'KC', name: 'KC Arabica', contracts: ['KCK26', 'KCN26', 'KCU26', 'KCZ26', 'KCH27', 'KCK27', 'KCN27', 'KCU27', 'KCZ27', 'KCH28'] },
    { code: 'RC', name: 'Robusta', contracts: ['LKCK26', 'LKCN26', 'LKCU26', 'LKCX26', 'LKCF27', 'LKCH27', 'LKCK27', 'LKCN27', 'LKCU27'] },
    { code: 'CT', name: 'Cotton', contracts: ['CTK26', 'CTN26', 'CTV26', 'CTZ26', 'CTH27', 'CTK27', 'CTN27', 'CTZ27'] },
    { code: 'SB', name: 'Raw Sugar', contracts: ['SGK26', 'SGN26', 'SGV26', 'SGH27', 'SGK27', 'SGN27', 'SGV27', 'SGH28', 'SGK28', 'SGN28', 'SGV28'] },
    { code: 'W', name: 'White Sugar', contracts: ['LSGK26', 'LSGQ26', 'LSGV26', 'LSGZ26', 'LSGH27', 'LSGK27', 'LSGQ27', 'LSGV27', 'LSGZ27', 'LSGH28', 'LSGK28', 'LSGQ28', 'LSGV28'] },
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
        const { rows } = await pool.query(`SELECT TO_CHAR(date, 'YYYY-MM-DD') as report_date_as_mm_dd_yyyy, * FROM ${table} ORDER BY date ASC`);
        res.json({ success: true, count: rows.length, data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/cocoa-london-origin', async (req, res) => {
    try {
        const { ageCategory = 'TOTAL Valid', metric = 'total_mt' } = req.query;
        const query = `
            SELECT TO_CHAR(date, 'YYYY-MM-DD') as date, region_product, age_category, total_mt, sdu_ldu_mt, bdu_mt 
            FROM cocoa_london_origin_stock
            WHERE age_category = $1
            ORDER BY date ASC;
        `;
        const { rows } = await pool.query(query, [ageCategory]);
        const pivM = new Map();
        for (const r of rows) {
            if (!pivM.has(r.date)) pivM.set(r.date, { report_date_as_mm_dd_yyyy: r.date });
            // Add mapped variable dynamic based on what was requested
            pivM.get(r.date)[r.region_product] = parseFloat(r[metric]);
        }
        const data = Array.from(pivM.values()).sort((a, b) => a.report_date_as_mm_dd_yyyy.localeCompare(b.report_date_as_mm_dd_yyyy));
        res.json({ success: true, count: data.length, data });
    } catch (err) {
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
// Cache object to prevent API rate limits (HTTP 429) since we request 69+ contracts at once.
let oiCache = {
    data: null,
    timestamp: 0,
    expiresIn: 60 * 60 * 1000, // 1 hour caching
};

// GET /api/oi-screener
router.get('/oi-screener', async (req, res) => {
    try {
        if (oiCache.data && (Date.now() - oiCache.timestamp < oiCache.expiresIn)) {
            console.log('[OI] Serving response from Memory Cache');
            return res.json({ success: true, ...oiCache.data });
        }

        const apiDomain = 'https://qh-api.corp.hertshtengroup.com';
        const token = process.env.QH_API_TOKEN || '';
        const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

        // 5-day window handles weekends & delayed OI publication
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - 5);
        const fmt = (d) => d.toISOString().split('T')[0];
        const start = fmt(startDate);
        const end = fmt(today);

        // Flatten all contracts with their group index
        const allContracts = [];
        OI_GROUPS.forEach((group, gi) => {
            group.contracts.forEach(qhcode => allContracts.push({ qhcode, gi }));
        });

        console.log(`[OI] Firing ${allContracts.length} requests in chunks (${start} → ${end})`);

        const rawResults = [];
        const CHUNK_SIZE = 5;

        for (let i = 0; i < allContracts.length; i += CHUNK_SIZE) {
            const chunk = allContracts.slice(i, i + CHUNK_SIZE);
            const chunkResults = await Promise.allSettled(
                chunk.map(({ qhcode }) =>
                    axios.get(`${apiDomain}/api/dailymarketdata/`, {
                        params: { qhcode, start, end, fields: 'oi,datetime' },
                        headers: { Authorization: authHeader, Accept: 'application/json' },
                        timeout: 5000,
                    })
                )
            );
            rawResults.push(...chunkResults);

            // Sleep briefly between chunks to prevent 429 Rate Limit
            if (i + CHUNK_SIZE < allContracts.length) {
                await new Promise(r => setTimeout(r, 800));
            }
        }

        // Build grouped response
        let dataDate = null;
        const groupedResults = OI_GROUPS.map(g => ({ ...g, contracts: [], net: 0, totalOI: 0 }));

        rawResults.forEach((result, idx) => {
            const { qhcode, gi } = allContracts[idx];
            const group = groupedResults[gi];

            if (result.status === 'rejected') {
                console.warn(`[OI] ${qhcode} failed: ${result.reason?.message}`);
                group.contracts.push({ qhcode, change: null, oi: null });
                return;
            }

            const apiResults = result.value?.data?.results;
            if (!Array.isArray(apiResults) || apiResults.length === 0) {
                group.contracts.push({ qhcode, change: null, oi: null });
                return;
            }

            // Sort newest → oldest, pick 2 most recent non-null OI readings
            const sorted = [...apiResults].sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
            const nonNull = sorted.filter(r => r.oi !== null && r.oi !== undefined);

            if (nonNull.length < 2) {
                group.contracts.push({ qhcode, change: null, oi: nonNull.length === 1 ? nonNull[0].oi : null });
                if (nonNull.length === 1) {
                    group.totalOI += nonNull[0].oi;
                }
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

        console.log(`[OI] Done. dataDate=${dataDate}`);
        const responseData = { dataDate: dataDate || end, groups: groupedResults };

        // Update cache ONLY if we successfully fetched at least some data
        // (If everything is 429, we don't want to freeze empty data for 1 hour)
        if (groupedResults.some(g => g.contracts.some(c => c.oi !== null))) {
            oiCache.data = responseData;
            oiCache.timestamp = Date.now();
        }

        res.json({ success: true, ...responseData });

    } catch (err) {
        console.error('[OI Screener] Fatal:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
