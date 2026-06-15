import { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import type { CanvasElement, Point, Stroke, TextElement, Sticker, ToolType, Transform, SelectionState, StickerType } from '../types';

const STICKER_EMOJIS: Record<StickerType, string> = {
  star: '⭐',
  smile: '😊',
  arrow: '➡️',
  heart: '❤️',
  lightning: '⚡',
};

interface InfiniteCanvasProps {
  elements: CanvasElement[];
  currentTool: ToolType;
  currentColor: string;
  brushWidth: number;
  userId: string;
  roomId: string;
  transform: Transform;
  setTransform: (t: Transform) => void;
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
  onElementAdd: (element: CanvasElement) => void;
  onElementUpdate: (element: CanvasElement) => void;
  onElementDelete: (id: string) => void;
  deletingId: string | null;
  newlyAddedId: string | null;
}

export interface InfiniteCanvasHandle {
  exportPNG: () => void;
}

function simplifyPoints(points: Point[], tolerance: number = 2): Point[] {
  if (points.length < 3) return points;
  const result: Point[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = result[result.length - 1];
    const curr = points[i];
    const dist = Math.sqrt((curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2);
    if (dist >= tolerance) {
      result.push(curr);
    }
  }
  result.push(points[points.length - 1]);
  return result;
}

function pointsToBezierPath(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y} L ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const cpx = (p0.x + p1.x) / 2;
    const cpy = (p0.y + p1.y) / 2;
    const cpx2 = (p1.x + p2.x) / 2;
    const cpy2 = (p1.y + p2.y) / 2;
    d += ` Q ${p1.x} ${p1.y} ${(cpx + cpx2) / 2} ${(cpy + cpy2) / 2}`;
  }
  if (points.length >= 2) {
    const last = points[points.length - 1];
    const prev = points[points.length - 2];
    d += ` L ${last.x} ${last.y}`;
  }
  return d;
}

function getElementBBox(element: CanvasElement): { x: number; y: number; width: number; height: number } {
  if (element.type === 'stroke') {
    const xs = element.points.map((p) => p.x);
    const ys = element.points.map((p) => p.y);
    const minX = Math.min(...xs) - element.width / 2;
    const minY = Math.min(...ys) - element.width / 2;
    const maxX = Math.max(...xs) + element.width / 2;
    const maxY = Math.max(...ys) + element.width / 2;
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  } else if (element.type === 'text') {
    const approxWidth = element.content.length * element.fontSize * 0.6;
    return { x: element.x, y: element.y - element.fontSize, width: approxWidth, height: element.fontSize * 1.2 };
  } else {
    const size = element.size;
    return { x: element.x - size / 2, y: element.y - size / 2, width: size, height: size };
  }
}

