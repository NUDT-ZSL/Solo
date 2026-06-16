import { create } from 'zustand';
import type { GameState, GameActions } from './types';
import {
  createInitialState,
  loadGame,
  saveGame,
  clearSave,
  collectItem as engineCollect,
  combineItems as engineCombine,
  checkPuzzle as engineCheckPuzzle,
  solvePuzzle as engineSolve,
  goThroughDoor as engineGoDoor,
  loadRoom as engineLoadRoom
} from './gameEngine';

interface StoreState extends GameState, GameActions {}

export const useGameStore = create<StoreState>((set, get) => ({
  rooms: [],
  currentRoomId: '',
  inventory: [],
  inventoryCapacity: 8,
  selectedInventoryIds: [],
  activePuzzleId: null,
  gameStarted: false,
  gameCompleted: false,
  isTransitioning: false,
  transitionDirection: 'fadeIn',
  errorFlash: false,
  combineFlash: false,
  showMenu: true,

  startNewGame: () => {
    clearSave();
    const initial = createInitialState();
    set({
      ...initial,
      gameStarted: true,
      showMenu: false,
      selectedInventoryIds: [],
      activePuzzleId: null,
      gameCompleted: false
    });
  },

  continueGame: () => {
    const saved = loadGame();
    if (saved) {
      set({
        ...saved,
        gameStarted: true,
        showMenu: false,
        selectedInventoryIds: [],
        activePuzzleId: null,
        gameCompleted: false
      });
      return true;
    }
    return false;
  },

  loadRoom: (roomId: string) => {
    const state = get();
    const result = engineLoadRoom(
      { rooms: state.rooms, currentRoomId: state.currentRoomId, inventory: state.inventory, inventoryCapacity: state.inventoryCapacity },
      roomId,
      { selectedInventoryIds: state.selectedInventoryIds, activePuzzleId: state.activePuzzleId }
    );
    if (result.roomState) {
      set({ currentRoomId: result.state.currentRoomId });
    }
  },

  collectItem: (itemId: string, roomId: string) => {
    const state = get();
    const room = state.rooms.find(r => r.id === roomId);
    if (!room) return;
    const interactive = room.interactiveItems.find(
      i => i.item.id === itemId && i.visible && !i.collected
    );
    if (!interactive) return;

    const result = engineCollect(
      { rooms: state.rooms, currentRoomId: state.currentRoomId, inventory: state.inventory, inventoryCapacity: state.inventoryCapacity },
      interactive.item,
      roomId
    );

    if (result.success) {
      set({
        inventory: result.state.inventory,
        rooms: result.state.rooms
      });
      get().saveProgress();
    } else {
      set({ errorFlash: true });
      setTimeout(() => set({ errorFlash: false }), 300);
    }
  },

  useItem: (_itemId: string, _targetId: string) => {
    return false;
  },

  selectInventoryItem: (itemId: string) => {
    const state = get();
    if (state.selectedInventoryIds.includes(itemId)) {
      set({ selectedInventoryIds: state.selectedInventoryIds.filter(id => id !== itemId) });
    } else if (state.selectedInventoryIds.length < 2) {
      set({ selectedInventoryIds: [...state.selectedInventoryIds, itemId] });
    }
  },

  clearSelection: () => {
    set({ selectedInventoryIds: [] });
  },

  combineItems: () => {
    const state = get();
    if (state.selectedInventoryIds.length !== 2) {
      set({ errorFlash: true });
      setTimeout(() => set({ errorFlash: false }), 300);
      return { success: false, message: '请选择两个物品' };
    }
    const result = engineCombine(
      { rooms: state.rooms, currentRoomId: state.currentRoomId, inventory: state.inventory, inventoryCapacity: state.inventoryCapacity },
      state.selectedInventoryIds[0],
      state.selectedInventoryIds[1],
      { selectedInventoryIds: state.selectedInventoryIds, activePuzzleId: state.activePuzzleId }
    );
    if (result.success && result.newInventory) {
      set({
        inventory: result.newInventory,
        selectedInventoryIds: [],
        combineFlash: true
      });
      setTimeout(() => set({ combineFlash: false }), 400);
      get().saveProgress();
    } else {
      set({ errorFlash: true });
      setTimeout(() => set({ errorFlash: false }), 300);
    }
    return { success: result.success, message: result.message };
  },

  openPuzzle: (puzzleId: string) => {
    set({ activePuzzleId: puzzleId });
  },

  closePuzzle: () => {
    set({ activePuzzleId: null });
  },

  solvePuzzle: (puzzleId: string) => {
    const state = get();
    const result = engineSolve(
      { rooms: state.rooms, currentRoomId: state.currentRoomId, inventory: state.inventory, inventoryCapacity: state.inventoryCapacity },
      puzzleId
    );
    set({
      rooms: result.state.rooms,
      activePuzzleId: null
    });
    if (result.completedRoom) {
      const lastRoom = state.rooms.find(r => r.id === state.currentRoomId);
      if (lastRoom?.id === 'attic') {
        set({ gameCompleted: true });
      }
    }
    get().saveProgress();
  },

  checkPuzzle: (puzzleId: string, answer: any) => {
    const state = get();
    const result = engineCheckPuzzle(
      { rooms: state.rooms, currentRoomId: state.currentRoomId, inventory: state.inventory, inventoryCapacity: state.inventoryCapacity },
      puzzleId,
      answer,
      { selectedInventoryIds: state.selectedInventoryIds, activePuzzleId: state.activePuzzleId }
    );
    return result.correct;
  },

  goThroughDoor: (doorId: string) => {
    const state = get();
    const result = engineGoDoor(
      { rooms: state.rooms, currentRoomId: state.currentRoomId, inventory: state.inventory, inventoryCapacity: state.inventoryCapacity },
      doorId
    );
    if (result.success) {
      if (result.toExit) {
        set({ gameCompleted: true });
        return;
      }
      set({
        isTransitioning: true,
        transitionDirection: 'fadeOut'
      });
      setTimeout(() => {
        set({
          currentRoomId: result.state.currentRoomId,
          rooms: result.state.rooms,
          transitionDirection: 'fadeIn'
        });
        setTimeout(() => {
          set({ isTransitioning: false });
          get().saveProgress();
        }, 500);
      }, 500);
    } else {
      set({ errorFlash: true });
      setTimeout(() => set({ errorFlash: false }), 300);
    }
  },

  setErrorFlash: (value: boolean) => set({ errorFlash: value }),
  setCombineFlash: (value: boolean) => set({ combineFlash: value }),

  saveProgress: () => {
    const state = get();
    saveGame({
      rooms: state.rooms,
      currentRoomId: state.currentRoomId,
      inventory: state.inventory,
      inventoryCapacity: state.inventoryCapacity
    });
  },

  resetGame: () => {
    clearSave();
    const initial = createInitialState();
    set({
      ...initial,
      gameStarted: false,
      showMenu: true,
      gameCompleted: false
    });
  },

  showMainMenu: () => set({ showMenu: true }),
  hideMenu: () => set({ showMenu: false })
}));
