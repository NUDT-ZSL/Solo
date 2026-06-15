export type Priority = 'high' | 'medium' | 'low';

export interface Todo {
  id: number;
  title: string;
  description: string;
  priority: Priority;
  tags: string;
  date: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface TodoFormData {
  title: string;
  description: string;
  priority: Priority;
  tags: string[];
}
