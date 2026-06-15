import { differenceInDays, parseISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

let plantsDb: any;
let remindersDb: any;
let schedulerTimer: NodeJS.Timeout | null = null;

export function initReminderService(plants: any, reminders: any) {
  plantsDb = plants;
  remindersDb = reminders;
  startScheduler();
}

function startScheduler() {
  if (schedulerTimer) clearInterval(schedulerTimer);

  const CHECK_HOURS = [8, 18];
  const lastChecked: Record<number, string> = {};

  schedulerTimer = setInterval(async () => {
    const now = new Date();
    const hour = now.getHours();
    const dateKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

    if (CHECK_HOURS.includes(hour) && lastChecked[hour] !== dateKey) {
      lastChecked[hour] = dateKey;
      await checkAndGenerateReminders();
    }
  }, 60000);
}

async function checkAndGenerateReminders() {
  try {
    const plants = await plantsDb.find({});

    for (const plant of plants) {
      const daysSinceWatered = differenceInDays(new Date(), parseISO(plant.lastWatered));

      if (daysSinceWatered >= plant.wateringFrequency) {
        const existing = await remindersDb.findOne({ plantId: plant._id, read: false });
        if (!existing) {
          await remindersDb.insert({
            _id: uuidv4(),
            plantId: plant._id,
            plantName: plant.name,
            type: 'water',
            message: `${plant.name}需要浇水了！已超过${daysSinceWatered}天未浇水`,
            read: false,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
  } catch (err) {
    console.error('提醒检查失败:', err);
  }
}

export async function getPendingReminders() {
  if (!remindersDb) return [];
  return remindersDb.find({ read: false }).sort({ createdAt: -1 });
}

export async function markRead(id: string) {
  if (!remindersDb) return null;
  await remindersDb.update({ _id: id }, { $set: { read: true } });
  return remindersDb.findOne({ _id: id });
}

export async function markAllRead() {
  if (!remindersDb) return;
  await remindersDb.update({}, { $set: { read: true } }, { multi: true });
}

export async function getUnreadCount() {
  if (!remindersDb) return 0;
  return remindersDb.count({ read: false });
}
