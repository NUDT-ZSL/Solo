const fs = require('fs');
const http = require('http');

const users = JSON.parse(fs.readFileSync('data/users.json', 'utf8'));
const token = Buffer.from(JSON.stringify({ userId: users[0].id, email: users[0].email })).toString('base64');

const formData = `--boundary123\r\nContent-Disposition: form-data; name="audio"; filename="test-audio.wav"\r\nContent-Type: audio/wav\r\n\r\n`;
const fileData = fs.readFileSync('test-audio.wav');
const endBoundary = '\r\n--boundary123--\r\n';

const headerBuf = Buffer.from(formData);
const endBuf = Buffer.from(endBoundary);
const body = Buffer.concat([headerBuf, fileData, endBuf]);

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/voiceprints',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'multipart/form-data; boundary=boundary123',
    'Content-Length': body.length,
  },
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (e) => { console.error('Error:', e.message); });
req.write(body);
req.end();
