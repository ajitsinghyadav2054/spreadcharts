const http = require('http');

// Test WITHOUT auth token (simulating anonymous request)
const options = {
    hostname: 'localhost',
    port: 3002,
    path: '/api/cocoa-bags?table=cocoa_london_bags',
    method: 'GET',
    headers: {} // no auth
};

const req = http.request(options, res => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Body: ${data.substring(0, 500)}`);
    });
});
req.on('error', console.error);
req.end();
