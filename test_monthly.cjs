const http = require('http');
const options = {
    hostname: 'localhost',
    port: 3002,
    path: '/api/cocoa-london-origin?ageCategory=TOTAL%20Valid&metric=total_mt',
    method: 'GET',
    headers: {}
};
const req = http.request(options, res => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        const json = JSON.parse(data);
        console.log(`Count: ${json.count}`);
        console.log(`Sample row:`, JSON.stringify(json.data?.[0]));
        console.log(`Last row:`, JSON.stringify(json.data?.[json.data.length - 1]));
    });
});
req.on('error', console.error);
req.end();
