export interface User {
  id: string;
  name: string;
  color: string;
}

export interface Note {
  id: string;
  sessionId: string;
  content: string;
  x: number;
  y: number;
  color: string;
  authorId: string;
  authorName: string;
  votes: string[];
  createdAt: number;
}

export interface Session {
  id: string;
  code: string;
  title: string;
  description: string;
  deadline: number;
  hostId: string;
  notes: Note[];
  users: User[];
  voting: boolean;
  voteCandidates: string[];
  createdAt: number;
}

export const NOTE_COLORS = [
  '#fef3c7',
  '#dbeafe',
  '#ecfccb',
  '#fce7f3',
  '#e0e7ff',
  '#fef9c3',
];

export function randomNoteColor(): string {
  return NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)];
}
