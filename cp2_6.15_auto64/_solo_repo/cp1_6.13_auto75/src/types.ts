export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  coverUrl: string;
  status: 'available' | 'borrowed';
  dueDate: string | null;
}

export interface Reminder extends Book {
  overdueDays: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
