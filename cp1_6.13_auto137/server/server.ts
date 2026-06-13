import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/data/:variable/:month', (req, res) => {
  const { variable, month } = req.params;
  
  const validVariables = ['temperature', 'pressure', 'precipitation'];
  if (!validVariables.includes(variable)) {
    return res.status(400).json({ error: 'Invalid variable. Must be temperature, pressure, or precipitation.' });
  }
  
  const monthNum = parseInt(month);
  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    return res.status(400).json({ error: 'Invalid month. Must be 1-12.' });
  }
  
  const paddedMonth = String(monthNum).padStart(2, '0');
  const filePath = path.join(__dirname, 'data', `${variable}_${paddedMonth}.json`);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Data file not found.' });
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read data file.' });
  }
});

app.get('/api/data/:variable', (req, res) => {
  const { variable } = req.params;
  
  const validVariables = ['temperature', 'pressure', 'precipitation'];
  if (!validVariables.includes(variable)) {
    return res.status(400).json({ error: 'Invalid variable.' });
  }
  
  const allData: Record<string, any> = {};
  
  for (let m = 1; m <= 12; m++) {
    const paddedMonth = String(m).padStart(2, '0');
    const filePath = path.join(__dirname, 'data', `${variable}_${paddedMonth}.json`);
    
    if (fs.existsSync(filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        allData[paddedMonth] = data;
      } catch (err) {
        console.error(`Failed to read ${filePath}`);
      }
    }
  }
  
  res.json(allData);
});

app.listen(PORT, () => {
  console.log(`Climate data server running on http://localhost:${PORT}`);
});
