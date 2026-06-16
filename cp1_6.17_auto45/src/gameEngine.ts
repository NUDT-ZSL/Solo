import type { Room, InventoryItem, Item, CombineRecipe } from './types';
import { COMBINE_RECIPES, ITEMS, createInitialRooms } from './roomData';

export interface GameEngineState {
  rooms: Room[];
  currentRoomId: string;
  inventory: InventoryItem[];
  inventoryCapacity: number;
}

export interface UIState {
  hoveredItemId?: string | null;
  selectedInventoryIds: string[];
  activePuzzleId?: string | null;
}

export interface RoomState {
  room: Room;
  canExit: boolean;
}

export interface CombineResult {
  success: boolean;
  message: string;
  newInventory?: InventoryItem[];
}

export interface PuzzleCheckResult {
  correct: boolean;
  message: string;
}

const STORAGE_KEY = 'escape-room-save';

export const saveGame = (state: GameEngineState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('保存失败:', e);
  }
};

export const loadGame = (): GameEngineState | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('加载失败:', e);
  }
  return null;
};

export const clearSave = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

export const createInitialState = (): GameEngineState => {
  return {
    rooms: createInitialRooms(),
    currentRoomId: 'livingroom',
    inventory: [],
    inventoryCapacity: 8
  };
};

export const loadRoom = (
  state: GameEngineState,
  roomId: string,
  _uiState: UIState
): { state: GameEngineState; roomState: RoomState | null; message: string } => {
  const room = state.rooms.find(r => r.id === roomId);
  if (!room) {
    return { state, roomState: null, message: '房间不存在' };
  }
  if (!room.unlocked) {
    return { state, roomState: null, message: '该房间尚未解锁' };
  }

  const canExit = room.puzzles.every(p => p.solved);
  return {
    state: { ...state, currentRoomId: roomId },
    roomState: { room, canExit },
    message: `进入${room.name}`
  };
};

export const useItem = (
  state: GameEngineState,
  itemId: string,
  targetId: string,
  _uiState: UIState
): { state: GameEngineState; success: boolean; message: string } => {
  const currentRoom = state.rooms.find(r => r.id === state.currentRoomId);
  if (!currentRoom) {
    return { state, success: false, message: '不在任何房间中' };
  }

  const targetItem = currentRoom.interactiveItems.find(
    i => i.item.id === targetId || i.linkedPuzzleId === targetId
  );

  if (targetItem && targetItem.requiresItem === itemId) {
    const newRooms = state.rooms.map(r => {
      if (r.id !== state.currentRoomId) return r;
      return {
        ...r,
        interactiveItems: r.interactiveItems.map(ti =>
          ti === targetItem ? { ...ti, visible: true } : ti
        )
      };
    });
    const newInventory = removeFromInventory(state.inventory, itemId);
    return {
      state: { ...state, rooms: newRooms, inventory: newInventory },
      success: true,
      message: `使用了${ITEMS[itemId]?.name || itemId}，某物被激活了...`
    };
  }

  const targetPuzzle = currentRoom.puzzles.find(p => p.id === targetId);
  if (targetPuzzle) {
    return { state, success: false, message: '这个道具在这里没有用' };
  }

  return { state, success: false, message: '无法在此处使用该道具' };
};

export const collectItem = (
  state: GameEngineState,
  item: Item,
  roomId: string
): { state: GameEngineState; success: boolean; message: string } => {
  const invItem = state.inventory.find(i => i.item.id === item.id);
  if (invItem && invItem.count >= item.maxStack) {
    return { state, success: false, message: `${item.name}已达最大堆叠数` };
  }

  const totalItems = state.inventory.reduce((sum, _i) => sum + 1, 0);
  if (!invItem && totalItems >= state.inventoryCapacity) {
    return { state, success: false, message: '背包已满' };
  }

  const newInventory = addToInventory(state.inventory, item);
  const newRooms = state.rooms.map(r => {
    if (r.id !== roomId) return r;
    return {
      ...r,
      interactiveItems: r.interactiveItems.map(ti =>
        ti.item.id === item.id && !ti.collected ? { ...ti, collected: true } : ti
      )
    };
  });

  return {
    state: { ...state, inventory: newInventory, rooms: newRooms },
    success: true,
    message: `获得了${item.name}`
  };
};

const addToInventory = (inventory: InventoryItem[], item: Item): InventoryItem[] => {
  const existing = inventory.find(i => i.item.id === item.id);
  if (existing) {
    return inventory.map(i =>
      i.item.id === item.id ? { ...i, count: Math.min(i.count + 1, item.maxStack) } : i
    );
  }
  return [...inventory, { item, count: 1 }];
};

const removeFromInventory = (inventory: InventoryItem[], itemId: string): InventoryItem[] => {
  return inventory
    .map(i => (i.item.id === itemId ? { ...i, count: i.count - 1 } : i))
    .filter(i => i.count > 0);
};

