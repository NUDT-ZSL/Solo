export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  cursorPosition: number;
}

export interface TrashNote extends Note {
  deletedAt: string;
}

export type SortOrder = 'asc' | 'desc';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
