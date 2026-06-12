import React, { useCallback } from 'react';
import { useGalleryStore } from '@/store';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import type { LightSource } from '@/types';

interface LightSourceProps {
  light: LightSource;
  zoom: number;
}

export const LightSourceComponent: React.FC<LightSourceProps> = ({ light, zoom }) => {
  const { updateLight, selectElement } = useGalleryStore();

  const { handlePointerDown, handlePointerMove, handlePointerUp } = useDragAndDrop({
    zoom,
    onStart: () => {
      selectElement({ type: 'light', id: light.id });
    },
    onMove: (delta) => {
      updateLight(light.id, {
        x: light.x + delta.x,
        y: light.y + delta.y,
      });
    },
  });

  const isSelected =
    useGalleryStore(
      (s) => s.selectedElement?.type === 'light' && s.selectedElement?.id === light.id
    );

  const glowRadius = 60 + light.intensity * 1.2;

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: 'absolute',
        left: light.x - 6,
        top: light.y - 6,
        width: 12,
        height: 12,
        cursor: 'move',
        touchAction: 'none',
        zIndex: isSelected ? 10 : 3,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 6 - glowRadius,
          top: 6 - glowRadius,
          width: glowRadius * 2,
          height: glowRadius * 2,
          borderRadius: '50%',
          background: `radial-gradient(circle, #fff9c4 0%, transparent 70%)`,
          opacity: light.intensity / 100,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          backgroundColor: '#fbbf24',
          border: isSelected ? '2px solid #3b82f6' : '2px solid #f59e0b',
          boxShadow: isSelected
            ? '0 0 0 2px #3b82f6, 0 0 8px rgba(251,191,36,0.5)'
            : '0 0 6px rgba(251,191,36,0.4)',
          position: 'relative',
          zIndex: 1,
          transition: 'box-shadow 0.2s ease',
        }}
      />
    </div>
  );
};
