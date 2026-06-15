import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { LayoutElement } from '@/types';

interface FloorPlanProps {
  width: number;
  height: number;
  elements: LayoutElement[];
  selectedElementId: string | null;
  hoveredElementId: string | null;
  dragPreview: LayoutElement | null;
  onElementClick: (element: LayoutElement, e: React.MouseEvent) => void;
  onCanvasClick: (e: React.MouseEvent) => void;
  onElementMouseDown: (element: LayoutElement, e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onElementHover: (elementId: string | null, pos?: { x: number; y: number }) => void;
}

export const FloorPlan: React.FC<FloorPlanProps> = ({
  width,
  height,
  elements,
  selectedElementId,
  hoveredElementId,
  dragPreview,
  onElementClick,
  onCanvasClick,
  onElementMouseDown,
  onMouseMove,
  onMouseUp,
  onElementHover,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafIdRef = useRef<number>(0);
  const pendingDrawRef = useRef(false);

  const roundRect = useCallback(
    (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    },
    []
  );

  const drawGrid = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    },
    [width, height]
  );

  const drawElement = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      el: LayoutElement,
      isSelected: boolean,
      isHovered: boolean,
      isPreview: boolean = false
    ) => {
      ctx.save();
      if (isPreview) ctx.globalAlpha = 0.6;

      if (el.type === 'wall') {
        ctx.fillStyle = '#e0e0e0';
        ctx.strokeStyle = isSelected || isHovered ? '#6c63ff' : '#bdbdbd';
        ctx.lineWidth = isSelected ? 3 : 1;
        roundRect(ctx, el.x, el.y, el.width, el.height, 4);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillStyle = el.artworkColor || '#c8e6c9';
        ctx.strokeStyle = isSelected || isHovered ? '#6c63ff' : (el.artworkColor || '#a5d6a7');
        ctx.lineWidth = isSelected ? 3 : 1;
        roundRect(ctx, el.x, el.y, el.width, el.height, 6);
        ctx.fill();
        ctx.stroke();

        if (el.artworkName && !isPreview) {
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          const textX = el.x + el.width / 2;
          const textY = el.y - 8;
          const tw = ctx.measureText(el.artworkName).width;
          const pad = 6;
          roundRect(ctx, textX - tw / 2 - pad, textY - 12, tw + pad * 2, 16, 4);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.fillText(el.artworkName, textX, textY);
        }
      }
      ctx.restore();
    },
    [roundRect]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, width, height);
    drawGrid(ctx);

    for (const element of elements) {
      drawElement(
        ctx,
        element,
        element.id === selectedElementId,
        element.id === hoveredElementId
      );
    }

    if (dragPreview) {
      drawElement(ctx, dragPreview, false, false, true);
    }
  }, [width, height, elements, selectedElementId, hoveredElementId, dragPreview, drawGrid, drawElement]);

  const scheduleDraw = useCallback(() => {
    if (pendingDrawRef.current) return;
    pendingDrawRef.current = true;
    rafIdRef.current = requestAnimationFrame(() => {
      pendingDrawRef.current = false;
      draw();
    });
  }, [draw]);

  useEffect(() => {
    scheduleDraw();
  }, [scheduleDraw]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  const getCanvasCoords = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (width / rect.width),
        y: (e.clientY - rect.top) * (height / rect.height),
      };
    },
    [width, height]
  );

  const hitTest = useCallback(
    (cx: number, cy: number): LayoutElement | null => {
      for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        if (cx >= el.x && cx <= el.x + el.width && cy >= el.y && cy <= el.y + el.height) {
          return el;
        }
      }
      return null;
    },
    [elements]
  );

  const handleCanvasClick = (e: React.MouseEvent) => {
    const { x, y } = getCanvasCoords(e);
    const hit = hitTest(x, y);
    if (hit) {
      onElementClick(hit, e);
    } else {
      onCanvasClick(e);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getCanvasCoords(e);
    const hit = hitTest(x, y);
    if (hit) {
      onElementMouseDown(hit, e);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    onMouseMove(e);
    const { x, y } = getCanvasCoords(e);
    const hit = hitTest(x, y);
    if (hit && hit.artworkName) {
      onElementHover(hit.id, { x: e.clientX, y: e.clientY });
    } else {
      onElementHover(null);
    }
  };

  const handleMouseLeave = () => {
    onElementHover(null);
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onClick={handleCanvasClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={handleMouseLeave}
      className="w-full h-full cursor-crosshair"
      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
    />
  );
};
