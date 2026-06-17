import React, { useState, useMemo, useCallback } from 'react';
import { useGameState } from '../context/GameState';
import { EquipmentSlot, Item } from '../types';
import { calculateWeight, formatCurrency, RARITY_COLORS } from '../utils/helpers';

interface DragPosition {
  x: number;
  y: number;
}

const EQUIPMENT_SLOT_LABELS: Record<EquipmentSlot, string> = {
  head: '头部',
  body: '身体',
  weapon: '武器',
  accessory: '饰品',
};

const EQUIPMENT_TYPES: Record<EquipmentSlot, string[]> = {
  head: ['armor'],
  body: ['armor'],
  weapon: ['weapon'],
  accessory: ['accessory'],
};

function canEquipToSlot(item: Item, slot: EquipmentSlot): boolean {
  if (slot === 'head' || slot === 'body') {
    return item.type === 'armor' && (slot === 'head' ? item.name.includes('盔') || item.name.includes('冠') || item.name.includes('帽') : !item.name.includes('盔') && !item.name.includes('冠') && !item.name.includes('帽'));
  }
  return EQUIPMENT_TYPES[slot].includes(item.type);
}

function isSameItem(a: Item, b: Item): boolean {
  return a.name === b.name && a.type === b.type && a.rarity === b.rarity;
}

