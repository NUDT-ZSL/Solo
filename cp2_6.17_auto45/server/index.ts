import express from 'express';
import cors from 'cors';
import { generateMockData } from './dataGenerator';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

app.get('/api/language-trends', (req, res) => {
  const data = generateMockData();
  res.json({
    success: true,
    data,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
