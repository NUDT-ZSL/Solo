import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { GameState, GameAction, Item, EquipmentSlot } from '../types';
import { generateShopItems, mergeStacks, swapItems, canStack, createInitialInventory } from '../utils/helpers';

const initialState: GameState = {
  inventory: createInitialInventory(20),
  gold: 500,
  maxWeight: 200,
  equipment: {
    head: null,
    body: null,
    weapon: null,
    accessory: null,
  },
  shopItems: generateShopItems(8),
  shopDialogState: 'greet',
  rarityFilter: 'all',
  dragItem: null,
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_DRAG_ITEM':
      return { ...state, dragItem: action.payload };

    case 'CLEAR_DRAG_ITEM':
      return { ...state, dragItem: null };

    case 'MOVE_ITEM': {
      const { fromIndex, toIndex } = action.payload;
      const newInventory = [...state.inventory];
      const fromSlot = newInventory[fromIndex];
      const toSlot = newInventory[toIndex];

      if (!fromSlot.item) return state;
      if (fromIndex === toIndex) return state;

      if (!toSlot.item) {
        newInventory[toIndex] = { ...fromSlot };
        newInventory[fromIndex] = { item: null, quantity: 0 };
        return { ...state, inventory: newInventory, dragItem: null };
      }

      if (canStack(fromSlot.item, toSlot)) {
        return { ...state, inventory: mergeStacks(state.inventory, fromIndex, toIndex), dragItem: null };
      }

      return { ...state, inventory: swapItems(state.inventory, fromIndex, toIndex), dragItem: null };
    }

    case 'STACK_ITEM': {
      const { fromIndex, toIndex } = action.payload;
      return { ...state, inventory: mergeStacks(state.inventory, fromIndex, toIndex), dragItem: null };
    }

    case 'SWAP_ITEM': {
      const { fromIndex, toIndex } = action.payload;
      return { ...state, inventory: swapItems(state.inventory, fromIndex, toIndex), dragItem: null };
    }

    case 'ADD_ITEM': {
      const { item, quantity } = action.payload;
      const newInventory = [...state.inventory];
      let remaining = quantity;

      for (let i = 0; i < newInventory.length && remaining > 0; i++) {
        const slot = newInventory[i];
        if (slot.item && canStack(item, slot)) {
          const canAdd = slot.item.maxStack - slot.quantity;
          const toAdd = Math.min(canAdd, remaining);
          newInventory[i] = { ...slot, quantity: slot.quantity + toAdd };
          remaining -= toAdd;
        }
      }

      if (remaining > 0) {
        for (let i = 0; i < newInventory.length && remaining > 0; i++) {
          if (!newInventory[i].item) {
            const toAdd = Math.min(item.maxStack, remaining);
            newInventory[i] = { item: { ...item }, quantity: toAdd };
            remaining -= toAdd;
          }
        }
      }

      return { ...state, inventory: newInventory };
    }

    case 'REMOVE_ITEM': {
      const { index, quantity } = action.payload;
      const newInventory = [...state.inventory];
      const slot = { ...newInventory[index] };
      if (!slot.item) return state;

      slot.quantity -= quantity;
      if (slot.quantity <= 0) {
        slot.item = null;
        slot.quantity = 0;
      }
      newInventory[index] = slot;
      return { ...state, inventory: newInventory };
    }

    case 'EQUIP_ITEM': {
      const { slot, item, inventoryIndex } = action.payload;
      const newInventory = [...state.inventory];
      const newEquipment = { ...state.equipment };
      const oldEquipped = newEquipment[slot];

      if (oldEquipped) {
        newInventory[inventoryIndex] = { item: oldEquipped, quantity: 1 };
      } else {
        newInventory[inventoryIndex] = { item: null, quantity: 0 };
      }

      newEquipment[slot] = item;
      return { ...state, inventory: newInventory, equipment: newEquipment, dragItem: null };
    }

    case 'UNEQUIP_ITEM': {
      const { slot } = action.payload;
      const item = state.equipment[slot];
      if (!item) return state;

      const newInventory = [...state.inventory];
      for (let i = 0; i < newInventory.length; i++) {
        if (!newInventory[i].item) {
          newInventory[i] = { item, quantity: 1 };
          const newEquipment = { ...state.equipment, [slot]: null };
          return { ...state, inventory: newInventory, equipment: newEquipment };
        }
      }
      return state;
    }

    case 'ADD_GOLD':
      return { ...state, gold: state.gold + action.payload };

    case 'REMOVE_GOLD':
      return { ...state, gold: Math.max(0, state.gold - action.payload) };

    case 'REFRESH_SHOP':
      return { ...state, shopItems: generateShopItems(8) };

    case 'SET_SHOP_DIALOG':
      return { ...state, shopDialogState: action.payload };

    case 'SET_RARITY_FILTER':
      return { ...state, rarityFilter: action.payload };

    case 'DECREASE_SHOP_STOCK': {
      const { itemId, quantity } = action.payload;
      const newShopItems = state.shopItems.map(shopItem => {
        if (shopItem.item.id === itemId) {
          return { ...shopItem, stock: Math.max(0, shopItem.stock - quantity) };
        }
        return shopItem;
      }).filter(shopItem => shopItem.stock > 0);
      return { ...state, shopItems: newShopItems };
    }

    default:
      return state;
  }
}

interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGameState() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameState must be used within a GameProvider');
  }
  return context;
}
