import { useCallback, useRef, useEffect, useState } from 'react';
import type { ColorNode, GradientType } from './types';
import { buildGradientCSS } from './types';

interface GradientCanvasProps {
  colorNodes: ColorNode[];
  angle: number;
  gradientType: GradientType;
  onPositionChange: (id: string, x: number, y: number) => void;
}

const NODE_RADIUS = 20;

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
    (clientX: number, clientY: number): { x: number; y: number } => {
      const el = canvasRef.current;
      if (!el) return { x: 50, y: 50 };
      const rect = el.getBoundingClientRect();
      const xPx = Math.max(NODE_RADIUS, Math.min(clientX - rect.left, rect.width - NODE_RADIUS));
      const yPx = Math.max(NODE_RADIUS, Math.min(clientY - rect.top, rect.height - NODE_RADIUS));
      const x = Math.round((xPx / rect.width) * 100);
      const y = Math.round((yPx / rect.height) * 100);
      return { x, y };
    },
    []
  );

  const handleMouseDown = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.preventDefault();
      draggingRef.current = id;
      const { x, y } = getPositionFromEvent(e.clientX, e.clientY);
      onPositionChange(id, x, y);
    },
    [getPositionFromEvent, onPositionChange]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const { x, y } = getPositionFromEvent(e.clientX, e.clientY);
      onPositionChange(draggingRef.current, x, y);
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
      const { x, y } = getPositionFromEvent(touch.clientX, touch.clientY);
      onPositionChange(draggingRef.current, x, y);
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
          ? (node.x / 100) * canvasSize.width - NODE_RADIUS
          : '50%';
        const top = canvasSize.height
          ? (node.y / 100) * canvasSize.height - NODE_RADIUS
          : '50%';
        return (
          <div
            key={node.id}
            onMouseDown={(e) => handleMouseDown(node.id, e)}
            onTouchStart={(e) => {
              draggingRef.current = node.id;
              const touch = e.touches[0];
              const { x, y } = getPositionFromEvent(touch.clientX, touch.clientY);
              onPositionChange(node.id, x, y);
            }}
            style={{
              position: 'absolute',
              left,
              top,
              width: NODE_RADIUS * 2,
              height: NODE_RADIUS * 2,
              borderRadius: '50%',
              background: node.color,
              border: '3px solid white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              cursor: 'grab',
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
