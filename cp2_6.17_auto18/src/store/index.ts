import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Exhibition, Wall, Exhibit, ToolType, Point } from '@/types';
import { createInitialExhibition, createSampleExhibitions, STORAGE_KEY } from '@/data/mockData';

interface ExhibitionStore {
  currentExhibition: Exhibition;
  savedExhibitions: Exhibition[];
  selectedTool: ToolType;
  selectedWallId: string | null;
  selectedExhibitId: string | null;
  path: Point[];
  showLoadModal: boolean;
  toast: { show: boolean; message: string } | null;

  setCurrentExhibition: (exhibition: Exhibition) => void;
  setSelectedTool: (tool: ToolType) => void;
  setSelectedWallId: (id: string | null) => void;
  setSelectedExhibitId: (id: string | null) => void;
  setPath: (path: Point[]) => void;
  setShowLoadModal: (show: boolean) => void;
  showToast: (message: string) => void;
  hideToast: () => void;

  addWall: (wall: Omit<Wall, 'id'>) => void;
  updateWall: (id: string, updates: Partial<Wall>) => void;
  deleteWall: (id: string) => void;

  addExhibit: (exhibit: Omit<Exhibit, 'id'>) => void;
  updateExhibit: (id: string, updates: Partial<Exhibit>) => void;
  deleteExhibit: (id: string) => void;

  saveExhibition: () => void;
  loadExhibition: (id: string) => void;
  deleteExhibition: (id: string) => void;
  newExhibition: () => void;
}

const loadFromStorage = (): Exhibition[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load from storage:', e);
  }
  return createSampleExhibitions();
};

const saveToStorage = (exhibitions: Exhibition[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(exhibitions));
  } catch (e) {
    console.error('Failed to save to storage:', e);
  }
};

export const useExhibitionStore = create<ExhibitionStore>((set, get) => {
  const savedExhibitions = loadFromStorage();
  const currentExhibition = savedExhibitions[0] || createInitialExhibition();

  return {
    currentExhibition,
    savedExhibitions,
    selectedTool: 'select',
    selectedWallId: null,
    selectedExhibitId: null,
    path: [],
    showLoadModal: false,
    toast: null,

    setCurrentExhibition: (exhibition) => set({ currentExhibition: exhibition }),
    setSelectedTool: (tool) => set({ selectedTool: tool }),
    setSelectedWallId: (id) => set({ selectedWallId: id, selectedExhibitId: null }),
    setSelectedExhibitId: (id) => set({ selectedExhibitId: id, selectedWallId: null }),
    setPath: (path) => set({ path }),
    setShowLoadModal: (show) => set({ showLoadModal: show }),

    showToast: (message) => {
      set({ toast: { show: true, message } });
      setTimeout(() => {
        get().hideToast();
      }, 2000);
    },
    hideToast: () => set({ toast: null }),

    addWall: (wall) => {
      const newWall: Wall = { ...wall, id: uuidv4() };
      set((state) => ({
        currentExhibition: {
          ...state.currentExhibition,
          walls: [...state.currentExhibition.walls, newWall],
          updatedAt: Date.now(),
        },
        selectedWallId: newWall.id,
        selectedExhibitId: null,
      }));
    },

    updateWall: (id, updates) => {
      set((state) => ({
        currentExhibition: {
          ...state.currentExhibition,
          walls: state.currentExhibition.walls.map((w) =>
            w.id === id ? { ...w, ...updates } : w
          ),
          updatedAt: Date.now(),
        },
      }));
    },

    deleteWall: (id) => {
      set((state) => ({
        currentExhibition: {
          ...state.currentExhibition,
          walls: state.currentExhibition.walls.filter((w) => w.id !== id),
          exhibits: state.currentExhibition.exhibits.filter((e) => e.wallId !== id),
          updatedAt: Date.now(),
        },
        selectedWallId: null,
      }));
    },

    addExhibit: (exhibit) => {
      const newExhibit: Exhibit = { ...exhibit, id: uuidv4() };
      set((state) => ({
        currentExhibition: {
          ...state.currentExhibition,
          exhibits: [...state.currentExhibition.exhibits, newExhibit],
          updatedAt: Date.now(),
        },
        selectedExhibitId: newExhibit.id,
        selectedWallId: null,
      }));
    },

    updateExhibit: (id, updates) => {
      set((state) => ({
        currentExhibition: {
          ...state.currentExhibition,
          exhibits: state.currentExhibition.exhibits.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
          updatedAt: Date.now(),
        },
      }));
    },

    deleteExhibit: (id) => {
      set((state) => ({
        currentExhibition: {
          ...state.currentExhibition,
          exhibits: state.currentExhibition.exhibits.filter((e) => e.id !== id),
          updatedAt: Date.now(),
        },
        selectedExhibitId: null,
      }));
    },

    saveExhibition: () => {
      const { currentExhibition, savedExhibitions } = get();
      const updatedExhibition = { ...currentExhibition, updatedAt: Date.now() };

      const existingIndex = savedExhibitions.findIndex((e) => e.id === currentExhibition.id);
      let newSavedExhibitions: Exhibition[];

      if (existingIndex >= 0) {
        newSavedExhibitions = [...savedExhibitions];
        newSavedExhibitions[existingIndex] = updatedExhibition;
      } else {
        newSavedExhibitions = [...savedExhibitions, updatedExhibition];
      }

      saveToStorage(newSavedExhibitions);
      set({
        currentExhibition: updatedExhibition,
        savedExhibitions: newSavedExhibitions,
      });
      get().showToast('保存成功');
    },

    loadExhibition: (id) => {
      const { savedExhibitions } = get();
      const exhibition = savedExhibitions.find((e) => e.id === id);
      if (exhibition) {
        set({
          currentExhibition: JSON.parse(JSON.stringify(exhibition)),
          showLoadModal: false,
          selectedWallId: null,
          selectedExhibitId: null,
        });
        get().showToast(`已加载: ${exhibition.name}`);
      }
    },

    deleteExhibition: (id) => {
      const { savedExhibitions, currentExhibition } = get();
      const newSavedExhibitions = savedExhibitions.filter((e) => e.id !== id);
      saveToStorage(newSavedExhibitions);

      let newCurrent = currentExhibition;
      if (currentExhibition.id === id) {
        newCurrent = newSavedExhibitions[0] || createInitialExhibition();
      }

      set({
        savedExhibitions: newSavedExhibitions,
        currentExhibition: newCurrent,
      });
    },

    newExhibition: () => {
      const newExhibition = createInitialExhibition();
      newExhibition.name = `新方案 ${new Date().toLocaleString('zh-CN')}`;
      set({
        currentExhibition: newExhibition,
        selectedWallId: null,
        selectedExhibitId: null,
      });
      get().showToast('已创建新方案');
    },
  };
});
