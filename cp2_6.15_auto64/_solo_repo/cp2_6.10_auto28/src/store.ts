import { create } from 'zustand';
import type { Todo, Column, Priority } from './types';

const generateId = () => Math.random().toString(36).substring(2, 11);

const initialColumns: Column[] = [
  { id: 'todo', title: '待办' },
  { id: 'in-progress', title: '进行中' },
  { id: 'done', title: '已完成' },
];

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const nextWeek = new Date(today);
nextWeek.setDate(nextWeek.getDate() + 7);

const formatDate = (date: Date) => date.toISOString().split('T')[0];

const initialTodos: Todo[] = [
  {
    id: generateId(),
    title: '需求评审会议',
    description: '与产品团队对齐Q3需求优先级',
    priority: 'urgent',
    dueDate: formatDate(tomorrow),
    columnId: 'todo',
    order: 0,
    tags: ['会议', '产品'],
  },
  {
    id: generateId(),
    title: '设计系统优化',
    description: '优化按钮组件和表单样式',
    priority: 'normal',
    dueDate: formatDate(nextWeek),
    columnId: 'todo',
    order: 1,
    tags: ['设计'],
  },
  {
    id: generateId(),
    title: '修复登录Bug',
    description: '修复验证码无法刷新的问题',
    priority: 'urgent',
    dueDate: formatDate(yesterday),
    columnId: 'in-progress',
    order: 0,
    tags: ['Bug'],
  },
  {
    id: generateId(),
    title: '用户调研报告',
    description: '整理上月用户反馈数据并输出报告',
    priority: 'low',
    dueDate: formatDate(nextWeek),
    columnId: 'in-progress',
    order: 1,
    tags: ['调研'],
  },
  {
    id: generateId(),
    title: '首页改版上线',
    description: '首页全新视觉设计已发布',
    priority: 'normal',
    dueDate: formatDate(yesterday),
    columnId: 'done',
    order: 0,
    tags: ['发布'],
  },
];

interface BoardStore {
  columns: Column[];
  todos: Todo[];
  searchQuery: string;
  showOverdue: boolean;
  isCreateModalOpen: boolean;
  isDetailPanelOpen: boolean;
  selectedTodoId: string | null;
  highlightedColumnId: string | null;

  setSearchQuery: (query: string) => void;
  setShowOverdue: (show: boolean) => void;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  openDetailPanel: (todoId: string) => void;
  closeDetailPanel: () => void;

  addTodo: (todo: Omit<Todo, 'id' | 'order' | 'isNew'> & { columnId: string }) => void;
  updateTodo: (id: string, updates: Partial<Todo>) => void;
  deleteTodo: (id: string) => void;

  addColumn: (title: string) => void;
  updateColumnTitle: (id: string, title: string) => void;

  moveTodo: (
    todoId: string,
    sourceColumnId: string,
    destinationColumnId: string,
    destinationIndex: number
  ) => void;

  getTodosByColumnId: (columnId: string) => Todo[];
  getFilteredTodos: () => Todo[];
  setHighlightedColumn: (columnId: string | null) => void;
  clearModifiedFlag: (todoId: string) => void;
  clearNewFlag: (todoId: string) => void;
}

export const useBoardStore = create<BoardStore>((set, get) => ({
  columns: initialColumns,
  todos: initialTodos,
  searchQuery: '',
  showOverdue: false,
  isCreateModalOpen: false,
  isDetailPanelOpen: false,
  selectedTodoId: null,
  highlightedColumnId: null,

  setSearchQuery: (query) => set({ searchQuery: query }),
  setShowOverdue: (show) => set({ showOverdue: show }),
  openCreateModal: () => set({ isCreateModalOpen: true }),
  closeCreateModal: () => set({ isCreateModalOpen: false }),
  openDetailPanel: (todoId) =>
    set({ selectedTodoId: todoId, isDetailPanelOpen: true }),
  closeDetailPanel: () =>
    set({ selectedTodoId: null, isDetailPanelOpen: false }),

  addTodo: (todoData) => {
    const { todos, columns } = get();
    const columnTodos = todos.filter((t) => t.columnId === todoData.columnId);
    if (columnTodos.length >= 10) return;

    const newTodo: Todo = {
      ...todoData,
      id: generateId(),
      order: columnTodos.length,
      isNew: true,
    };
    set({ todos: [...todos, newTodo] });
  },

  updateTodo: (id, updates) => {
    set((state) => ({
      todos: state.todos.map((t) =>
        t.id === id ? { ...t, ...updates, isModified: true } : t
      ),
    }));
  },

  deleteTodo: (id) => {
    set((state) => ({
      todos: state.todos.filter((t) => t.id !== id),
    }));
  },

  addColumn: (title) => {
    const newColumn: Column = {
      id: generateId(),
      title,
    };
    set((state) => ({ columns: [...state.columns, newColumn] }));
  },

  updateColumnTitle: (id, title) => {
    set((state) => ({
      columns: state.columns.map((c) =>
        c.id === id ? { ...c, title } : c
      ),
    }));
  },

  moveTodo: (todoId, sourceColumnId, destinationColumnId, destinationIndex) => {
    set((state) => {
      const todos = [...state.todos];
      const todoIndex = todos.findIndex((t) => t.id === todoId);
      if (todoIndex === -1) return state;

      const [movedTodo] = todos.splice(todoIndex, 1);

      const destinationTodos = todos
        .filter((t) => t.columnId === destinationColumnId)
        .sort((a, b) => a.order - b.order);

      if (destinationColumnId !== sourceColumnId && destinationTodos.length >= 10) {
        return state;
      }

      destinationTodos.splice(destinationIndex, 0, {
        ...movedTodo,
        columnId: destinationColumnId,
      });

      destinationTodos.forEach((todo, index) => {
        todo.order = index;
      });

      const otherTodos = todos.filter((t) => t.columnId !== destinationColumnId);

      if (sourceColumnId !== destinationColumnId) {
        const sourceTodos = otherTodos
          .filter((t) => t.columnId === sourceColumnId)
          .sort((a, b) => a.order - b.order);
        sourceTodos.forEach((todo, index) => {
          todo.order = index;
        });
        const remaining = otherTodos.filter((t) => t.columnId !== sourceColumnId);
        return {
          todos: [...destinationTodos, ...sourceTodos, ...remaining],
        };
      }

      return {
        todos: [...destinationTodos, ...otherTodos],
      };
    });
  },

  getTodosByColumnId: (columnId) => {
    const { todos } = get();
    return todos
      .filter((t) => t.columnId === columnId)
      .sort((a, b) => a.order - b.order);
  },

  getFilteredTodos: () => {
    const { todos, searchQuery, showOverdue } = get();
    let filtered = todos;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((t) =>
        t.title.toLowerCase().includes(query)
      );
    }

    if (showOverdue) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter((t) => {
        const dueDate = new Date(t.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
      });
    }

    return filtered;
  },

  setHighlightedColumn: (columnId) => {
    set({ highlightedColumnId: columnId });
  },

  clearModifiedFlag: (todoId) => {
    set((state) => ({
      todos: state.todos.map((t) =>
        t.id === todoId ? { ...t, isModified: false } : t
      ),
    }));
  },

  clearNewFlag: (todoId) => {
    set((state) => ({
      todos: state.todos.map((t) =>
        t.id === todoId ? { ...t, isNew: false } : t
      ),
    }));
  },
}));

export function isOverdue(dueDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

export function getPriorityLabel(priority: Priority): string {
  const labels: Record<Priority, string> = {
    urgent: '紧急',
    normal: '普通',
    low: '低优',
  };
  return labels[priority];
}
