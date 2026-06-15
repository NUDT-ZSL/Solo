import { v4 as uuidv4 } from 'uuid';

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  lineWidth: number;
  userId: string;
}

export interface User {
  id: string;
  name: string;
  color: string;
  cursorPosition: Point | null;
}

export interface StickyNoteData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
  userId: string;
}

export interface Room {
  id: string;
  strokes: Stroke[];
  users: Map<string, User>;
  stickyNotes: Map<string, StickyNoteData>;
}

const USER_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E9',
];

class RoomManager {
  private rooms: Map<string, Room> = new Map();

  createRoom(): string {
    let roomId: string;
    do {
      roomId = Math.floor(1000 + Math.random() * 9000).toString();
    } while (this.rooms.has(roomId));

    this.rooms.set(roomId, {
      id: roomId,
      strokes: [],
      users: new Map(),
      stickyNotes: new Map(),
    });

    return roomId;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  hasRoom(roomId: string): boolean {
    return this.rooms.has(roomId);
  }

  ensureRoom(roomId: string): Room {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        strokes: [],
        users: new Map(),
        stickyNotes: new Map(),
      });
    }
    return this.rooms.get(roomId)!;
  }

  addUser(roomId: string, userId: string, userName: string): User {
    const room = this.ensureRoom(roomId);
    const colorIndex = room.users.size % USER_COLORS.length;
    const color = USER_COLORS[colorIndex];

    const user: User = {
      id: userId,
      name: userName,
      color,
      cursorPosition: null,
    };

    room.users.set(userId, user);
    return user;
  }

  removeUser(roomId: string, userId: string): User | null {
    const room = this.getRoom(roomId);
    if (!room) return null;

    const user = room.users.get(userId);
    room.users.delete(userId);

    if (room.users.size === 0 && room.strokes.length === 0 && room.stickyNotes.size === 0) {
      this.rooms.delete(roomId);
    }

    return user || null;
  }

  getUsers(roomId: string): User[] {
    const room = this.getRoom(roomId);
    if (!room) return [];
    return Array.from(room.users.values());
  }

  addStroke(roomId: string, stroke: Stroke): void {
    const room = this.ensureRoom(roomId);
    room.strokes.push(stroke);
  }

  undoStroke(roomId: string, userId: string): Stroke | null {
    const room = this.getRoom(roomId);
    if (!room) return null;

    for (let i = room.strokes.length - 1; i >= 0; i--) {
      if (room.strokes[i].userId === userId) {
        const removed = room.strokes.splice(i, 1)[0];
        return removed;
      }
    }
    return null;
  }

  clearStrokes(roomId: string): void {
    const room = this.getRoom(roomId);
    if (!room) return;
    room.strokes = [];
  }

  getStrokes(roomId: string): Stroke[] {
    const room = this.getRoom(roomId);
    if (!room) return [];
    return room.strokes;
  }

  updateCursor(roomId: string, userId: string, position: Point): void {
    const room = this.getRoom(roomId);
    if (!room) return;
    const user = room.users.get(userId);
    if (user) {
      user.cursorPosition = position;
    }
  }

  addStickyNote(roomId: string, note: StickyNoteData): void {
    const room = this.ensureRoom(roomId);
    room.stickyNotes.set(note.id, note);
  }

  updateStickyNote(roomId: string, noteId: string, updates: Partial<StickyNoteData>): StickyNoteData | null {
    const room = this.getRoom(roomId);
    if (!room) return null;
    const note = room.stickyNotes.get(noteId);
    if (!note) return null;
    const updated = { ...note, ...updates };
    room.stickyNotes.set(noteId, updated);
    return updated;
  }

  deleteStickyNote(roomId: string, noteId: string): boolean {
    const room = this.getRoom(roomId);
    if (!room) return false;
    return room.stickyNotes.delete(noteId);
  }

  getStickyNotes(roomId: string): StickyNoteData[] {
    const room = this.getRoom(roomId);
    if (!room) return [];
    return Array.from(room.stickyNotes.values());
  }

  isRoomEmpty(roomId: string): boolean {
    const room = this.getRoom(roomId);
    if (!room) return true;
    return room.users.size === 0;
  }
}

export const roomManager = new RoomManager();
