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

  const glowRadius = 40 + light.intensity * 1.5;
  const glowOpacity = 0.3 + (light.intensity / 100) * 0.5;

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: 'absolute',
        left: light.x - glowRadius,
        top: light.y - glowRadius,
        width: glowRadius * 2,
        height: glowRadius * 2,
        cursor: 'move',
        touchAction: 'none',
        zIndex: isSelected ? 10 : 3,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(255,249,196,${glowOpacity}) 0%, rgba(255,249,196,0) 70%)`,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 12,
          height: 12,
          borderRadius: '50%',
          backgroundColor: '#fbbf24',
          border: isSelected ? '2px solid #3b82f6' : '2px solid #f59e0b',
          boxShadow: isSelected
            ? '0 0 0 2px #3b82f6, 0 0 10px rgba(251,191,36,0.6)'
            : '0 0 8px rgba(251,191,36,0.5)',
          transition: 'box-shadow 0.2s ease',
        }}
      />
    </div>
  );
};
