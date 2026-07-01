import axios from 'axios';
import pool from './server/db.js';

const apiDomain = 'https://qh-api.corp.hertshtengroup.com';
const token = process.env.QH_API_TOKEN || '';
const authHeader = "Bearer " + token;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
    console.log("Fetching KCK27 specifically...");
    try {
        const resp = await axios.get(`${apiDomain}/api/dailymarketdata/`, {
            params: { qhcode: 'KCK27', start_date: '2026-04-01', end_date: '2026-04-08', fields: 'oi,close,datetime,volume' },
            headers: { Authorization: authHeader, Accept: 'application/json' },
            timeout: 15000,
        });

        const records = resp.data?.results || [];
        console.log(`Found ${records.length} records for KCK27.`);

        let inserted = 0;
        for (const record of records) {
            if (record.oi === null || record.oi === undefined) continue;
            const trade_date = record.datetime.split('T')[0];

            try {
                await pool.query(
                    `INSERT INTO historic_open_interest (trade_date, group_code, qhcode, oi, close_price, volume)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     ON CONFLICT (trade_date, qhcode)
                     DO UPDATE SET oi = EXCLUDED.oi, close_price = EXCLUDED.close_price, volume = EXCLUDED.volume;`,
                    [trade_date, 'KC', 'KCK27', record.oi, record.close || null, record.volume || null]
                );
                inserted++;
            } catch (dbErr) { }
        }
        console.log(`Successfully synced ${inserted} rows into historic_open_interest for KCK27.`);
    } catch (err) {
        console.error("API Error Fetching KCK27", err.message);
    }
    process.exit(0);
}
run();
