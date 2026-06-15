import React, { useRef, useEffect, useCallback } from 'react';
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
  getCanvasCoordinates: (e: React.MouseEvent) => { x: number; y: number };
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
  getCanvasCoordinates,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  const roundRect = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      r: number
    ) => {
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
      element: LayoutElement,
      isSelected: boolean,
      isHovered: boolean,
      isPreview: boolean = false
    ) => {
      const { x, y, width: w, height: h, type, artworkColor, artworkName } = element;

      ctx.save();

      if (isPreview) {
        ctx.globalAlpha = 0.6;
      }

      if (type === 'wall') {
        const fillColor = '#e0e0e0';
        const strokeColor = '#bdbdbd';
        const borderRadius = 4;

        ctx.fillStyle = fillColor;
        ctx.strokeStyle = isSelected || isHovered ? '#6c63ff' : strokeColor;
        ctx.lineWidth = isSelected ? 3 : 1;

        roundRect(ctx, x, y, w, h, borderRadius);
        ctx.fill();
        ctx.stroke();
      } else {
        const fillColor = artworkColor || '#c8e6c9';
        const strokeColor = artworkColor ? artworkColor : '#a5d6a7';
        const borderRadius = 6;

        ctx.fillStyle = fillColor;
        ctx.strokeStyle = isSelected || isHovered ? '#6c63ff' : strokeColor;
        ctx.lineWidth = isSelected ? 3 : 1;

        roundRect(ctx, x, y, w, h, borderRadius);
        ctx.fill();
        ctx.stroke();

        if (artworkName && !isPreview) {
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          const textX = x + w / 2;
          const textY = y - 8;
          const textWidth = ctx.measureText(artworkName).width;
          const padding = 6;
          
          roundRect(
            ctx,
            textX - textWidth / 2 - padding,
            textY - 12,
            textWidth + padding * 2,
            16,
            4
          );
          ctx.fill();
          
          ctx.fillStyle = '#fff';
          ctx.fillText(artworkName, textX, textY);
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

    const startTime = performance.now();

    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, width, height);

    drawGrid(ctx);

    elements.forEach((element) => {
      drawElement(
        ctx,
        element,
        element.id === selectedElementId,
        element.id === hoveredElementId
      );
    });

    if (dragPreview) {
      drawElement(ctx, dragPreview, false, false, true);
    }

    const endTime = performance.now();
    const drawTime = endTime - startTime;
    if (drawTime > 16) {
      console.warn(`Canvas draw took ${drawTime.toFixed(2)}ms, target <16ms for 60fps`);
    }
  }, [width, height, elements, selectedElementId, hoveredElementId, dragPreview, drawGrid, drawElement]);

  useEffect(() => {
    const render = () => {
      draw();
      animationFrameRef.current = requestAnimationFrame(render);
    };
    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [draw]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (
        x >= el.x &&
        x <= el.x + el.width &&
        y >= el.y &&
        y <= el.y + el.height
      ) {
        onElementClick(el, e);
        return;
      }
    }

    onCanvasClick(e);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (
        x >= el.x &&
        x <= el.x + el.width &&
        y >= el.y &&
        y <= el.y + el.height
      ) {
        onElementMouseDown(el, e);
        return;
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    onMouseMove(e);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    let foundElement: LayoutElement | null = null;
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (
        x >= el.x &&
        x <= el.x + el.width &&
        y >= el.y &&
        y <= el.y + el.height
      ) {
        foundElement = el;
        break;
      }
    }

    if (foundElement && foundElement.artworkName) {
      onElementHover(foundElement.id, { x: e.clientX, y: e.clientY });
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
      style={{
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain',
      }}
    />
  );
};
