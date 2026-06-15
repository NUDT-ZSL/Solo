import React, { useCallback, useRef, useState } from 'react';
import { useDrop } from 'react-dnd';
import { FloorPlan } from './FloorPlan';
import { Toolbar } from './Toolbar';
import { useStore, createNewElement } from '@/store/useStore';
import { DRAG_TYPES } from '@/types';
import type { LayoutElement, Artwork } from '@/types';

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

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [draggingElement, setDraggingElement] = useState<LayoutElement | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const getCanvasCoordinates = useCallback(
    (e: React.MouseEvent) => {
      if (!canvasContainerRef.current || !layout) return { x: 0, y: 0 };
      
      const rect = canvasContainerRef.current.getBoundingClientRect();
      const scaleX = layout.width / rect.width;
      const scaleY = layout.height / rect.height;
      
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    [layout]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (selectedTool === 'select') {
        setSelectedElementId(null);
        return;
      }

      if (selectedTool === 'wall' || selectedTool === 'stand') {
        const coords = getCanvasCoordinates(e);
        const newElement = createNewElement(selectedTool, coords.x - 15, coords.y - 15);
        addElement(newElement);
        saveLayout();
      }
    },
    [selectedTool, getCanvasCoordinates, addElement, saveLayout, setSelectedElementId]
  );

  const handleElementClick = useCallback(
    (element: LayoutElement, e: React.MouseEvent) => {
      e.stopPropagation();

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

      const coords = getCanvasCoordinates(e);
      setDraggingElement(element);
      setDragOffset({
        x: coords.x - element.x,
        y: coords.y - element.y,
      });
      setIsDragging(true);
    },
    [selectedTool, getCanvasCoordinates, setIsDragging]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (draggingElement && selectedTool === 'select') {
        const coords = getCanvasCoordinates(e);
        const newX = Math.max(0, Math.min(coords.x - dragOffset.x, (layout?.width || 600) - draggingElement.width));
        const newY = Math.max(0, Math.min(coords.y - dragOffset.y, (layout?.height || 400) - draggingElement.height));

        const updatedElement = {
          ...draggingElement,
          x: newX,
          y: newY,
        };

        updateElement(updatedElement);
        setDraggingElement(updatedElement);
      }

      if (selectedTool === 'wall' || selectedTool === 'stand') {
        const coords = getCanvasCoordinates(e);
        const preview = createNewElement(selectedTool, coords.x - 15, coords.y - 15);
        setDragPreview(preview);
      }
    },
    [draggingElement, selectedTool, dragOffset, getCanvasCoordinates, updateElement, setDragPreview, layout]
  );

  const handleMouseUp = useCallback(() => {
    if (draggingElement) {
      saveLayout();
    }
    setDraggingElement(null);
    setIsDragging(false);
    setDragPreview(null);
  }, [draggingElement, saveLayout, setIsDragging, setDragPreview]);

  const handleElementHover = useCallback(
    (elementId: string | null, pos?: { x: number; y: number }) => {
      setHoveredElementId(elementId);
      if (pos) {
        setTooltipPosition({ x: pos.x, y: pos.y - 40 });
      } else {
        setTooltipPosition(null);
      }
    },
    [setHoveredElementId, setTooltipPosition]
  );

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: DRAG_TYPES.ARTWORK,
    drop: (item: { artwork: Artwork }, monitor) => {
      const offset = monitor.getClientOffset();
      if (!offset || !canvasContainerRef.current || !layout) return;

      const rect = canvasContainerRef.current.getBoundingClientRect();
      const scaleX = layout.width / rect.width;
      const scaleY = layout.height / rect.height;
      const x = (offset.x - rect.left) * scaleX;
      const y = (offset.y - rect.top) * scaleY;

      for (let i = layout.elements.length - 1; i >= 0; i--) {
        const el = layout.elements[i];
        if (
          el.type === 'stand' &&
          x >= el.x &&
          x <= el.x + el.width &&
          y >= el.y &&
          y <= el.y + el.height
        ) {
          assignArtworkToStand(el.id, item.artwork);
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

  if (!layout) {
    return (
      <div className="flex items-center justify-center h-full bg-[#2a2a3e]">
        <div className="text-[#e0e0ff] text-lg">加载中...</div>
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
        }}
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
            getCanvasCoordinates={getCanvasCoordinates}
          />
        </div>
        
        {isOver && canDrop && (
          <div className="absolute inset-0 border-2 border-dashed border-[#6c63ff] pointer-events-none rounded-lg m-4" />
        )}
      </div>
    </div>
  );
};
