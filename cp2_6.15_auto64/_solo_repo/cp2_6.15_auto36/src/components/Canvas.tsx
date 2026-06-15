import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import { LayoutElement, DragItem, BackgroundConfig } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/constants';

interface CanvasProps {
  elements: LayoutElement[];
  selectedId: string | null;
  background: BackgroundConfig;
  onAddElement: (type: any, x: number, y: number) => void;
  onUpdateElement: (id: string, updates: Partial<LayoutElement>) => void;
  onSelectElement: (id: string | null) => void;
  onDeleteElement: (id: string) => void;
  canvasRef?: React.RefObject<HTMLDivElement>;
  newElementId: string | null;
}

type HandleType = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  elementStartX: number;
  elementStartY: number;
}

interface ResizeState {
  isResizing: boolean;
  handle: HandleType;
  startX: number;
  startY: number;
  elementStartX: number;
  elementStartY: number;
  elementStartWidth: number;
  elementStartHeight: number;
  aspectRatio: number;
}

interface RotateState {
  isRotating: boolean;
  startAngle: number;
  centerX: number;
  centerY: number;
  elementStartRotation: number;
}

export const Canvas: React.FC<CanvasProps> = ({
  elements,
  selectedId,
  background,
  onAddElement,
  onUpdateElement,
  onSelectElement,
  onDeleteElement,
  canvasRef,
  newElementId,
}) => {
  const internalCanvasRef = useRef<HTMLDivElement>(null);
  const activeCanvasRef = (canvasRef as React.RefObject<HTMLDivElement>) || internalCanvasRef;
  
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [rotateState, setRotateState] = useState<RotateState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bounceId, setBounceId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImageId, setPendingImageId] = useState<string | null>(null);

  useEffect(() => {
    if (newElementId) {
      setBounceId(newElementId);
      const timer = setTimeout(() => setBounceId(null), 200);
      return () => clearTimeout(timer);
    }
  }, [newElementId]);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'MATERIAL',
    drop: (item: DragItem, monitor) => {
      const offset = monitor.getClientOffset();
      const canvasRect = activeCanvasRef.current?.getBoundingClientRect();
      if (!offset || !canvasRect) return;

      const x = offset.x - canvasRect.left - 75;
      const y = offset.y - canvasRect.top - 50;
      
      const clampedX = Math.max(0, Math.min(x, CANVAS_WIDTH - 50));
      const clampedY = Math.max(0, Math.min(y, CANVAS_HEIGHT - 50));
      
      onAddElement(item.elementType, clampedX, clampedY);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }), [onAddElement, activeCanvasRef]);

  const getBackgroundStyle = (): React.CSSProperties => {
    if (background.type === 'solid') {
      return { backgroundColor: background.color || '#ffffff' };
    } else if (background.type === 'gradient' && background.gradient) {
      return {
        background: `linear-gradient(${background.gradient.angle}deg, ${background.gradient.from}, ${background.gradient.to})`,
      };
    } else if (background.type === 'image' && background.imageUrl) {
      return {
        backgroundImage: `url(${background.imageUrl})`,
        backgroundSize: background.imageFit || 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      };
    }
    return { backgroundColor: '#ffffff' };
  };

  const handleElementMouseDown = useCallback((e: React.MouseEvent, element: LayoutElement) => {
    if (editingId === element.id) return;
    e.stopPropagation();
    onSelectElement(element.id);

    const startX = e.clientX;
    const startY = e.clientY;

    setDragState({
      isDragging: true,
      startX,
      startY,
      elementStartX: element.x,
      elementStartY: element.y,
    });
  }, [editingId, onSelectElement]);

  const handleResizeStart = useCallback((e: React.MouseEvent, element: LayoutElement, handle: HandleType) => {
    e.stopPropagation();
    e.preventDefault();

    const rect = activeCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    setResizeState({
      isResizing: true,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      elementStartX: element.x,
      elementStartY: element.y,
      elementStartWidth: element.width,
      elementStartHeight: element.height,
      aspectRatio: element.width / element.height,
    });
  }, [activeCanvasRef]);

  const handleRotateStart = useCallback((e: React.MouseEvent, element: LayoutElement) => {
    e.stopPropagation();
    e.preventDefault();

    const rect = activeCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const centerX = rect.left + element.x + element.width / 2;
    const centerY = rect.top + element.y + element.height / 2;
    const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);

    setRotateState({
      isRotating: true,
      startAngle,
      centerX,
      centerY,
      elementStartRotation: element.rotation,
    });
  }, [activeCanvasRef]);

  const handleDoubleClick = useCallback((e: React.MouseEvent, element: LayoutElement) => {
    e.stopPropagation();
    
    if (element.type === 'text') {
      setEditingId(element.id);
    } else if (element.type === 'image') {
      setPendingImageId(element.id);
      fileInputRef.current?.click();
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && pendingImageId) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        onUpdateElement(pendingImageId, { imageUrl: dataUrl });
      };
      reader.readAsDataURL(file);
    }
    setPendingImageId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [pendingImageId, onUpdateElement]);

  const handleTextBlur = useCallback((id: string, newText: string) => {
    onUpdateElement(id, { text: newText });
    setEditingId(null);
  }, [onUpdateElement]);

  const handleTextKeyDown = useCallback((e: React.KeyboardEvent, id: string, newText: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onUpdateElement(id, { text: newText });
      setEditingId(null);
    }
  }, [onUpdateElement]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragState?.isDragging && selectedId) {
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;

        const element = elements.find(el => el.id === selectedId);
        if (!element) return;

        let newX = dragState.elementStartX + dx;
        let newY = dragState.elementStartY + dy;

        newX = Math.max(0, Math.min(newX, CANVAS_WIDTH - element.width));
        newY = Math.max(0, Math.min(newY, CANVAS_HEIGHT - element.height));

        onUpdateElement(selectedId, { x: newX, y: newY });
      }

      if (resizeState?.isResizing && selectedId) {
        const dx = e.clientX - resizeState.startX;
        const dy = e.clientY - resizeState.startY;
        const { handle, aspectRatio, elementStartX, elementStartY, elementStartWidth, elementStartHeight } = resizeState;

        let newWidth = elementStartWidth;
        let newHeight = elementStartHeight;
        let newX = elementStartX;
        let newY = elementStartY;
        const shiftPressed = e.shiftKey;

        switch (handle) {
          case 'se':
            if (shiftPressed) {
              newWidth = Math.max(20, elementStartWidth + dx);
              newHeight = Math.max(20, elementStartHeight + dy);
            } else {
              newWidth = Math.max(20, elementStartWidth + dx);
              newHeight = newWidth / aspectRatio;
            }
            break;
          case 'sw':
            if (shiftPressed) {
              newWidth = Math.max(20, elementStartWidth - dx);
              newHeight = Math.max(20, elementStartHeight + dy);
              newX = elementStartX + (elementStartWidth - newWidth);
            } else {
              newWidth = Math.max(20, elementStartWidth - dx);
              newHeight = newWidth / aspectRatio;
              newX = elementStartX + (elementStartWidth - newWidth);
            }
            break;
          case 'ne':
            if (shiftPressed) {
              newWidth = Math.max(20, elementStartWidth + dx);
              newHeight = Math.max(20, elementStartHeight - dy);
              newY = elementStartY + (elementStartHeight - newHeight);
            } else {
              newWidth = Math.max(20, elementStartWidth + dx);
              newHeight = newWidth / aspectRatio;
              newY = elementStartY + (elementStartHeight - newHeight);
            }
            break;
          case 'nw':
            if (shiftPressed) {
              newWidth = Math.max(20, elementStartWidth - dx);
              newHeight = Math.max(20, elementStartHeight - dy);
              newX = elementStartX + (elementStartWidth - newWidth);
              newY = elementStartY + (elementStartHeight - newHeight);
            } else {
              newWidth = Math.max(20, elementStartWidth - dx);
              newHeight = newWidth / aspectRatio;
              newX = elementStartX + (elementStartWidth - newWidth);
              newY = elementStartY + (elementStartHeight - newHeight);
            }
            break;
          case 'n':
            newHeight = Math.max(10, elementStartHeight - dy);
            newY = elementStartY + (elementStartHeight - newHeight);
            break;
          case 's':
            newHeight = Math.max(10, elementStartHeight + dy);
            break;
          case 'w':
            newWidth = Math.max(10, elementStartWidth - dx);
            newX = elementStartX + (elementStartWidth - newWidth);
            break;
          case 'e':
            newWidth = Math.max(10, elementStartWidth + dx);
            break;
        }

        onUpdateElement(selectedId, {
          width: newWidth,
          height: newHeight,
          x: newX,
          y: newY,
        });
      }

      if (rotateState?.isRotating && selectedId) {
        const currentAngle = Math.atan2(e.clientY - rotateState.centerY, e.clientX - rotateState.centerX) * (180 / Math.PI);
        let angleDiff = currentAngle - rotateState.startAngle;
        let newRotation = rotateState.elementStartRotation + angleDiff;
        
        if (newRotation < 0) newRotation += 360;
        if (newRotation >= 360) newRotation -= 360;

        onUpdateElement(selectedId, { rotation: Math.round(newRotation) });
      }
    };

    const handleMouseUp = () => {
      if (dragState?.isDragging) {
        const element = elements.find(el => el.id === selectedId);
        if (element) {
          onUpdateElement(selectedId!, { x: element.x, y: element.y });
        }
      }
      setDragState(null);
      setResizeState(null);
      setRotateState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, resizeState, rotateState, selectedId, elements, onUpdateElement]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === activeCanvasRef.current) {
      onSelectElement(null);
      setEditingId(null);
    }
  }, [activeCanvasRef, onSelectElement]);

  const renderElementContent = (element: LayoutElement) => {
    switch (element.type) {
      case 'text':
        if (editingId === element.id) {
          return (
            <div
              className="canvas-element-text"
              contentEditable
              suppressContentEditableWarning
              style={{
                fontFamily: element.fontFamily,
                fontSize: element.fontSize,
                color: element.fontColor,
                lineHeight: element.lineHeight,
                letterSpacing: element.letterSpacing,
                textAlign: element.textAlign,
              }}
              onBlur={(e) => handleTextBlur(element.id, e.currentTarget.innerText)}
              onKeyDown={(e) => handleTextKeyDown(e, element.id, e.currentTarget.innerText)}
              autoFocus
              dangerouslySetInnerHTML={{ __html: element.text || '' }}
            />
          );
        }
        return (
          <div
            className="canvas-element-text"
            style={{
              fontFamily: element.fontFamily,
              fontSize: element.fontSize,
              color: element.fontColor,
              lineHeight: element.lineHeight,
              letterSpacing: element.letterSpacing,
              textAlign: element.textAlign,
            }}
          >
            {element.text}
          </div>
        );

      case 'image':
        if (element.imageUrl) {
          return (
            <img
              src={element.imageUrl}
              alt=""
              className="canvas-element-image"
              style={{ objectFit: element.imageFit }}
              draggable={false}
            />
          );
        }
        return (
          <div
            className="canvas-element-placeholder"
            onClick={(e) => {
              e.stopPropagation();
              setPendingImageId(element.id);
              fileInputRef.current?.click();
            }}
          >
            <span style={{ fontSize: '24px' }}>📷</span>
            <span>双击或点击添加图片</span>
          </div>
        );

      case 'shape':
        const shapeStyle: React.CSSProperties = {
          backgroundColor: element.fillColor,
          border: element.strokeWidth ? `${element.strokeWidth}px solid ${element.strokeColor}` : 'none',
        };
        
        if (element.shapeType === 'circle') {
          shapeStyle.borderRadius = '50%';
        } else if (element.shapeType === 'triangle') {
          return (
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: `${element.width / 2}px solid transparent`,
                borderRight: `${element.width / 2}px solid transparent`,
                borderBottom: `${element.height}px solid ${element.fillColor}`,
              }}
            />
          );
        }
        return <div className="canvas-element-shape" style={shapeStyle} />;

      case 'line':
        return (
          <div className="canvas-element-line">
            <hr
              className="line-stroke"
              style={{
                border: 'none',
                borderTop: `${element.lineThickness}px ${element.lineStyle} ${element.lineColor}`,
              }}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const renderResizeHandles = (element: LayoutElement) => {
    if (selectedId !== element.id) return null;

    const handles: HandleType[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

    return (
      <div className="resize-handles">
        {handles.map((handle) => (
          <div
            key={handle}
            className={`resize-handle ${handle}`}
            onMouseDown={(e) => handleResizeStart(e, element, handle)}
          />
        ))}
        <div className="rotate-connector" />
        <div
          className="rotate-handle"
          onMouseDown={(e) => handleRotateStart(e, element)}
        >
          ↻
        </div>
        {rotateState?.isRotating && selectedId === element.id && (
          <div className="rotation-label">{element.rotation}°</div>
        )}
        <button
          className="delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteElement(element.id);
          }}
        >
          ×
        </button>
      </div>
    );
  };

  return (
    <>
      <div
        ref={(node) => {
          drop(node);
          if (canvasRef) {
            (canvasRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          }
          (internalCanvasRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        className="canvas"
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          ...getBackgroundStyle(),
          boxShadow: isOver
            ? '0 0 0 3px rgba(68, 136, 255, 0.5), 0 20px 60px rgba(0, 0, 0, 0.3)'
            : '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
        onClick={handleCanvasClick}
      >
        {elements.length === 0 && (
          <div className="empty-hint">
            <div className="empty-hint-icon">✨</div>
            <div>从左侧拖拽素材到画布开始创作</div>
          </div>
        )}

        {elements.map((element) => (
          <div
            key={element.id}
            className={`canvas-element ${selectedId === element.id ? 'selected' : ''} ${bounceId === element.id ? 'bounce-in' : ''}`}
            style={{
              left: element.x,
              top: element.y,
              width: element.width,
              height: element.height,
              transform: `rotate(${element.rotation}deg)`,
              opacity: element.opacity,
              zIndex: selectedId === element.id ? 10 : 1,
            }}
            onMouseDown={(e) => handleElementMouseDown(e, element)}
            onDoubleClick={(e) => handleDoubleClick(e, element)}
          >
            <div className="canvas-element-content">
              {renderElementContent(element)}
            </div>
            {renderResizeHandles(element)}
          </div>
        ))}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </>
  );
};
