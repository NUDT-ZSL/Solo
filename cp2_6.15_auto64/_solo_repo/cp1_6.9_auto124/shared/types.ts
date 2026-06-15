export interface Task {
  id: string;
  title: string;
  createdAt: number;
  remindAt: number;
  completed: boolean;
}

export interface TaskCreateRequest {
  title: string;
  remindHours: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
