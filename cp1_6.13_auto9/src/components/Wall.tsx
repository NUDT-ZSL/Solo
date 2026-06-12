import React, { useCallback, useRef } from 'react';
import { useGalleryStore } from '@/store';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { RotateCw, Trash2 } from 'lucide-react';
import { snapToWalls } from '@/utils/geometry';
import type { Wall as WallType } from '@/types';

interface WallProps {
  wall: WallType;
  zoom: number;
}

export const Wall: React.FC<WallProps> = ({ wall, zoom }) => {
  const updateWall = useGalleryStore((s) => s.updateWall);
  const rotateWall = useGalleryStore((s) => s.rotateWall);
  const removeWall = useGalleryStore((s) => s.removeWall);
  const selectElement = useGalleryStore((s) => s.selectElement);
  const wallRef = useRef<HTMLDivElement>(null);

  const isSelected =
    useGalleryStore(
      (s) => s.selectedElement?.type === 'wall' && s.selectedElement?.id === wall.id
    );

  const handleDragMove = useCallback(
    (delta: { x: number; y: number }) => {
      const newX = wall.x + delta.x;
      const newY = wall.y + delta.y;
      const allWalls = useGalleryStore.getState().walls;

      const result = snapToWalls(
        newX,
        newY,
        wall.width,
        wall.height,
        allWalls,
        wall.id
      );

      updateWall(wall.id, {
        x: result.x,
        y: result.y,
        isSnapping: result.snapped,
      });
    },
    [wall, updateWall]
  );

  const handleDragStart = useCallback(() => {
    selectElement({ type: 'wall', id: wall.id });
  }, [selectElement, wall.id]);

  const handleDragEnd = useCallback(() => {
    updateWall(wall.id, { isSnapping: false });
  }, [updateWall, wall.id]);

  const { handlePointerDown, handlePointerMove, handlePointerUp } = useDragAndDrop({
    zoom,
    onStart: handleDragStart,
    onMove: handleDragMove,
    onEnd: handleDragEnd,
  });

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
        width: wall.width,
        height: wall.height,
        border: `2px solid ${wall.isSnapping ? '#3b82f6' : '#888'}`,
        backgroundColor: '#ffffff66',
        cursor: 'move',
        boxSizing: 'border-box',
        transition: 'border-color 0.1s ease',
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
