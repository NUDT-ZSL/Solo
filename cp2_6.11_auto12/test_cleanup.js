const http = require('http');

const bottleData = JSON.stringify({
  lat: 30.0,
  lng: 120.0,
  audioData: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=',
  audioDuration: 1
});

async function createBottle() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/bottles',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bottleData)
      }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve());
    });
    req.on('error', reject);
    req.write(bottleData);
    req.end();
  });
}

async function getBottleCount() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3001/api/bottles', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const bottles = JSON.parse(data);
          resolve(bottles.length);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function test() {
  console.log('Creating 210 bottles...');
  for (let i = 0; i < 210; i++) {
    await createBottle();
    if ((i + 1) % 50 === 0) {
      console.log(`Created ${i + 1} bottles...`);
    }
  }
  const count = await getBottleCount();
  console.log(`Total bottles after creating 210: ${count}`);
  console.log(`Cleanup working: ${count <= 200 ? 'YES ✓' : 'NO ✗'}`);
}

test().catch(console.error);
