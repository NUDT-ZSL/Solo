import { Item, ItemRarity, ShopItem, InventorySlot } from '../types';

export function formatCurrency(copper: number): string {
  const silver = Math.floor(copper / 100);
  const remainingCopper = copper % 100;
  if (silver > 0 && remainingCopper > 0) {
    return `${silver}银${remainingCopper}铜`;
  }
  if (silver > 0) {
    return `${silver}银`;
  }
  return `${remainingCopper}铜`;
}

const ITEM_POOL: Omit<Item, 'id'>[] = [
  { name: '铁剑', type: 'weapon', rarity: 'common', weight: 5, value: 50, maxStack: 1, icon: '🗡️', stats: { attack: 10 } },
  { name: '精钢剑', type: 'weapon', rarity: 'uncommon', weight: 6, value: 200, maxStack: 1, icon: '⚔️', stats: { attack: 25 } },
  { name: '暗影之刃', type: 'weapon', rarity: 'epic', weight: 4, value: 800, maxStack: 1, icon: '🔪', stats: { attack: 50, speed: 5 } },
  { name: '龙牙巨剑', type: 'weapon', rarity: 'legendary', weight: 10, value: 3000, maxStack: 1, icon: '🗡️', stats: { attack: 100, defense: 10 } },
  { name: '皮甲', type: 'armor', rarity: 'common', weight: 8, value: 40, maxStack: 1, icon: '🛡️', stats: { defense: 8 } },
  { name: '锁子甲', type: 'armor', rarity: 'uncommon', weight: 15, value: 180, maxStack: 1, icon: '🛡️', stats: { defense: 20 } },
  { name: '龙鳞铠甲', type: 'armor', rarity: 'epic', weight: 18, value: 700, maxStack: 1, icon: '🛡️', stats: { defense: 45, attack: 5 } },
  { name: '神圣板甲', type: 'armor', rarity: 'legendary', weight: 22, value: 2800, maxStack: 1, icon: '🛡️', stats: { defense: 90, speed: -5 } },
  { name: '铁盔', type: 'armor', rarity: 'common', weight: 3, value: 30, maxStack: 1, icon: '⛑️', stats: { defense: 5 } },
  { name: '骑士头盔', type: 'armor', rarity: 'uncommon', weight: 4, value: 150, maxStack: 1, icon: '⛑️', stats: { defense: 15 } },
  { name: '法师之冠', type: 'armor', rarity: 'epic', weight: 2, value: 600, maxStack: 1, icon: '👑', stats: { defense: 25, speed: 10 } },
  { name: '王者皇冠', type: 'armor', rarity: 'legendary', weight: 3, value: 2500, maxStack: 1, icon: '👑', stats: { defense: 50, attack: 20, speed: 10 } },
  { name: '铜戒指', type: 'accessory', rarity: 'common', weight: 0.1, value: 25, maxStack: 1, icon: '💍', stats: { speed: 3 } },
  { name: '银质项链', type: 'accessory', rarity: 'uncommon', weight: 0.2, value: 120, maxStack: 1, icon: '📿', stats: { defense: 5, speed: 5 } },
  { name: '魔力护符', type: 'accessory', rarity: 'epic', weight: 0.3, value: 550, maxStack: 1, icon: '🔮', stats: { attack: 15, defense: 15, speed: 10 } },
  { name: '远古圣物', type: 'accessory', rarity: 'legendary', weight: 0.5, value: 2200, maxStack: 1, icon: '💎', stats: { attack: 30, defense: 30, speed: 20 } },
  { name: '治疗药水', type: 'consumable', rarity: 'common', weight: 0.5, value: 15, maxStack: 99, icon: '🧪', stats: {} },
  { name: '魔力药水', type: 'consumable', rarity: 'uncommon', weight: 0.5, value: 45, maxStack: 99, icon: '🧪', stats: {} },
  { name: '治疗草', type: 'consumable', rarity: 'common', weight: 0.2, value: 5, maxStack: 99, icon: '🌿', stats: {} },
  { name: '星辰宝石', type: 'consumable', rarity: 'epic', weight: 0.3, value: 400, maxStack: 99, icon: '⭐', stats: {} },
];

