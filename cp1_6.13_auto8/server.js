import express from 'express';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

app.use(express.json());

const habitsDb = Datastore.create(join(__dirname, 'data', 'habits.db'));
const checkinsDb = Datastore.create(join(__dirname, 'data', 'checkins.db'));

const defaultHabits = [
  { _id: uuidv4(), name: '晨间阅读', targetFrequency: 7, createdAt: new Date().toISOString() },
  { _id: uuidv4(), name: '体育锻炼', targetFrequency: 3, createdAt: new Date().toISOString() },
  { _id: uuidv4(), name: '冥想', targetFrequency: 5, createdAt: new Date().toISOString() },
  { _id: uuidv4(), name: '健康饮食', targetFrequency: 7, createdAt: new Date().toISOString() }
];

async function initializeData() {
  const count = await habitsDb.count({});
  if (count === 0) {
    await habitsDb.insert(defaultHabits);
    console.log('Initialized default habits data');
  }
}

initializeData().catch(console.error);

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
    
    res.json(habitsWithStatus);
  } catch (error) {
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
    res.json(result);
  } catch (error) {
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
    res.status(500).json({ error: 'Failed to fetch weekly checkins' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
