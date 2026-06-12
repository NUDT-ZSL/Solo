import { useMemo } from 'react';
import {
  Task,
  TaskPosition,
  TickData,
  TimelineOutput,
  ROW_HEIGHT,
  TASK_HEIGHT,
  TASK_TOP_PADDING,
  BASE_PIXELS_PER_DAY,
  HEADER_HEIGHT,
  SIDE_PADDING,
  addDays,
  daysBetween,
} from './types';

export function useTimeline(
  tasks: Task[],
  zoom: number,
  viewportWidth: number
): TimelineOutput {
  return useMemo(() => {
    if (tasks.length === 0) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const start = addDays(now, -3);
      const end = addDays(now, 30);
      return {
        positions: [],
        ticks: generateTicks(start, end, BASE_PIXELS_PER_DAY * zoom, zoom),
        timeRange: { start, end },
        pixelsPerDay: BASE_PIXELS_PER_DAY * zoom,
        totalWidth: daysBetween(start, end) * BASE_PIXELS_PER_DAY * zoom + SIDE_PADDING * 2,
        totalHeight: ROW_HEIGHT * 4 + HEADER_HEIGHT,
      };
    }

    const minDate = new Date(Math.min(...tasks.map(t => t.startDate.getTime())));
    const maxDate = new Date(Math.max(...tasks.map(t => t.endDate.getTime())));
    const rangeStart = addDays(minDate, -3);
    const rangeEnd = addDays(maxDate, 7);

    const pixelsPerDay = BASE_PIXELS_PER_DAY * zoom;
    const totalDays = daysBetween(rangeStart, rangeEnd);
    const totalWidth = totalDays * pixelsPerDay + SIDE_PADDING * 2;
    const totalHeight = tasks.length * ROW_HEIGHT + HEADER_HEIGHT + SIDE_PADDING;

    const positions: TaskPosition[] = tasks.map((task, index) => {
      const startX = daysBetween(rangeStart, task.startDate) * pixelsPerDay + SIDE_PADDING;
      const width = Math.max(daysBetween(task.startDate, task.endDate) * pixelsPerDay, 8);
      return {
        id: task.id,
        x: startX,
        y: index * ROW_HEIGHT + HEADER_HEIGHT + TASK_TOP_PADDING,
        width,
        height: TASK_HEIGHT,
        row: index,
      };
    });

    const ticks = generateTicks(rangeStart, rangeEnd, pixelsPerDay, zoom);

    return {
      positions,
      ticks,
      timeRange: { start: rangeStart, end: rangeEnd },
      pixelsPerDay,
      totalWidth,
      totalHeight,
    };
  }, [tasks, zoom, viewportWidth]);
}

function generateTicks(rangeStart: Date, rangeEnd: Date, pixelsPerDay: number, zoom: number): TickData[] {
  const ticks: TickData[] = [];
  let tickDate = new Date(rangeStart);
  tickDate.setHours(0, 0, 0, 0);

  if (zoom < 2) {
    while (tickDate <= rangeEnd) {
      const x = daysBetween(rangeStart, tickDate) * pixelsPerDay + SIDE_PADDING;
      const day = tickDate.getDay();
      const label = day === 1 || day === 0
        ? `${tickDate.getMonth() + 1}/${tickDate.getDate()}`
        : `${tickDate.getDate()}`;
      ticks.push({ x, label, date: new Date(tickDate) });
      tickDate = addDays(tickDate, 1);
    }
  } else if (zoom < 4) {
    tickDate = getMonday(tickDate);
    while (tickDate <= rangeEnd) {
      const x = daysBetween(rangeStart, tickDate) * pixelsPerDay + SIDE_PADDING;
      ticks.push({
        x,
        label: `${tickDate.getMonth() + 1}月${tickDate.getDate()}日`,
        date: new Date(tickDate),
      });
      tickDate = addDays(tickDate, 7);
    }
  } else {
    tickDate = new Date(tickDate.getFullYear(), tickDate.getMonth(), 1);
    while (tickDate <= rangeEnd) {
      const x = daysBetween(rangeStart, tickDate) * pixelsPerDay + SIDE_PADDING;
      ticks.push({
        x,
        label: `${tickDate.getFullYear()}年${tickDate.getMonth() + 1}月`,
        date: new Date(tickDate),
      });
      tickDate = new Date(tickDate.getFullYear(), tickDate.getMonth() + 1, 1);
    }
  }

  return ticks;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}
