import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  AnnotationElement,
  ToolType,
  ImagePosition,
  AnchorElement,
  TextElement,
  ArrowElement,
  RulerElement,
  ANCHOR_COLOR,
  ARROW_DEFAULT_COLOR,
  RULER_DEFAULT_COLOR,
  SELECT_HIGHLIGHT,
} from './types';

interface CanvasCanvasProps {
  image: string | null;
  imagePosition: ImagePosition;
  elements: AnnotationElement[];
  selectedId: string | null;
  currentTool: ToolType;
  currentColor: string;
  currentFontSize: number;
  onImagePositionChange: (pos: ImagePosition) => void;
  onAddElement: (element: AnnotationElement) => void;
  onUpdateElement: (id: string, updates: Partial<AnnotationElement>) => void;
  onSelectElement: (id: string | null) => void;
  svgRef: React.RefObject<SVGSVGElement | null>;
  canvasSize: { width: number; height: number };
}

type DragState =
  | { type: 'none' }
  | { type: 'image'; startX: number; startY: number; origX: number; origY: number }
  | { type: 'element'; elementId: string; startX: number; startY: number; origX: number; origY: number; handle?: 'start' | 'end' }
  | { type: 'create-arrow'; startX: number; startY: number }
  | { type: 'create-ruler'; startX: number; startY: number };

