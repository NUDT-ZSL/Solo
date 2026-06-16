import React, { useRef, useEffect, useCallback, useState } from 'react';
import { smoothPath, calculateArrowHead, wrapText, springPhysics, distanceToSegment, type Point } from '../utils/drawingEngine';

export type ToolType = 'pen' | 'sticky' | 'arrow' | 'eraser';

export interface StickyNote {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
}

export interface DrawingLine {
  id: string;
  points: Point[];
  color: string;
  strokeWidth: number;
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
}

export interface ArrowLine {
  id: string;
  from: Point;
  to: Point;
  color: string;
  offsetX: number;
  offsetY: number;
}

export interface CollaboratorCursor {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
}

export type Annotation = StickyNote | DrawingLine | ArrowLine;

export interface CanvasProps {
  annotations: Annotation[];
  tool: ToolType;
  color: string;
  collaborators: CollaboratorCursor[];
  onAddLine: (line: DrawingLine) => void;
  onAddSticky: (sticky: StickyNote) => void;
  onAddArrow: (arrow: ArrowLine) => void;
  onDeleteAnnotation: (id: string) => void;
  onUpdateAnnotation: (annotation: Annotation) => void;
  fadingOutIds: string[];
  fadingInIds: string[];
  blinkingIds: string[];
}

const GRID_SPACING = 100;

interface SpringOffset {
  id: string;
  dx: number;
  dy: number;
  vx: number;
  vy: number;
}

