import { create } from 'zustand';
import type { BoardElement, ElementCategory, SavedBoard } from '../types';

interface MoodBoardState {
  elements: BoardElement[];
  selectedElementId: string | null;
  activeCategory: ElementCategory;
  savedBoards: SavedBoard[];
  currentBoardName: string;
  currentBoardTags: string[];
  nextZIndex: number;

  addElement: (elementId: string, x?: number, y?: number) => void;
  updateElement: (id: string, updates: Partial<BoardElement>) => void;
  removeElement: (id: string) => void;
  setSelectedElement: (id: string | null) => void;
  setActiveCategory: (category: ElementCategory) => void;
  bringToFront: (id: string) => void;
  saveBoard: (name: string, tags: string[], thumbnail?: string) => void;
  loadBoard: (boardId: string) => void;
  deleteBoard: (boardId: string) => void;
  clearBoard: () => void;
  setCurrentBoardName: (name: string) => void;
  setCurrentBoardTags: (tags: string[]) => void;
}

const ELEMENT_DEFAULTS: Record<string, { width: number; height: number }> = {
  primaryColor: { width: 120, height: 120 },
  secondaryColor: { width: 120, height: 120 },
  font: { width: 200, height: 80 },
  layout: { width: 160, height: 120 },
  pattern: { width: 100, height: 100 },
  iconStyle: { width: 80, height: 80 },
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

const savedBoardsFromStorage = (() => {
  try {
    const stored = localStorage.getItem('mood-boards');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
})();

export const useMoodBoardStore = create<MoodBoardState>((set, get) => ({
  elements: [],
  selectedElementId: null,
  activeCategory: 'primaryColor',
  savedBoards: savedBoardsFromStorage,
  currentBoardName: '',
  currentBoardTags: [],
  nextZIndex: 1,

  addElement: (elementId: string, x?: number, y?: number) => {
    const elementItem = getElementCategory(elementId);
    if (!elementItem) return;

    const defaults = ELEMENT_DEFAULTS[elementItem.category] || { width: 100, height: 100 };
    const state = get();
    const defaultX = x ?? 50 + Math.random() * 100;
    const defaultY = y ?? 50 + Math.random() * 100;

    const newElement: BoardElement = {
      id: generateId(),
      elementId,
      x: defaultX,
      y: defaultY,
      width: defaults.width,
      height: defaults.height,
      scale: 1,
      rotation: 0,
      zIndex: state.nextZIndex,
    };

    set({
      elements: [...state.elements, newElement],
      selectedElementId: newElement.id,
      nextZIndex: state.nextZIndex + 1,
    });
  },

  updateElement: (id: string, updates: Partial<BoardElement>) => {
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, ...updates } : el
      ),
    }));
  },

  removeElement: (id: string) => {
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== id),
      selectedElementId: state.selectedElementId === id ? null : state.selectedElementId,
    }));
  },

  setSelectedElement: (id: string | null) => {
    set({ selectedElementId: id });
  },

  setActiveCategory: (category: ElementCategory) => {
    set({ activeCategory: category });
  },

  bringToFront: (id: string) => {
    const state = get();
    const maxZ = Math.max(...state.elements.map((el) => el.zIndex), 0);
    const element = state.elements.find((el) => el.id === id);
    if (element && element.zIndex < maxZ) {
      set({
        elements: state.elements.map((el) =>
          el.id === id ? { ...el, zIndex: maxZ + 1 } : el
        ),
        nextZIndex: maxZ + 2,
      });
    }
  },

  saveBoard: (name: string, tags: string[], thumbnail?: string) => {
    const state = get();
    const board: SavedBoard = {
      id: generateId(),
      name,
      tags,
      elements: JSON.parse(JSON.stringify(state.elements)),
      createdAt: Date.now(),
      thumbnail,
    };

    const newBoards = [board, ...state.savedBoards];
    set({ savedBoards: newBoards, currentBoardName: name, currentBoardTags: tags });

    try {
      localStorage.setItem('mood-boards', JSON.stringify(newBoards));
    } catch (e) {
      console.warn('保存失败', e);
    }
  },

  loadBoard: (boardId: string) => {
    const board = get().savedBoards.find((b) => b.id === boardId);
    if (board) {
      set({
        elements: JSON.parse(JSON.stringify(board.elements)),
        currentBoardName: board.name,
        currentBoardTags: board.tags,
        selectedElementId: null,
        nextZIndex: Math.max(...board.elements.map((el) => el.zIndex), 0) + 1,
      });
    }
  },

  deleteBoard: (boardId: string) => {
    const newBoards = get().savedBoards.filter((b) => b.id !== boardId);
    set({ savedBoards: newBoards });
    try {
      localStorage.setItem('mood-boards', JSON.stringify(newBoards));
    } catch (e) {
      console.warn('删除失败', e);
    }
  },

  clearBoard: () => {
    set({ elements: [], selectedElementId: null, nextZIndex: 1 });
  },

  setCurrentBoardName: (name: string) => {
    set({ currentBoardName: name });
  },

  setCurrentBoardTags: (tags: string[]) => {
    set({ currentBoardTags: tags });
  },
}));

function getElementCategory(elementId: string): { category: ElementCategory } | null {
  const categories: ElementCategory[] = [
    'primaryColor',
    'secondaryColor',
    'font',
    'layout',
    'pattern',
    'iconStyle',
  ];

  for (const cat of categories) {
    const prefixMap: Record<ElementCategory, string> = {
      primaryColor: 'pc-',
      secondaryColor: 'sc-',
      font: 'ft-',
      layout: 'ly-',
      pattern: 'pt-',
      iconStyle: 'ic-',
    };
    if (elementId.startsWith(prefixMap[cat])) {
      return { category: cat };
    }
  }
  return null;
}