const CanvasCanvas: React.FC<CanvasCanvasProps> = ({
  image,
  imagePosition,
  elements,
  selectedId,
  currentTool,
  currentColor,
  currentFontSize,
  onImagePositionChange,
  onAddElement,
  onUpdateElement,
  onSelectElement,
  svgRef,
  canvasSize,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState>({ type: 'none' });
  const [previewElement, setPreviewElement] = useState<ArrowElement | RulerElement | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const getMousePos = useCallback((e: React.MouseEvent | MouseEvent): { x: number; y: number } => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, [svgRef]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    const containerWidth = canvasSize.width;
    const containerHeight = canvasSize.height;
    
    const scaleX = (containerWidth * 0.8) / img.naturalWidth;
    const scaleY = (containerHeight * 0.8) / img.naturalHeight;
    const scale = Math.min(scaleX, scaleY, 1);
    
    const x = (containerWidth - img.naturalWidth * scale) / 2;
    const y = (containerHeight - img.naturalHeight * scale) / 2;
    
    onImagePositionChange({ x, y, scale });
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    
    const pos = getMousePos(e);

    if (currentTool === 'select') {
      if (image) {
        const imgWidth = imageSize ? imageSize.width * imagePosition.scale : 0;
        const imgHeight = imageSize ? imageSize.height * imagePosition.scale : 0;
        if (
          pos.x >= imagePosition.x &&
          pos.x <= imagePosition.x + imgWidth &&
          pos.y >= imagePosition.y &&
          pos.y <= imagePosition.y + imgHeight
        ) {
          dragStateRef.current = {
            type: 'image',
            startX: e.clientX,
            startY: e.clientY,
            origX: imagePosition.x,
            origY: imagePosition.y,
          };
          onSelectElement(null);
          return;
        }
      }
      onSelectElement(null);
      return;
    }

    if (currentTool === 'anchor') {
      const newAnchor: AnchorElement = {
        id: generateId(),
        type: 'anchor',
        x: pos.x,
        y: pos.y,
      };
      onAddElement(newAnchor);
      onSelectElement(newAnchor.id);
      return;
    }

    if (currentTool === 'text') {
      const newText: TextElement = {
        id: generateId(),
        type: 'text',
        x: pos.x,
        y: pos.y,
        content: '',
        fontSize: currentFontSize,
        color: currentColor,
        width: 150,
        height: 40,
      };
      onAddElement(newText);
      onSelectElement(newText.id);
      return;
    }

    if (currentTool === 'arrow') {
      dragStateRef.current = {
        type: 'create-arrow',
        startX: pos.x,
        startY: pos.y,
      };
      setPreviewElement({
        id: 'preview',
        type: 'arrow',
        x: pos.x,
        y: pos.y,
        endX: pos.x,
        endY: pos.y,
        color: ARROW_DEFAULT_COLOR,
        lineWidth: 2,
      });
      return;
    }

    if (currentTool === 'ruler') {
      dragStateRef.current = {
        type: 'create-ruler',
        startX: pos.x,
        startY: pos.y,
      };
      setPreviewElement({
        id: 'preview',
        type: 'ruler',
        x: pos.x,
        y: pos.y,
        endX: pos.x,
        endY: pos.y,
        color: RULER_DEFAULT_COLOR,
        lineWidth: 2,
      });
      return;
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const dragState = dragStateRef.current;
    if (dragState.type === 'none') return;

    const pos = getMousePos(e);

    if (dragState.type === 'image') {
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      rafIdRef.current = requestAnimationFrame(() => {
        onImagePositionChange({
          ...imagePosition,
          x: dragState.origX + dx,
          y: dragState.origY + dy,
        });
      });
      return;
    }

    if (dragState.type === 'element') {
      const dx = pos.x - dragState.startX;
      const dy = pos.y - dragState.startY;
      const element = elements.find(el => el.id === dragState.elementId);
      
      if (!element) return;

      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }

      if (element.type === 'arrow' || element.type === 'ruler') {
        if (dragState.handle === 'start') {
          rafIdRef.current = requestAnimationFrame(() => {
            onUpdateElement(dragState.elementId, {
              x: dragState.origX + dx,
              y: dragState.origY + dy,
            } as Partial<AnnotationElement>);
          });
        } else if (dragState.handle === 'end') {
          rafIdRef.current = requestAnimationFrame(() => {
            onUpdateElement(dragState.elementId, {
              endX: dragState.origX + dx,
              endY: dragState.origY + dy,
            } as Partial<AnnotationElement>);
          });
        } else {
          rafIdRef.current = requestAnimationFrame(() => {
            onUpdateElement(dragState.elementId, {
              x: dragState.origX + dx,
              y: dragState.origY + dy,
              endX: (element.endX || 0) + dx,
              endY: (element.endY || 0) + dy,
            } as Partial<AnnotationElement>);
          });
        }
      } else {
        rafIdRef.current = requestAnimationFrame(() => {
          onUpdateElement(dragState.elementId, {
            x: dragState.origX + dx,
            y: dragState.origY + dy,
          } as Partial<AnnotationElement>);
        });
      }
      return;
    }

    if (dragState.type === 'create-arrow' && previewElement?.type === 'arrow') {
      setPreviewElement({
        ...previewElement,
        endX: pos.x,
        endY: pos.y,
      });
      return;
    }

    if (dragState.type === 'create-ruler' && previewElement?.type === 'ruler') {
      setPreviewElement({
        ...previewElement,
        endX: pos.x,
        endY: pos.y,
      });
      return;
    }
  }, [getMousePos, imagePosition, elements, onImagePositionChange, onUpdateElement, previewElement]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    const dragState = dragStateRef.current;
    const pos = getMousePos(e);

    if (dragState.type === 'create-arrow' && previewElement?.type === 'arrow') {
      const dx = pos.x - dragState.startX;
      const dy = pos.y - dragState.startY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 10) {
        const newArrow: ArrowElement = {
          id: generateId(),
          type: 'arrow',
          x: dragState.startX,
          y: dragState.startY,
          endX: pos.x,
          endY: pos.y,
          color: ARROW_DEFAULT_COLOR,
          lineWidth: 2,
        };
        onAddElement(newArrow);
        onSelectElement(newArrow.id);
      }
      setPreviewElement(null);
    }

    if (dragState.type === 'create-ruler' && previewElement?.type === 'ruler') {
      const dx = pos.x - dragState.startX;
      const dy = pos.y - dragState.startY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 10) {
        const newRuler: RulerElement = {
          id: generateId(),
          type: 'ruler',
          x: dragState.startX,
          y: dragState.startY,
          endX: pos.x,
          endY: pos.y,
          color: RULER_DEFAULT_COLOR,
          lineWidth: 2,
        };
        onAddElement(newRuler);
        onSelectElement(newRuler.id);
      }
      setPreviewElement(null);
    }

    dragStateRef.current = { type: 'none' };
    
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, [getMousePos, previewElement, onAddElement, onSelectElement]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleElementMouseDown = (e: React.MouseEvent, elementId: string, handle?: 'start' | 'end') => {
    e.stopPropagation();
    if (e.button !== 0) return;
    
    const pos = getMousePos(e);
    const element = elements.find(el => el.id === elementId);
    if (!element) return;

    onSelectElement(elementId);

    if (currentTool === 'select') {
      let origX: number, origY: number;
      
      if (handle === 'end' && (element.type === 'arrow' || element.type === 'ruler')) {
        origX = element.endX || 0;
        origY = element.endY || 0;
      } else {
        origX = element.x;
        origY = element.y;
      }

      dragStateRef.current = {
        type: 'element',
        elementId,
        startX: pos.x,
        startY: pos.y,
        origX,
        origY,
        handle,
      };
    }
  };

  const handleTextContentChange = (elementId: string, content: string) => {
    onUpdateElement(elementId, { content } as Partial<AnnotationElement>);
  };

  const handleTextBlur = (elementId: string, width: number, height: number) => {
    onUpdateElement(elementId, { width, height } as Partial<AnnotationElement>);
  };

  const getCursor = () => {
    const dragState = dragStateRef.current;
    if (dragState.type === 'image') return 'grabbing';
    if (dragState.type === 'element') return 'move';
    if (currentTool === 'select') return 'default';
    if (currentTool === 'anchor' || currentTool === 'text') return 'crosshair';
    if (currentTool === 'arrow' || currentTool === 'ruler') return 'crosshair';
    return 'default';
  };

  const renderAnchorPaths = () => {
    const anchors = elements.filter((e): e is AnchorElement => e.type === 'anchor');
    const paths = [];
    
    for (let i = 0; i < anchors.length - 1; i++) {
      const current = anchors[i];
      const next = anchors[i + 1];
      paths.push(
        <line
          key={`path-${current.id}-${next.id}`}
          x1={current.x}
          y1={current.y}
          x2={next.x}
          y2={next.y}
          stroke={ANCHOR_COLOR}
          strokeWidth={2}
          strokeDasharray="6,4"
          style={{ pointerEvents: 'none' }}
        />
      );
    }
    
    return paths;
  };

  const renderAnchor = (element: AnchorElement) => {
    const isSelected = selectedId === element.id;
    const radius = isSelected ? 7.2 : 6;
    
    return (
      <g
        key={element.id}
        onMouseDown={(e) => handleElementMouseDown(e, element.id)}
        style={{ cursor: 'move' }}
      >
        <circle
          cx={element.x}
          cy={element.y}
          r={radius + 4}
          fill="transparent"
        />
        <circle
          cx={element.x}
          cy={element.y}
          r={radius}
          fill={ANCHOR_COLOR}
          stroke="#ffffff"
          strokeWidth={2}
          style={{ transition: 'r 0.2s ease' }}
        />
      </g>
    );
  };

  const renderText = (element: TextElement) => {
    const isSelected = selectedId === element.id;
    const width = element.width || 150;
    const height = element.height || 40;
    
    return (
      <foreignObject
        key={element.id}
        x={element.x}
        y={element.y}
        width={width}
        height={height}
        onMouseDown={(e) => handleElementMouseDown(e, element.id)}
      >
        <div
          xmlns="http://www.w3.org/1999/xhtml"
          className={`text-box ${isSelected ? 'selected' : ''}`}
          contentEditable
          suppressContentEditableWarning
          style={{
            fontSize: element.fontSize,
            color: element.color,
            width: '100%',
            height: '100%',
          }}
          onInput={(e) => handleTextContentChange(element.id, e.currentTarget.textContent || '')}
          onBlur={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            handleTextBlur(element.id, rect.width, rect.height);
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {element.content || ''}
        </div>
      </foreignObject>
    );
  };

  const renderArrow = (element: ArrowElement) => {
    const isSelected = selectedId === element.id;
    const angle = Math.atan2(element.endY - element.y, element.endX - element.x);
    const arrowLength = 12;
    const arrowAngle = Math.PI / 6;
    
    const p1x = element.endX - arrowLength * Math.cos(angle - arrowAngle);
    const p1y = element.endY - arrowLength * Math.sin(angle - arrowAngle);
    const p2x = element.endX - arrowLength * Math.cos(angle + arrowAngle);
    const p2y = element.endY - arrowLength * Math.sin(angle + arrowAngle);

    return (
      <g
        key={element.id}
        onMouseDown={(e) => handleElementMouseDown(e, element.id)}
        style={{ cursor: 'move' }}
      >
        <line
          x1={element.x}
          y1={element.y}
          x2={element.endX}
          y2={element.endY}
          stroke={element.color}
          strokeWidth={element.lineWidth}
          style={{ pointerEvents: 'stroke' }}
        />
        <polygon
          points={`${element.endX},${element.endY} ${p1x},${p1y} ${p2x},${p2y}`}
          fill={element.color}
        />
        {isSelected && (
          <>
            <circle
              cx={element.x}
              cy={element.y}
              r={6}
              fill={element.color}
              stroke="#ffffff"
              strokeWidth={2}
              style={{ cursor: 'move' }}
              onMouseDown={(e) => handleElementMouseDown(e, element.id, 'start')}
            />
            <circle
              cx={element.endX}
              cy={element.endY}
              r={6}
              fill={element.color}
              stroke="#ffffff"
              strokeWidth={2}
              style={{ cursor: 'move' }}
              onMouseDown={(e) => handleElementMouseDown(e, element.id, 'end')}
            />
          </>
        )}
      </g>
    );
  };

  const renderRuler = (element: RulerElement) => {
    const isSelected = selectedId === element.id;
    const dx = element.endX - element.x;
    const dy = element.endY - element.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    const arrowLength = 10;
    const arrowAngle = Math.PI / 6;

    const sp1x = element.x + arrowLength * Math.cos(angle - arrowAngle);
    const sp1y = element.y + arrowLength * Math.sin(angle - arrowAngle);
    const sp2x = element.x + arrowLength * Math.cos(angle + arrowAngle);
    const sp2y = element.y + arrowLength * Math.sin(angle + arrowAngle);

    const ep1x = element.endX - arrowLength * Math.cos(angle - arrowAngle);
    const ep1y = element.endY - arrowLength * Math.sin(angle - arrowAngle);
    const ep2x = element.endX - arrowLength * Math.cos(angle + arrowAngle);
    const ep2y = element.endY - arrowLength * Math.sin(angle + arrowAngle);

    const midX = (element.x + element.endX) / 2;
    const midY = (element.y + element.endY) / 2;
    const perpAngle = angle + Math.PI / 2;
    const labelX = midX + 15 * Math.cos(perpAngle);
    const labelY = midY + 15 * Math.sin(perpAngle);

    const tickCount = Math.floor(length / 50);
    const ticks = [];
    for (let i = 1; i <= tickCount; i++) {
      const t = i / (tickCount + 1);
      const tx = element.x + dx * t;
      const ty = element.y + dy * t;
      const tickLength = 6;
      ticks.push(
        <line
          key={`tick-${i}`}
          x1={tx + tickLength * Math.cos(perpAngle)}
          y1={ty + tickLength * Math.sin(perpAngle)}
          x2={tx - tickLength * Math.cos(perpAngle)}
          y2={ty - tickLength * Math.sin(perpAngle)}
          stroke={element.color}
          strokeWidth={1}
        />
      );
    }

    return (
      <g
        key={element.id}
        onMouseDown={(e) => handleElementMouseDown(e, element.id)}
        style={{ cursor: 'move' }}
      >
        <line
          x1={element.x}
          y1={element.y}
          x2={element.endX}
          y2={element.endY}
          stroke={element.color}
          strokeWidth={element.lineWidth}
          style={{ pointerEvents: 'stroke' }}
        />
        <polygon
          points={`${element.x},${element.y} ${sp1x},${sp1y} ${sp2x},${sp2y}`}
          fill={element.color}
        />
        <polygon
          points={`${element.endX},${element.endY} ${ep1x},${ep1y} ${ep2x},${ep2y}`}
          fill={element.color}
        />
        {ticks}
        <text
          x={labelX}
          y={labelY}
          fill={element.color}
          fontSize={12}
          fontFamily="system-ui, -apple-system, sans-serif"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          {Math.round(length)}px
        </text>
        {isSelected && (
          <>
            <circle
              cx={element.x}
              cy={element.y}
              r={6}
              fill={element.color}
              stroke="#ffffff"
              strokeWidth={2}
              style={{ cursor: 'move' }}
              onMouseDown={(e) => handleElementMouseDown(e, element.id, 'start')}
            />
            <circle
              cx={element.endX}
              cy={element.endY}
              r={6}
              fill={element.color}
              stroke="#ffffff"
              strokeWidth={2}
              style={{ cursor: 'move' }}
              onMouseDown={(e) => handleElementMouseDown(e, element.id, 'end')}
            />
          </>
        )}
      </g>
    );
  };

  const renderPreview = () => {
    if (!previewElement) return null;
    
    if (previewElement.type === 'arrow') {
      const angle = Math.atan2(previewElement.endY - previewElement.y, previewElement.endX - previewElement.x);
      const arrowLength = 12;
      const arrowAngle = Math.PI / 6;
      
      const p1x = previewElement.endX - arrowLength * Math.cos(angle - arrowAngle);
      const p1y = previewElement.endY - arrowLength * Math.sin(angle - arrowAngle);
      const p2x = previewElement.endX - arrowLength * Math.cos(angle + arrowAngle);
      const p2y = previewElement.endY - arrowLength * Math.sin(angle + arrowAngle);

      return (
        <g style={{ pointerEvents: 'none', opacity: 0.7 }}>
          <line
            x1={previewElement.x}
            y1={previewElement.y}
            x2={previewElement.endX}
            y2={previewElement.endY}
            stroke={previewElement.color}
            strokeWidth={previewElement.lineWidth}
            strokeDasharray="4,4"
          />
          <polygon
            points={`${previewElement.endX},${previewElement.endY} ${p1x},${p1y} ${p2x},${p2y}`}
            fill={previewElement.color}
          />
          <circle cx={previewElement.x} cy={previewElement.y} r={4} fill={previewElement.color} />
        </g>
      );
    }

    if (previewElement.type === 'ruler') {
      const dx = previewElement.endX - previewElement.x;
      const dy = previewElement.endY - previewElement.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      const arrowLength = 10;
      const arrowAngle = Math.PI / 6;

      const sp1x = previewElement.x + arrowLength * Math.cos(angle - arrowAngle);
      const sp1y = previewElement.y + arrowLength * Math.sin(angle - arrowAngle);
      const sp2x = previewElement.x + arrowLength * Math.cos(angle + arrowAngle);
      const sp2y = previewElement.y + arrowLength * Math.sin(angle + arrowAngle);

      const ep1x = previewElement.endX - arrowLength * Math.cos(angle - arrowAngle);
      const ep1y = previewElement.endY - arrowLength * Math.sin(angle - arrowAngle);
      const ep2x = previewElement.endX - arrowLength * Math.cos(angle + arrowAngle);
      const ep2y = previewElement.endY - arrowLength * Math.sin(angle + arrowAngle);

      const midX = (previewElement.x + previewElement.endX) / 2;
      const midY = (previewElement.y + previewElement.endY) / 2;
      const perpAngle = angle + Math.PI / 2;
      const labelX = midX + 15 * Math.cos(perpAngle);
      const labelY = midY + 15 * Math.sin(perpAngle);

      return (
        <g style={{ pointerEvents: 'none', opacity: 0.7 }}>
          <line
            x1={previewElement.x}
            y1={previewElement.y}
            x2={previewElement.endX}
            y2={previewElement.endY}
            stroke={previewElement.color}
            strokeWidth={previewElement.lineWidth}
            strokeDasharray="4,4"
          />
          <polygon
            points={`${previewElement.x},${previewElement.y} ${sp1x},${sp1y} ${sp2x},${sp2y}`}
            fill={previewElement.color}
          />
          <polygon
            points={`${previewElement.endX},${previewElement.endY} ${ep1x},${ep1y} ${ep2x},${ep2y}`}
            fill={previewElement.color}
          />
          <text
            x={labelX}
            y={labelY}
            fill={previewElement.color}
            fontSize={12}
            fontFamily="system-ui, -apple-system, sans-serif"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {Math.round(length)}px
          </text>
        </g>
      );
    }

    return null;
  };

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      style={{ cursor: getCursor() }}
    >
      <svg
        ref={svgRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onMouseDown={handleCanvasMouseDown}
      >
        <rect
          x={0}
          y={0}
          width={canvasSize.width}
          height={canvasSize.height}
          fill="#1a1a1a"
        />

        {image && imageSize && (
          <image
            href={image}
            x={imagePosition.x}
            y={imagePosition.y}
            width={imageSize.width * imagePosition.scale}
            height={imageSize.height * imagePosition.scale}
            onLoad={handleImageLoad}
            preserveAspectRatio="xMidYMid meet"
            style={{
              cursor: currentTool === 'select' ? 'grab' : 'default',
            }}
          />
        )}

        {renderAnchorPaths()}

        {elements.map((element) => {
          switch (element.type) {
            case 'anchor':
              return renderAnchor(element);
            case 'text':
              return renderText(element);
            case 'arrow':
              return renderArrow(element);
            case 'ruler':
              return renderRuler(element);
            default:
              return null;
          }
        })}

        {renderPreview()}
      </svg>

      {!image && (
        <div className="canvas-placeholder">
          <div className="placeholder-icon">📷</div>
          <div className="placeholder-text">点击上方"上传图片"按钮开始标注</div>
          <div className="placeholder-hint">支持 PNG / JPG 格式</div>
        </div>
      )}
    </div>
  );
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export default CanvasCanvas;
