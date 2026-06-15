import express from 'express';
import Datastore from 'nedb-promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const db = Datastore.create(join(__dirname, 'data', 'notes.db'));

app.use(express.json());

app.get('/api/notes', async (req, res) => {
  try {
    const notes = await db.find({});
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notes', async (req, res) => {
  try {
    const note = await db.insert(req.body);
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, x, y, linkedIds } = req.body;
    
    const updateData = { title, content, category, x, y };
    if (linkedIds !== undefined) {
      updateData.linkedIds = linkedIds;
    }
    
    const note = await db.update({ _id: id }, { $set: updateData }, { returnUpdatedDocs: true });
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.remove({ _id: id }, {});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
