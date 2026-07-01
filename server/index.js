import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';
import cftcRoutes, { updateOiScreenerCache } from './routes.js';
import { updateMarketData } from './services/cftcUpdater.js';
import { updateIceData } from './services/iceUpdater.js';
import { runCftcAlertCheck } from './services/cftcAlertService.js';
import { syncCocoaBags } from './services/cocoaBagsSync.js';
import { startCocoaFileWatcher } from './services/cocoaFileWatcher.js';
import { syncCocoaLondon } from './services/cocoaLondonSync.js';
import { syncIvoryArrivals } from './services/cocoaArrivalsSync.js';
import { syncAllLondonOrigins } from './services/cocoaLondonOriginSync.js';
import authRoutes, { authenticateToken } from './authRoutes.js';
import { updateHistoricOi } from './services/historicOiUpdater.js';
import { runRhoAlertCheck } from './services/rhoAlertService.js';
import { updateOpeningVariation } from './services/openingVariationService.js';
import { createOpeningVariationTable } from './migrations/createOpeningVariationTable.js';
import { createOvDataTables } from './migrations/createOvDataTables.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: './server/.env' });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes

// 1. Auth Routes (Public)
app.use('/api/auth', authRoutes);

// 2. Protected Data Routes (Apply middleware)
app.use('/api', cftcRoutes);

// Serve React frontend static files
const distPath = path.join(__dirname, '..', 'dist');

// Middleware to prevent caching of HTML
function noCache(req, res, next) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    next();
}

app.use(express.static(distPath, {
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        }
    }
}));

// Catch-all: serve React app for any non-API route (Express 5 syntax)
app.get('/{*splat}', noCache, (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(distPath, 'index.html'));
    }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://10.132.30.182:${PORT}`);

    // Schedule Daily CFTC Update & Alert: Every morning at 8:00 AM Local Time
    // Running daily ensures we catch the Friday/Saturday update regardless of server restarts
    cron.schedule('0 8 * * *', async () => {
        console.log('[Scheduler] Triggering daily CFTC data update check (08:00 AM)...');
        const result = await updateMarketData();

        // ── Run ATH/ATL alert check if new data was ingested ──
        if (result && result.success && result.newRecords > 0) {
            console.log(`[Scheduler] ${result.newRecords} new CFTC record(s) inserted — running alert check for Teams...`);
            await runCftcAlertCheck();
        } else {
            console.log('[Scheduler] No new CFTC records found — skipping alert check.');
        }

        // ── ICE COT update (runs after CFTC) ──────────────────
        console.log('[Scheduler] Triggering ICE COT update...');
        await updateIceData();
    });
    console.log('[Scheduler] Daily CFTC data ingestion check scheduled (Daily @ 08:00 AM Local).');

    // Schedule Historic OI Update: 10:00 PM Local Time (22:00)
    cron.schedule('0 22 * * *', async () => {
        console.log('[Scheduler] Triggering 10:00 PM Historic OI daily update...');
        await updateHistoricOi();
    });
    console.log('[Scheduler] Historic OI ingestion scheduled for 22:00 local time daily.');

    // Schedule Opening Variation daily update: 19:05 Local Time (after KC closes at 18:30 London)
    cron.schedule('5 19 * * 1-5', async () => {
        console.log('[Scheduler] Triggering Opening Variation daily update (19:05)...');
        await updateOpeningVariation();
    });
    console.log('[Scheduler] Opening Variation update scheduled for 19:05 Mon-Fri.');

    // Run DB migrations for Opening Variation tables on startup
    createOpeningVariationTable().catch(err =>
        console.error('[Startup] opening_variation_days migration error:', err.message)
    );
    createOvDataTables().catch(err =>
        console.error('[Startup] ov_settlements/ov_candles migration error:', err.message)
    );

    // Schedule Daily Cocoa Warehouse Sync fallback: 8:30 AM Local Time
    cron.schedule('30 8 * * *', async () => {
        console.log('[Scheduler] Triggering Daily Cocoa Warehouse Sync fallback (08:30 AM)...');
        try {
            console.log('[Scheduler] Syncing London Cocoa Bags...');
            await syncCocoaLondon();
            console.log('[Scheduler] Syncing US Cocoa Bags...');
            await syncCocoaBags();
            console.log('[Scheduler] Syncing Ivory Coast Arrivals...');
            await syncIvoryArrivals();
            console.log('[Scheduler] Syncing London Stock Origins...');
            await syncAllLondonOrigins();
            console.log('[Scheduler] Daily Cocoa Warehouse Sync completed successfully!');
        } catch (err) {
            console.error('[Scheduler] Daily Cocoa Warehouse Sync failed:', err.message);
        }
    });
    console.log('[Scheduler] Daily Cocoa Warehouse Sync scheduled for 08:30 local time daily.');

    // Start Cocoa Bags file watcher (auto-syncs when OneDrive updates the file)
    startCocoaFileWatcher();
});

// Manual Trigger Endpoint (for testing)
app.post('/api/update-data', async (req, res) => {
    console.log('[Manual] Update triggered via API');
    const result = await updateMarketData();
    res.json(result);
});

// Manual ICE Update Trigger
app.post('/api/update-ice', async (req, res) => {
    console.log('[Manual] ICE COT update triggered via API');
    const result = await updateIceData();
    res.json(result);
});

// Manual CFTC Alert Check Endpoint (test without waiting for Friday)
app.post('/api/test-cftc-alerts', async (req, res) => {
    console.log('[Manual] CFTC Alert Check triggered manually');
    try {
        await runCftcAlertCheck();
        res.json({ success: true, message: 'Alert check complete — check Teams channel and server logs.' });
    } catch (err) {
        console.error('[Manual] Alert check failed:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Manual Rho Alert Check Endpoint (for testing)
app.post('/api/test-rho-alerts', async (req, res) => {
    console.log('[Manual] Rho Alert Check triggered manually via API');
    try {
        await runRhoAlertCheck();
        res.json({ success: true, message: 'Rho Alert check complete — check Teams channel and server logs.' });
    } catch (err) {
        console.error('[Manual] Rho alert check failed:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Manual Cocoa sync trigger
app.post('/api/sync-cocoa-bags', async (req, res) => {
    console.log('[Manual] Cocoa Bags sync triggered via API');
    try {
        const result = await syncCocoaBags();
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
