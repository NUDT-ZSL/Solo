export interface PomodoroRecord {
  timestamp: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  estimatedPomodoros: number;
  completedPomodoros: number;
  pomodoroRecords: PomodoroRecord[];
  completed: boolean;
  createdAt: number;
}

export interface WeeklyStat {
  day: string;
  date: string;
  count: number;
}

export type TimerMode = 'work' | 'break' | 'idle';
