import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import { FloorPlan } from './FloorPlan';
import { Toolbar } from './Toolbar';
import { useStore, createNewElement } from '@/store/useStore';
import { DRAG_TYPES } from '@/types';
import type { LayoutElement, Artwork } from '@/types';
import { getAverageColor, rgbToHex } from '@/utils/colorUtils';

export const LayoutEditor: React.FC = () => {
  const layout = useStore((state) => state.layout);
  const selectedTool = useStore((state) => state.selectedTool);
  const selectedElementId = useStore((state) => state.selectedElementId);
  const hoveredElementId = useStore((state) => state.hoveredElementId);
  const dragPreview = useStore((state) => state.dragPreview);
  const setSelectedElementId = useStore((state) => state.setSelectedElementId);
  const addElement = useStore((state) => state.addElement);
  const updateElement = useStore((state) => state.updateElement);
  const removeElement = useStore((state) => state.removeElement);
  const saveLayout = useStore((state) => state.saveLayout);
  const setIsDragging = useStore((state) => state.setIsDragging);
  const setDragPreview = useStore((state) => state.setDragPreview);
  const setHoveredElementId = useStore((state) => state.setHoveredElementId);
  const setTooltipPosition = useStore((state) => state.setTooltipPosition);
  const assignArtworkToStand = useStore((state) => state.assignArtworkToStand);
  const isMobile = useStore((state) => state.isMobile);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef<LayoutElement | null>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const rafPendingRef = useRef(false);
  const rafIdRef = useRef<number>(0);
  const lastMouseRef = useRef<{ cx: number; cy: number } | null>(null);

  const getCanvasCoords = useCallback(
    (cx: number, cy: number) => {
      const canvas = containerRef.current?.querySelector('canvas');
      if (!canvas || !layout) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: (cx - rect.left) * (layout.width / rect.width),
        y: (cy - rect.top) * (layout.height / rect.height),
      };
    },
    [layout]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (draggingRef.current) return;
      if (selectedTool === 'select') {
        setSelectedElementId(null);
        return;
      }
      if (selectedTool === 'wall' || selectedTool === 'stand') {
        const coords = getCanvasCoords(e.clientX, e.clientY);
        const isWall = selectedTool === 'wall';
        const dw = isWall ? 100 : 30;
        const dh = isWall ? 10 : 30;
        const nx = Math.max(0, Math.min(coords.x - dw / 2, (layout?.width || 600) - dw));
        const ny = Math.max(0, Math.min(coords.y - dh / 2, (layout?.height || 400) - dh));
        addElement(createNewElement(selectedTool, nx, ny));
        saveLayout();
      }
    },
    [selectedTool, getCanvasCoords, addElement, saveLayout, setSelectedElementId, layout]
  );

  const handleElementClick = useCallback(
    (element: LayoutElement, e: React.MouseEvent) => {
      e.stopPropagation();
      if (draggingRef.current) return;
      if (selectedTool === 'delete') {
        removeElement(element.id);
        saveLayout();
        return;
      }
      if (selectedTool === 'select') {
        setSelectedElementId(element.id);
      }
    },
    [selectedTool, removeElement, saveLayout, setSelectedElementId]
  );

  const handleElementMouseDown = useCallback(
    (element: LayoutElement, e: React.MouseEvent) => {
      if (selectedTool !== 'select') return;
      e.preventDefault();
      const coords = getCanvasCoords(e.clientX, e.clientY);
      draggingRef.current = element;
      offsetRef.current = { x: coords.x - element.x, y: coords.y - element.y };
      setIsDragging(true);
    },
    [selectedTool, getCanvasCoords, setIsDragging]
  );

  const flushDragToStore = useCallback(() => {
    if (!draggingRef.current) return;
    updateElement(draggingRef.current);
  }, [updateElement]);

  const scheduleDragUpdate = useCallback(() => {
    if (rafPendingRef.current) return;
    rafPendingRef.current = true;
    rafIdRef.current = requestAnimationFrame(() => {
      rafPendingRef.current = false;
      flushDragToStore();
    });
  }, [flushDragToStore]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (draggingRef.current && selectedTool === 'select') {
        lastMouseRef.current = { cx: e.clientX, cy: e.clientY };
        const coords = getCanvasCoords(e.clientX, e.clientY);
        const el = draggingRef.current;
        const maxX = (layout?.width || 600) - el.width;
        const maxY = (layout?.height || 400) - el.height;
        const nx = Math.max(0, Math.min(coords.x - offsetRef.current.x, maxX));
        const ny = Math.max(0, Math.min(coords.y - offsetRef.current.y, maxY));
        draggingRef.current = { ...el, x: nx, y: ny };
        scheduleDragUpdate();
      }

      if (selectedTool === 'wall' || selectedTool === 'stand') {
        const coords = getCanvasCoords(e.clientX, e.clientY);
        const isWall = selectedTool === 'wall';
        const dw = isWall ? 100 : 30;
        const dh = isWall ? 10 : 30;
        const nx = Math.max(0, Math.min(coords.x - dw / 2, (layout?.width || 600) - dw));
        const ny = Math.max(0, Math.min(coords.y - dh / 2, (layout?.height || 400) - dh));
        setDragPreview(createNewElement(selectedTool, nx, ny));
      }
    },
    [selectedTool, getCanvasCoords, scheduleDragUpdate, setDragPreview, layout]
  );

  const handleMouseUp = useCallback(() => {
    if (draggingRef.current) {
      if (rafPendingRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafPendingRef.current = false;
      }
      flushDragToStore();
      saveLayout();
    }
    draggingRef.current = null;
    setIsDragging(false);
    setDragPreview(null);
  }, [flushDragToStore, saveLayout, setIsDragging, setDragPreview]);

  const handleMouseLeave = useCallback(() => {
    if (draggingRef.current) {
      if (rafPendingRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafPendingRef.current = false;
      }
      flushDragToStore();
      saveLayout();
    }
    draggingRef.current = null;
    setIsDragging(false);
  }, [flushDragToStore, saveLayout, setIsDragging]);

  const handleElementHover = useCallback(
    (elementId: string | null, pos?: { x: number; y: number }) => {
      setHoveredElementId(elementId);
      setTooltipPosition(pos && elementId ? { x: pos.x, y: pos.y - 40 } : null);
    },
    [setHoveredElementId, setTooltipPosition]
  );

  const computeArtworkColor = useCallback(async (artwork: Artwork): Promise<string> => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = artwork.thumbnailUrl;
      });
      if (img.complete && img.naturalWidth > 0) {
        const rgbColor = getAverageColor(img);
        return rgbColor.startsWith('rgb(') ? rgbToHex(rgbColor) : rgbColor;
      }
    } catch (err) {
      console.warn('Failed to compute average color, using server value:', err);
    }
    return artwork.averageColor;
  }, []);

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: DRAG_TYPES.ARTWORK,
    drop: (item: { artwork: Artwork }, monitor) => {
      const offset = monitor.getClientOffset();
      if (!offset || !layout) return { dropped: false };

      const canvas = containerRef.current?.querySelector('canvas');
      if (!canvas) return { dropped: false };

      const rect = canvas.getBoundingClientRect();
      const sx = layout.width / rect.width;
      const sy = layout.height / rect.height;
      const x = (offset.x - rect.left) * sx;
      const y = (offset.y - rect.top) * sy;

      for (let i = layout.elements.length - 1; i >= 0; i--) {
        const el = layout.elements[i];
        if (
          el.type === 'stand' &&
          x >= el.x && x <= el.x + el.width &&
          y >= el.y && y <= el.y + el.height
        ) {
          assignArtworkToStand(el.id, item.artwork);
          computeArtworkColor(item.artwork).then((computedColor) => {
            assignArtworkToStand(el.id, { ...item.artwork, averageColor: computedColor });
            saveLayout();
          });
          return { dropped: true };
        }
      }
      return { dropped: false };
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [layout, assignArtworkToStand, saveLayout, computeArtworkColor]);

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      drop(node);
    },
    [drop]
  );

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (draggingRef.current) {
        if (rafPendingRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafPendingRef.current = false;
        }
        flushDragToStore();
        saveLayout();
        draggingRef.current = null;
        setIsDragging(false);
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [flushDragToStore, saveLayout, setIsDragging]);

  if (!layout) {
    return (
      <div className="flex items-center justify-center h-full bg-[#2a2a3e]">
        <div className="text-[#e0e0ff] text-lg animate-pulse">加载中...</div>
      </div>
    );
  }

  return (
    <div className={`flex ${isMobile ? 'flex-col-reverse' : 'flex-row'} h-full bg-[#2a2a3e]`}>
      <Toolbar />

      <div
        ref={setRefs}
        className="flex-1 flex items-center justify-center p-4 overflow-hidden relative"
        style={{
          backgroundColor: isOver && canDrop ? 'rgba(108, 99, 255, 0.1)' : undefined,
          transition: 'background-color 0.3s ease-out',
          cursor: selectedTool === 'select' ? 'default' : 'crosshair',
          userSelect: 'none',
        }}
        onMouseLeave={handleMouseLeave}
      >
        <div className="w-full h-full max-w-full max-h-full flex items-center justify-center">
          <FloorPlan
            width={layout.width}
            height={layout.height}
            elements={layout.elements}
            selectedElementId={selectedElementId}
            hoveredElementId={hoveredElementId}
            dragPreview={dragPreview}
            onElementClick={handleElementClick}
            onCanvasClick={handleCanvasClick}
            onElementMouseDown={handleElementMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onElementHover={handleElementHover}
          />
        </div>

        {isOver && canDrop && (
          <div className="absolute inset-0 border-2 border-dashed border-[#6c63ff] pointer-events-none rounded-lg m-4 animate-pulse" />
        )}
      </div>
    </div>
  );
};
