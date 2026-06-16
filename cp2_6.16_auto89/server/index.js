import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const dataPath = path.join(__dirname, '../src/Data/mockData.json');

const readData = () => {
  const rawData = fs.readFileSync(dataPath, 'utf-8');
  return JSON.parse(rawData);
};

app.get('/api/poets', (req, res) => {
  setTimeout(() => {
    const data = readData();
    res.json(data.poets);
  }, 2000);
});

app.get('/api/poet/:id', (req, res) => {
  setTimeout(() => {
    const data = readData();
    const poet = data.poets.find(p => p.id === req.params.id);
    if (poet) {
      res.json(poet);
    } else {
      res.status(404).json({ message: '诗人不存在' });
    }
  }, 2000);
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
