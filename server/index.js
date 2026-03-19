import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';
import cftcRoutes from './routes.js';
import { updateMarketData } from './services/cftcUpdater.js';
import { syncCocoaBags } from './services/cocoaBagsSync.js';
import { startCocoaFileWatcher } from './services/cocoaFileWatcher.js';
import authRoutes, { authenticateToken } from './authRoutes.js';

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
app.use('/api', authenticateToken, cftcRoutes);

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

    // Schedule Weekly Update: Friday at 21:00 UTC (Approx 4-5 PM ET)
    cron.schedule('0 21 * * 5', async () => {
        console.log('[Scheduler] Triggering weekly CFTC data update...');
        await updateMarketData();
    });
    console.log('[Scheduler] Weekly data ingestion scheduled (Fridays @ 21:00 UTC).');

    // Start Cocoa Bags file watcher (auto-syncs when OneDrive updates the file)
    startCocoaFileWatcher();
});

// Manual Trigger Endpoint (for testing)
app.post('/api/update-data', async (req, res) => {
    console.log('[Manual] Update triggered via API');
    const result = await updateMarketData();
    res.json(result);
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
