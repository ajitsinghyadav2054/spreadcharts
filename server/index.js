import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import cftcRoutes from './routes.js';
import { updateMarketData } from './services/cftcUpdater.js';
import authRoutes, { authenticateToken } from './authRoutes.js';

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

// Health check
app.get('/', (req, res) => {
    res.send('CFTC Data API is running');
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);

    // Schedule Weekly Update: Friday at 21:00 UTC (Approx 4-5 PM ET)
    cron.schedule('0 21 * * 5', async () => {
        console.log('[Scheduler] Triggering weekly CFTC data update...');
        await updateMarketData();
    });
    console.log('[Scheduler] Weekly data ingestion scheduled (Fridays @ 21:00 UTC).');
});

// Manual Trigger Endpoint (for testing)
app.post('/api/update-data', async (req, res) => {
    console.log('[Manual] Update triggered via API');
    const result = await updateMarketData();
    res.json(result);
});
