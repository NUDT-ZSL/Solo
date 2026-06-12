import { useState, useRef, useEffect, useCallback } from 'react';
import type { Room, Item, Wall, ItemType } from '../../types';
import ItemIcon from './ItemIcon';

interface GridEditorProps {
  room: Room;
  selectedItemId: string | null;
  onSelectItem: (item: Item | null) => void;
  onToggleWall: (x: number, y: number, visible: boolean) => void;
  onMoveItem: (itemId: string, x: number, y: number) => void;
  tool: 'wall' | 'erase' | 'select' | ItemType;
  onAddItem?: (type: ItemType, x: number, y: number) => void;
}

const CELL_SIZE = 48;

function GridEditor({
  room,
  selectedItemId,
  onSelectItem,
  onToggleWall,
  onMoveItem,
  tool,
  onAddItem
}: GridEditorProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'add' | 'remove' | null>(null);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [animatingWalls, setAnimatingWalls] = useState<Map<string, number>>(new Map());
  const [newItemPositions, setNewItemPositions] = useState<Map<string, number>>(new Map());
  const gridRef = useRef<HTMLDivElement>(null);

  const wallMap = new Map<string, Wall>();
  room.walls.forEach(w => {
    wallMap.set(`${w.x},${w.y}`, w);
  });

  const getGridPosition = useCallback((clientX: number, clientY: number) => {
    if (!gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left) / CELL_SIZE);
    const y = Math.floor((clientY - rect.top) / CELL_SIZE);
    if (x < 0 || x >= room.width || y < 0 || y >= room.height) return null;
    return { x, y };
  }, [room.width, room.height]);

  const addWallAnimation = (x: number, y: number) => {
    const key = `${x},${y}`;
    const timestamp = Date.now();
    setAnimatingWalls(prev => new Map(prev).set(key, timestamp));
    setTimeout(() => {
      setAnimatingWalls(prev => {
        const next = new Map(prev);
        const t = next.get(key);
        if (t === timestamp) {
          next.delete(key);
        }
        return next;
      });
    }, 350);
  };

  const addItemAnimation = (x: number, y: number) => {
    const key = `${x},${y}`;
    const timestamp = Date.now();
    setNewItemPositions(prev => new Map(prev).set(key, timestamp));
    setTimeout(() => {
      setNewItemPositions(prev => {
        const next = new Map(prev);
        const t = next.get(key);
        if (t === timestamp) {
          next.delete(key);
        }
        return next;
      });
    }, 500);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getGridPosition(e.clientX, e.clientY);
    if (!pos) return;

    const wallKey = `${pos.x},${pos.y}`;
    const hasWall = wallMap.has(wallKey) && wallMap.get(wallKey)!.visible;

    if (tool === 'wall') {
      setIsDragging(true);
      setDragMode('add');
      if (!hasWall) {
        onToggleWall(pos.x, pos.y, true);
        addWallAnimation(pos.x, pos.y);
      }
    } else if (tool === 'erase') {
      setIsDragging(true);
      setDragMode('remove');
      if (hasWall) {
        onToggleWall(pos.x, pos.y, false);
      }
    } else if (tool === 'select') {
      const clickedItem = room.items.find(item => item.x === pos.x && item.y === pos.y && !item.collected);
      if (clickedItem) {
        onSelectItem(clickedItem);
        setDraggedItem(clickedItem.id);
        setIsDragging(true);
      } else {
        onSelectItem(null);
      }
    } else if (onAddItem) {
      const existingItem = room.items.find(item => item.x === pos.x && item.y === pos.y);
      if (!existingItem && !hasWall) {
        addItemAnimation(pos.x, pos.y);
        onAddItem(tool as ItemType, pos.x, pos.y);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const pos = getGridPosition(e.clientX, e.clientY);
    if (!pos) return;

    const wallKey = `${pos.x},${pos.y}`;
    const hasWall = wallMap.has(wallKey) && wallMap.get(wallKey)!.visible;

    if (dragMode === 'add' && !hasWall) {
      onToggleWall(pos.x, pos.y, true);
      addWallAnimation(pos.x, pos.y);
    } else if (dragMode === 'remove' && hasWall) {
      onToggleWall(pos.x, pos.y, false);
    } else if (draggedItem) {
      const existingItem = room.items.find(item => item.x === pos.x && item.y === pos.y && item.id !== draggedItem);
      if (!existingItem && !hasWall) {
        onMoveItem(draggedItem, pos.x, pos.y);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragMode(null);
    setDraggedItem(null);
  };

  const renderGrid = () => {
    const cells = [];
    const now = Date.now();
    
    for (let y = 0; y < room.height; y++) {
      for (let x = 0; x < room.width; x++) {
        const key = `${x},${y}`;
        const wall = wallMap.get(key);
        const isWall = wall?.visible;
        const isAnimating = animatingWalls.has(key) && (now - (animatingWalls.get(key) || 0)) < 350;
        
        cells.push(
          <div
            key={key}
            style={{
              position: 'absolute',
              left: x * CELL_SIZE,
              top: y * CELL_SIZE,
              width: CELL_SIZE,
              height: CELL_SIZE,
              backgroundColor: isWall ? '#475569' : 'transparent',
              border: '1px solid rgba(71, 85, 105, 0.3)',
              opacity: isWall ? (isAnimating ? 0.01 : 1) : 0,
              transition: isAnimating ? 'none' : 'opacity 0.1s',
              animation: isAnimating && isWall ? 'wallFadeIn 0.3s ease-out forwards' : 'none',
              willChange: isAnimating ? 'opacity' : 'auto'
            }}
          >
            {isWall && (
              <div style={{
                width: '100%',
                height: '100%',
                background: `
                  repeating-linear-gradient(
                    90deg,
                    transparent,
                    transparent 8px,
                    rgba(0,0,0,0.1) 8px,
                    rgba(0,0,0,0.1) 10px
                  ),
                  repeating-linear-gradient(
                    0deg,
                    transparent,
                    transparent 8px,
                    rgba(0,0,0,0.1) 8px,
                    rgba(0,0,0,0.1) 10px
                  )
                `,
                imageRendering: 'pixelated' as const,
                opacity: isAnimating ? 0 : 1,
                animation: isAnimating && isWall ? 'wallFadeIn 0.3s ease-out forwards' : 'none'
              }} />
            )}
          </div>
        );
      }
    }
    return cells;
  };

  const renderItems = () => {
    const now = Date.now();
    
    return room.items
      .filter(item => !item.collected)
      .map(item => {
        const isSelected = item.id === selectedItemId;
        const posKey = `${item.x},${item.y}`;
        const isNewAnimating = newItemPositions.has(posKey) && (now - (newItemPositions.get(posKey) || 0)) < 500;
        
        return (
          <div
            key={item.id}
            style={{
              position: 'absolute',
              left: item.x * CELL_SIZE + 4,
              top: item.y * CELL_SIZE + 4,
              width: CELL_SIZE - 8,
              height: CELL_SIZE - 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              backgroundColor: isSelected ? 'rgba(249, 115, 22, 0.2)' : 'rgba(30, 41, 59, 0.6)',
              border: isSelected ? '2px solid #f97316' : '1px solid #475569',
              cursor: 'pointer',
              transition: isNewAnimating ? 'none' : 'all 0.2s',
              boxShadow: isSelected ? '0 0 10px rgba(249, 115, 22, 0.5)' : 'none',
              zIndex: isSelected ? 10 : 1,
              animation: isNewAnimating ? 'itemDrop 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' : 'none',
              transformOrigin: 'center bottom',
              willChange: isNewAnimating ? 'transform, opacity' : 'auto'
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (tool === 'select') {
                onSelectItem(item);
              }
            }}
          >
            <ItemIcon type={item.type} size={28} />
          </div>
        );
      });
  };

  return (
    <div
      ref={gridRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        position: 'relative',
        width: room.width * CELL_SIZE,
        height: room.height * CELL_SIZE,
        backgroundColor: '#0f172a',
        borderRadius: '8px',
        overflow: 'hidden',
        cursor: tool === 'select' ? 'default' : 'crosshair',
        userSelect: 'none'
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(71, 85, 105, 0.2) 1px, transparent 1px),
            linear-gradient(90deg, rgba(71, 85, 105, 0.2) 1px, transparent 1px)
          `,
          backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
          pointerEvents: 'none'
        }}
      />
      {renderGrid()}
      {renderItems()}
    </div>
  );
}

export default GridEditor;
