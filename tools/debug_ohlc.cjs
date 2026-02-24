const axios = require('axios');

async function debug() {
    try {
        const url = 'http://localhost:3002/api/ohlc-proxy?instrument=CCN26&interval=1D&count=5000';
        console.log('Fetching:', url);
        const res = await axios.get(url);
        if (res.data.success) {
            console.log('Success - checking data range:');
            const data = res.data.data;
            if (data.length > 0) {
                const first = new Date(data[0].time).toISOString().split('T')[0];
                const last = new Date(data[data.length - 1].time).toISOString().split('T')[0];
                console.log(`First: ${first}, Last: ${last}, Count: ${data.length}`);
                // Print extensive tail
                const dates = data.map(d => new Date(d.time).toISOString().split('T')[0]);
                const targets = ['2026-02-11', '2026-02-12', '2026-02-13'];
                targets.forEach(t => {
                    const found = data.find(d => new Date(d.time).toISOString().split('T')[0] === t);
                    console.log(`Date ${t}: ${found ? 'FOUND (Close: ' + found.close + ')' : 'MISSING'}`);
                });
            } else {
                console.log('Empty data');
            }
        } else {
            console.error('Failed:', res.data.error);
        }
    } catch (err) {
        console.error('Request failed:', err.message);
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Data:', err.response.data);
        }
    }
}

debug();
