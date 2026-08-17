const http = require('http');

const req = http.request('http://127.0.0.1:8787/api/admin/dashboard', {
  method: 'GET',
  headers: {
    'X-Debug-Bypass': 'true'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('userRole:', json.userRole);
      console.log('success:', json.success);
    } catch(e) {
      console.log('raw:', data.substring(0, 200));
    }
  });
});

req.on('error', console.error);
req.end();
