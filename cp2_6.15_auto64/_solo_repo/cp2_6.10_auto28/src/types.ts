export type Priority = 'urgent' | 'normal' | 'low';

export interface Todo {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  dueDate: string;
  columnId: string;
  order: number;
  tags: string[];
  isNew?: boolean;
  isModified?: boolean;
}

export interface Column {
  id: string;
  title: string;
  isHighlighted?: boolean;
}

export interface BoardState {
  columns: Column[];
  todos: Todo[];
  searchQuery: string;
  showOverdue: boolean;
  editingTodo: Todo | null;
  isCreateModalOpen: boolean;
  isDetailPanelOpen: boolean;
  selectedTodoId: string | null;
}
