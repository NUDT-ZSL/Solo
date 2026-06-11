import { create } from 'zustand';
import type { User, TodoItem } from '../types';

interface AppState {
  user: User;
  todoCount: number;
  todos: TodoItem[];
  setTodoCount: (count: number) => void;
  setTodos: (todos: TodoItem[]) => void;
  refreshTodos: () => Promise<void>;
}

const mockUser: User = {
  userId: 'user-001',
  userName: '张三',
  avatar: '',
  role: 'manager',
};

export const useStore = create<AppState>((set, get) => ({
  user: mockUser,
  todoCount: 0,
  todos: [],
  setTodoCount: (count) => set({ todoCount: count }),
  setTodos: (todos) => set({ todos, todoCount: todos.length }),
  refreshTodos: async () => {
    try {
      const response = await fetch('/api/todos');
      if (response.ok) {
        const result = await response.json();
        if (result.code === 0) {
          const todos = result.data || [];
          set({ todos, todoCount: todos.length });
        }
      }
    } catch (error) {
      console.error('刷新待办失败:', error);
    }
  },
}));
