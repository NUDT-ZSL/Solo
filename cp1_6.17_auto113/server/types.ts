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
