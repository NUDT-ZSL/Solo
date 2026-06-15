import { create } from 'zustand';
import type { User, TodoItem } from '../types';
import { getTodos } from '../api';

interface AppState {
  user: User;
  todoCount: number;
  todos: any[];
  setTodoCount: (count: number) => void;
  setTodos: (todos: any[]) => void;
  refreshTodos: () => Promise<void>;
}

const mockUser: User = {
  userId: 'u002',
  userName: '李主管',
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
      const userId = get().user.userId;
      const result: any = await getTodos(userId);
      if (result.code === 0 || result.success) {
        const todos = result.data || [];
        set({ todos, todoCount: todos.length });
      }
    } catch (error) {
      console.error('刷新待办失败:', error);
    }
  },
}));
