import axios from 'axios';

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

export interface User {
  id: string;
  name: string;
  avatar: string;
  color: string;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignee_id: string | null;
  estimated_hours: number;
  due_date: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface TimeLog {
  id: string;
  task_id: string;
  user_id: string;
  log_date: string;
  hours: number;
  created_at: string;
}

export interface MemberStats {
  user_id: string;
  user_name: string;
  avatar: string;
  color: string;
  total_tasks: number;
  completed_tasks: number;
  total_estimated_hours: number;
  overdue_tasks: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type StatsRange = '7d' | '30d' | 'all';

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[API Error]', error.message);
    return Promise.reject(error);
  }
);

const unwrap = async <T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> => {
  const res = await promise;
  if (!res.data.success) {
    throw new Error(res.data.error || 'Request failed');
  }
  return res.data.data as T;
};

export const usersApi = {
  getAll: () => unwrap<User[]>(api.get('/users')),
};

export const tasksApi = {
  getAll: (params?: { status?: TaskStatus; assignee_id?: string }) =>
    unwrap<Task[]>(api.get('/tasks', { params })),
  getById: (id: string) => unwrap<Task>(api.get(`/tasks/${id}`)),
  create: (data: Partial<Task> & { title: string }) =>
    unwrap<Task>(api.post('/tasks', data)),
  update: (id: string, data: Partial<Task>) =>
    unwrap<Task>(api.put(`/tasks/${id}`, data)),
  updateStatus: (id: string, status: TaskStatus) =>
    unwrap<Task>(api.patch(`/tasks/${id}/status`, { status })),
  remove: (id: string) => unwrap<void>(api.delete(`/tasks/${id}`)),
};

export const timeLogsApi = {
  getAll: (params?: { user_id?: string; from_date?: string; to_date?: string }) =>
    unwrap<TimeLog[]>(api.get('/time-logs', { params })),
};

export const statsApi = {
  getMemberStats: (range: StatsRange = 'all') =>
    unwrap<MemberStats[]>(api.get('/stats/members', { params: { range } })),
};
