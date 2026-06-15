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

  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const draggingElementRef = useRef<LayoutElement | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [draggingElement, setDraggingElement] = useState<LayoutElement | null>(null);
  const [, forceRender] = useState(0);

  const getCanvasCoordinates = useCallback(
    (clientX: number, clientY: number) => {
      if (!canvasContainerRef.current || !layout) return { x: 0, y: 0 };
      
      const rect = canvasContainerRef.current.getBoundingClientRect();
      const canvasElement = canvasContainerRef.current.querySelector('canvas');
      if (!canvasElement) return { x: 0, y: 0 };

      const canvasRect = canvasElement.getBoundingClientRect();
      const scaleX = layout.width / canvasRect.width;
      const scaleY = layout.height / canvasRect.height;
      
      return {
        x: (clientX - canvasRect.left) * scaleX,
        y: (clientY - canvasRect.top) * scaleY,
      };
    },
    [layout]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (draggingElementRef.current) return;

      if (selectedTool === 'select') {
        setSelectedElementId(null);
        return;
      }

      if (selectedTool === 'wall' || selectedTool === 'stand') {
        const coords = getCanvasCoordinates(e.clientX, e.clientY);
        const isWall = selectedTool === 'wall';
        const defaultWidth = isWall ? 100 : 30;
        const defaultHeight = isWall ? 10 : 30;
        const newElement = createNewElement(
          selectedTool,
          Math.max(0, Math.min(coords.x - defaultWidth / 2, (layout?.width || 600) - defaultWidth)),
          Math.max(0, Math.min(coords.y - defaultHeight / 2, (layout?.height || 400) - defaultHeight))
        );
        addElement(newElement);
        saveLayout();
      }
    },
    [selectedTool, getCanvasCoordinates, addElement, saveLayout, setSelectedElementId, layout]
  );

  const handleElementClick = useCallback(
    (element: LayoutElement, e: React.MouseEvent) => {
      e.stopPropagation();

      if (draggingElementRef.current) return;

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
      const coords = getCanvasCoordinates(e.clientX, e.clientY);
      
      draggingElementRef.current = element;
      dragOffsetRef.current = {
        x: coords.x - element.x,
        y: coords.y - element.y,
      };
      setDraggingElement(element);
      setIsDragging(true);
    },
    [selectedTool, getCanvasCoordinates, setIsDragging]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (draggingElementRef.current && selectedTool === 'select') {
        const coords = getCanvasCoordinates(e.clientX, e.clientY);
        const el = draggingElementRef.current;
        const newX = Math.max(0, Math.min(coords.x - dragOffsetRef.current.x, (layout?.width || 600) - el.width));
        const newY = Math.max(0, Math.min(coords.y - dragOffsetRef.current.y, (layout?.height || 400) - el.height));

        const updatedElement = {
          ...el,
          x: newX,
          y: newY,
        };

        draggingElementRef.current = updatedElement;
        updateElement(updatedElement);
        setDraggingElement(updatedElement);
      }

      if (selectedTool === 'wall' || selectedTool === 'stand') {
        const coords = getCanvasCoordinates(e.clientX, e.clientY);
        const isWall = selectedTool === 'wall';
        const defaultWidth = isWall ? 100 : 30;
        const defaultHeight = isWall ? 10 : 30;
        const preview = createNewElement(
          selectedTool,
          Math.max(0, Math.min(coords.x - defaultWidth / 2, (layout?.width || 600) - defaultWidth)),
          Math.max(0, Math.min(coords.y - defaultHeight / 2, (layout?.height || 400) - defaultHeight))
        );
        setDragPreview(preview);
      }
    },
    [selectedTool, getCanvasCoordinates, updateElement, setDragPreview, layout]
  );

  const handleMouseUp = useCallback(() => {
    if (draggingElementRef.current) {
      saveLayout();
    }
    draggingElementRef.current = null;
    setDraggingElement(null);
    setIsDragging(false);
    setDragPreview(null);
  }, [saveLayout, setIsDragging, setDragPreview]);

  const handleMouseLeave = useCallback(() => {
    if (draggingElementRef.current) {
      saveLayout();
    }
    draggingElementRef.current = null;
    setDraggingElement(null);
    setIsDragging(false);
  }, [saveLayout, setIsDragging]);

  const handleElementHover = useCallback(
    (elementId: string | null, pos?: { x: number; y: number }) => {
      setHoveredElementId(elementId);
      if (pos && elementId) {
        setTooltipPosition({ x: pos.x, y: pos.y - 40 });
      } else {
        setTooltipPosition(null);
      }
    },
    [setHoveredElementId, setTooltipPosition]
  );

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: DRAG_TYPES.ARTWORK,
    drop: async (item: { artwork: Artwork }, monitor) => {
      const offset = monitor.getClientOffset();
      if (!offset || !layout) return { dropped: false };

      const canvasElement = canvasContainerRef.current?.querySelector('canvas');
      if (!canvasElement) return { dropped: false };

      const canvasRect = canvasElement.getBoundingClientRect();
      const scaleX = layout.width / canvasRect.width;
      const scaleY = layout.height / canvasRect.height;
      const x = (offset.x - canvasRect.left) * scaleX;
      const y = (offset.y - canvasRect.top) * scaleY;

      for (let i = layout.elements.length - 1; i >= 0; i--) {
        const el = layout.elements[i];
        if (
          el.type === 'stand' &&
          x >= el.x &&
          x <= el.x + el.width &&
          y >= el.y &&
          y <= el.y + el.height
        ) {
          let computedColor = item.artwork.averageColor;
          try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = () => reject(new Error('Image load failed'));
              img.src = item.artwork.thumbnailUrl;
            });
            if (img.complete && img.naturalWidth > 0) {
              const rgbColor = getAverageColor(img);
              if (rgbColor.startsWith('rgb(')) {
                computedColor = rgbToHex(rgbColor);
              } else {
                computedColor = rgbColor;
              }
            }
          } catch (err) {
            console.warn('Failed to compute average color, using server value:', err);
          }
          const artworkWithColor: Artwork = {
            ...item.artwork,
            averageColor: computedColor,
          };
          assignArtworkToStand(el.id, artworkWithColor);
          saveLayout();
          return { dropped: true };
        }
      }
      return { dropped: false };
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [layout, assignArtworkToStand, saveLayout]);

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      canvasContainerRef.current = node;
      drop(node);
    },
    [drop]
  );

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (draggingElementRef.current) {
        saveLayout();
        draggingElementRef.current = null;
        setDraggingElement(null);
        setIsDragging(false);
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [saveLayout, setIsDragging]);

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
            getCanvasCoordinates={(e) => getCanvasCoordinates(e.clientX, e.clientY)}
          />
        </div>
        
        {isOver && canDrop && (
          <div className="absolute inset-0 border-2 border-dashed border-[#6c63ff] pointer-events-none rounded-lg m-4 animate-pulse" />
        )}
      </div>
    </div>
  );
};
