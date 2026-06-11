const fs = require('fs');
const path = require('path');

const COLS = 1024;
const ROWS = 1000;
const filePath = path.join(__dirname, 'data', 'terrain_1024.csv');

function generateHeight(row, col) {
  const nx = col / COLS;
  const ny = row / ROWS;
  let h = 0;
  h += 300 * Math.sin(nx * Math.PI * 3) * Math.cos(ny * Math.PI * 2);
  h += 150 * Math.sin(nx * Math.PI * 7 + 0.5) * Math.cos(ny * Math.PI * 5 + 0.3);
  h += 80 * Math.sin(nx * Math.PI * 13 + 1.2) * Math.cos(ny * Math.PI * 11 + 0.8);
  h += 40 * Math.sin(nx * Math.PI * 23 + 2.1) * Math.cos(ny * Math.PI * 19 + 1.5);
  h += 500;
  h = Math.max(0, Math.min(1000, h));
  return h.toFixed(1);
}

const stream = fs.createWriteStream(filePath);
for (let r = 0; r < ROWS; r++) {
  const row = [];
  for (let c = 0; c < COLS; c++) {
    row.push(generateHeight(r, c));
  }
  stream.write(row.join(',') + '\n');
}
stream.end();
stream.on('finish', () => {
  console.log(`Generated ${filePath} (${ROWS} rows x ${COLS} cols)`);
});
