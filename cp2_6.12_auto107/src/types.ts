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
