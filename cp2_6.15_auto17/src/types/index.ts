export type Priority = 'urgent' | 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  title: string;
  assignee: string;
  estimateHours: number;
  priority: Priority;
  columnId: string;
}

export interface Column {
  id: string;
  title: string;
  taskIds: string[];
}

export interface BoardState {
  tasks: Record<string, Task>;
  columns: Record<string, Column>;
  columnOrder: string[];
}

export interface MemberWorkload {
  name: string;
  taskCount: number;
  totalHours: number;
  capacity: number;
  remainingCapacity: number;
  isOverloaded: boolean;
  tasks: Task[];
}

export interface WorkloadSummary {
  totalTasks: number;
  overloadedCount: number;
  members: MemberWorkload[];
}

export type BoardAction =
  | {
      type: 'MOVE_TASK';
      payload: {
        source: { droppableId: string; index: number };
        destination: { droppableId: string; index: number };
      };
    }
  | { type: 'ADD_TASK'; payload: Omit<Task, 'id' | 'columnId'> };

export const PRIORITY_COLORS: Record<Priority, string> = {
  urgent: '#ff4d4d',
  high: '#ffa64d',
  medium: '#4d79ff',
  low: '#4dff4d',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  urgent: '紧急',
  high: '高',
  medium: '中',
  low: '低',
};

export const OVERLOAD_THRESHOLD = 5;
export const MEMBER_CAPACITY = 8;
export const OVERLOAD_BLINK_INTERVAL = 0.5;

export const TEAM_MEMBERS = ['张三', '李四', '王五', '赵六', '钱七'];