export function InventoryModule() {
  const { state, dispatch } = useGameState();
  const [dragPos, setDragPos] = useState<DragPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredEquipSlot, setHoveredEquipSlot] = useState<EquipmentSlot | null>(null);

  const currentWeight = useMemo(() => calculateWeight(state.inventory), [state.inventory]);

  const totalStats = useMemo(() => {
    const stats = { attack: 0, defense: 0, speed: 0 };
    const equipSlots: (Item | null)[] = [
      state.equipment.head,
      state.equipment.body,
      state.equipment.weapon,
      state.equipment.accessory,
    ];
    equipSlots.forEach(item => {
      if (item) {
        stats.attack += item.stats.attack || 0;
        stats.defense += item.stats.defense || 0;
        stats.speed += item.stats.speed || 0;
      }
    });
    return stats;
  }, [state.equipment]);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    const slot = state.inventory[index];
    if (!slot.item) return;

    dispatch({ type: 'SET_DRAG_ITEM', payload: { slotIndex: index, item: slot.item, quantity: slot.quantity } });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));

    const ghost = (e.target as HTMLElement).cloneNode(true) as HTMLElement;
    ghost.style.position = 'absolute';
    ghost.style.top = '-9999px';
    ghost.style.opacity = '0.5';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 30, 30);
    setTimeout(() => document.body.removeChild(ghost), 0);

    setIsDragging(true);
    setDragPos({ x: e.clientX, y: e.clientY });
  }, [state.inventory, dispatch]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    if (e.clientX === 0 && e.clientY === 0) return;
    setDragPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDragPos(null);
    setHoveredEquipSlot(null);
    dispatch({ type: 'CLEAR_DRAG_ITEM' });
  }, [dispatch]);

  const handleDropOnSlot = useCallback((e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (!state.dragItem) return;

    const fromIndex = state.dragItem.slotIndex;
    if (fromIndex === toIndex) {
      dispatch({ type: 'CLEAR_DRAG_ITEM' });
      return;
    }

    const toSlot = state.inventory[toIndex];
    const dragItem = state.dragItem.item;

    if (toSlot.item && isSameItem(dragItem, toSlot.item) && toSlot.quantity < toSlot.item.maxStack) {
      dispatch({ type: 'STACK_ITEM', payload: { fromIndex, toIndex } });
    } else {
      dispatch({ type: 'MOVE_ITEM', payload: { fromIndex, toIndex } });
    }

    setIsDragging(false);
    setDragPos(null);
  }, [state.dragItem, state.inventory, dispatch]);

  const handleDropOnEquip = useCallback((e: React.DragEvent, slot: EquipmentSlot) => {
    e.preventDefault();
    if (!state.dragItem) return;

    const item = state.dragItem.item;
    if (canEquipToSlot(item, slot)) {
      dispatch({
        type: 'EQUIP_ITEM',
        payload: { slot, item, inventoryIndex: state.dragItem.slotIndex },
      });
    }
    setIsDragging(false);
    setDragPos(null);
    setHoveredEquipSlot(null);
  }, [state.dragItem, dispatch]);

  const handleDragEnterEquip = useCallback((e: React.DragEvent, slot: EquipmentSlot) => {
    e.preventDefault();
    if (state.dragItem && canEquipToSlot(state.dragItem.item, slot)) {
      setHoveredEquipSlot(slot);
    }
  }, [state.dragItem]);

  const handleDragLeaveEquip = useCallback(() => {
    setHoveredEquipSlot(null);
  }, []);

  const handleDoubleClickEquip = useCallback((slot: EquipmentSlot) => {
    if (state.equipment[slot]) {
      dispatch({ type: 'UNEQUIP_ITEM', payload: { slot } });
    }
  }, [state.equipment, dispatch]);

  return (
    <div className="inventory-panel" onDragOver={(e) => e.preventDefault()}>
      <div className="stats-panel">
        <div className="stats-title">角色属性</div>
        <div className="stats-row">
          <span className="stat-label">攻击力:</span>
          <span className="stat-value">{totalStats.attack}</span>
        </div>
        <div className="stats-row">
          <span className="stat-label">防御力:</span>
          <span className="stat-value">{totalStats.defense}</span>
        </div>
        <div className="stats-row">
          <span className="stat-label">速度:</span>
          <span className="stat-value">{totalStats.speed}</span>
        </div>
      </div>

      <div className="inventory-content">
        <div className="equipment-slots">
          {(Object.keys(EQUIPMENT_SLOT_LABELS) as EquipmentSlot[]).map(slot => {
            const equippedItem = state.equipment[slot];
            const isHovered = hoveredEquipSlot === slot;
            return (
              <div
                key={slot}
                className={`equipment-slot ${isHovered ? 'equip-highlight' : ''}`}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={(e) => handleDragEnterEquip(e, slot)}
                onDragLeave={handleDragLeaveEquip}
                onDrop={(e) => handleDropOnEquip(e, slot)}
                onDoubleClick={() => handleDoubleClickEquip(slot)}
                title={EQUIPMENT_SLOT_LABELS[slot]}
              >
                {equippedItem && (
                  <div
                    className="equipment-item"
                    style={{ borderColor: RARITY_COLORS[equippedItem.rarity] }}
                  >
                    <span className="item-icon">{equippedItem.icon}</span>
                  </div>
                )}
                <span className="equipment-label">{EQUIPMENT_SLOT_LABELS[slot]}</span>
              </div>
            );
          })}
        </div>

        <div className="inventory-container">
          <div className="inventory-grid">
            {state.inventory.map((slot, index) => (
              <div
                key={index}
                className={`inventory-slot ${isDragging && state.dragItem && slot.item && isSameItem(state.dragItem.item, slot.item) && slot.quantity < slot.item.maxStack ? 'slot-stackable' : ''}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDropOnSlot(e, index)}
              >
                {slot.item && (
                  <div
                    className={`inventory-item ${isDragging && state.dragItem?.slotIndex === index ? 'dragging' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDrag={handleDrag}
                    onDragEnd={handleDragEnd}
                    style={{ borderColor: RARITY_COLORS[slot.item.rarity] }}
                  >
                    <span className="item-icon">{slot.item.icon}</span>
                    {slot.quantity > 1 && (
                      <span className="item-quantity">{slot.quantity}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="inventory-footer">
        <div className="gold-display">
          <span className="gold-icon">💰</span>
          <span className="gold-value">{formatCurrency(state.gold)}</span>
        </div>
        <div className="weight-display">
          <span className="weight-label">负重:</span>
          <span className={`weight-value ${currentWeight > state.maxWeight ? 'overweight' : ''}`}>
            {currentWeight.toFixed(1)} / {state.maxWeight}kg
          </span>
        </div>
      </div>

      {isDragging && state.dragItem && dragPos && (
        <div
          className="drag-ghost"
          style={{
            left: dragPos.x + 10,
            top: dragPos.y + 10,
            position: 'fixed',
            pointerEvents: 'none',
            zIndex: 10000,
            opacity: 0.6,
          }}
        >
          <span className="item-icon">{state.dragItem.item.icon}</span>
          {state.dragItem.quantity > 1 && (
            <span className="item-quantity">{state.dragItem.quantity}</span>
          )}
        </div>
      )}
    </div>
  );
}
