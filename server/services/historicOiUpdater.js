import axios from 'axios';
import pool from '../db.js';
import { OI_GROUPS } from '../routes.js';

const apiDomain = 'https://qh-api.corp.hertshtengroup.com';
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(qhcode, start_date, end_date, authHeader) {
    let retries = 5;
    let delay = 60000; // 60s sleep on 429

    while (retries > 0) {
        try {
            const resp = await axios.get(`${apiDomain}/api/dailymarketdata/`, {
                params: { qhcode, start_date, end_date, fields: 'oi,close,datetime,volume' },
                headers: { Authorization: authHeader, Accept: 'application/json' },
                timeout: 15000,
            });
            return resp.data?.results || [];
        } catch (err) {
            const status = err?.response?.status;
            if (status === 429) {
                console.log(`\n    [429] Rate limit hit for ${qhcode}. Sleeping ${delay / 1000}s...`);
                await sleep(delay);
                retries--;
                delay = 60000;
            } else {
                console.error(`  [!] API Error for ${qhcode}: ${status || err.message}`);
                return [];
            }
        }
    }
    console.warn(`  [!] Max retries exhausted for ${qhcode}`);
    return [];
}

export async function updateHistoricOi() {
    console.log("🚀 Starting Daily Historic OI Update Process (Anti-429 Mode)...");

    const token = process.env.QH_API_TOKEN || '';
    const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

    // Fetch from 7 days ago to Today to ensure we don't miss updates and handle weekends
    const today = new Date();
    const startDateDate = new Date(today);
    startDateDate.setDate(today.getDate() - 7);

    const start_date = startDateDate.toISOString().split('T')[0];
    const end_date = today.toISOString().split('T')[0];

    // Flatten all groups and their contracts
    const allContracts = [];
    OI_GROUPS.forEach(group => {
        group.contracts.forEach(qhcode => {
            allContracts.push({ qhcode, group_code: group.code });
        });
    });

    console.log(`📋 Found ${allContracts.length} contracts to fetch for Historic OI (${start_date} to ${end_date}).`);

    let totalInserted = 0;

    for (let i = 0; i < allContracts.length; i++) {
        const contract = allContracts[i];

        try {
            const records = await fetchWithRetry(contract.qhcode, start_date, end_date, authHeader);
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
                        [trade_date, contract.group_code, contract.qhcode, record.oi, record.close || null, record.volume || null]
                    );
                    inserted++;
                } catch (dbErr) {
                    // Suppress unique constraint / existing row logs to cleanly show updates
                }
            }

            if (inserted > 0) {
                console.log(`  ✔  ${contract.qhcode.padEnd(8)}: Synced ${inserted} rows.`);
                totalInserted += inserted;
            }

            // Polite 2-second delay between every single fetch to maintain stealth/anti-429 limits globally
            await sleep(2000);

        } catch (err) {
            console.error(`  [X] Failed ${contract.qhcode}: ${err.message}`);
        }
    }

    console.log(`✅ Daily Historic OI Update Complete! Total inserted: ${totalInserted}`);
}
