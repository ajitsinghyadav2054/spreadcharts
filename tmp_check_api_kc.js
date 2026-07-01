import axios from 'axios';
const apiDomain = 'https://qh-api.corp.hertshtengroup.com';
const token = process.env.QH_API_TOKEN || '';
const start_date = '2026-04-01';
const end_date = '2026-04-08';

async function test() {
    const resp = await axios.get(apiDomain + '/api/dailymarketdata/', {
        params: { qhcode: 'KCK26', start_date, end_date, fields: 'oi,datetime' },
        headers: { Authorization: "Bearer " + token, Accept: 'application/json' }
    });
    const results = resp.data.results;
    console.log("Total entries returned:", results.length);
    console.log("First:", results[0]?.datetime);
    console.log("Last:", results[results.length - 1]?.datetime);
}
test();
