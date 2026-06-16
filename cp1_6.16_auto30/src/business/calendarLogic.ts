import { addDays, differenceInDays, isBefore, isAfter, isSameDay, format, parseISO } from 'date-fns';
import type { Seed, PlantSchedule, EventType, GrowthStage, GardenEvent, Reminder, ClaimedSeed, StageCount } from '../types';

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  sowing: '播种',
  watering: '浇水',
  fertilizing: '施肥',
  harvesting: '收获',
  germination: '发芽',
  thinning: '间苗',
};

const STAGE_LABELS: Record<GrowthStage['stage'], string> = {
  seed: '种子期',
  germination: '发芽期',
  growth: '生长期',
  flowering: '开花期',
  fruiting: '结果期',
  harvested: '已收获',
};

export function generatePlantSchedule(seed: Seed, startDate: Date = new Date()): PlantSchedule {
  const { germination, thinning, growth, flowering, fruiting } = seed.growthDays;

  const sowingDate = startDate;
  const germinationDate = addDays(sowingDate, germination);
  const thinningDate = addDays(germinationDate, thinning);
  const growthStartDate = addDays(thinningDate, 1);
  const floweringDate = addDays(growthStartDate, growth);
  const fruitingDate = addDays(floweringDate, flowering);
  const harvestDate = addDays(fruitingDate, fruiting);

  return {
    sowingDate: format(sowingDate, 'yyyy-MM-dd'),
    germinationDate: format(germinationDate, 'yyyy-MM-dd'),
    thinningDate: format(thinningDate, 'yyyy-MM-dd'),
    growthStartDate: format(growthStartDate, 'yyyy-MM-dd'),
    floweringDate: format(floweringDate, 'yyyy-MM-dd'),
    fruitingDate: format(fruitingDate, 'yyyy-MM-dd'),
    harvestDate: format(harvestDate, 'yyyy-MM-dd'),
  };
}

export function getCurrentGrowthStage(
  schedule: PlantSchedule,
  events: GardenEvent[],
  today: Date = new Date()
): GrowthStage['stage'] {
  const harvestEvents = events.filter(e => e.type === 'harvesting' && e.completed);
  if (harvestEvents.length > 0) {
    return 'harvested';
  }

  const todayStr = format(today, 'yyyy-MM-dd');

  if (isBefore(parseISO(todayStr), parseISO(schedule.germinationDate))) {
    return 'seed';
  }
  if (isBefore(parseISO(todayStr), parseISO(schedule.thinningDate))) {
    return 'germination';
  }
  if (isBefore(parseISO(todayStr), parseISO(schedule.floweringDate))) {
    return 'growth';
  }
  if (isBefore(parseISO(todayStr), parseISO(schedule.fruitingDate))) {
    return 'flowering';
  }
  if (isBefore(parseISO(todayStr), parseISO(schedule.harvestDate))) {
    return 'fruiting';
  }
  return 'harvested';
}

export function getStageLabel(stage: GrowthStage['stage']): string {
  return STAGE_LABELS[stage];
}

export function getEventTypeLabel(type: EventType): string {
  return EVENT_TYPE_LABELS[type];
}

export function getDaysUntilNextEvent(
  schedule: PlantSchedule,
  events: GardenEvent[],
  today: Date = new Date()
): { eventType: EventType; label: string; days: number; date: string } | null {
  const todayStr = format(today, 'yyyy-MM-dd');
  const todayIso = parseISO(todayStr);

  const scheduledEvents: Array<{ date: string; type: EventType }> = [
    { date: schedule.sowingDate, type: 'sowing' },
    { date: schedule.germinationDate, type: 'germination' },
    { date: schedule.thinningDate, type: 'thinning' },
    { date: schedule.floweringDate, type: 'fertilizing' },
    { date: schedule.fruitingDate, type: 'fertilizing' },
    { date: schedule.harvestDate, type: 'harvesting' },
  ];

  const completedDates = new Set(
    events.filter(e => e.completed).map(e => format(parseISO(e.date), 'yyyy-MM-dd'))
  );

  for (const { date, type } of scheduledEvents) {
    const dateIso = parseISO(date);
    if (
      (isAfter(dateIso, todayIso) || isSameDay(dateIso, todayIso)) &&
      !completedDates.has(date)
    ) {
      return {
        eventType: type,
        label: EVENT_TYPE_LABELS[type],
        days: differenceInDays(dateIso, todayIso),
        date,
      };
    }
  }

  return null;
}

export function generateReminders(
  claimedSeeds: ClaimedSeed[],
  events: GardenEvent[],
  today: Date = new Date()
): Reminder[] {
  const reminders: Reminder[] = [];
  const todayStr = format(today, 'yyyy-MM-dd');
  const todayIso = parseISO(todayStr);

  for (const claimed of claimedSeeds) {
    const { schedule, seed } = claimed;
    const seedEvents = events.filter(e => e.claimedSeedId === claimed.id);
    const completedDates = new Set(
      seedEvents.filter(e => e.completed).map(e => format(parseISO(e.date), 'yyyy-MM-dd'))
    );

    const scheduleItems: Array<{ date: string; type: EventType }> = [
      { date: schedule.sowingDate, type: 'sowing' },
      { date: schedule.germinationDate, type: 'germination' },
      { date: schedule.thinningDate, type: 'thinning' },
      { date: schedule.harvestDate, type: 'harvesting' },
    ];

    for (const item of scheduleItems) {
      const dateIso = parseISO(item.date);
      const daysAway = differenceInDays(dateIso, todayIso);

      if (daysAway >= 0 && daysAway <= 7 && !completedDates.has(item.date)) {
        reminders.push({
          id: `${claimed.id}-${item.type}-${item.date}`,
          claimedSeedId: claimed.id,
          seedName: seed.name,
          eventType: item.type,
          eventTypeLabel: EVENT_TYPE_LABELS[item.type],
          date: item.date,
          daysAway,
          read: false,
        });
      }
    }
  }

  return reminders.sort((a, b) => a.daysAway - b.daysAway);
}

export function getGrowthProgressPercentage(
  schedule: PlantSchedule,
  today: Date = new Date()
): number {
  const start = parseISO(schedule.sowingDate);
  const end = parseISO(schedule.harvestDate);
  const totalDays = differenceInDays(end, start);
  const elapsed = differenceInDays(today, start);

  if (elapsed <= 0) return 0;
  if (elapsed >= totalDays) return 100;
  return Math.round((elapsed / totalDays) * 100);
}

export function isDatePast(dateStr: string, today: Date = new Date()): boolean {
  return isBefore(parseISO(dateStr), parseISO(format(today, 'yyyy-MM-dd')));
}

export function isDateToday(dateStr: string, today: Date = new Date()): boolean {
  return isSameDay(parseISO(dateStr), today);
}

export function countStages(
  claimedSeeds: ClaimedSeed[],
  events: GardenEvent[],
  today: Date = new Date()
): StageCount {
  const counts: StageCount = {
    seed: 0,
    germination: 0,
    growth: 0,
    flowering: 0,
    fruiting: 0,
    harvested: 0,
  };

  for (const claimed of claimedSeeds) {
    const seedEvents = events.filter(e => e.claimedSeedId === claimed.id);
    const stage = getCurrentGrowthStage(claimed.schedule, seedEvents, today);
    counts[stage]++;
  }

  return counts;
}

export { EVENT_TYPE_LABELS, STAGE_LABELS };
