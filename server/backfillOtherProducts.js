// server/backfillOtherProducts.js
// One-time backfill for the new "Other Products" groups
// Fetches from 2024-01-01 to today with extreme rate limit care.

import 'dotenv/config';
import axios from 'axios';
import pool from './db.js';

const apiDomain = 'https://qh-api.corp.hertshtengroup.com';
const token = process.env.QH_API_TOKEN || '';
const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

const NEW_GROUPS = [
    // DC already inserted in previous run, we'll keep it here but the script skips already existing rows effectively, though to save API calls let's comment it out for this immediate run:
    // { code: 'DC',  name: 'Milk Class III',      contracts: ['DCH26','DCJ26','DCK26','DCM26','DCN26','DCQ26','DCU26','DCV26','DCX26','DCZ26','DCF27','DCG27','DCH27','DCJ27','DCK27'] },
    { code: 'OJ', name: 'Orange Juice', contracts: ['OJK26', 'OJN26', 'OJU26', 'OJX26', 'OJF27', 'OJH27', 'OJK27'] },
    { code: 'CSC', name: 'Cash Settled Cheese', contracts: ['CSCH26', 'CSCJ26', 'CSCK26', 'CSCM26', 'CSCN26', 'CSCQ26', 'CSCU26', 'CSCV26', 'CSCX26', 'CSCZ26', 'CSCF27', 'CSCG27', 'CSCH27', 'CSCJ27', 'CSCK27'] },
    { code: 'ZR', name: 'Rough Rice', contracts: ['ZRK26', 'ZRN26', 'ZRU26', 'ZRX26', 'ZRF27', 'ZRH27'] },
    { code: 'LBR', name: 'Lumber', contracts: ['LBRK26', 'LBRN26', 'LBRU26', 'LBRX26', 'LBRF27'] },
    { code: 'OTS', name: 'Oats', contracts: ['OTSK26', 'OTSN26', 'OTSU26', 'OTSZ26', 'OTSH27'] },
];

const start_date = '2024-01-01';
const end_date = new Date().toISOString().split('T')[0];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(qhcode) {
    let retries = 5;
    let delay = 60000; // start with 60s if 429 hits

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
                console.log(`\n    [429 ALERT] Rate limit hit. Sleeping ${delay / 1000}s...`);
                await sleep(delay);
                retries--;
                delay = 60000; // Wait a minute again if it repeats
            } else {
                throw err;
            }
        }
    }
    throw new Error(`Max retries reached for ${qhcode}`);
}

async function backfill() {
    console.log(`\n🚀  Other Products Historic OI Backfill (Anti-429 Mode)`);
    console.log(`📅  Date range: ${start_date} → ${end_date}\n`);

    const allContracts = [];
    NEW_GROUPS.forEach(group => {
        group.contracts.forEach(qhcode => {
            allContracts.push({ qhcode, group_code: group.code });
        });
    });

    console.log(`📋  ${allContracts.length} contracts to fetch.\n`);

    let totalInserted = 0;

    for (let i = 0; i < allContracts.length; i++) {
        const contract = allContracts[i];
        process.stdout.write(`[${i + 1}/${allContracts.length}] Fetching ${contract.qhcode.padEnd(8)}... `);

        try {
            const records = await fetchWithRetry(contract.qhcode);
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
                    console.error(`\n  [DB] ${contract.qhcode} @ ${trade_date}: ${dbErr.message}`);
                }
            }
            console.log(`✔ inserted ${inserted}`);
            totalInserted += inserted;

            // Polite 2-second delay between successful calls to stay under rate limit permanently
            await sleep(2000);

        } catch (err) {
            console.log(`❌ Failed: ${err.message}`);
        }
    }

    console.log(`\n🎉  Backfill complete!  Inserted: ${totalInserted}`);
    await pool.end();
    process.exit(0);
}

backfill().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
