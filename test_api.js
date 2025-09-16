const http = require('http');

// ทดสอบ API
const options = {
    hostname: 'localhost',
    port: 8080,
    path: '/api/test',
    method: 'GET'
};

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers: ${JSON.stringify(res.headers)}`);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Response body:');
        console.log(data);
    });
});

req.on('error', (e) => {
    console.error(`Error: ${e.message}`);
});

req.end();
