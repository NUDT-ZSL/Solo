import express from 'express';
import cors from 'cors';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const db = Datastore.create({ filename: './data/presets.db', autoload: true });

app.get('/api/presets', async (_req, res) => {
  try {
    const presets = await db.find({}).sort({ createdAt: -1 });
    res.json(presets);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch presets' });
  }
});

app.post('/api/presets', async (req, res) => {
  try {
    const preset = {
      ...req.body,
      id: uuidv4(),
      createdAt: Date.now()
    };
    const doc = await db.insert(preset);
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create preset' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