function rotatePoint(p: Point, center: Point, angleDeg: number): Point {
  const angle = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

function pointInBBox(pt: Point, bbox: { x: number; y: number; width: number; height: number }, padding: number = 0): boolean {
  return (
    pt.x >= bbox.x - padding &&
    pt.x <= bbox.x + bbox.width + padding &&
    pt.y >= bbox.y - padding &&
    pt.y <= bbox.y + bbox.height + padding
  );
}

export const InfiniteCanvas = forwardRef<InfiniteCanvasHandle, InfiniteCanvasProps>(function InfiniteCanvas(
  {
    elements,
    currentTool,
    currentColor,
    brushWidth,
    userId,
    roomId,
    transform,
    setTransform,
    selectedElementId,
    setSelectedElementId,
    onElementAdd,
    onElementUpdate,
    onElementDelete,
    deletingId,
    newlyAddedId,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point | null>(null);
  const [selection, setSelection] = useState<SelectionState>({
    elementId: null,
    handleType: null,
    startPoint: null,
    originalElement: null,
  });
  const [textInput, setTextInput] = useState<{ x: number; y: number; elementId?: string; content: string } | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const animationRef = useRef<number | null>(null);

  const screenToWorld = useCallback(
    (screenX: number, screenY: number): Point => {
      const container = containerRef.current;
      if (!container) return { x: 0, y: 0 };
      const rect = container.getBoundingClientRect();
      const x = (screenX - rect.left - transform.x) / transform.scale;
      const y = (screenY - rect.top - transform.y) / transform.scale;
      return { x, y };
    },
    [transform]
  );

  useImperativeHandle(ref, () => ({
    exportPNG: () => {
      const svg = svgRef.current;
      if (!svg) return;

      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

      if (elements.length === 0) {
        const canvas = document.createElement('canvas');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        const link = document.createElement('a');
        link.download = `sketchy-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        return;
      }

      const bboxes = elements.map(getElementBBox);
      const minX = Math.min(...bboxes.map((b) => b.x)) - 40;
      const minY = Math.min(...bboxes.map((b) => b.y)) - 40;
      const maxX = Math.max(...bboxes.map((b) => b.x + b.width)) + 40;
      const maxY = Math.max(...bboxes.map((b) => b.y + b.height)) + 40;

      const width = (maxX - minX) * transform.scale;
      const height = (maxY - minY) * transform.scale;

      clone.setAttribute('width', `${width}`);
      clone.setAttribute('height', `${height}`);
      clone.setAttribute('viewBox', `${minX} ${minY} ${maxX - minX} ${maxY - minY}`);

      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bg.setAttribute('x', String(minX));
      bg.setAttribute('y', String(minY));
      bg.setAttribute('width', String(maxX - minX));
      bg.setAttribute('height', String(maxY - minY));
      bg.setAttribute('fill', '#ffffff');
      clone.insertBefore(bg, clone.firstChild);

      const xml = new XMLSerializer().serializeToString(clone);
      const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(width);
        canvas.height = Math.ceil(height);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
        URL.revokeObjectURL(url);
        const link = document.createElement('a');
        link.download = `sketchy-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      };
      img.src = url;
    },
  }));

  const getHandlePosition = useCallback(
    (element: CanvasElement, handle: string): Point => {
      const bbox = getElementBBox(element);
      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2;
      const rot = (element as any).rotation || 0;

      let rawPt: Point;
      switch (handle) {
        case 'resize-tl':
          rawPt = { x: bbox.x, y: bbox.y };
          break;
        case 'resize-tr':
          rawPt = { x: bbox.x + bbox.width, y: bbox.y };
          break;
        case 'resize-bl':
          rawPt = { x: bbox.x, y: bbox.y + bbox.height };
          break;
        case 'resize-br':
          rawPt = { x: bbox.x + bbox.width, y: bbox.y + bbox.height };
          break;
        case 'rotate':
          rawPt = { x: cx, y: bbox.y - 30 };
          break;
        default:
          rawPt = { x: cx, y: cy };
      }
      return rotatePoint(rawPt, { x: cx, y: cy }, rot);
    },
    []
  );

  const hitTestElement = useCallback(
    (worldPt: Point): { element: CanvasElement; handleType: SelectionState['handleType'] } | null => {
      for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        const bbox = getElementBBox(el);
        const rot = (el as any).rotation || 0;
        const center = { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 };
        const localPt = rotatePoint(worldPt, center, -rot);

        const handleSize = 8 / transform.scale;
        const handlePad = 4 / transform.scale;

        if (selectedElementId === el.id) {
          const handles: { type: SelectionState['handleType']; raw: Point }[] = [
            { type: 'resize-tl', raw: { x: bbox.x, y: bbox.y } },
            { type: 'resize-tr', raw: { x: bbox.x + bbox.width, y: bbox.y } },
            { type: 'resize-bl', raw: { x: bbox.x, y: bbox.y + bbox.height } },
            { type: 'resize-br', raw: { x: bbox.x + bbox.width, y: bbox.y + bbox.height } },
            { type: 'rotate', raw: { x: center.x, y: bbox.y - 30 } },
          ];
          for (const h of handles) {
            if (
              Math.abs(localPt.x - h.raw.x) <= handleSize + handlePad &&
              Math.abs(localPt.y - h.raw.y) <= handleSize + handlePad
            ) {
              return { element: el, handleType: h.type };
            }
          }
        }

        if (el.type === 'stroke') {
          for (let j = 0; j < el.points.length - 1; j++) {
            const p1 = el.points[j];
            const p2 = el.points[j + 1];
            const dist = distanceToSegment(localPt, p1, p2);
            if (dist <= Math.max(el.width / 2 + 4, 6)) {
              return { element: el, handleType: 'move' };
            }
          }
        } else {
          if (pointInBBox(localPt, bbox, 4)) {
            return { element: el, handleType: 'move' };
          }
        }
      }
      return null;
    },
    [elements, selectedElementId, transform.scale]
  );

  const distanceToSegment = (p: Point, v: Point, w: Point): number => {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return Math.sqrt((p.x - v.x) ** 2 + (p.y - v.y) ** 2);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const proj = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
    return Math.sqrt((p.x - proj.x) ** 2 + (p.y - proj.y) ** 2);
  };

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (textInput) return;
      (e.target as Element).setPointerCapture?.(e.pointerId);

      const worldPt = screenToWorld(e.clientX, e.clientY);

      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
        e.preventDefault();
        return;
      }

      if (currentTool === 'select' || selectedElementId) {
        const hit = hitTestElement(worldPt);
        if (hit) {
          setSelectedElementId(hit.element.id);
          setSelection({
            elementId: hit.element.id,
            handleType: hit.handleType,
            startPoint: worldPt,
            originalElement: JSON.parse(JSON.stringify(hit.element)),
          });
          return;
        }
      }

      if (currentTool === 'brush') {
        const newStroke: Stroke = {
          id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: 'stroke',
          roomId,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          points: [worldPt],
          color: currentColor,
          width: brushWidth,
        };
        setCurrentStroke(newStroke);
        setIsDrawing(true);
        setSelectedElementId(null);
        return;
      }

      if (currentTool === 'text') {
        setTextInput({ x: worldPt.x, y: worldPt.y, content: '' });
        setSelectedElementId(null);
        return;
      }

      setSelectedElementId(null);
    },
    [
      currentTool,
      currentColor,
      brushWidth,
      userId,
      roomId,
      transform,
      screenToWorld,
      selectedElementId,
      setSelectedElementId,
      hitTestElement,
      textInput,
    ]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const worldPt = screenToWorld(e.clientX, e.clientY);

      if (isPanning && panStart) {
        const newX = e.clientX - panStart.x;
        const newY = e.clientY - panStart.y;
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        animationRef.current = requestAnimationFrame(() => {
          setTransform({ ...transform, x: newX, y: newY });
        });
        return;
      }

      if (isDrawing && currentStroke) {
        const last = currentStroke.points[currentStroke.points.length - 1];
        const dist = Math.sqrt((worldPt.x - last.x) ** 2 + (worldPt.y - last.y) ** 2);
        if (dist >= 1.5) {
          setCurrentStroke({
            ...currentStroke,
            points: [...currentStroke.points, worldPt],
          });
        }
        return;
      }

      if (selection.elementId && selection.startPoint && selection.originalElement) {
        const el = selection.originalElement;
        const dx = worldPt.x - selection.startPoint.x;
        const dy = worldPt.y - selection.startPoint.y;

        if (selection.handleType === 'move') {
          if (el.type === 'stroke') {
            const newPoints = el.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
            onElementUpdate({ ...el, points: newPoints, updatedAt: Date.now() } as Stroke);
          } else if (el.type === 'text') {
            onElementUpdate({ ...el, x: el.x + dx, y: el.y + dy, updatedAt: Date.now() } as TextElement);
          } else if (el.type === 'sticker') {
            onElementUpdate({ ...el, x: el.x + dx, y: el.y + dy, updatedAt: Date.now() } as Sticker);
          }
        } else if (selection.handleType?.startsWith('resize') && el.type === 'stroke') {
          const bbox = getElementBBox(el);
          const cx = bbox.x + bbox.width / 2;
          const cy = bbox.y + bbox.height / 2;

          let scaleX = 1;
          let scaleY = 1;
          if (selection.handleType === 'resize-br') {
            scaleX = 1 + dx / (bbox.width / 2 || 1);
            scaleY = 1 + dy / (bbox.height / 2 || 1);
          } else if (selection.handleType === 'resize-tr') {
            scaleX = 1 + dx / (bbox.width / 2 || 1);
            scaleY = 1 - dy / (bbox.height / 2 || 1);
          } else if (selection.handleType === 'resize-bl') {
            scaleX = 1 - dx / (bbox.width / 2 || 1);
            scaleY = 1 + dy / (bbox.height / 2 || 1);
          } else if (selection.handleType === 'resize-tl') {
            scaleX = 1 - dx / (bbox.width / 2 || 1);
            scaleY = 1 - dy / (bbox.height / 2 || 1);
          }
          const scale = Math.max(0.1, (Math.abs(scaleX) + Math.abs(scaleY)) / 2);
          const newPoints = el.points.map((p) => ({
            x: cx + (p.x - cx) * scale,
            y: cy + (p.y - cy) * scale,
          }));
          const newWidth = Math.max(1, el.width * scale);
          onElementUpdate({
            ...el,
            points: newPoints,
            width: newWidth,
            updatedAt: Date.now(),
          } as Stroke);
        } else if (selection.handleType === 'rotate' && el.type === 'stroke') {
          const bbox = getElementBBox(el);
          const cx = bbox.x + bbox.width / 2;
          const cy = bbox.y + bbox.height / 2;
          const startAngle = Math.atan2(selection.startPoint.y - cy, selection.startPoint.x - cx);
          const currAngle = Math.atan2(worldPt.y - cy, worldPt.x - cx);
          let angleDeg = ((currAngle - startAngle) * 180) / Math.PI;
          if (e.shiftKey) {
            angleDeg = Math.round(angleDeg / 15) * 15;
          }
          const newPoints = el.points.map((p) => rotatePoint(p, { x: cx, y: cy }, angleDeg));
          onElementUpdate({
            ...(el as any),
            points: newPoints,
            rotation: (((el as any).rotation || 0) + angleDeg) % 360,
            updatedAt: Date.now(),
          });
        }
      }
    },
    [
      isPanning,
      panStart,
      isDrawing,
      currentStroke,
      selection,
      transform,
      setTransform,
      screenToWorld,
      onElementUpdate,
    ]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      (e.target as Element).releasePointerCapture?.(e.pointerId);

      if (isPanning) {
        setIsPanning(false);
        setPanStart(null);
      }

      if (isDrawing && currentStroke) {
        const simplified = simplifyPoints(currentStroke.points, 1.5);
        if (simplified.length >= 2) {
          onElementAdd({
            ...currentStroke,
            points: simplified,
            updatedAt: Date.now(),
          });
        }
        setCurrentStroke(null);
        setIsDrawing(false);
      }

      if (selection.elementId) {
        setSelection({ elementId: null, handleType: null, startPoint: null, originalElement: null });
      }
    },
    [isDrawing, currentStroke, isPanning, selection, onElementAdd]
  );

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const delta = -e.deltaY * 0.001;
      let newScale = transform.scale * (1 + delta);
      newScale = Math.max(0.3, Math.min(5, newScale));

      const worldX = (mouseX - transform.x) / transform.scale;
      const worldY = (mouseY - transform.y) / transform.scale;

      const newX = mouseX - worldX * newScale;
      const newY = mouseY - worldY * newScale;

      setTransform({ x: newX, y: newY, scale: newScale });
    },
    [transform, setTransform]
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (textInput) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementId && !editingTextId) {
          const target = e.target as HTMLElement;
          if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
          onElementDelete(selectedElementId);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedElementId, onElementDelete, textInput, editingTextId]);

  const submitTextInput = useCallback(
    (content: string) => {
      if (!textInput) return;
      const trimmed = content.trim();
      if (!trimmed) {
        setTextInput(null);
        return;
      }

      if (textInput.elementId) {
        const el = elements.find((e) => e.id === textInput.elementId);
        if (el && el.type === 'text') {
          onElementUpdate({
            ...el,
            content: trimmed,
            updatedAt: Date.now(),
          });
        }
        setEditingTextId(null);
      } else {
        const newText: TextElement = {
          id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: 'text',
          roomId,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          x: textInput.x,
          y: textInput.y,
          content: trimmed,
          fontSize: 16,
          color: currentColor,
          fontFamily: 'sans-serif',
        };
        onElementAdd(newText);
      }
      setTextInput(null);
    },
    [textInput, elements, roomId, userId, currentColor, onElementAdd, onElementUpdate]
  );

  const selectedElement = elements.find((e) => e.id === selectedElementId);

  const renderElement = (element: CanvasElement) => {
    const isRemote = element.isRemote;
    const isNewlyAdded = newlyAddedId === element.id;
    const isDeleting = deletingId === element.id;
    const isSelected = selectedElementId === element.id;
    const opacity = element.opacity ?? (isRemote ? 0.7 : 1);

    const commonStyle: React.CSSProperties = {
      transition: isNewlyAdded ? 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.1s ease' : 'opacity 0.1s ease',
      transformOrigin: 'center',
      transform: isNewlyAdded ? 'scale(1)' : undefined,
      opacity: isDeleting ? 0 : opacity,
      animation: isDeleting ? 'flash-twice 0.3s ease-out forwards' : undefined,
      cursor: isSelected ? 'move' : 'pointer',
    };

    if (element.type === 'stroke') {
      const d = pointsToBezierPath(element.points);
      return (
        <path
          key={element.id}
          d={d}
          stroke={element.color}
          strokeWidth={element.width}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={commonStyle}
          className="stroke-element"
        />
      );
    }

    if (element.type === 'text') {
      return (
        <text
          key={element.id}
          x={element.x}
          y={element.y}
          fill={element.color}
          fontSize={element.fontSize}
          fontFamily={element.fontFamily}
          style={{
            ...commonStyle,
            userSelect: 'none',
            pointerEvents: editingTextId === element.id ? 'none' : 'auto',
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setEditingTextId(element.id);
            setSelectedElementId(element.id);
            setTextInput({
              x: element.x,
              y: element.y,
              elementId: element.id,
              content: element.content,
            });
          }}
          className="text-element"
        >
          {element.content}
        </text>
      );
    }

    if (element.type === 'sticker') {
      return (
        <text
          key={element.id}
          x={element.x}
          y={element.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={element.size}
          style={{
            ...commonStyle,
            userSelect: 'none',
            animation: isNewlyAdded
              ? 'sticker-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
              : isDeleting
              ? 'flash-twice 0.3s ease-out forwards'
              : undefined,
          }}
          className="sticker-element"
        >
          {STICKER_EMOJIS[element.stickerType]}
        </text>
      );
    }

    return null;
  };

  const renderSelectionHandles = () => {
    if (!selectedElement) return null;

    const bbox = getElementBBox(selectedElement);
    const rot = (selectedElement as any).rotation || 0;
    const cx = bbox.x + bbox.width / 2;
    const cy = bbox.y + bbox.height / 2;

    const handleSize = 8 / transform.scale;
    const strokeWidth = 2 / transform.scale;

    return (
      <g style={{ pointerEvents: 'none' }}>
        <rect
          x={bbox.x - 4 / transform.scale}
          y={bbox.y - 4 / transform.scale}
          width={bbox.width + 8 / transform.scale}
          height={bbox.height + 8 / transform.scale}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={strokeWidth}
          strokeDasharray={`${6 / transform.scale} ${4 / transform.scale}`}
          transform={`rotate(${rot} ${cx} ${cy})`}
          style={{ pointerEvents: 'none' }}
        />
        {selectedElement.type === 'stroke' && (
          <>
            <circle
              cx={getHandlePosition(selectedElement, 'resize-tl').x}
              cy={getHandlePosition(selectedElement, 'resize-tl').y}
              r={handleSize}
              fill="white"
              stroke="#3b82f6"
              strokeWidth={strokeWidth}
              style={{ cursor: 'nwse-resize', pointerEvents: 'auto' }}
            />
            <circle
              cx={getHandlePosition(selectedElement, 'resize-tr').x}
              cy={getHandlePosition(selectedElement, 'resize-tr').y}
              r={handleSize}
              fill="white"
              stroke="#3b82f6"
              strokeWidth={strokeWidth}
              style={{ cursor: 'nesw-resize', pointerEvents: 'auto' }}
            />
            <circle
              cx={getHandlePosition(selectedElement, 'resize-bl').x}
              cy={getHandlePosition(selectedElement, 'resize-bl').y}
              r={handleSize}
              fill="white"
              stroke="#3b82f6"
              strokeWidth={strokeWidth}
              style={{ cursor: 'nesw-resize', pointerEvents: 'auto' }}
            />
            <circle
              cx={getHandlePosition(selectedElement, 'resize-br').x}
              cy={getHandlePosition(selectedElement, 'resize-br').y}
              r={handleSize}
              fill="white"
              stroke="#3b82f6"
              strokeWidth={strokeWidth}
              style={{ cursor: 'nwse-resize', pointerEvents: 'auto' }}
            />
            <line
              x1={cx}
              y1={bbox.y}
              x2={cx}
              y2={bbox.y - 30}
              stroke="#3b82f6"
              strokeWidth={strokeWidth}
              transform={`rotate(${rot} ${cx} ${cy})`}
              style={{ pointerEvents: 'none' }}
            />
            <circle
              cx={getHandlePosition(selectedElement, 'rotate').x}
              cy={getHandlePosition(selectedElement, 'rotate').y}
              r={handleSize}
              fill="white"
              stroke="#3b82f6"
              strokeWidth={strokeWidth}
              style={{ cursor: 'grab', pointerEvents: 'auto' }}
            />
          </>
        )}
      </g>
    );
  };

  const container = containerRef.current;
  const viewportWidth = container?.clientWidth || window.innerWidth;
  const viewportHeight = container?.clientHeight || window.innerHeight;
  const gridSpacing = 40;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#ffffff',
        cursor: isPanning ? 'grabbing' : currentTool === 'brush' ? 'crosshair' : currentTool === 'text' ? 'text' : 'default',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{ display: 'block' }}
      >
        <defs>
          <pattern
            id="grid"
            width={gridSpacing * transform.scale}
            height={gridSpacing * transform.scale}
            patternUnits="userSpaceOnUse"
            x={transform.x % (gridSpacing * transform.scale)}
            y={transform.y % (gridSpacing * transform.scale)}
          >
            <path
              d={`M ${gridSpacing * transform.scale} 0 L 0 0 0 ${gridSpacing * transform.scale}`}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="1"
            />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#grid)" />

        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {elements.filter((e) => e.id !== deletingId).map(renderElement)}

          {currentStroke && (
            <path
              d={pointsToBezierPath(currentStroke.points)}
              stroke={currentStroke.color}
              strokeWidth={currentStroke.width}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.9}
            />
          )}

          {renderSelectionHandles()}
        </g>
      </svg>

      {textInput && (
        <div
          style={{
            position: 'fixed',
            left: transform.x + textInput.x * transform.scale,
            top: transform.y + (textInput.y - (textInput.elementId ? 16 : 0)) * transform.scale,
            zIndex: 200,
            pointerEvents: 'auto',
          }}
        >
          <input
            type="text"
            autoFocus
            defaultValue={textInput.content}
            placeholder="输入文字..."
            onBlur={(e) => submitTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitTextInput(e.currentTarget.value);
              if (e.key === 'Escape') setTextInput(null);
            }}
            style={{
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
              border: '2px solid #6366f1',
              padding: '6px 10px',
              fontSize: `${16 * transform.scale}px`,
              fontFamily: 'sans-serif',
              color: currentColor,
              outline: 'none',
              minWidth: '120px',
              width: 'auto',
              animation: 'fadeIn 0.2s ease-out',
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes flash-twice {
          0%, 100% { opacity: 1; }
          25% { opacity: 0; }
          50% { opacity: 1; }
          75% { opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes sticker-pop {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .stroke-element, .text-element, .sticker-element {
          transition: opacity 0.1s ease;
        }
      `}</style>
    </div>
  );
});
