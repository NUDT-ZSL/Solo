export interface User {
  id: string;
  nickname: string;
  avatar: string;
}

export interface Tag {
  name: string;
  color: string;
}

export type Priority = 'urgent' | 'high' | 'medium' | 'low';
export type ColumnType = 'todo' | 'inProgress' | 'done';

export interface Card {
  id: string;
  projectId: string;
  column: ColumnType;
  title: string;
  description: string;
  assigneeId: string | null;
  priority: Priority;
  dueDate: string | null;
  tags: Tag[];
  createdAt: string;
  movedAt: string | null;
}

export interface Comment {
  id: string;
  cardId: string;
  userId: string;
  content: string;
  createdAt: string;
  user?: User;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  startDate?: string;
}

export interface BurndownData {
  dates: string[];
  ideal: number[];
  actual: number[];
  total: number;
}

export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}