export const combineItems = (
  state: GameEngineState,
  itemId1: string,
  itemId2: string,
  _uiState: UIState
): CombineResult => {
  if (itemId1 === itemId2) {
    return { success: false, message: '不能组合相同的物品' };
  }

  const inv1 = state.inventory.find(i => i.item.id === itemId1);
  const inv2 = state.inventory.find(i => i.item.id === itemId2);

  if (!inv1 || !inv2) {
    return { success: false, message: '背包中没有这些物品' };
  }

  const recipe: CombineRecipe | undefined = COMBINE_RECIPES.find(
    r =>
      (r.ingredients[0] === itemId1 && r.ingredients[1] === itemId2) ||
      (r.ingredients[0] === itemId2 && r.ingredients[1] === itemId1)
  );

  if (!recipe) {
    return { success: false, message: '无法组合' };
  }

  let newInventory = state.inventory;
  if (recipe.consumeBoth) {
    newInventory = removeFromInventory(newInventory, itemId1);
    newInventory = removeFromInventory(newInventory, itemId2);
  }
  newInventory = addToInventory(newInventory, recipe.result);

  return {
    success: true,
    message: `合成了${recipe.result.name}！`,
    newInventory
  };
};

export const checkPuzzle = (
  state: GameEngineState,
  puzzleId: string,
  answer: any,
  _uiState: UIState
): PuzzleCheckResult => {
  const room = state.rooms.find(r => r.id === state.currentRoomId);
  if (!room) {
    return { correct: false, message: '不在任何房间中' };
  }

  const puzzle = room.puzzles.find(p => p.id === puzzleId);
  if (!puzzle) {
    return { correct: false, message: '谜题不存在' };
  }

  if (puzzle.solved) {
    return { correct: true, message: '该谜题已经解开了' };
  }

  switch (puzzle.type) {
    case 'password':
      if (String(answer).toLowerCase() === String(puzzle.data.answer).toLowerCase()) {
        return { correct: true, message: '密码正确！' };
      }
      return { correct: false, message: '密码错误' };

    case 'jigsaw': {
      const solution = puzzle.data.solution;
      const isCorrect = answer.every((v: number, i: number) => v === solution[i]);
      if (isCorrect) {
        return { correct: true, message: '拼图完成！' };
      }
      return { correct: false, message: '拼图还未完成' };
    }

    case 'connect': {
      const pairs = puzzle.data.pairs as [string, string][];
      const userPairs = answer as [string, string][];
      if (!userPairs || userPairs.length !== pairs.length) {
        return { correct: false, message: '还有连线未完成' };
      }
      const isCorrect = pairs.every(pair =>
        userPairs.some(
          up =>
            (up[0] === pair[0] && up[1] === pair[1]) ||
            (up[0] === pair[1] && up[1] === pair[0])
        )
      );
      if (isCorrect) {
        return { correct: true, message: '全部连接正确！' };
      }
      return { correct: false, message: '连接有误' };
    }

    case 'mechanism': {
      const steps = puzzle.data.steps as number;
      if (answer === steps) {
        return { correct: true, message: '机关已激活！' };
      }
      return { correct: false, message: '步骤未完成' };
    }

    default:
      return { correct: false, message: '未知谜题类型' };
  }
};

export const solvePuzzle = (
  state: GameEngineState,
  puzzleId: string
): { state: GameEngineState; completedRoom: boolean } => {
  let completedRoom = false;
  const newRooms = state.rooms.map(r => {
    if (r.id !== state.currentRoomId) return r;
    const newPuzzles = r.puzzles.map(p =>
      p.id === puzzleId ? { ...p, solved: true } : p
    );
    const allSolved = newPuzzles.every(p => p.solved);
    if (allSolved) {
      completedRoom = true;
      const newDoors = r.doors.map(d => ({ ...d, locked: false }));
      return { ...r, puzzles: newPuzzles, doors: newDoors, completed: true };
    }
    return { ...r, puzzles: newPuzzles };
  });

  return { state: { ...state, rooms: newRooms }, completedRoom };
};

export const goThroughDoor = (
  state: GameEngineState,
  doorId: string
): { state: GameEngineState; success: boolean; message: string; toExit?: boolean } => {
  const room = state.rooms.find(r => r.id === state.currentRoomId);
  if (!room) {
    return { state, success: false, message: '不在任何房间中' };
  }

  const door = room.doors.find(d => d.id === doorId);
  if (!door) {
    return { state, success: false, message: '找不到这扇门' };
  }

  if (door.locked) {
    return { state, success: false, message: '这扇门锁住了，需要先解开所有谜题' };
  }

  if (door.targetRoomId === 'exit') {
    return { state, success: true, message: '成功逃脱！', toExit: true };
  }

  const newRooms = state.rooms.map(r =>
    r.id === door.targetRoomId ? { ...r, unlocked: true } : r
  );

  return {
    state: { ...state, rooms: newRooms, currentRoomId: door.targetRoomId },
    success: true,
    message: `前往${door.targetRoomId}`
  };
};

export const getInventorySummary = (state: GameEngineState): InventoryItem[] => {
  return state.inventory;
};

export const getCurrentRoom = (state: GameEngineState): Room | undefined => {
  return state.rooms.find(r => r.id === state.currentRoomId);
};
