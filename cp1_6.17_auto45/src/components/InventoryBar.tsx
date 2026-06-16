import { useState } from 'react';
import { useGameStore } from '../store';

export default function InventoryBar() {
  const {
    inventory,
    inventoryCapacity,
    selectedInventoryIds,
    selectInventoryItem,
    combineItems
  } = useGameStore();

  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const slots = Array.from({ length: inventoryCapacity }, (_, i) => inventory[i]);
  const canCombine = selectedInventoryIds.length === 2;

  return (
    <div className="inventory-bar">
      <div className="inventory-label">
        🎒 背包 ({inventory.length}/{inventoryCapacity})
      </div>
      <div className="inventory-slots">
        {slots.map((invItem, idx) => {
          if (!invItem) {
            return <div key={idx} className="inventory-slot empty" />;
          }
          const isSelected = selectedInventoryIds.includes(invItem.item.id);
          return (
            <div
              key={invItem.item.id}
              className={`inventory-slot ${isSelected ? 'selected' : ''}`}
              onMouseEnter={() => setHoveredId(invItem.item.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => selectInventoryItem(invItem.item.id)}
            >
              <span className="inventory-icon">{invItem.item.icon}</span>
              {invItem.count > 1 && (
                <span className="inventory-count">{invItem.count}</span>
              )}
              {hoveredId === invItem.item.id && (
                <div className="inventory-tooltip">
                  {invItem.item.name}
                  <div style={{ fontSize: '0.7rem', color: '#8a8a9e', marginTop: '2px' }}>
                    {invItem.item.description}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button
        className={`combine-btn ${canCombine ? 'ready' : ''}`}
        onClick={combineItems}
        disabled={!canCombine}
      >
        ⚗️ 组合
      </button>
    </div>
  );
}
