export type TaskCategory = 'planned' | 'inProgress' | 'completed';

export interface Task {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  category: TaskCategory;
  dependencies: string[];
}

export interface TaskPosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  row: number;
}

export interface TickData {
  x: number;
  label: string;
  date: Date;
}

export interface TimelineOutput {
  positions: TaskPosition[];
  ticks: TickData[];
  timeRange: { start: Date; end: Date };
  pixelsPerDay: number;
  totalWidth: number;
  totalHeight: number;
}

export interface TooltipInfo {
  task: Task;
  mouseX: number;
  mouseY: number;
}

export const CATEGORY_COLORS: Record<TaskCategory, string> = {
  planned: '#98D8C8',
  inProgress: '#F7DC6F',
  completed: '#BB8FCE',
};

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  planned: '计划中',
  inProgress: '进行中',
  completed: '已完成',
};

export const ROW_HEIGHT = 40;
export const TASK_HEIGHT = 28;
export const TASK_TOP_PADDING = (ROW_HEIGHT - TASK_HEIGHT) / 2;
export const BASE_PIXELS_PER_DAY = 60;
export const HEADER_HEIGHT = 50;
export const SIDE_PADDING = 20;

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}
