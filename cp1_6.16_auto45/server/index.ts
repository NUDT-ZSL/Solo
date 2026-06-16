import express from 'express';
import cors from 'cors';
import { furnitureLibrary, lightingPresets } from './data';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/furniture', (req, res) => {
  res.json({
    success: true,
    data: furnitureLibrary,
  });
});

app.get('/api/lighting-presets', (req, res) => {
  res.json({
    success: true,
    data: lightingPresets,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`GET /api/furniture - 获取家具列表`);
  console.log(`GET /api/lighting-presets - 获取光照预设`);
});
