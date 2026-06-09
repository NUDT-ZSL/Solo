import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, '..', 'whiteboard-data.json');

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

app.get('/api/load', (req, res) => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      res.json({ success: true, data: JSON.parse(data) });
    } else {
      res.json({ success: true, data: { nodes: [], connectors: [] } });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: '加载数据失败' });
  }
});

app.post('/api/save', (req, res) => {
  try {
    const data = req.body;
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: '保存数据失败' });
  }
});

app.listen(PORT, () => {
  console.log(`MindMeld 服务器运行在 http://localhost:${PORT}`);
});
