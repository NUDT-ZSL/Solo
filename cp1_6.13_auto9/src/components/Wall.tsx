import React, { useCallback, useRef } from 'react';
import { useGalleryStore } from '@/store';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { RotateCw, Trash2 } from 'lucide-react';
import type { Wall } from '@/types';

interface WallProps {
  wall: Wall;
  zoom: number;
}

export const Wall: React.FC<WallProps> = ({ wall, zoom }) => {
  const { updateWall, rotateWall, removeWall, selectElement, snapWall } = useGalleryStore();
  const wallRef = useRef<HTMLDivElement>(null);

  const { handlePointerDown, handlePointerMove, handlePointerUp } = useDragAndDrop({
    zoom,
    onStart: () => {
      selectElement({ type: 'wall', id: wall.id });
    },
    onMove: (delta) => {
      const newX = wall.x + delta.x;
      const newY = wall.y + delta.y;
      const snapped = snapWall(wall.id, newX, newY);
      updateWall(wall.id, { x: snapped.x, y: snapped.y });
    },
  });

  const isSelected =
    useGalleryStore(
      (s) => s.selectedElement?.type === 'wall' && s.selectedElement?.id === wall.id
    );

  const handleRotate = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      rotateWall(wall.id);
    },
    [rotateWall, wall.id]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      removeWall(wall.id);
    },
    [removeWall, wall.id]
  );

  const isVertical = wall.rotation === 90 || wall.rotation === 270;
  const displayWidth = isVertical ? wall.height : wall.width;
  const displayHeight = isVertical ? wall.width : wall.height;

  return (
    <div
      ref={wallRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: 'absolute',
        left: wall.x,
        top: wall.y,
        width: displayWidth,
        height: displayHeight,
        border: `2px solid ${wall.isSnapping ? '#3b82f6' : '#888'}`,
        backgroundColor: '#ffffff66',
        cursor: 'move',
        boxSizing: 'border-box',
        transition: wall.isSnapping ? 'border-color 0.15s ease' : 'none',
        boxShadow: isSelected
          ? '0 0 0 2px #3b82f6, 0 2px 8px rgba(0,0,0,0.12)'
          : '0 1px 3px rgba(0,0,0,0.08)',
        zIndex: isSelected ? 10 : 1,
        touchAction: 'none',
      }}
    >
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            top: -32,
            right: 0,
            display: 'flex',
            gap: 4,
          }}
        >
          <button
            onClick={handleRotate}
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              border: 'none',
              backgroundColor: '#3b82f6',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'box-shadow 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 6px rgba(59,130,246,0.4)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
          >
            <RotateCw size={14} />
          </button>
          <button
            onClick={handleDelete}
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              border: 'none',
              backgroundColor: '#ef4444',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'box-shadow 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 6px rgba(239,68,68,0.4)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: 10,
          color: '#666',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {wall.rotation}°
      </div>
    </div>
  );
};
