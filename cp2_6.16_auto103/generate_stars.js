import fs from 'fs';

const stars = [];

for (let i = 0; i < 500; i++) {
  const ra = Math.random() * 360;
  const sinDec = Math.random() * 2 - 1;
  const dec = Math.asin(sinDec) * (180 / Math.PI);

  stars.push({
    id: i + 1,
    name: `Star-${String(i + 1).padStart(3, '0')},
    ra: parseFloat(ra.toFixed(4)),
    dec: parseFloat(dec.toFixed(4)),
    brightness: {
      visible: parseFloat((Math.random() * 100).toFixed(2)),
      infrared: parseFloat((Math.random() * 100).toFixed(2)),
      ultraviolet: parseFloat((Math.random() * 100).toFixed(2)),
      xray: parseFloat((Math.random() * 100).toFixed(2))
    },
    distance: parseFloat((Math.random() * 10000).toFixed(2))
  });
}

fs.writeFileSync('server/data/stars.json', JSON.stringify(stars, null, 2), 'utf8');
console.log('Generated 500 stars');
