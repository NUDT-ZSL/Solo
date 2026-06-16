export interface Item {
  id: string;
  name: string;
  icon: string;
  description: string;
  maxStack: number;
}

export interface InventoryItem {
  item: Item;
  count: number;
}

export interface InteractiveItem {
  item: Item;
  x: number;
  y: number;
  visible: boolean;
  collected: boolean;
  linkedPuzzleId?: string;
  requiresItem?: string;
}

export interface Door {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  targetRoomId: string;
  locked: boolean;
  requiredPuzzleIds: string[];
  label: string;
  isHidden?: boolean;
}

export interface Puzzle {
  id: string;
  name: string;
  type: 'jigsaw' | 'password' | 'connect' | 'mechanism';
  solved: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  data: any;
  hint?: string;
  unlocksItemId?: string;
}

export interface Furniture {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  label?: string;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  theme: string;
  bgColor: string;
  wallPattern: string;
  floorPattern: string;
  interactiveItems: InteractiveItem[];
  puzzles: Puzzle[];
  doors: Door[];
  furniture: Furniture[];
  unlocked: boolean;
  completed: boolean;
}

export interface CombineRecipe {
  ingredients: [string, string];
  result: Item;
  consumeBoth: boolean;
}

export interface GameState {
  rooms: Room[];
  currentRoomId: string;
  inventory: InventoryItem[];
  inventoryCapacity: number;
  selectedInventoryIds: string[];
  activePuzzleId: string | null;
  gameStarted: boolean;
  gameCompleted: boolean;
  isTransitioning: boolean;
  transitionDirection: 'fadeIn' | 'fadeOut';
  errorFlash: boolean;
  combineFlash: boolean;
  showMenu: boolean;
}

export interface GameActions {
  startNewGame: () => void;
  continueGame: () => boolean;
  loadRoom: (roomId: string) => void;
  collectItem: (itemId: string, roomId: string) => void;
  useItem: (itemId: string, targetId: string) => boolean;
  selectInventoryItem: (itemId: string) => void;
  clearSelection: () => void;
  combineItems: () => { success: boolean; message: string };
  openPuzzle: (puzzleId: string) => void;
  closePuzzle: () => void;
  solvePuzzle: (puzzleId: string) => void;
  checkPuzzle: (puzzleId: string, answer: any) => boolean;
  goThroughDoor: (doorId: string) => void;
  setErrorFlash: (value: boolean) => void;
  setCombineFlash: (value: boolean) => void;
  saveProgress: () => void;
  resetGame: () => void;
  showMainMenu: () => void;
  hideMenu: () => void;
}
