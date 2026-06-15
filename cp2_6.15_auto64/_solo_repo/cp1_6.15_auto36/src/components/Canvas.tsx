import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Tool,
  Shape,
  User,
  Point,
  PenShape,
  RectangleShape,
  CircleShape,
  StickyShape,
  ToastType,
  ShapeType,
} from '../types';
import { CursorIcon } from './Icons';

interface CanvasProps {
  tool: Tool;
  shapes: Shape[];
  onShapesChange: (shapes: Shape[], recordHistory?: boolean) => void;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  users: User[];
  onCursorMove: (pos: Point) => void;
  onShapeCreated: (shape: Shape) => void;
  onShapeUpdated: (id: string, updates: Partial<Shape>) => void;
  onBatchUpdate: (updates: { id: string; updates: Partial<Shape> }[]) => void;
  onShapesDeleted: (ids: string[]) => void;
  getNextZIndex: () => number;
  animating: boolean;
  clearAnimating: boolean;
  showToast: (message: string, type?: ToastType) => void;
  exportMode: boolean;
}

type HandleType = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move';

interface TransformData {
  startShapes: Shape[];
  startBounds: Map<string, { x: number; y: number; w: number; h: number }>;
  startMouse: Point;
  handle: HandleType;
  activeId: string;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 5;
const HANDLE_SIZE = 8;

const Canvas: React.FC<CanvasProps> = ({
  tool,
  shapes,
  onShapesChange,
  selectedIds,
  onSelectedIdsChange,
  fillColor,
  strokeColor,
  strokeWidth,
  users,
  onCursorMove,
  onShapeCreated,
  onShapeUpdated,
  onBatchUpdate,
  onShapesDeleted,
  getNextZIndex,
  animating,
  clearAnimating,
  showToast,
  exportMode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState<Point>({ x: 100, y: 60 });
  const [scale, setScale] = useState(1);
  const [drawing, setDrawing] = useState(false);
  const [tempShape, setTempShape] = useState<Shape | null>(null);
  const [transform, setTransform] = useState<TransformData | null>(null);
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ mouse: Point; offset: Point } | null>(null);
  const [editingStickyId, setEditingStickyId] = useState<string | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<HandleType | null>(null);
  const lastCursorEmitRef = useRef<number>(0);

  const screenToWorld = useCallback(
    (clientX: number, clientY: number): Point => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      return {
        x: (clientX - rect.left - offset.x) / scale,
        y: (clientY - rect.top - offset.y) / scale,
      };
    },
    [offset, scale]
  );

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setScale((prev) => {
      const delta = -e.deltaY * 0.0015;
      const next = Math.min(Math.max(prev + prev * delta, MIN_SCALE), MAX_SCALE);
      const ratio = next / prev;
      setOffset((off) => ({
        x: mouseX - (mouseX - off.x) * ratio,
        y: mouseY - (mouseY - off.y) * ratio,
      }));
      return next;
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const getShapeBounds = useCallback((shape: Shape) => {
    if (shape.type === 'rectangle' || shape.type === 'sticky') {
      return { x: shape.x, y: shape.y, w: shape.width, h: shape.height };
    } else if (shape.type === 'circle') {
      return {
        x: shape.x - shape.radiusX,
        y: shape.y - shape.radiusY,
        w: shape.radiusX * 2,
        h: shape.radiusY * 2,
      };
    } else {
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      shape.points.forEach((p) => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      });
      const padding = shape.strokeWidth / 2 + 2;
      return {
        x: minX - padding,
        y: minY - padding,
        w: maxX - minX + padding * 2,
        h: maxY - minY + padding * 2,
      };
    }
  }, []);

  const hitTest = useCallback(
    (point: Point): string | null => {
      const sorted = [...shapes].sort((a, b) => a.zIndex - b.zIndex);
      for (let i = sorted.length - 1; i >= 0; i--) {
        const s = sorted[i];
        const b = getShapeBounds(s);
        if (point.x >= b.x && point.x <= b.x + b.w && point.y >= b.y && point.y <= b.y + b.h) {
          return s.id;
        }
      }
      return null;
    },
    [shapes, getShapeBounds]
  );

  const getHandlePositions = useCallback(
    (b: { x: number; y: number; w: number; h: number }) => {
      const h = HANDLE_SIZE / scale;
      return {
        nw: { x: b.x - h, y: b.y - h },
        n: { x: b.x + b.w / 2 - h, y: b.y - h },
        ne: { x: b.x + b.w - h, y: b.y - h },
        e: { x: b.x + b.w - h, y: b.y + b.h / 2 - h },
        se: { x: b.x + b.w - h, y: b.y + b.h - h },
        s: { x: b.x + b.w / 2 - h, y: b.y + b.h - h },
        sw: { x: b.x - h, y: b.y + b.h - h },
        w: { x: b.x - h, y: b.y + b.h / 2 - h },
      };
    },
    [scale]
  );

  const getHandleAt = useCallback(
    (point: Point): { id: string; handle: HandleType } | null => {
      const h = (HANDLE_SIZE / scale) * 2;
      const hitBox = (x: number, y: number) =>
        point.x >= x && point.x <= x + h && point.y >= y && point.y <= y + h;

      for (let i = selectedIds.length - 1; i >= 0; i--) {
        const id = selectedIds[i];
        const s = shapes.find((sh) => sh.id === id);
        if (!s) continue;
        const b = getShapeBounds(s);
        const hp = getHandlePositions(b);

        if (selectedIds.length === 1) {
          if (hitBox(hp.nw.x, hp.nw.y)) return { id, handle: 'nw' };
          if (hitBox(hp.ne.x, hp.ne.y)) return { id, handle: 'ne' };
          if (hitBox(hp.sw.x, hp.sw.y)) return { id, handle: 'sw' };
          if (hitBox(hp.se.x, hp.se.y)) return { id, handle: 'se' };
          if (hitBox(hp.n.x, hp.n.y)) return { id, handle: 'n' };
          if (hitBox(hp.s.x, hp.s.y)) return { id, handle: 's' };
          if (hitBox(hp.w.x, hp.w.y)) return { id, handle: 'w' };
          if (hitBox(hp.e.x, hp.e.y)) return { id, handle: 'e' };
        }

        if (point.x >= b.x && point.x <= b.x + b.w && point.y >= b.y && point.y <= b.y + b.h) {
          return { id, handle: 'move' };
        }
      }
      return null;
    },
    [selectedIds, shapes, getShapeBounds, getHandlePositions, scale]
  );

  const applyTransformToBounds = useCallback(
    (b: { x: number; y: number; w: number; h: number }, handle: HandleType, dx: number, dy: number) => {
      let { x, y, w, h } = b;

      switch (handle) {
        case 'nw':
          x = b.x + dx;
          y = b.y + dy;
          w = b.w - dx;
          h = b.h - dy;
          break;
        case 'ne':
          y = b.y + dy;
          w = b.w + dx;
          h = b.h - dy;
          break;
        case 'sw':
          x = b.x + dx;
          w = b.w - dx;
          h = b.h + dy;
          break;
        case 'se':
          w = b.w + dx;
          h = b.h + dy;
          break;
        case 'n':
          y = b.y + dy;
          h = b.h - dy;
          break;
        case 's':
          h = b.h + dy;
          break;
        case 'w':
          x = b.x + dx;
          w = b.w - dx;
          break;
        case 'e':
          w = b.w + dx;
          break;
        case 'move':
          x = b.x + dx;
          y = b.y + dy;
          break;
      }
      w = Math.max(10, w);
      h = Math.max(10, h);
      return { x, y, w, h };
    },
    []
  );

  const boundsToShapeUpdates = useCallback(
    (shape: Shape, nb: { x: number; y: number; w: number; h: number }, origBounds: { x: number; y: number; w: number; h: number }) => {
      const updates: Partial<Shape> = {};

      if (shape.type === 'rectangle' || shape.type === 'sticky') {
        updates.x = nb.x;
        updates.y = nb.y;
        updates.width = nb.w;
        updates.height = nb.h;
      } else if (shape.type === 'circle') {
        updates.x = nb.x + nb.w / 2;
        updates.y = nb.y + nb.h / 2;
        updates.radiusX = nb.w / 2;
        updates.radiusY = nb.h / 2;
      } else if (shape.type === 'pen') {
        const ox = origBounds.x;
        const oy = origBounds.y;
        const ow = Math.max(origBounds.w, 1);
        const oh = Math.max(origBounds.h, 1);
        const sx = nb.w / ow;
        const sy = nb.h / oh;
        updates.points = shape.points.map((p) => ({
          x: nb.x + (p.x - ox) * sx,
          y: nb.y + (p.y - oy) * sy,
        }));
      }
      return updates;
    },
    []
  );

  const onMouseDown = (e: React.MouseEvent) => {
    const world = screenToWorld(e.clientX, e.clientY);

    if (e.button === 1) {
      e.preventDefault();
      setPanning(true);
      setPanStart({ mouse: { x: e.clientX, y: e.clientY }, offset: { ...offset } });
      return;
    }

    if (e.button === 0 && (e.altKey || e.ctrlKey || e.metaKey)) {
      setPanning(true);
      setPanStart({ mouse: { x: e.clientX, y: e.clientY }, offset: { ...offset } });
      return;
    }

    if (e.button !== 0) return;

    if (editingStickyId) {
      setEditingStickyId(null);
    }

    if (tool === 'select') {
      const hitHandle = getHandleAt(world);
      if (hitHandle) {
        if (hitHandle.handle === 'move' && !selectedIds.includes(hitHandle.id)) {
          onSelectedIdsChange([hitHandle.id]);
        }
        const boundMap = new Map<string, { x: number; y: number; w: number; h: number }>();
        selectedIds.forEach((id) => {
          const s = shapes.find((sh) => sh.id === id);
          if (s) boundMap.set(id, getShapeBounds(s));
        });
        if (!boundMap.has(hitHandle.id)) {
          const s = shapes.find((sh) => sh.id === hitHandle.id);
          if (s) boundMap.set(hitHandle.id, getShapeBounds(s));
        }

        setTransform({
          startShapes: JSON.parse(JSON.stringify(shapes)),
          startBounds: boundMap,
          startMouse: world,
          handle: hitHandle.handle,
          activeId: hitHandle.id,
        });
        return;
      }

      const hit = hitTest(world);
      if (hit) {
        let newSelection: string[];
        if (e.shiftKey) {
          if (selectedIds.includes(hit)) {
            newSelection = selectedIds.filter((i) => i !== hit);
          } else {
            newSelection = [...selectedIds, hit];
          }
        } else {
          newSelection = selectedIds.includes(hit) ? selectedIds : [hit];
        }
        onSelectedIdsChange(newSelection);

        const boundMap = new Map<string, { x: number; y: number; w: number; h: number }>();
        newSelection.forEach((id) => {
          const s = shapes.find((sh) => sh.id === id);
          if (s) boundMap.set(id, getShapeBounds(s));
        });
        setTransform({
          startShapes: JSON.parse(JSON.stringify(shapes)),
          startBounds: boundMap,
          startMouse: world,
          handle: 'move',
          activeId: hit,
        });
      } else {
        onSelectedIdsChange([]);
      }
      return;
    }

    if (tool === 'eraser') {
      const hit = hitTest(world);
      if (hit) {
        const newShapes = shapes.filter((s) => s.id !== hit);
        onShapesChange(newShapes);
        onShapesDeleted([hit]);
      }
      setDrawing(true);
      return;
    }

    if (tool === 'pen') {
      const newShape: PenShape = {
        id: uuidv4(),
        type: 'pen',
        points: [{ ...world }],
        fillColor: 'transparent',
        strokeColor,
        strokeWidth,
        opacity: 1,
        zIndex: getNextZIndex(),
      };
      setTempShape(newShape);
      setDrawing(true);
      return;
    }

    if (tool === 'rectangle') {
      const newShape: RectangleShape = {
        id: uuidv4(),
        type: 'rectangle',
        x: world.x,
        y: world.y,
        width: 0.01,
        height: 0.01,
        fillColor,
        strokeColor,
        strokeWidth,
        opacity: 1,
        zIndex: getNextZIndex(),
      };
      setTempShape(newShape);
      setDrawing(true);
      return;
    }

    if (tool === 'circle') {
      const newShape: CircleShape = {
        id: uuidv4(),
        type: 'circle',
        x: world.x + 0.01,
        y: world.y + 0.01,
        radiusX: 0.01,
        radiusY: 0.01,
        fillColor,
        strokeColor,
        strokeWidth,
        opacity: 1,
        zIndex: getNextZIndex(),
      };
      setTempShape(newShape);
      setDrawing(true);
      return;
    }

    if (tool === 'sticky') {
      const newShape: StickyShape = {
        id: uuidv4(),
        type: 'sticky',
        x: world.x,
        y: world.y,
        width: 180,
        height: 140,
        fillColor: fillColor === 'transparent' ? '#fff59d' : fillColor,
        strokeColor,
        strokeWidth: 2,
        opacity: 0.95,
        zIndex: getNextZIndex(),
        text: '',
        fontSize: 14,
      };
      const newShapes = [...shapes, newShape];
      onShapesChange(newShapes);
      onShapeCreated(newShape);
      onSelectedIdsChange([newShape.id]);
      setTimeout(() => setEditingStickyId(newShape.id), 50);
      showToast('便签已添加，双击可编辑内容', 'info');
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const world = screenToWorld(e.clientX, e.clientY);

    const now = Date.now();
    if (now - lastCursorEmitRef.current > 80) {
      onCursorMove(world);
      lastCursorEmitRef.current = now;
    }

    if (panning && panStart) {
      const dx = e.clientX - panStart.mouse.x;
      const dy = e.clientY - panStart.mouse.y;
      setOffset({ x: panStart.offset.x + dx, y: panStart.offset.y + dy });
      return;
    }

    if (transform) {
      const dx = world.x - transform.startMouse.x;
      const dy = world.y - transform.startMouse.y;
      const newShapes = shapes.map((s) => {
        const orig = transform.startBounds.get(s.id);
        if (!orig) return s;
        const nb = applyTransformToBounds(orig, transform.handle, dx, dy);
        const updates = boundsToShapeUpdates(s, nb, orig);
        return { ...s, ...updates };
      });
      onShapesChange(newShapes, false);
      return;
    }

    if (tool === 'select' && selectedIds.length === 1 && !drawing) {
      const hh = getHandleAt(world);
      setHoveredHandle(hh?.handle || null);
    }

    if (!drawing) return;

    if (tool === 'eraser') {
      const hit = hitTest(world);
      if (hit) {
        const filtered = shapes.filter((s) => s.id !== hit);
        if (filtered.length !== shapes.length) {
          onShapesChange(filtered, false);
          onShapesDeleted([hit]);
        }
      }
      return;
    }

    if (tempShape && tempShape.type === 'pen') {
      const pts = [...tempShape.points, { x: world.x, y: world.y }];
      setTempShape({ ...tempShape, points: pts });
    } else if (tempShape && tempShape.type === 'rectangle') {
      const start = tempShape as RectangleShape;
      const x = Math.min(start.x, world.x);
      const y = Math.min(start.y, world.y);
      const w = Math.abs(world.x - start.x);
      const h = Math.abs(world.y - start.y);
      setTempShape({ ...tempShape, x, y, width: w, height: h });
    } else if (tempShape && tempShape.type === 'circle') {
      const start = tempShape as CircleShape;
      const sx = start.x - 0.01;
      const sy = start.y - 0.01;
      const x = Math.min(sx, world.x);
      const y = Math.min(sy, world.y);
      const w = Math.abs(world.x - sx);
      const h = Math.abs(world.y - sy);
      setTempShape({
        ...tempShape,
        x: x + w / 2,
        y: y + h / 2,
        radiusX: w / 2,
        radiusY: h / 2,
      });
    }
  };

  const onMouseUp = (e: React.MouseEvent) => {
    if (panning) {
      setPanning(false);
      setPanStart(null);
      return;
    }

    if (transform) {
      const updatesList: { id: string; updates: Partial<Shape> }[] = [];
      transform.startBounds.forEach((orig, id) => {
        const origShape = transform.startShapes.find((s) => s.id === id);
        const curShape = shapes.find((s) => s.id === id);
        if (!origShape || !curShape) return;
        const changes: Partial<Shape> = {};
        (Object.keys(curShape) as (keyof Shape)[]).forEach((k) => {
          if (JSON.stringify(origShape[k]) !== JSON.stringify(curShape[k])) {
            (changes as any)[k] = (curShape as any)[k];
          }
        });
        if (Object.keys(changes).length > 0) {
          updatesList.push({ id, updates: changes });
        }
      });

      if (updatesList.length > 0) {
        onBatchUpdate(updatesList);
        onShapesChange(shapes, true);
      }
      setTransform(null);
      return;
    }

    if (!drawing) return;
    setDrawing(false);

    if (tool === 'eraser') return;

    if (tempShape) {
      let valid = true;
      if (tempShape.type === 'pen') {
        valid = tempShape.points.length >= 2;
      } else if (tempShape.type === 'rectangle' || tempShape.type === 'sticky') {
        valid = tempShape.width > 2 && tempShape.height > 2;
      } else if (tempShape.type === 'circle') {
        valid = tempShape.radiusX > 1 && tempShape.radiusY > 1;
      }

      if (valid) {
        const newShapes = [...shapes, tempShape];
        onShapesChange(newShapes);
        onShapeCreated(tempShape);
        onSelectedIdsChange([tempShape.id]);
      } else if (tempShape.type === 'rectangle' || tempShape.type === 'circle') {
        if (tool === 'rectangle') {
          const fixed: RectangleShape = {
            ...(tempShape as RectangleShape),
            width: 120,
            height: 80,
          };
          const newShapes = [...shapes, fixed];
          onShapesChange(newShapes);
          onShapeCreated(fixed);
          onSelectedIdsChange([fixed.id]);
        } else if (tool === 'circle') {
          const fixed: CircleShape = {
            ...(tempShape as CircleShape),
            radiusX: 60,
            radiusY: 50,
          };
          const newShapes = [...shapes, fixed];
          onShapesChange(newShapes);
          onShapeCreated(fixed);
          onSelectedIdsChange([fixed.id]);
        }
      }
      setTempShape(null);
    }
  };

  const onMouseLeave = () => {
    if (panning) {
      setPanning(false);
      setPanStart(null);
    }
    if (transform) {
      if (tool === 'eraser') {
        setDrawing(false);
      }
    }
  };

  const getCursor = (): React.CSSProperties['cursor'] => {
    if (panning) return 'grabbing';
    if (hoveredHandle) {
      switch (hoveredHandle) {
        case 'nw':
        case 'se':
          return 'nwse-resize';
        case 'ne':
        case 'sw':
          return 'nesw-resize';
        case 'n':
        case 's':
          return 'ns-resize';
        case 'e':
        case 'w':
          return 'ew-resize';
        case 'move':
          return 'move';
      }
    }
    switch (tool) {
      case 'pen':
      case 'eraser':
        return 'crosshair';
      case 'rectangle':
      case 'circle':
        return 'crosshair';
      case 'sticky':
        return 'text';
      case 'select':
        return 'default';
      default:
        return 'default';
    }
  };

  const sortedShapes = useMemo(() => [...shapes].sort((a, b) => a.zIndex - b.zIndex), [shapes]);
  const displayShapes = useMemo(
    () => (tempShape ? [...sortedShapes, tempShape] : sortedShapes),
    [sortedShapes, tempShape]
  );

  const renderPathD = (points: Point[]) => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.01} ${points[0].y + 0.01}`;
    if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      d += ` Q ${points[i].x} ${points[i].y} ${xc} ${yc}`;
    }
    const last = points[points.length - 1];
    d += ` L ${last.x} ${last.y}`;
    return d;
  };

  const renderShape = (s: Shape, isTemp = false) => {
    const animClass = `${animating ? 'animating' : ''} ${!isTemp && clearAnimating ? 'scale-out' : ''} ${isTemp ? '' : 'fade-shape'}`;
    const remoteOutline = s.isRemote ? '#ff7043' : null;

    if (s.type === 'pen') {
      const d = renderPathD(s.points);
      return (
        <g key={s.id} style={{ pointerEvents: isTemp ? 'none' : 'all' }}>
          <path
            d={d}
            fill="none"
            stroke={s.strokeColor}
            strokeWidth={s.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`svg-shape ${animClass}`}
            opacity={s.opacity}
          />
          {remoteOutline && (
            <path
              d={d}
              fill="none"
              stroke={remoteOutline}
              strokeWidth={Math.max(2, s.strokeWidth + 2)}
              strokeDasharray="8,6"
              strokeLinecap="round"
              className="remote-outline"
              opacity={0.8}
              style={{ pointerEvents: 'none' }}
            />
          )}
        </g>
      );
    }

    if (s.type === 'rectangle') {
      return (
        <g key={s.id} style={{ pointerEvents: isTemp ? 'none' : 'all' }}>
          <rect
            x={s.x}
            y={s.y}
            width={Math.max(s.width, 0.1)}
            height={Math.max(s.height, 0.1)}
            rx={3}
            ry={3}
            fill={s.fillColor === 'transparent' ? 'none' : s.fillColor}
            stroke={s.strokeColor}
            strokeWidth={s.strokeWidth}
            className={`svg-shape ${animClass}`}
            opacity={s.opacity}
          />
          {remoteOutline && (
            <rect
              x={s.x}
              y={s.y}
              width={Math.max(s.width, 0.1)}
              height={Math.max(s.height, 0.1)}
              rx={3}
              ry={3}
              fill="none"
              stroke={remoteOutline}
              strokeWidth={3}
              strokeDasharray="8,6"
              className="remote-outline"
              opacity={0.85}
              style={{ pointerEvents: 'none' }}
            />
          )}
        </g>
      );
    }

    if (s.type === 'circle') {
      return (
        <g key={s.id} style={{ pointerEvents: isTemp ? 'none' : 'all' }}>
          <ellipse
            cx={s.x}
            cy={s.y}
            rx={Math.max(s.radiusX, 0.05)}
            ry={Math.max(s.radiusY, 0.05)}
            fill={s.fillColor === 'transparent' ? 'none' : s.fillColor}
            stroke={s.strokeColor}
            strokeWidth={s.strokeWidth}
            className={`svg-shape ${animClass}`}
            opacity={s.opacity}
          />
          {remoteOutline && (
            <ellipse
              cx={s.x}
              cy={s.y}
              rx={Math.max(s.radiusX, 0.05)}
              ry={Math.max(s.radiusY, 0.05)}
              fill="none"
              stroke={remoteOutline}
              strokeWidth={3}
              strokeDasharray="8,6"
              className="remote-outline"
              opacity={0.85}
              style={{ pointerEvents: 'none' }}
            />
          )}
        </g>
      );
    }

    if (s.type === 'sticky') {
      const isEditing = editingStickyId === s.id;
      return (
        <g key={s.id}>
          <foreignObject
            x={s.x}
            y={s.y}
            width={Math.max(s.width, 10)}
            height={Math.max(s.height, 10)}
            opacity={s.opacity}
            className={animClass}
            style={{ pointerEvents: isTemp ? 'none' : 'all' }}
          >
            <div
              xmlns="http://www.w3.org/1999/xhtml"
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: s.fillColor === 'transparent' ? 'rgba(255,245,157,0.95)' : s.fillColor,
                border: `${s.strokeWidth}px solid ${s.strokeColor}`,
                borderRadius: 6,
                overflow: 'hidden',
                boxSizing: 'border-box',
                boxShadow: '2px 3px 8px rgba(0,0,0,0.2)',
              }}
            >
              {isEditing ? (
                <textarea
                  className="sticky-text"
                  autoFocus
                  defaultValue={s.text}
                  onBlur={(e) => {
                    const newShapes = shapes.map((sh) =>
                      sh.id === s.id ? { ...sh, text: e.target.value } : sh
                    );
                    onShapesChange(newShapes);
                    onShapeUpdated(s.id, { text: e.target.value });
                    setEditingStickyId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') (e.target as HTMLTextAreaElement).blur();
                  }}
                  style={{ color: '#333' }}
                />
              ) : (
                <div
                  style={{
                    padding: 14,
                    fontSize: s.fontSize,
                    lineHeight: 1.5,
                    color: '#333',
                    fontFamily: 'inherit',
                    wordBreak: 'break-word',
                    height: '100%',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    cursor: tool === 'select' ? 'pointer' : 'default',
                    whiteSpace: 'pre-wrap',
                    userSelect: 'none',
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (tool === 'select') setEditingStickyId(s.id);
                  }}
                >
                  {s.text || (
                    <span style={{ color: '#999', fontStyle: 'italic' }}>双击编辑便签内容...</span>
                  )}
                </div>
              )}
            </div>
          </foreignObject>
          {remoteOutline && (
            <rect
              x={s.x}
              y={s.y}
              width={Math.max(s.width, 10)}
              height={Math.max(s.height, 10)}
              fill="none"
              stroke={remoteOutline}
              strokeWidth={3}
              strokeDasharray="8,6"
              className="remote-outline"
              opacity={0.85}
              style={{ pointerEvents: 'none' }}
              rx={6}
            />
          )}
        </g>
      );
    }
    return null;
  };

  const renderSelectionHandles = () => {
    if (exportMode || selectedIds.length === 0) return null;
    const h = HANDLE_SIZE / scale;

    return selectedIds.map((id) => {
      const s = shapes.find((sh) => sh.id === id);
      if (!s) return null;
      const b = getShapeBounds(s);

      return (
        <g key={`sel-${id}`}>
          <rect
            className="selection-box"
            x={b.x - 3}
            y={b.y - 3}
            width={b.w + 6}
            height={b.h + 6}
            style={{ pointerEvents: 'none' }}
          />
          {selectedIds.length === 1 && (
            <>
              <rect className="selection-handle" x={b.x - h} y={b.y - h} width={h * 2} height={h * 2} rx={2} />
              <rect
                className="selection-handle"
                x={b.x + b.w / 2 - h}
                y={b.y - h}
                width={h * 2}
                height={h * 2}
                rx={2}
              />
              <rect className="selection-handle" x={b.x + b.w - h} y={b.y - h} width={h * 2} height={h * 2} rx={2} />
              <rect
                className="selection-handle"
                x={b.x + b.w - h}
                y={b.y + b.h / 2 - h}
                width={h * 2}
                height={h * 2}
                rx={2}
              />
              <rect className="selection-handle" x={b.x + b.w - h} y={b.y + b.h - h} width={h * 2} height={h * 2} rx={2} />
              <rect
                className="selection-handle"
                x={b.x + b.w / 2 - h}
                y={b.y + b.h - h}
                width={h * 2}
                height={h * 2}
                rx={2}
              />
              <rect className="selection-handle" x={b.x - h} y={b.y + b.h - h} width={h * 2} height={h * 2} rx={2} />
              <rect
                className="selection-handle"
                x={b.x - h}
                y={b.y + b.h / 2 - h}
                width={h * 2}
                height={h * 2}
                rx={2}
              />
            </>
          )}
        </g>
      );
    });
  };

  const renderCursors = () => {
    if (exportMode) return null;
    return users.map((user) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return null;
      const screenX = user.cursor.x * scale + offset.x;
      const screenY = user.cursor.y * scale + offset.y;
      if (screenX < -200 || screenX > rect.width + 200 || screenY < -200 || screenY > rect.height + 200) return null;

      return (
        <div
          key={user.id}
          className="cursor-indicator"
          style={{
            transform: `translate(${screenX}px, ${screenY}px)`,
            left: 0,
            top: 0,
          }}
        >
          <CursorIcon color={user.color} />
          <div className="cursor-label" style={{ backgroundColor: user.color }}>
            {user.name}
          </div>
        </div>
      );
    });
  };

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      style={{ cursor: getCursor() }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          transition: panning || transform || drawing ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        <svg
          className="svg-canvas"
          xmlns="http://www.w3.org/2000/svg"
          width={10000}
          height={10000}
          style={{ display: 'block', overflow: 'visible' }}
        >
          {displayShapes.map((s) => renderShape(s, s === tempShape))}
          {renderSelectionHandles()}
        </svg>
      </div>
      {renderCursors()}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          right: 16,
          fontSize: 11,
          color: 'var(--text-secondary)',
          backgroundColor: 'rgba(45,45,45,0.8)',
          padding: '4px 10px',
          borderRadius: 4,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        缩放: {Math.round(scale * 100)}% | 中键平移 | 滚轮缩放
      </div>
    </div>
  );
};

export default Canvas;
