import { create } from 'zustand';
import type { Dialog, User, HistoryRecord, Character } from '../types';
import { dialogApi, historyApi } from '../api/dialogApi';

export const CHARACTERS: Character[] = [
  { name: '主角', color: '#E74C3C' },
  { name: '配角', color: '#3498DB' },
  { name: '反派', color: '#9B59B6' },
  { name: '路人A', color: '#2ECC71' },
  { name: '路人B', color: '#F39C12' }
];

interface StoreState {
  user: User | null;
  dialogs: Dialog[];
  historyRecords: HistoryRecord[];
  currentPanelId: string | null;
  isLoading: boolean;
  setUser: (user: User) => void;
  setCurrentPanel: (panelId: string | null) => void;
  loadDialogs: (panelId: string) => Promise<void>;
  loadHistory: (panelId: string) => Promise<void>;
  addDialog: (dialog: Partial<Dialog>) => Promise<Dialog | null>;
  moveDialog: (id: string, x: number, y: number, modifiedBy: string) => void;
  saveDialogPosition: (id: string, modifiedBy: string) => Promise<void>;
  updateDialogText: (id: string, text: string, modifiedBy: string) => Promise<void>;
  updateDialogCharacter: (id: string, character: string, characterColor: string, modifiedBy: string) => Promise<void>;
  deleteDialog: (id: string) => Promise<void>;
  getDialogById: (id: string) => Dialog | undefined;
}

export const useStore = create<StoreState>((set, get) => ({
  user: null,
  dialogs: [],
  historyRecords: [],
  currentPanelId: null,
  isLoading: false,

  setUser: (user) => set({ user }),

  setCurrentPanel: (panelId) => set({ currentPanelId: panelId }),

  loadDialogs: async (panelId) => {
    set({ isLoading: true });
    try {
      const dialogs = await dialogApi.getDialogsByPanel(panelId);
      set({ dialogs, currentPanelId: panelId });
    } catch (error) {
      console.error('Failed to load dialogs:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  loadHistory: async (panelId) => {
    try {
      const history = await historyApi.getHistoryByPanel(panelId);
      set({ historyRecords: history });
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  },

  addDialog: async (dialog) => {
    try {
      const newDialog = await dialogApi.createDialog(dialog);
      set((state) => ({
        dialogs: [...state.dialogs, newDialog]
      }));
      return newDialog;
    } catch (error) {
      console.error('Failed to add dialog:', error);
      return null;
    }
  },

  moveDialog: (id, x, y, modifiedBy) => {
    set((state) => ({
      dialogs: state.dialogs.map((d) =>
        d._id === id ? { ...d, x, y } : d
      )
    }));
  },

  saveDialogPosition: async (id, modifiedBy) => {
    const dialog = get().dialogs.find((d) => d._id === id);
    if (!dialog) return;
    try {
      await dialogApi.updateDialog(id, {
        x: dialog.x,
        y: dialog.y,
        modifiedBy
      });
    } catch (error) {
      console.error('Failed to save dialog position:', error);
    }
  },

  updateDialogText: async (id, text, modifiedBy) => {
    try {
      const updated = await dialogApi.updateDialog(id, { text, modifiedBy });
      set((state) => ({
        dialogs: state.dialogs.map((d) =>
          d._id === id ? updated : d
        )
      }));
      if (get().currentPanelId) {
        get().loadHistory(get().currentPanelId!);
      }
    } catch (error) {
      console.error('Failed to update dialog text:', error);
    }
  },

  updateDialogCharacter: async (id, character, characterColor, modifiedBy) => {
    try {
      const updated = await dialogApi.updateDialog(id, {
        character,
        characterColor,
        modifiedBy
      });
      set((state) => ({
        dialogs: state.dialogs.map((d) =>
          d._id === id ? updated : d
        )
      }));
      if (get().currentPanelId) {
        get().loadHistory(get().currentPanelId!);
      }
    } catch (error) {
      console.error('Failed to update dialog character:', error);
    }
  },

  deleteDialog: async (id) => {
    try {
      await dialogApi.deleteDialog(id);
      set((state) => ({
        dialogs: state.dialogs.filter((d) => d._id !== id)
      }));
    } catch (error) {
      console.error('Failed to delete dialog:', error);
    }
  },

  getDialogById: (id) => {
    return get().dialogs.find((d) => d._id === id);
  }
}));