const RARITY_WEIGHTS: Record<ItemRarity, number> = {
  common: 50,
  uncommon: 30,
  epic: 15,
  legendary: 5,
};

function weightedRandomRarity(): ItemRarity {
  const totalWeight = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
    random -= weight;
    if (random <= 0) return rarity as ItemRarity;
  }
  return 'common';
}

export function generateRandomItem(): Item {
  const rarity = weightedRandomRarity();
  const pool = ITEM_POOL.filter(item => item.rarity === rarity);
  const template = pool[Math.floor(Math.random() * pool.length)] || ITEM_POOL[0];
  return {
    ...template,
    id: `${template.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };
}

export function generateShopItems(count: number = 8): ShopItem[] {
  const shuffled = [...ITEM_POOL].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);
  return selected.map(template => ({
    item: {
      ...template,
      id: `shop-${template.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    },
    stock: template.rarity === 'legendary' ? 1 : template.rarity === 'epic' ? 2 : Math.floor(Math.random() * 10) + 3,
  }));
}

export function canStack(fromItem: Item, toSlot: InventorySlot): boolean {
  if (!toSlot.item) return false;
  if (toSlot.item.id.split('-')[0] !== fromItem.id.split('-')[0]) return false;
  if (fromItem.name !== toSlot.item.name) return false;
  return toSlot.quantity < toSlot.item.maxStack;
}

export function mergeStacks(
  inventory: InventorySlot[],
  fromIndex: number,
  toIndex: number
): InventorySlot[] {
  const newInventory = [...inventory];
  const fromSlot = { ...newInventory[fromIndex] };
  const toSlot = { ...newInventory[toIndex] };

  if (!fromSlot.item || !toSlot.item) return newInventory;

  const canAdd = toSlot.item.maxStack - toSlot.quantity;
  const toAdd = Math.min(canAdd, fromSlot.quantity);

  toSlot.quantity += toAdd;
  fromSlot.quantity -= toAdd;

  if (fromSlot.quantity <= 0) {
    fromSlot.item = null;
    fromSlot.quantity = 0;
  }

  newInventory[fromIndex] = fromSlot;
  newInventory[toIndex] = toSlot;

  return newInventory;
}

export function swapItems(
  inventory: InventorySlot[],
  fromIndex: number,
  toIndex: number
): InventorySlot[] {
  const newInventory = [...inventory];
  const temp = newInventory[fromIndex];
  newInventory[fromIndex] = newInventory[toIndex];
  newInventory[toIndex] = temp;
  return newInventory;
}

export function calculateWeight(inventory: InventorySlot[]): number {
  return inventory.reduce((total, slot) => {
    if (slot.item) {
      return total + slot.item.weight * slot.quantity;
    }
    return total;
  }, 0);
}

export const RARITY_COLORS: Record<ItemRarity, string> = {
  common: '#FFFFFF',
  uncommon: '#4169E1',
  epic: '#8A2BE2',
  legendary: '#FFD700',
};

export const RARITY_NAMES: Record<ItemRarity, string> = {
  common: '普通',
  uncommon: '稀有',
  epic: '史诗',
  legendary: '传说',
};

export function createInitialInventory(size: number = 20): InventorySlot[] {
  const slots: InventorySlot[] = Array.from({ length: size }, () => ({
    item: null,
    quantity: 0,
  }));

  const starterItems: { template: Omit<Item, 'id'>; quantity: number; index: number }[] = [
    { template: ITEM_POOL[0], quantity: 1, index: 0 },
    { template: ITEM_POOL[4], quantity: 1, index: 1 },
    { template: ITEM_POOL[16], quantity: 5, index: 2 },
    { template: ITEM_POOL[18], quantity: 10, index: 3 },
  ];

  starterItems.forEach(({ template, quantity, index }) => {
    slots[index] = {
      item: {
        ...template,
        id: `starter-${template.name}-${index}`,
      },
      quantity,
    };
  });

  return slots;
}
