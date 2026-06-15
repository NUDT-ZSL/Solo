const express = require('express');
const Datastore = require('nedb-promises');
const path = require('path');

const app = express();
const PORT = 3000;

const db = Datastore.create({ filename: path.join(__dirname, 'data', 'scores.db'), autoload: true });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

app.get('/api/highscore', async (req, res) => {
  try {
    const doc = await db.find({}).sort({ score: -1 }).limit(1).exec();
    if (doc.length > 0) {
      res.json({ score: doc[0].score, name: doc[0].name || 'Unknown' });
    } else {
      res.json({ score: 0, name: 'None' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch high score' });
  }
});

app.post('/api/highscore', async (req, res) => {
  try {
    const { score, name } = req.body;
    if (typeof score !== 'number' || score < 0) {
      return res.status(400).json({ error: 'Invalid score' });
    }
    const doc = await db.insert({ score, name: name || 'Player', date: new Date().toISOString() });
    res.json({ success: true, id: doc._id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save score' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
