import { updateHistoricOi } from './server/services/historicOiUpdater.js';
import axios from 'axios';
import pool from './server/db.js';

// overwrite fetchWithRetry inside historicOiUpdater indirectly or just run standard updater
async function run() {
    console.log("Checking what KC has in DB before...");
    let r = await pool.query("SELECT MAX(trade_date) FROM historic_open_interest WHERE group_code='KC'");
    console.log("Before DB MAX:", r.rows[0]);

    console.log("Testing API for KCK26...");
    const resp = await axios.get('https://qh-api.corp.hertshtengroup.com/api/dailymarketdata/', {
        params: { qhcode: 'KCK26', start_date: '2026-04-01', end_date: '2026-04-08', fields: 'oi,close,datetime,volume' },
        headers: { Authorization: "Bearer " + (process.env.QH_API_TOKEN || ''), Accept: 'application/json' },
        timeout: 5000,
    });
    const records = resp.data.results;
    console.log("API returned for KCK26 count:", records.length);
    console.log("API returned KC 0th date:", records[0].datetime);
}

run();
