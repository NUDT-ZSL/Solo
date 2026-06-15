import React, { useState, useRef, useCallback, useMemo, useEffect, memo } from 'react';
import { Shape, DragState } from '../types';
import ShapeElement from './ShapeElement';
import { getGradientId, getShadowId } from '../utils/shapeUtils';
import { rafThrottle, snapAngle, clamp } from '../utils/performanceUtils';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const HANDLE_SIZE = 8;
const ROTATE_HANDLE_OFFSET = 24;

interface EditorCanvasProps {
  shapes: Shape[];
  selectedId: string | null;
  onSelectShape: (id: string | null) => void;
  onUpdateShape: (id: string, updates: Partial<Shape>) => void;
  onSetShapes: (shapes: Shape[]) => void;
}

type ResizeHandle = 'tl' | 'tr' | 'bl' | 'br';

const EditorCanvas: React.FC<EditorCanvasProps> = memo(function EditorCanvas({
  shapes,
  selectedId,
  onSelectShape,
  onUpdateShape,
  onSetShapes,
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragState = useRef<DragState>({
    mode: null,
    startX: 0,
    startY: 0,
    startShape: null,
    startAngle: 0,
    startMouseAngle: 0,
    offsetX: 0,
    offsetY: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [shiftPressed, setShiftPressed] = useState(false);

  const selectedShape = useMemo(() => {
    return shapes.find(s => s.id === selectedId) || null;
  }, [shapes, selectedId]);

  const sortedShapes = useMemo(() => {
    return [...shapes].sort((a, b) => a.zIndex - b.zIndex);
  }, [shapes]);

  const defsContent = useMemo(() => {
    return shapes.map(shape => {
      const elements: React.ReactNode[] = [];
      
      if (shape.shadow.blur > 0 || shape.shadow.offsetX !== 0 || shape.shadow.offsetY !== 0) {
        const shadowId = getShadowId(shape.id);
        elements.push(
          <filter
            key={`shadow-${shape.id}`}
            id={shadowId}
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feDropShadow
              dx={shape.shadow.offsetX}
              dy={shape.shadow.offsetY}
              stdDeviation={shape.shadow.blur}
              floodColor={shape.shadow.color}
              floodOpacity={shape.shadow.opacity}
            />
          </filter>
        );
      }
      
      if (shape.useGradient) {
        const gradientId = getGradientId(shape.id);
        const sortedStops = [...shape.gradient.stops].sort((a, b) => a.offset - b.offset);
        
        if (shape.gradient.type === 'linear') {
          const angleRad = (shape.gradient.angle * Math.PI) / 180;
          const x1 = 50 - 50 * Math.cos(angleRad);
          const y1 = 50 - 50 * Math.sin(angleRad);
          const x2 = 50 + 50 * Math.cos(angleRad);
          const y2 = 50 + 50 * Math.sin(angleRad);
          
          elements.push(
            <linearGradient
              key={`grad-${shape.id}`}
              id={gradientId}
              x1={`${x1}%`}
              y1={`${y1}%`}
              x2={`${x2}%`}
              y2={`${y2}%`}
            >
              {sortedStops.map(stop => (
                <stop
                  key={stop.id}
                  offset={`${stop.offset * 100}%`}
                  stopColor={stop.color}
                />
              ))}
            </linearGradient>
          );
        } else {
          elements.push(
            <radialGradient
              key={`grad-${shape.id}`}
              id={gradientId}
              cx="50%"
              cy="50%"
              r="50%"
            >
              {sortedStops.map(stop => (
                <stop
                  key={stop.id}
                  offset={`${stop.offset * 100}%`}
                  stopColor={stop.color}
                />
              ))}
            </radialGradient>
          );
        }
      }
      
      return elements;
    });
  }, [shapes]);

  const getSVGPoint = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  const handleShapeMouseDown = useCallback((e: React.MouseEvent, shapeId: string) => {
    e.stopPropagation();
    const shape = shapes.find(s => s.id === shapeId);
    if (!shape || shape.locked) return;

    const point = getSVGPoint(e.clientX, e.clientY);
    onSelectShape(shapeId);
    
    dragState.current = {
      mode: 'move',
      startX: point.x,
      startY: point.y,
      startShape: { ...shape },
      startAngle: shape.rotation,
      startMouseAngle: 0,
      offsetX: point.x - shape.x,
      offsetY: point.y - shape.y,
    };
    
    setIsDragging(true);
    document.body.classList.add('dragging');
  }, [shapes, onSelectShape, getSVGPoint]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, handle: ResizeHandle) => {
    e.stopPropagation();
    if (!selectedShape || selectedShape.locked) return;

    const point = getSVGPoint(e.clientX, e.clientY);
    
    dragState.current = {
      mode: 'resize',
      handle,
      startX: point.x,
      startY: point.y,
      startShape: { ...selectedShape },
      startAngle: 0,
      startMouseAngle: 0,
      offsetX: 0,
      offsetY: 0,
    };
    
    setIsDragging(true);
    document.body.classList.add('dragging');
  }, [selectedShape, getSVGPoint]);

  const handleRotateMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedShape || selectedShape.locked) return;

    const point = getSVGPoint(e.clientX, e.clientY);
    const centerX = selectedShape.x + selectedShape.width / 2;
    const centerY = selectedShape.y + selectedShape.height / 2;
    const mouseAngle = Math.atan2(point.y - centerY, point.x - centerX) * (180 / Math.PI);

    dragState.current = {
      mode: 'rotate',
      startX: point.x,
      startY: point.y,
      startShape: { ...selectedShape },
      startAngle: selectedShape.rotation,
      startMouseAngle: mouseAngle,
      offsetX: 0,
      offsetY: 0,
    };
    
    setIsDragging(true);
    document.body.classList.add('dragging');
  }, [selectedShape, getSVGPoint]);

  const handleMouseMove = useCallback(
    rafThrottle((e: MouseEvent) => {
      if (!dragState.current.mode || !dragState.current.startShape) return;

      const point = getSVGPoint(e.clientX, e.clientY);
      const { mode, startShape } = dragState.current;

      if (mode === 'move') {
        const newX = point.x - dragState.current.offsetX;
        const newY = point.y - dragState.current.offsetY;
        
        onUpdateShape(startShape.id, {
          x: clamp(newX, 0, CANVAS_WIDTH - startShape.width),
          y: clamp(newY, 0, CANVAS_HEIGHT - startShape.height),
        });
      } else if (mode === 'resize') {
        const handle = dragState.current.handle as ResizeHandle;
        const dx = point.x - dragState.current.startX;
        const dy = point.y - dragState.current.startY;
        
        let newWidth = startShape.width;
        let newHeight = startShape.height;
        let newX = startShape.x;
        let newY = startShape.y;
        
        const aspectRatio = startShape.width / startShape.height;
        const lockAspect = shiftPressed;

        if (handle === 'br') {
          newWidth = Math.max(20, startShape.width + dx);
          newHeight = Math.max(20, startShape.height + dy);
          if (lockAspect) {
            if (Math.abs(dx) > Math.abs(dy)) {
              newHeight = newWidth / aspectRatio;
            } else {
              newWidth = newHeight * aspectRatio;
            }
          }
        } else if (handle === 'tr') {
          newWidth = Math.max(20, startShape.width + dx);
          newHeight = Math.max(20, startShape.height - dy);
          newY = startShape.y + (startShape.height - newHeight);
          if (lockAspect) {
            if (Math.abs(dx) > Math.abs(dy)) {
              newHeight = newWidth / aspectRatio;
              newY = startShape.y + (startShape.height - newHeight);
            } else {
              newWidth = newHeight * aspectRatio;
            }
          }
        } else if (handle === 'bl') {
          newWidth = Math.max(20, startShape.width - dx);
          newHeight = Math.max(20, startShape.height + dy);
          newX = startShape.x + (startShape.width - newWidth);
          if (lockAspect) {
            if (Math.abs(dx) > Math.abs(dy)) {
              newHeight = newWidth / aspectRatio;
            } else {
              newWidth = newHeight * aspectRatio;
              newX = startShape.x + (startShape.width - newWidth);
            }
          }
        } else if (handle === 'tl') {
          newWidth = Math.max(20, startShape.width - dx);
          newHeight = Math.max(20, startShape.height - dy);
          newX = startShape.x + (startShape.width - newWidth);
          newY = startShape.y + (startShape.height - newHeight);
          if (lockAspect) {
            if (Math.abs(dx) > Math.abs(dy)) {
              newHeight = newWidth / aspectRatio;
              newY = startShape.y + (startShape.height - newHeight);
            } else {
              newWidth = newHeight * aspectRatio;
              newX = startShape.x + (startShape.width - newWidth);
            }
          }
        }

        onUpdateShape(startShape.id, {
          x: clamp(newX, 0, CANVAS_WIDTH - newWidth),
          y: clamp(newY, 0, CANVAS_HEIGHT - newHeight),
          width: newWidth,
          height: newHeight,
        });
      } else if (mode === 'rotate') {
        const centerX = startShape.x + startShape.width / 2;
        const centerY = startShape.y + startShape.height / 2;
        const currentMouseAngle = Math.atan2(point.y - centerY, point.x - centerX) * (180 / Math.PI);
        
        const deltaAngle = currentMouseAngle - dragState.current.startMouseAngle;
        let newAngle = dragState.current.startAngle + deltaAngle;
        
        if (shiftPressed) {
          newAngle = snapAngle(newAngle, 15);
        }
        
        if (newAngle < 0) newAngle += 360;
        if (newAngle >= 360) newAngle -= 360;
        
        onUpdateShape(startShape.id, {
          rotation: newAngle,
        });
      }
    }),
    [onUpdateShape, getSVGPoint, shiftPressed]
  );

  const handleMouseUp = useCallback(() => {
    dragState.current.mode = null;
    dragState.current.startShape = null;
    setIsDragging(false);
    document.body.classList.remove('dragging');
  }, []);

  const handleCanvasMouseDown = useCallback(() => {
    onSelectShape(null);
  }, [onSelectShape]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setShiftPressed(true);
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          const newShapes = shapes.filter(s => s.id !== selectedId);
          onSetShapes(newShapes);
          onSelectShape(null);
        }
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setShiftPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedId, shapes, onSetShapes, onSelectShape]);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const renderHandles = useMemo(() => {
    if (!selectedShape) return null;

    const { x, y, width, height, rotation } = selectedShape;
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    const transform = `rotate(${rotation}, ${centerX}, ${centerY})`;

    const handles: { id: ResizeHandle; x: number; y: number; cursor: string }[] = [
      { id: 'tl', x: x - HANDLE_SIZE / 2, y: y - HANDLE_SIZE / 2, cursor: 'nwse-resize' },
      { id: 'tr', x: x + width - HANDLE_SIZE / 2, y: y - HANDLE_SIZE / 2, cursor: 'nesw-resize' },
      { id: 'bl', x: x - HANDLE_SIZE / 2, y: y + height - HANDLE_SIZE / 2, cursor: 'nesw-resize' },
      { id: 'br', x: x + width - HANDLE_SIZE / 2, y: y + height - HANDLE_SIZE / 2, cursor: 'nwse-resize' },
    ];

    const rotateHandleY = y - ROTATE_HANDLE_OFFSET;

    return (
      <g transform={transform}>
        <rect
          className="selection-border"
          x={x - 1}
          y={y - 1}
          width={width + 2}
          height={height + 2}
        />
        <line
          x1={centerX}
          y1={y}
          x2={centerX}
          y2={rotateHandleY}
          stroke="#6c63ff"
          strokeWidth="1"
          strokeDasharray="3,3"
          pointerEvents="none"
        />
        {handles.map(handle => (
          <rect
            key={handle.id}
            className={`handle resize-handle ${handle.id}`}
            x={handle.x}
            y={handle.y}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            fill="#fff"
            stroke="#6c63ff"
            strokeWidth="1.5"
            style={{ cursor: handle.cursor }}
            onMouseDown={(e) => handleResizeMouseDown(e, handle.id)}
          />
        ))}
        <circle
          className="handle rotate-handle"
          cx={centerX}
          cy={rotateHandleY}
          r={6}
          fill="#fff"
          stroke="#6c63ff"
          strokeWidth="1.5"
          onMouseDown={handleRotateMouseDown}
        />
      </g>
    );
  }, [selectedShape, handleResizeMouseDown, handleRotateMouseDown]);

  return (
    <div className="canvas-wrapper">
      <div className="canvas-toolbar">
        <span style={{ fontSize: '13px', color: '#666' }}>LogoLab 编辑器</span>
        <span style={{ fontSize: '12px', color: '#999' }}>
          画布: {CANVAS_WIDTH} × {CANVAS_HEIGHT} | 形状: {shapes.length}
        </span>
      </div>
      <div className="canvas-container">
        <svg
          ref={svgRef}
          className="svg-canvas"
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
          onMouseDown={handleCanvasMouseDown}
        >
          <defs>{defsContent}</defs>
          
          {sortedShapes.map(shape => (
            <ShapeElement
              key={shape.id}
              shape={shape}
              isSelected={shape.id === selectedId}
              onMouseDown={handleShapeMouseDown}
            />
          ))}
          
          {renderHandles}
        </svg>
      </div>
    </div>
  );
});

export default EditorCanvas;
