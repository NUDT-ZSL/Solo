import React from 'react';
import { useStore } from '@/store/useStore';

export const Tooltip: React.FC = () => {
  const hoveredElementId = useStore((state) => state.hoveredElementId);
  const tooltipPosition = useStore((state) => state.tooltipPosition);
  const layout = useStore((state) => state.layout);

  if (!hoveredElementId || !tooltipPosition || !layout) return null;

  const element = layout.elements.find((el) => el.id === hoveredElementId);
  if (!element || !element.artworkName) return null;

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: tooltipPosition.x,
        top: tooltipPosition.y,
        transform: 'translateX(-50%)',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        className="
          px-2.5 py-1.5 rounded
          bg-[rgba(0,0,0,0.7)] text-white
          text-xs whitespace-nowrap
          shadow-lg
        "
      >
        {element.artworkName}
      </div>
    </div>
  );
};
