export type Priority = 'high' | 'medium' | 'low';

export interface Card {
  id: string;
  listId: string;
  title: string;
  description: string;
  priority: Priority;
  dueDate: string | null;
  assignee: string | null;
  order: number;
  createdAt: string;
  completedAt: string | null;
}

export interface List {
  id: string;
  projectId: string;
  title: string;
  order: number;
}

export interface Member {
  id: string;
  projectId: string;
  email: string;
  name: string;
  role: 'owner' | 'member';
  joinedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  ownerEmail: string;
}

export interface Comment {
  id: string;
  cardId: string;
  author: string;
  content: string;
  createdAt: string;
}

export interface Invitation {
  id: string;
  projectId: string;
  email: string;
  token: string;
  invitedAt: string;
  accepted: boolean;
}

export type ViewMode = 'board' | 'gantt' | 'stats';

export interface ToastNotification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}
