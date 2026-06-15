import { Todo, TodoFormData } from './types';

const API_BASE = '/api';

export const fetchTodosByDate = async (date: string): Promise<Todo[]> => {
  const res = await fetch(`${API_BASE}/todos?date=${date}`);
  if (!res.ok) throw new Error('Failed to fetch todos');
  return res.json();
};

export const fetchTodosByDateRange = async (startDate: string, endDate: string): Promise<Todo[]> => {
  const res = await fetch(`${API_BASE}/todos?startDate=${startDate}&endDate=${endDate}`);
  if (!res.ok) throw new Error('Failed to fetch todos');
  return res.json();
};

export const createTodo = async (date: string, data: TodoFormData & { order_index: number }): Promise<Todo> => {
  const res = await fetch(`${API_BASE}/todos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...data,
      date,
      tags: data.tags.join(','),
    }),
  });
  if (!res.ok) throw new Error('Failed to create todo');
  return res.json();
};

export const updateTodo = async (id: number, data: Partial<TodoFormData>): Promise<Todo> => {
  const body: Record<string, unknown> = { ...data };
  if (data.tags) {
    body.tags = data.tags.join(',');
  }
  const res = await fetch(`${API_BASE}/todos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to update todo');
  return res.json();
};

export const deleteTodo = async (id: number): Promise<boolean> => {
  const res = await fetch(`${API_BASE}/todos/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete todo');
  return res.json();
};

export const reorderTodos = async (date: string, orderedIds: number[]): Promise<boolean> => {
  const res = await fetch(`${API_BASE}/todos/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, orderedIds }),
  });
  if (!res.ok) throw new Error('Failed to reorder todos');
  return res.json();
};
