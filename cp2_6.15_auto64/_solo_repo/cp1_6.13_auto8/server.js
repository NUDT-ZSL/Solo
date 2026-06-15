import express from 'express';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import { format, subDays, startOfDay } from 'date-fns';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

app.use(express.json());

const dataDir = join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('[Server] Created data directory:', dataDir);
}

const habitsDbPath = join(dataDir, 'habits.db');
const checkinsDbPath = join(dataDir, 'checkins.db');

console.log('[Server] Initializing databases...');
const habitsDb = Datastore.create(habitsDbPath);
const checkinsDb = Datastore.create(checkinsDbPath);

const defaultHabits = [
  { _id: uuidv4(), name: '晨间阅读', targetFrequency: 7, createdAt: new Date().toISOString() },
  { _id: uuidv4(), name: '体育锻炼', targetFrequency: 3, createdAt: new Date().toISOString() },
  { _id: uuidv4(), name: '冥想', targetFrequency: 5, createdAt: new Date().toISOString() },
  { _id: uuidv4(), name: '健康饮食', targetFrequency: 7, createdAt: new Date().toISOString() }
];

async function initializeDefaultHabits() {
  try {
    const count = await habitsDb.count({});
    console.log(`[Server] Current habits count in DB: ${count}`);

    if (count === 0) {
      console.log('[Server] No habits found. Inserting default habits...');
      const inserted = await habitsDb.insert(defaultHabits);
      console.log(`[Server] Successfully inserted ${inserted.length} default habits.`);

      const verifyCount = await habitsDb.count({});
      console.log(`[Server] Verification - habits count after insert: ${verifyCount}`);
      
      if (verifyCount !== defaultHabits.length) {
        console.error('[Server] WARNING: Inserted count does not match expected!');
      }
    } else {
      console.log('[Server] Using existing habits data.');
      const allHabits = await habitsDb.find({});
      allHabits.forEach(h => console.log(`  - ${h.name}`));
    }
    return true;
  } catch (err) {
    console.error('[Server] Error during data initialization:', err);
    return false;
  }
}

async function ensureCheckinsDbReady() {
  try {
    const count = await checkinsDb.count({});
    console.log(`[Server] Checkins count in DB: ${count}`);
    return true;
  } catch (err) {
    console.error('[Server] Error verifying checkins DB:', err);
    return false;
  }
}

app.get('/api/habits', async (req, res) => {
  try {
    const habits = await habitsDb.find({}).sort({ createdAt: 1 });
    const today = format(new Date(), 'yyyy-MM-dd');
    
    const habitsWithStatus = await Promise.all(
      habits.map(async (habit) => {
        const todayCheckin = await checkinsDb.findOne({
          habitId: habit._id,
          date: today
        });
        return {
          ...habit,
          isCheckedToday: !!todayCheckin
        };
      })
    );
    
    console.log(`[GET /api/habits] Returning ${habitsWithStatus.length} habits`);
    res.json(habitsWithStatus);
  } catch (error) {
    console.error('[GET /api/habits] error:', error);
    res.status(500).json({ error: 'Failed to fetch habits' });
  }
});

app.post('/api/habits/:id/checkin', async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    
    const habit = await habitsDb.findOne({ _id: id });
    if (!habit) {
      return res.status(404).json({ error: 'Habit not found' });
    }
    
    const today = format(new Date(), 'yyyy-MM-dd');
    const existingCheckin = await checkinsDb.findOne({
      habitId: id,
      date: today
    });
    
    if (existingCheckin) {
      return res.status(400).json({ error: 'Already checked in today' });
    }
    
    const checkin = {
      _id: uuidv4(),
      habitId: id,
      date: today,
      note: note || '',
      createdAt: new Date().toISOString()
    };
    
    const result = await checkinsDb.insert(checkin);
    console.log(`[POST /api/habits/:id/checkin] Checkin successful: ${result._id} for habit ${habit.name}`);
    res.json(result);
  } catch (error) {
    console.error('[POST /api/habits/:id/checkin] error:', error);
    res.status(500).json({ error: 'Failed to check in' });
  }
});

app.get('/api/habits/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    
    const checkins = await checkinsDb
      .find({ habitId: id })
      .sort({ createdAt: -1 });
    
    let streak = 0;
    const today = startOfDay(new Date());
    
    for (let i = 0; i < 365; i++) {
      const checkDate = subDays(today, i);
      const dateStr = format(checkDate, 'yyyy-MM-dd');
      const hasCheckin = checkins.some(c => c.date === dateStr);
      
      if (hasCheckin) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    
    res.json({ checkins, streak });
  } catch (error) {
    console.error('[GET /api/habits/:id/stats] error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.get('/api/stats/weekly', async (req, res) => {
  try {
    const habits = await habitsDb.find({});
    const totalHabits = habits.length;
    
    const dailyStats = [];
    const today = startOfDay(new Date());
    
    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const dayCheckins = await checkinsDb.find({ date: dateStr });
      const completedHabits = new Set(dayCheckins.map(c => c.habitId)).size;
      
      dailyStats.push({
        date: dateStr,
        totalHabits,
        completedHabits,
        completionRate: totalHabits > 0 ? completedHabits / totalHabits : 0
      });
    }
    
    res.json(dailyStats);
  } catch (error) {
    console.error('[GET /api/stats/weekly] error:', error);
    res.status(500).json({ error: 'Failed to fetch weekly stats' });
  }
});

app.get('/api/habits/:id/weekly-checkins', async (req, res) => {
  try {
    const { id } = req.params;
    const today = startOfDay(new Date());
    const dates = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      dates.push(format(date, 'yyyy-MM-dd'));
    }
    
    const checkins = await checkinsDb.find({
      habitId: id,
      date: { $in: dates }
    });
    
    const weeklyStatus = dates.map(date => {
      const hasCheckin = checkins.some(c => c.date === date);
      return { date, checked: hasCheckin };
    });
    
    res.json(weeklyStatus);
  } catch (error) {
    console.error('[GET /api/habits/:id/weekly-checkins] error:', error);
    res.status(500).json({ error: 'Failed to fetch weekly checkins' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function startServer() {
  console.log('[Server] Waiting for databases to load...');
  
  try {
    await new Promise((resolve) => {
      habitsDb.on('load', () => {
        console.log('[Server] Habits database loaded successfully.');
        resolve(null);
      });
    });

    await new Promise((resolve) => {
      checkinsDb.on('load', () => {
        console.log('[Server] Checkins database loaded successfully.');
        resolve(null);
      });
    });
  } catch (e) {
    console.error('[Server] Error waiting for DB load events:', e);
  }

  await initializeDefaultHabits();
  await ensureCheckinsDbReady();

  app.listen(PORT, () => {
    console.log(`\n[Server] ===== HabitFlow API Server =====`);
    console.log(`[Server] Running on http://localhost:${PORT}`);
    console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
    console.log(`[Server] Habits API:   http://localhost:${PORT}/api/habits`);
    console.log(`[Server] =================================\n`);
  });
}

startServer().catch(err => {
  console.error('[Server] FATAL ERROR during startup:', err);
  process.exit(1);
});
