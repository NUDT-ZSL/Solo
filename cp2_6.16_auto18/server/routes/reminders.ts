import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { allQuery, getQuery } from '../database';
import type { Plant, CareEvent, Reminder } from '../../src/types';
import { EVENT_NAMES } from '../../src/types';

const router = Router();

const completedReminders = new Map<string, boolean>();

function generateReminders(plant: Plant, lastEvents: CareEvent[]): Reminder[] {
  const reminders: Reminder[] = [];
  const today = new Date();
  const location = plant.location || '客厅';

  const locationMultiplier: Record<string, number> = {
    '阳台': 0.8,
    '客厅': 1.0,
    '浴室': 1.2,
    '卧室': 1.0,
    '厨房': 0.9,
    '书房': 1.0,
  };

  const multiplier = locationMultiplier[location] || 1.0;

  const getLastEventDate = (type: string): Date | null => {
    const event = lastEvents.find(e => e.type === type);
    return event ? new Date(event.date) : null;
  };

  const waterDate = getLastEventDate('water');
  const fertilizeDate = getLastEventDate('fertilize');
  const pruneDate = getLastEventDate('prune');
  const repotDate = getLastEventDate('repot');

  const waterDays = Math.round(7 * multiplier);
  const fertilizeDays = Math.round(30 * multiplier);
  const pruneDays = Math.round(60 * multiplier);
  const repotDays = Math.round(365 * multiplier);

  if (waterDate) {
    const nextWater = new Date(waterDate);
    nextWater.setDate(nextWater.getDate() + waterDays);
    if (nextWater >= today && nextWater <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) {
      reminders.push({
        id: uuidv4(),
        plantId: plant.id,
        plantName: plant.name,
        type: 'water',
        date: nextWater.toISOString().split('T')[0],
        description: `给${plant.name}${EVENT_NAMES['water']}，当前摆放位置：${location}`,
        completed: false,
      });
    }
  } else {
    const nextWater = new Date(today);
    nextWater.setDate(nextWater.getDate() + Math.ceil(waterDays / 2));
    if (nextWater <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) {
      reminders.push({
        id: uuidv4(),
        plantId: plant.id,
        plantName: plant.name,
        type: 'water',
        date: nextWater.toISOString().split('T')[0],
        description: `给${plant.name}${EVENT_NAMES['water']}，当前摆放位置：${location}`,
        completed: false,
      });
    }
  }

  if (fertilizeDate) {
    const nextFertilize = new Date(fertilizeDate);
    nextFertilize.setDate(nextFertilize.getDate() + fertilizeDays);
    if (nextFertilize >= today && nextFertilize <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) {
      reminders.push({
        id: uuidv4(),
        plantId: plant.id,
        plantName: plant.name,
        type: 'fertilize',
        date: nextFertilize.toISOString().split('T')[0],
        description: `给${plant.name}${EVENT_NAMES['fertilize']}，建议使用缓释肥`,
        completed: false,
      });
    }
  } else {
    const nextFertilize = new Date(today);
    nextFertilize.setDate(nextFertilize.getDate() + 3);
    if (nextFertilize <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) {
      reminders.push({
        id: uuidv4(),
        plantId: plant.id,
        plantName: plant.name,
        type: 'fertilize',
        date: nextFertilize.toISOString().split('T')[0],
        description: `给${plant.name}${EVENT_NAMES['fertilize']}，建议使用缓释肥`,
        completed: false,
      });
    }
  }

  if (pruneDate) {
    const nextPrune = new Date(pruneDate);
    nextPrune.setDate(nextPrune.getDate() + pruneDays);
    if (nextPrune >= today && nextPrune <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) {
      reminders.push({
        id: uuidv4(),
        plantId: plant.id,
        plantName: plant.name,
        type: 'prune',
        date: nextPrune.toISOString().split('T')[0],
        description: `给${plant.name}${EVENT_NAMES['prune']}，去除黄叶和徒长枝`,
        completed: false,
      });
    }
  }

  if (repotDate) {
    const nextRepot = new Date(repotDate);
    nextRepot.setDate(nextRepot.getDate() + repotDays);
    if (nextRepot >= today && nextRepot <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) {
      reminders.push({
        id: uuidv4(),
        plantId: plant.id,
        plantName: plant.name,
        type: 'repot',
        date: nextRepot.toISOString().split('T')[0],
        description: `给${plant.name}${EVENT_NAMES['repot']}，检查根系状态`,
        completed: false,
      });
    }
  }

  return reminders;
}

router.get('/', async (req, res) => {
  try {
    const plantsResult = await allQuery<any>(`
      SELECT 
        id, 
        name, 
        scientific_name as scientificName,
        image,
        description,
        light,
        water,
        temperature,
        soil,
        location,
        added_at as addedAt
      FROM plants 
      ORDER BY added_at DESC
    `);

    const plants = plantsResult as unknown as Plant[];
    const allReminders: Reminder[] = [];

    for (const plant of plants) {
      const events = await allQuery<any>(`
        SELECT 
          id, 
          plant_id as plantId,
          type,
          date,
          note
        FROM care_events 
        WHERE plant_id = ?
        ORDER BY date DESC
        LIMIT 10
      `, [plant.id]);

      const plantReminders = generateReminders(plant, events as unknown as CareEvent[]);

      for (const reminder of plantReminders) {
        reminder.completed = completedReminders.get(reminder.id) || false;
        allReminders.push(reminder);
      }
    }

    allReminders.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    res.json({
      success: true,
      reminders: allReminders,
    });
  } catch (error) {
    console.error('Get reminders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get reminders',
    });
  }
});

router.post('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    completedReminders.set(id, true);

    res.json({
      success: true,
      message: 'Reminder marked as completed',
    });
  } catch (error) {
    console.error('Complete reminder error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete reminder',
    });
  }
});

export default router;
