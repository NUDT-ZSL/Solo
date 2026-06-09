import { create } from 'zustand';
import type { DrawCommand, Note, ToolType, User, Point } from './types';
import { PRESET_COLORS } from './types';

interface WhiteboardState {
  selfUser: User | null;
  users: User[];
  drawings: DrawCommand[];
  notes: Note[];
  cursors: Map<string, Point>;

  tool: ToolType;
  color: string;
  strokeWidth: number;
  fill: boolean;
  fillAlpha: number;

  scale: number;
  offset: Point;

  sidebarOpen: boolean;

  setSelfUser: (u: User) => void;
  setUsers: (users: User[]) => void;
  removeUser: (userId: string) => void;
  addDrawing: (cmd: DrawCommand) => void;
  setDrawings: (cmds: DrawCommand[]) => void;
  markDrawingUndone: (commandId: string) => void;
  clearAll: () => void;

  addNote: (note: Note) => void;
  setNotes: (notes: Note[]) => void;
  updateNote: (note: Note) => void;
  deleteNote: (id: string) => void;

  setCursor: (userId: string, pos: Point) => void;
  removeCursor: (userId: string) => void;

  setTool: (t: ToolType) => void;
  setColor: (c: string) => void;
  setStrokeWidth: (w: number) => void;
  setFill: (f: boolean) => void;
  setFillAlpha: (a: number) => void;

  setScale: (s: number) => void;
  setOffset: (o: Point) => void;

  toggleSidebar: () => void;
}

export const useStore = create<WhiteboardState>((set) => ({
  selfUser: null,
  users: [],
  drawings: [],
  notes: [],
  cursors: new Map(),

  tool: 'pencil',
  color: PRESET_COLORS[0],
  strokeWidth: 4,
  fill: false,
  fillAlpha: 0.5,

  scale: 1,
  offset: { x: 0, y: 0 },

  sidebarOpen: true,

  setSelfUser: (u) => set({ selfUser: u }),
  setUsers: (users) => set({ users }),
  removeUser: (userId) =>
    set((s) => {
      const cursors = new Map(s.cursors);
      cursors.delete(userId);
      return {
        users: s.users.filter((u) => u.id !== userId),
        cursors,
      };
    }),
  addDrawing: (cmd) => set((s) => ({ drawings: [...s.drawings, cmd] })),
  setDrawings: (cmds) => set({ drawings: cmds }),
  markDrawingUndone: (commandId) =>
    set((s) => ({
      drawings: s.drawings.map((d) =>
        d.id === commandId ? { ...d, undone: true } : d
      ),
    })),
  clearAll: () => set({ drawings: [], notes: [] }),

  addNote: (note) => set((s) => ({ notes: [...s.notes, note] })),
  setNotes: (notes) => set({ notes }),
  updateNote: (note) =>
    set((s) => ({
      notes: s.notes.map((n) => (n.id === note.id ? note : n)),
    })),
  deleteNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),

  setCursor: (userId, pos) =>
    set((s) => {
      const cursors = new Map(s.cursors);
      cursors.set(userId, pos);
      return { cursors };
    }),
  removeCursor: (userId) =>
    set((s) => {
      const cursors = new Map(s.cursors);
      cursors.delete(userId);
      return { cursors };
    }),

  setTool: (t) => set({ tool: t }),
  setColor: (c) => set({ color: c }),
  setStrokeWidth: (w) => set({ strokeWidth: w }),
  setFill: (f) => set({ fill: f }),
  setFillAlpha: (a) => set({ fillAlpha: a }),

  setScale: (s) => set({ scale: Math.max(0.5, Math.min(3, s)) }),
  setOffset: (o) => set({ offset: o }),

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
