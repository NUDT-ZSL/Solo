import React, { useRef, useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Tool, Shape, User, Point, PenShape, RectangleShape, CircleShape, StickyShape, ToastType } from '../types';
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
  startPoints: { id: string; x: number; y: number; w: number; h: number }[];
  startMouse: Point;
  handle: HandleType;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 5;

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
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [drawing, setDrawing] = useState(false);
  const [tempShape, setTempShape] = useState<Shape | null>(null);
  const [transform, setTransform] = useState<TransformData | null>(null);
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ mouse: Point; offset: Point } | null>(null);
  const [editingStickyId, setEditingStickyId] = useState<string | null>(null);
  const cursorPosRef = useRef<Point | null>(null);
  const [, forceUpdate] = useState(0);

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
    const delta = -e.deltaY * 0.001;
    setScale((prev) => {
      const next = Math.min(Math.max(prev + prev * delta, MIN_SCALE), MAX_SCALE);
      return next;
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'v' || e.key === 'V') {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          // Tool change handled by App via keyboard if needed
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getShapeBounds = useCallback((shape: Shape) => {
    if (shape.type === 'rectangle' || shape.type === 'sticky') {
      return { x: shape.x, y: shape.y, w: shape.width, h: shape.height };
    } else if (shape.type === 'circle') {
      return { x: shape.x - shape.radiusX, y: shape.y - shape.radiusY, w: shape.radiusX * 2, h: shape.radiusY * 2 };
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
      const padding = shape.strokeWidth;
      return { x: minX - padding, y: minY - padding, w: maxX - minX + padding * 2, h: maxY - minY + padding * 2 };
    }
  }, []);

  const hitTest = useCallback(
    (point: Point): string | null => {
      for (let i = shapes.length - 1; i >= 0; i--) {
        const s = shapes[i];
        const b = getShapeBounds(s);
        if (point.x >= b.x && point.x <= b.x + b.w && point.y >= b.y && point.y <= b.y + b.h) {
          return s.id;
        }
      }
      return null;
    },
    [shapes, getShapeBounds]
  );

  const getHandleAt = useCallback(
    (point: Point): { id: string; handle: HandleType } | null => {
      for (let i = selectedIds.length - 1; i >= 0; i--) {
        const id = selectedIds[i];
        const s = shapes.find((sh) => sh.id === id);
        if (!s) continue;
        const b = getShapeBounds(s);
        const handleSize = 8 / scale;
        const hb = {
          x: b.x - handleSize,
          y: b.y - handleSize,
          w: handleSize * 2,
          h: handleSize * 2,
        };
        const inH = (x: number, y: number) =>
          point.x >= x && point.x <= x + handleSize * 2 && point.y >= y && point.y <= y + handleSize * 2;

        if (selectedIds.length === 1) {
          if (inH(b.x - handleSize, b.y - handleSize)) return { id, handle: 'nw' };
          if (inH(b.x + b.w - handleSize, b.y - handleSize)) return { id, handle: 'ne' };
          if (inH(b.x - handleSize, b.y + b.h - handleSize)) return { id, handle: 'sw' };
          if (inH(b.x + b.w - handleSize, b.y + b.h - handleSize)) return { id, handle: 'se' };
          if (inH(b.x + b.w / 2 - handleSize, b.y - handleSize)) return { id, handle: 'n' };
          if (inH(b.x + b.w / 2 - handleSize, b.y + b.h - handleSize)) return { id, handle: 's' };
          if (inH(b.x - handleSize, b.y + b.h / 2 - handleSize)) return { id, handle: 'w' };
          if (inH(b.x + b.w - handleSize, b.y + b.h / 2 - handleSize)) return { id, handle: 'e' };
        }
        if (point.x >= b.x && point.x <= b.x + b.w && point.y >= b.y && point.y <= b.y + b.h) {
          return { id, handle: 'move' };
        }
      }
      return null;
    },
    [selectedIds, shapes, getShapeBounds, scale]
  );

  const applyHandleTransform = useCallback(
    (shape: Shape, handle: HandleType, deltaX: number, deltaY: number, start: { x: number; y: number; w: number; h: number }) => {
      const { x: sx, y: sy, w: sw, h: sh } = start;
      let x = sx,
        y = sy,
        w = sw,
        h = sh;

      switch (handle) {
        case 'nw':
          x = sx + deltaX;
          y = sy + deltaY;
          w = sw - deltaX;
          h = sh - deltaY;
          break;
        case 'ne':
          y = sy + deltaY;
          w = sw + deltaX;
          h = sh - deltaY;
          break;
        case 'sw':
          x = sx + deltaX;
          w = sw - deltaX;
          h = sh + deltaY;
          break;
        case 'se':
          w = sw + deltaX;
          h = sh + deltaY;
          break;
        case 'n':
          y = sy + deltaY;
          h = sh - deltaY;
          break;
        case 's':
          h = sh + deltaY;
          break;
        case 'w':
          x = sx + deltaX;
          w = sw - deltaX;
          break;
        case 'e':
          w = sw + deltaX;
          break;
        case 'move':
          x = sx + deltaX;
          y = sy + deltaY;
          break;
      }
      w = Math.max(10, w);
      h = Math.max(10, h);

      const updates: Partial<Shape> = {};
      if (shape.type === 'rectangle' || shape.type === 'sticky') {
        updates.x = x;
        updates.y = y;
        updates.width = w;
        updates.height = h;
      } else if (shape.type === 'circle') {
        const cx = shape.x;
        const cy = shape.y;
        const rx = shape.radiusX;
        const ry = shape.radiusY;
        const origX = cx - rx;
        const origY = cy - ry;
        const origW = rx * 2;
        const origH = ry * 2;
        let nx = origX,
          ny = origY,
          nw = origW,
          nh = origH;
        if (handle.includes('w')) {
          nx = origX + deltaX;
          nw = origW - deltaX;
        }
        if (handle.includes('e')) {
          nw = origW + deltaX;
        }
        if (handle.includes('n')) {
          ny = origY + deltaY;
          nh = origH - deltaY;
        }
        if (handle.includes('s')) {
          nh = origH + deltaY;
        }
        if (handle === 'move') {
          nx = origX + deltaX;
          ny = origY + deltaY;
        }
        nw = Math.max(10, nw);
        nh = Math.max(10, nh);
        updates.x = nx + nw / 2;
        updates.y = ny + nh / 2;
        updates.radiusX = nw / 2;
        updates.radiusY = nh / 2;
      } else if (shape.type === 'pen') {
        if (handle === 'move') {
          updates.points = shape.points.map((p) => ({ x: p.x + deltaX, y: p.y + deltaY }));
        } else {
          const origB = { x: sx, y: sy, w: sw, h: sh };
          const scaleX = w / Math.max(origB.w, 1);
          const scaleY = h / Math.max(origB.h, 1);
          updates.points = shape.points.map((p) => ({
            x: origB.x + (p.x - origB.x) * scaleX + (x - origB.x),
            y: origB.y + (p.y - origB.y) * scaleY + (y - origB.y),
          }));
        }
      }
      return updates;
    },
    []
  );

  const onMouseDown = (e: React.MouseEvent) => {
    const world = screenToWorld(e.clientX, e.clientY);
    cursorPosRef.current = world;

    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setPanning(true);
      setPanStart({ mouse: { x: e.clientX, y: e.clientY }, offset: { ...offset } });
      return;
    }

    if (e.button !== 0) return;

    if (tool === 'select') {
      const hitHandle = getHandleAt(world);
      if (hitHandle) {
        if (hitHandle.handle === 'move') {
          if (!selectedIds.includes(hitHandle.id)) {
            onSelectedIdsChange([hitHandle.id]);
            return;
          }
        }
        setTransform({
          startShapes: JSON.parse(JSON.stringify(shapes)),
          startPoints: selectedIds.map((id) => {
            const s = shapes.find((sh) => sh.id === id)!;
            const b = getShapeBounds(s);
            return { id, x: b.x, y: b.y, w: b.w, h: b.h };
          }),
          startMouse: world,
          handle: hitHandle.handle,
        });
        return;
      }
      const hit = hitTest(world);
      if (hit) {
        if (e.shiftKey) {
          if (selectedIds.includes(hit)) {
            onSelectedIdsChange(selectedIds.filter((i) => i !== hit));
          } else {
            onSelectedIdsChange([...selectedIds, hit]);
          }
        } else {
          if (!selectedIds.includes(hit)) {
            onSelectedIdsChange([hit]);
          }
        }
        const handle = 'move';
        setTransform({
          startShapes: JSON.parse(JSON.stringify(shapes)),
          startPoints: selectedIds.map((id) => {
            const s = shapes.find((sh) => sh.id === id)!;
            const b = getShapeBounds(s);
            return { id, x: b.x, y: b.y, w: b.w, h: b.h };
          }),
          startMouse: world,
          handle,
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
        points: [world],
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
        width: 0,
        height: 0,
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
        x: world.x,
        y: world.y,
        radiusX: 0,
        radiusY: 0,
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
        fillColor,
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
      setEditingStickyId(newShape.id);
      showToast('便签已添加，点击编辑内容', 'info');
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const world = screenToWorld(e.clientX, e.clientY);
    cursorPosRef.current = world;

    onCursorMove(world);

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
        const sp = transform.startPoints.find((p) => p.id === s.id);
        if (!sp) return s;
        const updates = applyHandleTransform(s, transform.handle, dx, dy, { x: sp.x, y: sp.y, w: sp.w, h: sp.h });
        return { ...s, ...updates };
      });
      onShapesChange(newShapes, false);
      return;
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
      const pts = [...tempShape.points, world];
      setTempShape({ ...tempShape, points: pts });
    } else if (tempShape && tempShape.type === 'rectangle') {
      const start = (tempShape as RectangleShape);
      const x = Math.min(start.x + 0.001, world.x);
      const y = Math.min(start.y + 0.001, world.y);
      const w = Math.abs(world.x - (start.x + 0.001));
      const h = Math.abs(world.y - (start.y + 0.001));
      // Keep original start point
      setTempShape({ ...tempShape, x, y, width: w, height: h });
    } else if (tempShape && tempShape.type === 'circle') {
      const start = (tempShape as CircleShape);
      const sx = start.x + 0.001;
      const sy = start.y + 0.001;
      const cx = (sx + world.x) / 2;
      const cy = (sy + world.y) / 2;
      const rx = Math.abs(world.x - sx) / 2;
      const ry = Math.abs(world.y - sy) / 2;
      setTempShape({ ...tempShape, x: cx, y: cy, radiusX: rx, radiusY: ry });
    }
  };

  const onMouseUp = (e: React.MouseEvent) => {
    const world = screenToWorld(e.clientX, e.clientY);

    if (panning) {
      setPanning(false);
      setPanStart(null);
      return;
    }

    if (transform) {
      const updated = transform.startPoints
        .map((sp) => {
          const orig = transform.startShapes.find((s) => s.id === sp.id)!;
          const current = shapes.find((s) => s.id === sp.id)!;
          const changes: Partial<Shape> = {};
          (Object.keys(current) as (keyof Shape)[]).forEach((k) => {
            if (JSON.stringify(orig[k]) !== JSON.stringify(current[k])) {
              (changes as any)[k] = current[k];
            }
          });
          return { id: sp.id, updates: changes };
        })
        .filter((u) => Object.keys(u.updates).length > 0);

      if (updated.length > 0) {
        onBatchUpdate(updated);
        const historyShapes = shapes;
        onShapesChange(historyShapes, true);
      }
      setTransform(null);
      return;
    }

    if (!drawing) return;
    setDrawing(false);

    if (tool === 'eraser') {
      // history already recorded via onShapesChange
      return;
    }

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
      }
      setTempShape(null);
    }
  };

  const onMouseLeave = () => {
    if (panning) {
      setPanning(false);
      setPanStart(null);
    }
    if (drawing && tool === 'eraser') {
      setDrawing(false);
    }
  };

  const getCursor = () => {
    if (panning) return 'grabbing';
    if (tool === 'select' && selectedIds.length > 0 && transform?.handle && transform.handle !== 'move') {
      switch (transform?.handle) {
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

  const sortedShapes = [...shapes].sort((a, b) => a.zIndex - b.zIndex);
  const displayShapes = tempShape ? [...sortedShapes, tempShape] : sortedShapes;

  const renderShape = (s: Shape, isTemp = false) => {
    const selected = selectedIds.includes(s.id);
    const commonProps = {
      className: `svg-shape ${animating ? 'animating' : ''} ${!isTemp && clearAnimating ? 'scale-out' : ''} ${isTemp ? '' : 'fade-shape'}`,
      opacity: s.opacity,
    };
    const remoteColor = s.isRemote ? '#ff7043' : null;
    const remoteStroke = remoteColor ? { stroke: remoteColor, strokeWidth: Math.max(2, s.strokeWidth + 1), strokeDasharray: '6,4' } : null;

    if (s.type === 'pen') {
      let d = '';
      if (s.points.length > 0) {
        d = `M ${s.points[0].x} ${s.points[0].y}`;
        for (let i = 1; i < s.points.length - 1; i++) {
          const xc = (s.points[i].x + s.points[i + 1].x) / 2;
          const yc = (s.points[i].y + s.points[i + 1].y) / 2;
          d += ` Q ${s.points[i].x} ${s.points[i].y} ${xc} ${yc}`;
        }
        if (s.points.length > 1) {
          d += ` L ${s.points[s.points.length - 1].x} ${s.points[s.points.length - 1].y}`;
        }
      }
      return (
        <g key={s.id}>
          <path
            d={d}
            fill="none"
            stroke={s.strokeColor}
            strokeWidth={s.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            {...commonProps}
            style={{ pointerEvents: isTemp ? 'none' : 'stroke' }}
          />
          {remoteStroke && (
            <path
              d={d}
              fill="none"
              {...remoteStroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="remote-outline"
              style={{ pointerEvents: 'none' }}
            />
          )}
        </g>
      );
    }

    if (s.type === 'rectangle') {
      return (
        <g key={s.id}>
          <rect
            x={s.x}
            y={s.y}
            width={s.width}
            height={s.height}
            rx={2}
            ry={2}
            fill={s.fillColor === 'transparent' ? 'none' : s.fillColor}
            stroke={s.strokeColor}
            strokeWidth={s.strokeWidth}
            {...commonProps}
            style={{ pointerEvents: isTemp ? 'none' : 'all' }}
          />
          {remoteStroke && (
            <rect
              x={s.x}
              y={s.y}
              width={s.width}
              height={s.height}
              rx={2}
              ry={2}
              fill="none"
              {...remoteStroke}
              className="remote-outline"
              style={{ pointerEvents: 'none' }}
            />
          )}
        </g>
      );
    }

    if (s.type === 'circle') {
      return (
        <g key={s.id}>
          <ellipse
            cx={s.x}
            cy={s.y}
            rx={s.radiusX}
            ry={s.radiusY}
            fill={s.fillColor === 'transparent' ? 'none' : s.fillColor}
            stroke={s.strokeColor}
            strokeWidth={s.strokeWidth}
            {...commonProps}
            style={{ pointerEvents: isTemp ? 'none' : 'all' }}
          />
          {remoteStroke && (
            <ellipse
              cx={s.x}
              cy={s.y}
              rx={s.radiusX}
              ry={s.radiusY}
              fill="none"
              {...remoteStroke}
              className="remote-outline"
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
            width={s.width}
            height={s.height}
            opacity={s.opacity}
            className={`${animating ? 'animating' : ''} ${clearAnimating ? 'scale-out' : ''}`}
            style={{ pointerEvents: isTemp ? 'none' : 'all' }}
          >
            <div
              xmlns="http://www.w3.org/1999/xhtml"
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: s.fillColor === 'transparent' ? 'transparent' : s.fillColor,
                border: `${s.strokeWidth}px solid ${s.strokeColor}`,
                borderRadius: 4,
                overflow: 'hidden',
                boxSizing: 'border-box',
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
                />
              ) : (
                <div
                  style={{
                    padding: 12,
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
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (tool === 'select') setEditingStickyId(s.id);
                  }}
                >
                  {s.text || <span style={{ color: '#999' }}>双击编辑...</span>}
                </div>
              )}
            </div>
          </foreignObject>
          {remoteStroke && (
            <rect
              x={s.x}
              y={s.y}
              width={s.width}
              height={s.height}
              fill="none"
              {...remoteStroke}
              className="remote-outline"
              style={{ pointerEvents: 'none' }}
            />
          )}
        </g>
      );
    }
    return null;
  };

  const renderSelectionUI = () => {
    return selectedIds.map((id) => {
      const s = shapes.find((sh) => sh.id === id);
      if (!s) return null;
      const b = getShapeBounds(s);
      const handleSize = 8 / scale;

      const handles =
        selectedIds.length === 1
          ? [
              { x: b.x, y: b.y, type: 'nw' },
              { x: b.x + b.w, y: b.y, type: 'ne' },
              { x: b.x, y: b.y + b.h, type: 'sw' },
              { x: b.x + b.w, y: b.y + b.h, type: 'se' },
              { x: b.x + b.w / 2, y: b.y, type: 'n' },
              { x: b.x + b.w / 2, y: b.y + b.h, type: 's' },
              { x: b.x, y: b.y + b.h / 2, type: 'w' },
              { x: b.x + b.w, y: b.y + b.h / 2, type: 'e' },
            ]
          : [];

      return (
        <g key={`sel-${id}`}>
          <rect
            className="selection-box"
            x={b.x - 2}
            y={b.y - 2}
            width={b.w + 4}
            height={b.h + 4}
          />
          {handles.map((h) => (
            <rect
              key={h.type}
              className="selection-handle"
              x={h.x - handleSize}
              y={h.y - handleSize}
              width={handleSize * 2}
              height={handleSize * 2}
              rx={2}
            />
          ))}
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

      return (
        <div
          key={user.id}
          className="cursor-indicator"
          style={{
            left: screenX,
            top: screenY,
            display: screenX > -100 && screenX < rect.width + 100 && screenY > -100 && screenY < rect.height + 100 ? 'block' : 'none',
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

  const svgViewTransform = `translate(${offset.x}px, ${offset.y}px) scale(${scale})`;

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
      <div className="canvas-wrapper" style={{ transform: svgViewTransform }}>
        <svg
          className="svg-canvas"
          xmlns="http://www.w3.org/2000/svg"
          width={10000}
          height={10000}
          style={{ transformOrigin: '0 0' }}
        >
          {displayShapes.map((s) => renderShape(s, s === tempShape))}
          {!exportMode && renderSelectionUI()}
        </svg>
      </div>
      {renderCursors()}
    </div>
  );
};

export default Canvas;
