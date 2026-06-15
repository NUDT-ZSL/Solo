import React, { useCallback, useRef, useEffect } from 'react';
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
  const wallRef = useRef<HTMLDivElement>(null);
  const currentWallRef = useRef(wall);

  useEffect(() => {
    currentWallRef.current = wall;
  }, [wall]);

  const handleDragStart = useCallback(() => {
    useGalleryStore.getState().selectElement({ type: 'wall', id: wall.id });
  }, [wall.id]);

  const handleDragMove = useCallback(
    (delta: { x: number; y: number }) => {
      const current = currentWallRef.current;
      const newX = current.x + delta.x;
      const newY = current.y + delta.y;
      const allWalls = useGalleryStore.getState().walls;

      const result = snapToWalls(newX, newY, current.width, current.height, allWalls, current.id);

      useGalleryStore.getState().updateWall(current.id, {
        x: result.x,
        y: result.y,
        isSnapping: result.snapped,
      });
    },
    []
  );

  const handleDragEnd = useCallback(() => {
    useGalleryStore.getState().updateWall(wall.id, { isSnapping: false });
  }, [wall.id]);

  const { handlePointerDown, handlePointerMove, handlePointerUp } = useDragAndDrop({
    zoom,
    onStart: handleDragStart,
    onMove: handleDragMove,
    onEnd: handleDragEnd,
  });

  const isSelected =
    useGalleryStore(
      (s) => s.selectedElement?.type === 'wall' && s.selectedElement?.id === wall.id
    );

  const handleRotate = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      useGalleryStore.getState().rotateWall(wall.id);
    },
    [wall.id]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      useGalleryStore.getState().removeWall(wall.id);
    },
    [wall.id]
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
        transition: 'border-color 0.08s ease',
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
