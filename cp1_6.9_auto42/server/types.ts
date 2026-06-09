export type NoteStatus = 'incubating' | 'inProgress' | 'launched';

export type NoteCategory = 'bug' | 'feature' | 'optimization' | 'design' | 'default';

export interface Comment {
  id: string;
  text: string;
  createdAt: number;
  author: string;
}

export interface Note {
  id: string;
  content: string;
  x: number;
  y: number;
  status: NoteStatus;
  color: string;
  category: NoteCategory;
  comments: Comment[];
  createdAt: number;
  updatedAt: number;
}

export interface HistoryAction {
  id: string;
  type: 'create' | 'move' | 'update' | 'delete';
  noteId: string;
  note?: Note;
  oldX?: number;
  oldY?: number;
  oldStatus?: NoteStatus;
  newX?: number;
  newY?: number;
  newStatus?: NoteStatus;
  timestamp: number;
}

export interface User {
  id: string;
  name: string;
  color: string;
}

export type ServerToClientEvents = {
  syncBoard: (notes: Note[]) => void;
  userJoined: (user: User, onlineUsers: User[]) => void;
  userLeft: (userId: string, onlineUsers: User[]) => void;
  syncHistory: (history: HistoryAction[]) => void;
};

export type ClientToServerEvents = {
  createNote: (noteData: { content: string; status: NoteStatus }) => void;
  moveNote: (data: { noteId: string; x: number; y: number; status: NoteStatus }) => void;
  updateNote: (data: { noteId: string; content?: string; comments?: Comment[] }) => void;
  deleteNote: (noteId: string) => void;
  joinBoard: (userName: string) => void;
  requestHistory: () => void;
};

export const CATEGORY_COLORS: Record<NoteCategory, string> = {
  bug: '#FF6B6B',
  feature: '#4ECDC4',
  optimization: '#FFE66D',
  design: '#A29BFE',
  default: '#95A5A6'
};

export const CATEGORY_KEYWORDS: Record<NoteCategory, string[]> = {
  bug: ['bug', 'Bug', 'BUG', '错误', '问题', '修复', '崩溃', '异常'],
  feature: ['功能', '新功能', '需求', '特性', '功能点'],
  optimization: ['优化', '性能', '改进', '提速', '重构', '效率'],
  design: ['设计', 'UI', 'UX', '界面', '视觉', '样式', '交互'],
  default: []
};

export function classifyNote(content: string): { category: NoteCategory; color: string } {
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (cat === 'default') continue;
    for (const kw of keywords) {
      if (content.includes(kw)) {
        return { category: cat as NoteCategory, color: CATEGORY_COLORS[cat as NoteCategory] };
      }
    }
  }
  return { category: 'default', color: CATEGORY_COLORS.default };
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
