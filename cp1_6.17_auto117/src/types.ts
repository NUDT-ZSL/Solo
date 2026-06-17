export type ItemType = 'weapon' | 'armor' | 'accessory' | 'consumable';
export type ItemRarity = 'common' | 'uncommon' | 'epic' | 'legendary';

export interface ItemStats {
  attack?: number;
  defense?: number;
  speed?: number;
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  weight: number;
  value: number;
  maxStack: number;
  icon: string;
  stats: ItemStats;
}

export interface InventorySlot {
  item: Item | null;
  quantity: number;
}

export type EquipmentSlot = 'head' | 'body' | 'weapon' | 'accessory';

export interface Equipment {
  head: Item | null;
  body: Item | null;
  weapon: Item | null;
  accessory: Item | null;
}

export interface ShopItem {
  item: Item;
  stock: number;
}

export type ShopDialogState = 'greet' | 'buy' | 'sell' | 'leave';

export type RarityFilter = 'all' | ItemRarity;

export interface GameState {
  inventory: InventorySlot[];
  gold: number;
  maxWeight: number;
  equipment: Equipment;
  shopItems: ShopItem[];
  shopDialogState: ShopDialogState;
  rarityFilter: RarityFilter;
  dragItem: { slotIndex: number; item: Item; quantity: number } | null;
}

export type GameAction =
  | { type: 'SET_DRAG_ITEM'; payload: GameState['dragItem'] }
  | { type: 'CLEAR_DRAG_ITEM' }
  | { type: 'MOVE_ITEM'; payload: { fromIndex: number; toIndex: number } }
  | { type: 'STACK_ITEM'; payload: { fromIndex: number; toIndex: number } }
  | { type: 'SWAP_ITEM'; payload: { fromIndex: number; toIndex: number } }
  | { type: 'ADD_ITEM'; payload: { item: Item; quantity: number } }
  | { type: 'REMOVE_ITEM'; payload: { index: number; quantity: number } }
  | { type: 'EQUIP_ITEM'; payload: { slot: EquipmentSlot; item: Item; inventoryIndex: number } }
  | { type: 'UNEQUIP_ITEM'; payload: { slot: EquipmentSlot } }
  | { type: 'ADD_GOLD'; payload: number }
  | { type: 'REMOVE_GOLD'; payload: number }
  | { type: 'REFRESH_SHOP' }
  | { type: 'SET_SHOP_DIALOG'; payload: ShopDialogState }
  | { type: 'SET_RARITY_FILTER'; payload: RarityFilter }
  | { type: 'DECREASE_SHOP_STOCK'; payload: { itemId: string; quantity: number } };
