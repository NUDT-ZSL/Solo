const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');

const defaultData = {
  'users.json': [],
  'books.json': [],
  'exchanges.json': { requests: [], records: [] },
};

function ensureDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function readData(filename) {
  ensureDir();
  const filePath = path.join(dataDir, filename);
  if (!fs.existsSync(filePath)) {
    return defaultData[filename] || [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

function writeData(filename, data) {
  ensureDir();
  const filePath = path.join(dataDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = { readData, writeData };
