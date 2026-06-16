import { Plant, getSpeciesColor } from './plantManager';

export type TaskType = '浇水' | '施肥' | '修剪' | '转盆';

export interface CareTask {
  id: string;
  plantId: string;
  plantName: string;
  plantSpecies: string;
  taskType: TaskType;
  date: string;
  completed: boolean;
  color: string;
}

export interface GrowthRecord {
  id: string;
  plantId: string;
  photo: string;
  note: string;
  lightLevel: number;
  timestamp: string;
  taskType: TaskType;
}

export interface MonthlyStats {
  month: string;
  waterCount: number;
  fertilizeCount: number;
  pruneCount: number;
  rotateCount: number;
  total: number;
}

export interface PlantStats {
  plantId: string;
  plantName: string;
  totalWatering: number;
  totalFertilizing: number;
  ageDays: number;
  createdAt: string;
}

const TASK_TYPE_CONFIG: { type: TaskType; baseInterval: number }[] = [
  { type: '浇水', baseInterval: 0 },
  { type: '施肥', baseInterval: 0 },
  { type: '修剪', baseInterval: 0 },
  { type: '转盆', baseInterval: 0 },
];

const FERTILIZE_MULTIPLIER = 4;
const PRUNE_INTERVAL = 30;
const ROTATE_INTERVAL = 7;

function getWeekDates(referenceDate: Date): string[] {
  const dates: string[] = [];
  const day = referenceDate.getDay();
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() - ((day + 6) % 7));
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function daysSince(dateStr: string, reference: Date): number {
  const d = new Date(dateStr);
  return Math.floor((reference.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function generateWeeklyTasks(plants: Plant[], referenceDate: Date): CareTask[] {
  const tasks: CareTask[] = [];
  const weekDates = getWeekDates(referenceDate);

  for (const plant of plants) {
    const color = getSpeciesColor(plant.species);

    for (const dateStr of weekDates) {
      const dayOffset = daysSince(plant.createdAt, new Date(dateStr + 'T12:00:00'));
      if (dayOffset < 0) continue;

      if (dayOffset % plant.wateringFrequency === 0) {
        tasks.push({
          id: `task_${plant.id}_water_${dateStr}`,
          plantId: plant.id,
          plantName: plant.name,
          plantSpecies: plant.species,
          taskType: '浇水',
          date: dateStr,
          completed: false,
          color,
        });
      }

      const fertilizeInterval = plant.wateringFrequency * FERTILIZE_MULTIPLIER;
      if (dayOffset % fertilizeInterval === 0 && dayOffset > 0) {
        tasks.push({
          id: `task_${plant.id}_fert_${dateStr}`,
          plantId: plant.id,
          plantName: plant.name,
          plantSpecies: plant.species,
          taskType: '施肥',
          date: dateStr,
          completed: false,
          color,
        });
      }

      if (dayOffset % PRUNE_INTERVAL === 0 && dayOffset > 0) {
        tasks.push({
          id: `task_${plant.id}_prune_${dateStr}`,
          plantId: plant.id,
          plantName: plant.name,
          plantSpecies: plant.species,
          taskType: '修剪',
          date: dateStr,
          completed: false,
          color,
        });
      }

      if (dayOffset % ROTATE_INTERVAL === 0 && dayOffset > 0) {
        tasks.push({
          id: `task_${plant.id}_rotate_${dateStr}`,
          plantId: plant.id,
          plantName: plant.name,
          plantSpecies: plant.species,
          taskType: '转盆',
          date: dateStr,
          completed: false,
          color,
        });
      }
    }
  }

  tasks.sort((a, b) => a.date.localeCompare(b.date));
  return tasks;
}

export function updateTaskStatus(
  tasks: CareTask[],
  taskId: string,
  completed: boolean
): CareTask[] {
  return tasks.map((t) => (t.id === taskId ? { ...t, completed } : t));
}

export function aggregateMonthlyStats(
  completedTasks: CareTask[],
  months: number = 12
): MonthlyStats[] {
  const now = new Date();
  const stats: MonthlyStats[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    stats.push({
      month: key,
      waterCount: 0,
      fertilizeCount: 0,
      pruneCount: 0,
      rotateCount: 0,
      total: 0,
    });
  }

  for (const task of completedTasks) {
    const taskMonth = task.date.slice(0, 7);
    const stat = stats.find((s) => s.month === taskMonth);
    if (!stat) continue;
    switch (task.taskType) {
      case '浇水':
        stat.waterCount++;
        break;
      case '施肥':
        stat.fertilizeCount++;
        break;
      case '修剪':
        stat.pruneCount++;
        break;
      case '转盆':
        stat.rotateCount++;
        break;
    }
    stat.total++;
  }

  return stats;
}

export function computePlantStats(
  plants: Plant[],
  completedTasks: CareTask[]
): PlantStats[] {
  const now = new Date();
  return plants.map((plant) => {
    const plantTasks = completedTasks.filter((t) => t.plantId === plant.id);
    return {
      plantId: plant.id,
      plantName: plant.name,
      totalWatering: plantTasks.filter((t) => t.taskType === '浇水').length,
      totalFertilizing: plantTasks.filter((t) => t.taskType === '施肥').length,
      ageDays: daysSince(plant.createdAt, now),
      createdAt: plant.createdAt,
    };
  });
}

export { TASK_TYPE_CONFIG, getWeekDates };
