import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, '../src/data.json');

async function readData() {
  const raw = await readFile(dataPath, 'utf-8');
  return JSON.parse(raw);
}

async function saveData(data) {
  await writeFile(dataPath, JSON.stringify(data, null, 2), 'utf-8');
}

function enrichPlot(plot, users) {
  const adopter = plot.adopterId ? users.find(u => u.id === plot.adopterId) : null;
  return {
    ...plot,
    area: `${plot.width}m×${plot.height}m`,
    adopter: adopter ? { id: adopter.id, name: adopter.name, avatar: adopter.avatar } : null,
  };
}

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/gardens/:id', async (req, res) => {
  try {
    const data = await readData();
    const garden = data.gardens.find(g => g.id === req.params.id);
    if (!garden) return res.status(404).json({ error: 'Garden not found' });
    const plots = data.plots
      .filter(p => p.gardenId === garden.id)
      .map(p => enrichPlot(p, data.users));
    res.json({ id: garden.id, name: garden.name, plots });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/plots/:id/adopt', async (req, res) => {
  try {
    const data = await readData();
    const plot = data.plots.find(p => p.id === req.params.id);
    if (!plot) return res.status(404).json({ error: 'Plot not found' });
    if (plot.status !== 'vacant') return res.status(400).json({ error: 'Plot is not vacant' });
    const { userId, cropName } = req.body;
    plot.status = 'adopted';
    plot.adopterId = userId;
    plot.cropName = cropName;
    await saveData(data);
    res.json(enrichPlot(plot, data.users));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/plots/:id', async (req, res) => {
  try {
    const data = await readData();
    const plot = data.plots.find(p => p.id === req.params.id);
    if (!plot) return res.status(404).json({ error: 'Plot not found' });
    res.json(enrichPlot(plot, data.users));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/plots/:id/journals', async (req, res) => {
  try {
    const data = await readData();
    const plot = data.plots.find(p => p.id === req.params.id);
    if (!plot) return res.status(404).json({ error: 'Plot not found' });
    const { userId, cropVariety, description, imageUrl } = req.body;
    const journal = {
      id: uuidv4(),
      plotId: plot.id,
      userId,
      cropVariety,
      description,
      imageUrl: imageUrl || '',
      createdAt: new Date().toISOString(),
    };
    plot.journals.push(journal);
    await saveData(data);
    res.json(journal);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/plots/:id/checkin', async (req, res) => {
  try {
    const data = await readData();
    const plot = data.plots.find(p => p.id === req.params.id);
    if (!plot) return res.status(404).json({ error: 'Plot not found' });
    const { userId, type } = req.body;
    const now = new Date().toISOString();
    const checkIn = { id: uuidv4(), plotId: plot.id, userId, type, createdAt: now };
    plot.checkIns.push(checkIn);
    if (type === 'water') {
      plot.lastWateredAt = now;
    }
    await saveData(data);

    const today = dayjs().format('YYYY-MM-DD');
    const todayWater = plot.checkIns.filter(c => c.type === 'water' && dayjs(c.createdAt).format('YYYY-MM-DD') === today).length;
    const todayFertilize = plot.checkIns.filter(c => c.type === 'fertilize' && dayjs(c.createdAt).format('YYYY-MM-DD') === today).length;
    const todayJournals = plot.journals.filter(j => dayjs(j.createdAt).format('YYYY-MM-DD') === today).length;
    const score = todayWater * 2 + todayFertilize * 3 + todayJournals * 1;

    const existingScore = data.dailyScores.find(ds => ds.plotId === plot.id && ds.date === today);
    if (existingScore) {
      existingScore.score = score;
    } else {
      data.dailyScores.push({ plotId: plot.id, userId, date: today, score });
    }
    await saveData(data);

    const todayCount = plot.checkIns.filter(c => c.type === type && dayjs(c.createdAt).format('YYYY-MM-DD') === today).length;
    res.json({ checkIn, todayCount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/leaderboard/:gardenId', async (req, res) => {
  try {
    const data = await readData();
    const gardenPlots = data.plots.filter(p => p.gardenId === req.params.gardenId && p.status === 'adopted');
    const today = dayjs().format('YYYY-MM-DD');
    const results = gardenPlots.map(plot => {
      const todayWater = plot.checkIns.filter(c => c.type === 'water' && dayjs(c.createdAt).format('YYYY-MM-DD') === today).length;
      const todayFertilize = plot.checkIns.filter(c => c.type === 'fertilize' && dayjs(c.createdAt).format('YYYY-MM-DD') === today).length;
      const todayJournals = plot.journals.filter(j => dayjs(j.createdAt).format('YYYY-MM-DD') === today).length;
      const healthScore = todayWater * 2 + todayFertilize * 3 + todayJournals * 1;
      const adopter = data.users.find(u => u.id === plot.adopterId);
      return {
        plotId: plot.id,
        number: plot.number,
        adopterId: plot.adopterId,
        adopterName: adopter?.name || '',
        avatar: adopter?.avatar || '',
        cropName: plot.cropName,
        healthScore,
      };
    });
    results.sort((a, b) => b.healthScore - a.healthScore);
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/leaderboard/:gardenId/trend/:userId', async (req, res) => {
  try {
    const dbData = await readData();
    const { gardenId, userId } = req.params;
    const userPlots = dbData.plots.filter(p => p.gardenId === gardenId && p.adopterId === userId);
    const plotIds = userPlots.map(p => p.id);
    const labels: string[] = [];
    const data: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
      labels.push(date);
      const dayScore = dbData.dailyScores
        .filter(ds => ds.date === date && plotIds.includes(ds.plotId))
        .reduce((sum, ds) => sum + ds.score, 0);
      data.push(dayScore);
    }
    res.json({ labels, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const data = await readData();
    const user = data.users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(3100, () => console.log('Server running on port 3100'));
