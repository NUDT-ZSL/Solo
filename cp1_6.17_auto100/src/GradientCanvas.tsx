import { useCallback, useRef, useEffect, useState } from 'react';
import type { ColorNode, GradientType } from './types';
import { buildGradientCSS } from './types';

interface GradientCanvasProps {
  colorNodes: ColorNode[];
  angle: number;
  gradientType: GradientType;
  onPositionChange: (id: string, position: number) => void;
}

export default function GradientCanvas({
  colorNodes,
  angle,
  gradientType,
  onPositionChange,
}: GradientCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCanvasSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const getPositionFromEvent = useCallback(
    (clientX: number, _clientY: number) => {
      const el = canvasRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      return Math.round((x / rect.width) * 100);
    },
    []
  );

  const handleMouseDown = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.preventDefault();
      draggingRef.current = id;
      const pos = getPositionFromEvent(e.clientX, e.clientY);
      onPositionChange(id, pos);
    },
    [getPositionFromEvent, onPositionChange]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const pos = getPositionFromEvent(e.clientX, e.clientY);
      onPositionChange(draggingRef.current, pos);
    };
    const handleMouseUp = () => {
      draggingRef.current = null;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [getPositionFromEvent, onPositionChange]);

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (!draggingRef.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      const pos = getPositionFromEvent(touch.clientX, touch.clientY);
      onPositionChange(draggingRef.current, pos);
    };
    const handleTouchEnd = () => {
      draggingRef.current = null;
    };
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [getPositionFromEvent, onPositionChange]);

  const gradientCSS = buildGradientCSS(colorNodes, angle, gradientType);

  return (
    <div
      ref={canvasRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: gradientCSS,
        borderRadius: 12,
        overflow: 'hidden',
        minHeight: 400,
      }}
    >
      {colorNodes.map((node) => {
        const left = canvasSize.width
          ? (node.position / 100) * canvasSize.width
          : '50%';
        return (
          <div
            key={node.id}
            onMouseDown={(e) => handleMouseDown(node.id, e)}
            onTouchStart={(e) => {
              draggingRef.current = node.id;
              const touch = e.touches[0];
              const pos = getPositionFromEvent(touch.clientX, touch.clientY);
              onPositionChange(node.id, pos);
            }}
            style={{
              position: 'absolute',
              top: '50%',
              left: typeof left === 'number' ? left - 20 : left,
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: node.color,
              border: '3px solid white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              cursor: 'grab',
              transform: 'translateY(-50%)',
              zIndex: 10,
              touchAction: 'none',
              userSelect: 'none',
            }}
          />
        );
      })}
    </div>
  );
}
