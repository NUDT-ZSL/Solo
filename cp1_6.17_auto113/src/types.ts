export interface StickyNoteData {
  id: string;
  x: number;
  y: number;
  content: string;
  color: string;
  boardId: string;
}

export interface Board {
  id: string;
  name: string;
  createdAt: number;
}

export interface WSMessage {
  type: string;
  payload: any;
}

export interface OnlineUser {
  userId: string;
  boardId: string;
}

export const NOTE_COLORS = [
  '#FFE4B5',
  '#FFB6C1',
  '#B0E0E6',
  '#98FB98',
  '#DDA0DD',
  '#F0E68C',
];
