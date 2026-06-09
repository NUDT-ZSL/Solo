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