const Canvas: React.FC<CanvasProps> = ({
  annotations,
  tool,
  color,
  collaborators,
  onAddLine,
  onAddSticky,
  onAddArrow,
  onDeleteAnnotation,
  onUpdateAnnotation,
  fadingOutIds,
  fadingInIds,
  blinkingIds,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: window.innerWidth - 260, h: window.innerHeight });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panViewStart, setPanViewStart] = useState({ x: 0, y: 0 });

  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [arrowStart, setArrowStart] = useState<Point | null>(null);
  const [arrowPreview, setArrowPreview] = useState<Point | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    id: string;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    origOffsetX: number;
    origOffsetY: number;
    origX?: number;
    origY?: number;
  } | null>(null);

  const [springOffset, setSpringOffset] = useState<SpringOffset | null>(null);
  const springRafRef = useRef<number>(0);

  const [resizing, setResizing] = useState<{
    id: string;
    corner: string;
    startMouseX: number;
    startMouseY: number;
    origWidth: number;
    origHeight: number;
    origX: number;
    origY: number;
  } | null>(null);

  const [editingStickyId, setEditingStickyId] = useState<string | null>(null);
  const pulseRafRef = useRef<number>(0);

  const screenToCanvas = useCallback((clientX: number, clientY: number): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const x = viewBox.x + ((clientX - rect.left) / rect.width) * viewBox.w;
    const y = viewBox.y + ((clientY - rect.top) / rect.height) * viewBox.h;
    return { x, y };
  }, [viewBox]);

  useEffect(() => {
    const handleResize = () => {
      setViewBox(prev => ({
        ...prev,
        w: window.innerWidth - 260,
        h: window.innerHeight,
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!springOffset) return;

    let running = true;
    const animate = () => {
      if (!running) return;
      setSpringOffset(prev => {
        if (!prev) return null;
        const xResult = springPhysics(prev.dx, 0, prev.vx, 300, 20, 0.016);
        const yResult = springPhysics(prev.dy, 0, prev.vy, 300, 20, 0.016);
        if (xResult.settled && yResult.settled) return null;
        return {
          ...prev,
          dx: xResult.position,
          dy: yResult.position,
          vx: xResult.velocity,
          vy: yResult.velocity,
        };
      });
      if (running) springRafRef.current = requestAnimationFrame(animate);
    };

    springRafRef.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      cancelAnimationFrame(springRafRef.current);
    };
  }, [springOffset !== null]);

  useEffect(() => {
    return () => {
      if (springRafRef.current) cancelAnimationFrame(springRafRef.current);
      if (pulseRafRef.current) cancelAnimationFrame(pulseRafRef.current);
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const pos = screenToCanvas(clientX, clientY);

    if ('button' in e && (e.button === 1 || (e.button === 0 && e.altKey))) {
      setIsPanning(true);
      setPanStart({ x: clientX, y: clientY });
      setPanViewStart({ x: viewBox.x, y: viewBox.y });
      return;
    }

    if (tool === 'pen') {
      setIsDrawing(true);
      setCurrentPoints([pos]);
    } else if (tool === 'sticky') {
      const id = `sticky-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      onAddSticky({
        id,
        x: pos.x - 75,
        y: pos.y - 60,
        width: 150,
        height: 120,
        text: '',
        color: '#FFF9C4',
      });
      setEditingStickyId(id);
    } else if (tool === 'arrow') {
      setArrowStart(pos);
      setArrowPreview(pos);
    } else if (tool === 'eraser') {
      for (const ann of annotations) {
        if ('points' in ann) {
          const line = ann as DrawingLine;
          for (let i = 1; i < line.points.length; i++) {
            if (distanceToSegment(pos, line.points[i - 1], line.points[i]) < 10) {
              onDeleteAnnotation(line.id);
              return;
            }
          }
        } else if ('x' in ann) {
          const sticky = ann as StickyNote;
          if (pos.x >= sticky.x && pos.x <= sticky.x + sticky.width &&
              pos.y >= sticky.y && pos.y <= sticky.y + sticky.height) {
            onDeleteAnnotation(sticky.id);
            return;
          }
        } else if ('from' in ann) {
          const arrow = ann as ArrowLine;
          if (distanceToSegment(pos, arrow.from, arrow.to) < 10) {
            onDeleteAnnotation(arrow.id);
            return;
          }
        }
      }
    }
  }, [tool, viewBox, annotations, screenToCanvas, onAddSticky, onAddArrow, onDeleteAnnotation]);

  const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    if (isPanning) {
      const dx = clientX - panStart.x;
      const dy = clientY - panStart.y;
      setViewBox(prev => ({
        ...prev,
        x: panViewStart.x - dx,
        y: panViewStart.y - dy,
      }));
      return;
    }

    const pos = screenToCanvas(clientX, clientY);

    if (isDrawing && tool === 'pen') {
      setCurrentPoints(prev => [...prev, pos]);
    } else if (tool === 'arrow' && arrowStart) {
      setArrowPreview(pos);
    } else if (dragState) {
      const dx = pos.x - dragState.startX;
      const dy = pos.y - dragState.startY;
      const ann = annotations.find(a => a.id === dragState.id);
      if (!ann) return;

      if ('x' in ann) {
        const sticky = ann as StickyNote;
        onUpdateAnnotation({
          ...sticky,
          x: (dragState.origX ?? sticky.x) + dx,
          y: (dragState.origY ?? sticky.y) + dy,
        });
      } else if ('offsetX' in ann) {
        const line = ann as DrawingLine;
        onUpdateAnnotation({
          ...line,
          offsetX: dragState.origOffsetX + dx,
          offsetY: dragState.origOffsetY + dy,
        });
      } else if ('from' in ann) {
        const arrow = ann as ArrowLine;
        onUpdateAnnotation({
          ...arrow,
          offsetX: dragState.origOffsetX + dx,
          offsetY: dragState.origOffsetY + dy,
        });
      }

      setDragState(prev => prev ? { ...prev, lastX: pos.x, lastY: pos.y } : null);
    } else if (resizing) {
      const dx = pos.x - resizing.startMouseX;
      const dy = pos.y - resizing.startMouseY;
      const ann = annotations.find(a => a.id === resizing.id) as StickyNote | undefined;
      if (!ann) return;

      let newW = resizing.origWidth;
      let newH = resizing.origHeight;
      let newX = resizing.origX;
      let newY = resizing.origY;

      if (resizing.corner.includes('right')) newW = Math.max(60, resizing.origWidth + dx);
      if (resizing.corner.includes('left')) {
        newW = Math.max(60, resizing.origWidth - dx);
        newX = resizing.origX + (resizing.origWidth - newW);
      }
      if (resizing.corner.includes('bottom')) newH = Math.max(60, resizing.origHeight + dy);
      if (resizing.corner.includes('top')) {
        newH = Math.max(60, resizing.origHeight - dy);
        newY = resizing.origY + (resizing.origHeight - newH);
      }

      const scaleRatio = newW / resizing.origWidth;
      newH = resizing.origHeight * scaleRatio;

      onUpdateAnnotation({ ...ann, x: newX, y: newY, width: newW, height: newH });
    }
  }, [isPanning, isDrawing, tool, arrowStart, dragState, resizing, panStart, panViewStart, annotations, screenToCanvas, onUpdateAnnotation]);

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (isDrawing && currentPoints.length > 1) {
      const id = `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      onAddLine({
        id,
        points: currentPoints,
        color,
        strokeWidth: 4,
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1,
      });
    }
    setIsDrawing(false);
    setCurrentPoints([]);

    if (tool === 'arrow' && arrowStart && arrowPreview) {
      const dx = arrowPreview.x - arrowStart.x;
      const dy = arrowPreview.y - arrowStart.y;
      if (Math.sqrt(dx * dx + dy * dy) > 10) {
        const id = `arrow-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        onAddArrow({
          id,
          from: arrowStart,
          to: arrowPreview,
          color,
          offsetX: 0,
          offsetY: 0,
        });
      }
    }
    setArrowStart(null);
    setArrowPreview(null);

    if (dragState) {
      const vx = (dragState.lastX - dragState.startX) * 2;
      const vy = (dragState.lastY - dragState.startY) * 2;
      const speed = Math.sqrt(vx * vx + vy * vy);
      const clampedVx = speed > 0 ? (vx / speed) * Math.min(speed, 200) : 0;
      const clampedVy = speed > 0 ? (vy / speed) * Math.min(speed, 200) : 0;

      if (Math.abs(clampedVx) > 5 || Math.abs(clampedVy) > 5) {
        setSpringOffset({
          id: dragState.id,
          dx: 0,
          dy: 0,
          vx: clampedVx,
          vy: clampedVy,
        });
      }
      setDragState(null);
    }

    if (resizing) {
      setResizing(null);
    }
  }, [isPanning, isDrawing, currentPoints, tool, arrowStart, arrowPreview, dragState, resizing, color, annotations, onAddLine, onAddArrow]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    const scaleFactor = e.deltaY > 0 ? 1.05 : 0.95;
    setViewBox(prev => {
      const newW = Math.min(8000, Math.max(300, prev.w * scaleFactor));
      const newH = Math.min(8000, Math.max(300, prev.h * scaleFactor));
      const dw = newW - prev.w;
      const dh = newH - prev.h;
      return {
        x: prev.x - dw / 2,
        y: prev.y - dh / 2,
        w: newW,
        h: newH,
      };
    });
  }, []);

  const startDrag = (id: string, e: React.MouseEvent, offsetX?: number, offsetY?: number, x?: number, y?: number) => {
    e.stopPropagation();
    const pos = screenToCanvas(e.clientX, e.clientY);
    setSelectedId(id);
    setDragState({
      id,
      startX: pos.x,
      startY: pos.y,
      lastX: pos.x,
      lastY: pos.y,
      origOffsetX: offsetX ?? 0,
      origOffsetY: offsetY ?? 0,
      origX: x,
      origY: y,
    });
  };

  const startResize = (id: string, corner: string, e: React.MouseEvent, ann: StickyNote) => {
    e.stopPropagation();
    e.preventDefault();
    const pos = screenToCanvas(e.clientX, e.clientY);
    setResizing({
      id,
      corner,
      startMouseX: pos.x,
      startMouseY: pos.y,
      origWidth: ann.width,
      origHeight: ann.height,
      origX: ann.x,
      origY: ann.y,
    });
    setSelectedId(id);
  };

  const renderGrid = () => {
    const lines: JSX.Element[] = [];
    const startX = Math.floor(viewBox.x / GRID_SPACING) * GRID_SPACING;
    const startY = Math.floor(viewBox.y / GRID_SPACING) * GRID_SPACING;
    const endX = viewBox.x + viewBox.w + GRID_SPACING;
    const endY = viewBox.y + viewBox.h + GRID_SPACING;

    for (let x = startX; x <= endX; x += GRID_SPACING) {
      lines.push(
        <line key={`vx-${x}`} x1={x} y1={viewBox.y} x2={x} y2={viewBox.y + viewBox.h} stroke="#E0E0E0" strokeWidth={0.5} />
      );
    }
    for (let y = startY; y <= endY; y += GRID_SPACING) {
      lines.push(
        <line key={`hz-${y}`} x1={viewBox.x} y1={y} x2={viewBox.x + viewBox.w} y2={y} stroke="#E0E0E0" strokeWidth={0.5} />
      );
    }
    return lines;
  };

  const renderCurrentPath = () => {
    if (!isDrawing || currentPoints.length < 2) return null;
    const { d } = smoothPath(currentPoints);
    return <path d={d} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />;
  };

  const renderArrowPreview = () => {
    if (!arrowStart || !arrowPreview) return null;
    const { line, head } = calculateArrowHead(arrowStart, arrowPreview);
    return (
      <g>
        <path d={line} fill="none" stroke={color} strokeWidth={3} />
        <path d={head} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" />
      </g>
    );
  };

  const getSpringDx = (id: string): number => {
    if (springOffset && springOffset.id === id) return springOffset.dx;
    return 0;
  };

  const getSpringDy = (id: string): number => {
    if (springOffset && springOffset.id === id) return springOffset.dy;
    return 0;
  };

  const renderAnnotation = (ann: Annotation) => {
    const isFadingOut = fadingOutIds.includes(ann.id);
    const isFadingIn = fadingInIds.includes(ann.id);
    const isBlinking = blinkingIds.includes(ann.id);

    let className = '';
    if (isBlinking) {
      className = 'blink';
    } else if (isFadingOut) {
      className = 'fade-out';
    } else if (isFadingIn) {
      className = 'fade-in';
    }

    const sdx = getSpringDx(ann.id);
    const sdy = getSpringDy(ann.id);

    if ('points' in ann) {
      const line = ann as DrawingLine;
      const { d } = smoothPath(line.points);
      return (
        <g
          key={line.id}
          className={className}
          transform={`translate(${line.offsetX + sdx}, ${line.offsetY + sdy})`}
          onMouseDown={(e) => startDrag(line.id, e, line.offsetX, line.offsetY)}
          style={{ cursor: 'pointer' }}
        >
          <path d={d} fill="none" stroke={line.color} strokeWidth={line.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          {selectedId === line.id && renderControlPoints(line)}
        </g>
      );
    }

    if ('from' in ann) {
      const arrow = ann as ArrowLine;
      const from = { x: arrow.from.x + arrow.offsetX, y: arrow.from.y + arrow.offsetY };
      const to = { x: arrow.to.x + arrow.offsetX, y: arrow.to.y + arrow.offsetY };
      const { line: lineD, head } = calculateArrowHead(from, to);
      return (
        <g
          key={arrow.id}
          className={className}
          transform={`translate(${sdx}, ${sdy})`}
          onMouseDown={(e) => startDrag(arrow.id, e, arrow.offsetX, arrow.offsetY)}
          style={{ cursor: 'pointer' }}
        >
          <path d={lineD} fill="none" stroke={arrow.color} strokeWidth={3} />
          <path d={head} fill="none" stroke={arrow.color} strokeWidth={3} strokeLinejoin="round" />
          {selectedId === arrow.id && (
            <>
              <circle cx={from.x} cy={from.y} r={4} fill="#3498DB" style={{ cursor: 'pointer' }} />
              <circle cx={to.x} cy={to.y} r={4} fill="#3498DB" style={{ cursor: 'pointer' }} />
            </>
          )}
        </g>
      );
    }

    if ('x' in ann) {
      const sticky = ann as StickyNote;
      const isEditing = editingStickyId === sticky.id;
      const { lines: wrappedLines, lineHeight } = wrapText(sticky.text, sticky.width - 16, 13, 3);

      return (
        <g
          key={sticky.id}
          className={className}
          transform={`translate(${sdx}, ${sdy})`}
          onMouseDown={(e) => {
            if (tool === 'eraser') return;
            startDrag(sticky.id, e, undefined, undefined, sticky.x, sticky.y);
          }}
          style={{ cursor: 'pointer' }}
        >
          <rect
            x={sticky.x}
            y={sticky.y}
            width={sticky.width}
            height={sticky.height}
            rx={6}
            ry={6}
            fill="#FFF9C4"
            stroke={isEditing ? '#1ABC9C' : '#F1C40F'}
            strokeWidth={isEditing ? 2 : 1.5}
            style={{ filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.15))' }}
            className={isEditing ? 'sticky-pulse' : ''}
          />
          {isEditing ? (
            <foreignObject x={sticky.x + 8} y={sticky.y + 8} width={sticky.width - 16} height={sticky.height - 16}>
              <input
                autoFocus
                defaultValue={sticky.text}
                className="sticky-input"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onUpdateAnnotation({ ...sticky, text: (e.target as HTMLInputElement).value });
                    setEditingStickyId(null);
                  }
                }}
                onBlur={(e) => {
                  onUpdateAnnotation({ ...sticky, text: (e.target as HTMLInputElement).value });
                  setEditingStickyId(null);
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: 13,
                  fontFamily: 'Inter, system-ui, sans-serif',
                  color: '#2C3E50',
                  resize: 'none',
                }}
              />
            </foreignObject>
          ) : (
            <text x={sticky.x + 8} y={sticky.y + 24} fontSize={13} fontFamily="Inter, system-ui, sans-serif" fill="#2C3E50">
              {wrappedLines.map((ln, i) => (
                <tspan key={i} x={sticky.x + 8} dy={i === 0 ? 0 : lineHeight}>
                  {ln}
                </tspan>
              ))}
            </text>
          )}
          {selectedId === sticky.id && renderStickyControlPoints(sticky)}
        </g>
      );
    }

    return null;
  };

  const renderControlPoints = (line: DrawingLine) => {
    const minX = Math.min(...line.points.map(p => p.x)) + line.offsetX;
    const minY = Math.min(...line.points.map(p => p.y)) + line.offsetY;
    const maxX = Math.max(...line.points.map(p => p.x)) + line.offsetX;
    const maxY = Math.max(...line.points.map(p => p.y)) + line.offsetY;

    const pts = [
      { x: minX, y: minY }, { x: (minX + maxX) / 2, y: minY }, { x: maxX, y: minY },
      { x: maxX, y: (minY + maxY) / 2 }, { x: maxX, y: maxY }, { x: (minX + maxX) / 2, y: maxY },
      { x: minX, y: maxY }, { x: minX, y: (minY + maxY) / 2 },
    ];

    return pts.map((p, i) => (
      <circle key={i} cx={p.x} cy={p.y} r={4} fill="#3498DB" style={{ cursor: 'pointer' }} />
    ));
  };

  const renderStickyControlPoints = (sticky: StickyNote) => {
    const corners = [
      { x: sticky.x, y: sticky.y, corner: 'top-left' },
      { x: sticky.x + sticky.width / 2, y: sticky.y, corner: 'top-center' },
      { x: sticky.x + sticky.width, y: sticky.y, corner: 'top-right' },
      { x: sticky.x + sticky.width, y: sticky.y + sticky.height / 2, corner: 'center-right' },
      { x: sticky.x + sticky.width, y: sticky.y + sticky.height, corner: 'bottom-right' },
      { x: sticky.x + sticky.width / 2, y: sticky.y + sticky.height, corner: 'bottom-center' },
      { x: sticky.x, y: sticky.y + sticky.height, corner: 'bottom-left' },
      { x: sticky.x, y: sticky.y + sticky.height / 2, corner: 'center-left' },
    ];

    return corners.map((c, i) => (
      <circle
        key={i}
        cx={c.x}
        cy={c.y}
        r={4}
        fill="#3498DB"
        style={{ cursor: 'pointer' }}
        onMouseDown={(e) => startResize(sticky.id, c.corner, e, sticky)}
      />
    ));
  };

  const renderCollaborators = () => {
    return collaborators.map(c => (
      <g key={c.id}>
        <circle cx={c.x} cy={c.y} r={10} fill={c.color} opacity={0.6} />
        <text x={c.x} y={c.y - 14} fontSize={10} fontFamily="Inter, system-ui, sans-serif" fill={c.color} textAnchor="middle">
          {c.name}
        </text>
      </g>
    ));
  };

  const cursorMap: Record<ToolType, string> = {
    pen: 'crosshair',
    sticky: 'crosshair',
    arrow: 'crosshair',
    eraser: 'pointer',
  };

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        overflow: 'hidden',
        background: '#FAFAFA',
      }}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        style={{ cursor: isPanning ? 'grabbing' : cursorMap[tool] }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        onWheel={handleWheel}
      >
        <rect x={viewBox.x} y={viewBox.y} width={viewBox.w} height={viewBox.h} fill="#FAFAFA" />
        {renderGrid()}
        {annotations.map(renderAnnotation)}
        {renderCurrentPath()}
        {renderArrowPreview()}
        {renderCollaborators()}
      </svg>
    </div>
  );
};

export default Canvas;
