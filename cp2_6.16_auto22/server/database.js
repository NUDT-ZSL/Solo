import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'itineraries.json');

const readDB = () => {
  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('读取数据库失败:', err);
  }
  return {};
};

const writeDB = (data) => {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('写入数据库失败:', err);
  }
};

export const getItinerary = (id) => {
  const db = readDB();
  return db[id] || null;
};

export const saveItinerary = (id, data) => {
  const db = readDB();
  db[id] = {
    id,
    budget: data.budget,
    days: data.days,
    preference: data.preference,
    data: JSON.stringify(data),
    created_at: new Date().toISOString()
  };
  writeDB(db);
};

export default { getItinerary, saveItinerary };
