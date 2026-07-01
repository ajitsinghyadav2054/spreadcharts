import 'dotenv/config';
import axios from 'axios';
import pool from './db.js';
import { OI_GROUPS } from './routes.js';

const apiDomain = 'https://qh-api.corp.hertshtengroup.com';
const token = process.env.QH_API_TOKEN || '';
const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

async function backfill() {
    console.log("🚀 Starting Historic OI Backfill Process...");

    // Fetch from 2024-01-01 to Today
    const start_date = '2024-01-01';
    const end_date = new Date().toISOString().split('T')[0];

    // Flatten all groups and their contracts
    const allContracts = [];
    OI_GROUPS.forEach(group => {
        group.contracts.forEach(qhcode => {
            allContracts.push({ qhcode, group_code: group.code });
        });
    });

    console.log(`Found ${allContracts.length} contracts to fetch.`);
    const CHUNK_SIZE = 5;

    for (let i = 0; i < allContracts.length; i += CHUNK_SIZE) {
        const chunk = allContracts.slice(i, i + CHUNK_SIZE);
        console.log(`Processing chunk ${i} to ${i + CHUNK_SIZE} / ${allContracts.length}...`);

        try {
            const results = await Promise.allSettled(
                chunk.map(({ qhcode }) =>
                    axios.get(`${apiDomain}/api/dailymarketdata/`, {
                        params: { qhcode, start_date, end_date, fields: 'oi,close,datetime,volume' },
                        headers: { Authorization: authHeader, Accept: 'application/json' },
                        timeout: 10000, // 10s wait for historical
                    })
                )
            );

            // Extract and Insert
            for (let idx = 0; idx < results.length; idx++) {
                const res = results[idx];
                const contract = chunk[idx];

                if (res.status === 'fulfilled' && res.value.data?.results) {
                    const records = res.value.data.results;
                    let inserted = 0;

                    for (const record of records) {
                        if (record.oi === null) continue;

                        const trade_date = record.datetime.split('T')[0];

                        try {
                            await pool.query(
                                `INSERT INTO historic_open_interest (trade_date, group_code, qhcode, oi, close_price, volume)
                                 VALUES ($1, $2, $3, $4, $5, $6)
                                 ON CONFLICT (trade_date, qhcode)
                                 DO UPDATE SET oi = EXCLUDED.oi, close_price = EXCLUDED.close_price, volume = EXCLUDED.volume;`,
                                [trade_date, contract.group_code, contract.qhcode, record.oi, record.close || null, record.volume || null]
                            );
                            inserted++;
                        } catch (dbErr) {
                            console.error(`[DB Error ${contract.qhcode} @ ${trade_date}]:`, dbErr.message);
                        }
                    }
                    console.log(`[✔] ${contract.qhcode}: Synced ${inserted} rows.`);
                } else if (res.status === 'rejected') {
                    console.error(`[❌] ${contract.qhcode} API Error:`, res.reason?.response?.status || res.reason.message);
                }
            }

            // Sleep 1000ms between chunks to totally prevent rate limit banning
            if (i + CHUNK_SIZE < allContracts.length) {
                console.log("Sleeping 1s...");
                await new Promise(r => setTimeout(r, 1000));
            }
        } catch (err) {
            console.error("Critical Chunk Error:", err);
        }
    }

    console.log("✅ Historic Backfill Complete!");
    pool.end();
}

backfill();
