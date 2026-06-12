import express from 'express';
import Datastore from 'nedb-promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const scoresDb = Datastore.create(join(__dirname, 'data', 'scores.db'));
const configDb = Datastore.create(join(__dirname, 'data', 'config.db'));

const defaultConfig = {
  floors: 3,
  gridWidth: 10,
  gridHeight: 6,
  baseHp: 100,
  maxCrystals: 5,
  crystalRegenTime: 2000,
  playerSpeed: 2.5,
  crystalSpeed: 6,
  crystalDamage: 15,
  explosionRadius: 1.5,
  slowPercentage: 0.4,
  slowDuration: 2000,
  snowMonsterCount: 3,
  snowMonsterSpeed: 1.2,
  snowMonsterDamage: 10,
  snowMonsterKnockback: 3,
  iceGolemCount: 2,
  iceGolemSpeed: 0.4,
  iceGolemDamage: 25,
  iceGolemFreezeDuration: 1500,
  energyDropChance: 0.2,
  energyHealAmount: 5,
  icicleMinCount: 2,
  icicleMaxCount: 3
};

async function initConfig() {
  const existing = await configDb.findOne({ id: 'default' });
  if (!existing) {
    await configDb.insertOne({ id: 'default', ...defaultConfig, createdAt: Date.now() });
  }
}
initConfig();

app.get('/api/scores', async (req, res) => {
  try {
    const scores = await scoresDb
      .find({})
      .sort({ score: -1 })
      .limit(10);
    res.json({ success: true, data: scores });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/scores', async (req, res) => {
  try {
    const { playerName, score, level, kills } = req.body;
    if (!playerName || typeof score !== 'number') {
      return res.status(400).json({ success: false, error: 'Invalid data' });
    }
    const record = await scoresDb.insertOne({
      playerName,
      score,
      level: level || 1,
      kills: kills || 0,
      createdAt: Date.now()
    });
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/config', async (req, res) => {
  try {
    const config = await configDb.findOne({ id: 'default' });
    res.json({ success: true, data: config || defaultConfig });
  } catch (err) {
    res.json({ success: true, data: defaultConfig });
  }
});

app.listen(PORT, () => {
  console.log(`FrostSpire server running at http://localhost:${PORT}`);
});
