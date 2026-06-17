export interface Project {
  id: string;
  name: string;
  tags: string[];
  targetDuration: number;
  color: string;
}

export interface LogEntry {
  id: string;
  projectId: string;
  date: string;
  duration: number;
  tag: string;
}

export interface FilterState {
  dateRange: 'today' | 'week' | 'month' | 'custom';
  customStart?: string;
  customEnd?: string;
  tag?: string;
}
