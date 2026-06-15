export type Priority = 'high' | 'medium' | 'low';

export interface Milestone {
  id: string;
  title: string;
  date: string;
  priority: Priority;
  progress: number;
}

export interface MonthInfo {
  year: number;
  month: number;
  label: string;
  yearLabel: string;
}
