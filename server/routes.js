import express from 'express';
import axios from 'axios';
import pool from './db.js';

const router = express.Router();

// Map product display names to table names
const PRODUCT_TABLES = {
    'COCOA': 'cocoa',
    'COFFEE C': 'coffee_c',
    'COTTON NO. 2': 'cotton_no_2',
    'SUGAR NO. 11': 'sugar_no_11'
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

export default router;
