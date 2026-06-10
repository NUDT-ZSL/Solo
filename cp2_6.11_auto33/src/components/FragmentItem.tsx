import React, { useEffect, useRef, useState } from 'react';
import type { Fragment, StyleType } from '@/types';
import { pointsToClipPath, renderFragmentToCanvas } from '@/utils/collageEngine';

interface FragmentItemProps {
  fragment: Fragment;
  sourceImage: HTMLImageElement;
  style: StyleType;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onDragStart: (e: React.MouseEvent, id: string) => void;
  styleTransitioning: boolean;
}

export const FragmentItem: React.FC<FragmentItemProps> = ({
  fragment,
  sourceImage,
  style,
  isSelected,
  onSelect,
  onDragStart,
  styleTransitioning,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const maxX = Math.max(...fragment.points.map((p) => p.x));
  const maxY = Math.max(...fragment.points.map((p) => p.y));
  const clipPath = `polygon(${pointsToClipPath(fragment.points)})`;
  const width = maxX * fragment.scale;
  const height = maxY * fragment.scale;

  useEffect(() => {
    if (fragment.colliding) {
      setShakeKey((k) => k + 1);
    }
  }, [fragment.colliding]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = Math.ceil(maxX);
    canvas.height = Math.ceil(maxY);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const renderFrag: Fragment = {
      ...fragment,
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
    };
    renderFragmentToCanvas(ctx, renderFrag, sourceImage, style);
  }, [fragment, sourceImage, style, maxX, maxY]);

  return (
    <div
      key={shakeKey}
      className={`absolute cursor-move select-none transition-opacity duration-300 ${
        fragment.colliding ? 'collision-shake' : ''
      } ${styleTransitioning ? 'style-fade-out' : 'style-fade-in'}`}
      style={{
        left: fragment.x,
        top: fragment.y,
        width,
        height,
        zIndex: fragment.zIndex + 10,
        transform: `rotate(${fragment.rotation}deg)`,
        transformOrigin: 'center center',
        filter: fragment.colliding
          ? 'drop-shadow(0 0 6px #EF4444) drop-shadow(0 0 3px #EF4444)'
          : 'drop-shadow(2px 4px 8px rgba(0,0,0,0.2))',
      }}
      onMouseDown={(e) => onDragStart(e, fragment.id)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(e);
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          clipPath,
          display: 'block',
        }}
      />
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            clipPath,
            border: 'none',
            outline: '2px dashed #C5A55A',
            outlineOffset: '2px',
            pointerEvents: 'none',
            boxSizing: 'border-box',
          }}
        />
      )}
      {fragment.textOverlay && fragment.textOverlay.content && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            fontFamily:
              fragment.textOverlay.fontFamily === 'serif'
                ? "'Playfair Display', 'Noto Serif SC', serif"
                : "'Inter', sans-serif",
            fontSize: fragment.textOverlay.fontSize * fragment.scale,
            color: 'rgba(74, 63, 53, 0.9)',
            fontWeight: 600,
            textAlign: 'center',
            whiteSpace: 'pre-line',
            lineHeight: 1.2,
            padding: '8px',
            textShadow: '0 1px 2px rgba(255,255,255,0.8)',
          }}
        >
          {fragment.textOverlay.content}
        </div>
      )}
    </div>
  );
};
