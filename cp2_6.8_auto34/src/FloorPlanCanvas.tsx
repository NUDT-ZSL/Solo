import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Room,
  Scale,
  Point,
  Opening,
  OpeningType,
  DetectedRegion,
  hexToRgba,
  generateId,
  getNextColor,
  polygonAreaSquareMeters,
  distance,
  lerp,
  pointToLineDistance,
  pointInPolygon,
  pixelsToMeters,
  OPENING_TYPE_LABELS,
} from './utils';

interface FloorPlanCanvasProps {
  imageUrl: string | null;
  imageSize: { width: number; height: number } | null;
  rooms: Room[];
  scale: Scale;
  onRoomsChange: (rooms: Room[]) => void;
  selectedRoomId: string | null;
  onRoomSelect: (roomId: string | null) => void;
  detectedRegions: DetectedRegion[];
  onConfirmRegion: (region: DetectedRegion) => void;
  onClearDetected: () => void;
}

interface ViewTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

type DragMode =
  | { type: 'none' }
  | { type: 'pan'; startX: number; startY: number; ox: number; oy: number }
  | { type: 'vertex'; roomId: string; pointIdx: number }
  | { type: 'opening'; roomId: string; openingId: string }
  | { type: 'room'; roomId: string; startMousePt: Point; startPts: Point[] };

interface DialogState {
  type: 'opening';
  roomId: string;
  edgeIndex: number;
  position: number;
}

export default function FloorPlanCanvas(props: FloorPlanCanvasProps) {
  const {
    imageUrl,
    imageSize,
    rooms,
    scale,
    onRoomsChange,
    selectedRoomId,
    onRoomSelect,
    detectedRegions,
    onConfirmRegion,
    onClearDetected,
  } = props;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [view, setView] = useState<ViewTransform>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [pendingPoints, setPendingPoints] = useState<Point[]>([]);
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
  const [hoveredVertex, setHoveredVertex] = useState<{ roomId: string; idx: number } | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<{ roomId: string; edgeIdx: number } | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<number>(-1);
  const [dragMode, setDragMode] = useState<DragMode>({ type: 'none' });
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [animatingRoomIds, setAnimatingRoomIds] = useState<Set<string>>(new Set());
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

  const screenToImage = useCallback(
    (sx: number, sy: number): Point => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      const x = (sx - rect.left - view.offsetX) / view.scale;
      const y = (sy - rect.top - view.offsetY) / view.scale;
      return { x, y };
    },
    [view]
  );

  const imageToScreen = useCallback(
    (ix: number, iy: number): Point => {
      return {
        x: ix * view.scale + view.offsetX,
        y: iy * view.scale + view.offsetY,
      };
    },
    [view]
  );

  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect && img.width > 0) {
        const s = Math.min(rect.width / img.width, rect.height / img.height, 1);
        setView({
          scale: s,
          offsetX: (rect.width - img.width * s) / 2,
          offsetY: (rect.height - img.height * s) / 2,
        });
      }
      draw();
    };
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    const updateSize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) setCanvasSize({ w: rect.width, h: rect.height });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#FAFAFA';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (imageRef.current) {
      const img = imageRef.current;
      ctx.save();
      ctx.translate(view.offsetX, view.offsetY);
      ctx.scale(view.scale, view.scale);
      ctx.drawImage(img, 0, 0);

      detectedRegions.forEach((region, idx) => {
        ctx.beginPath();
        region.points.forEach((p, i) => {
          const sp = p;
          if (i === 0) ctx.moveTo(sp.x, sp.y);
          else ctx.lineTo(sp.x, sp.y);
        });
        ctx.closePath();
        const isHover = idx === hoveredRegion;
        ctx.fillStyle = isHover ? 'rgba(74,144,217,0.35)' : 'rgba(74,144,217,0.15)';
        ctx.fill();
        ctx.strokeStyle = isHover ? '#4A90D9' : 'rgba(74,144,217,0.6)';
        ctx.lineWidth = isHover ? 3 / view.scale : 2 / view.scale;
        ctx.setLineDash([6 / view.scale, 4 / view.scale]);
        ctx.stroke();
        ctx.setLineDash([]);

        const cx = region.points.reduce((s, p) => s + p.x, 0) / region.points.length;
        const cy = region.points.reduce((s, p) => s + p.y, 0) / region.points.length;
        ctx.fillStyle = '#4A90D9';
        ctx.font = `${14 / view.scale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(
          `候选区域 ${idx + 1}  (置信度 ${(region.confidence * 100).toFixed(0)}%)  点击确认`,
          cx,
          cy - 10 / view.scale
        );
        ctx.font = `${12 / view.scale}px sans-serif`;
        ctx.fillText('✓ 确认', cx, cy + 12 / view.scale);
      });

      rooms.forEach((room) => {
        const isSelected = room.id === selectedRoomId;
        const isAnimating = animatingRoomIds.has(room.id);
        const fillAlpha = isAnimating ? 0.15 : isSelected ? 0.4 : 0.3;

        if (room.points.length >= 3) {
          ctx.beginPath();
          room.points.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          });
          ctx.closePath();
          ctx.fillStyle = hexToRgba(room.color, fillAlpha);
          ctx.fill();
          ctx.strokeStyle = room.color;
          ctx.lineWidth = (isSelected ? 3 : 2) / view.scale;
          ctx.stroke();
        }

        if (isSelected && room.points.length > 0) {
          room.points.forEach((p, i) => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 6 / view.scale, 0, Math.PI * 2);
            ctx.fillStyle = hoveredVertex?.roomId === room.id && hoveredVertex.idx === i ? '#E74C3C' : '#fff';
            ctx.fill();
            ctx.strokeStyle = room.color;
            ctx.lineWidth = 2 / view.scale;
            ctx.stroke();
          });
        }

        if (hoveredEdge && hoveredEdge.roomId === room.id && room.points.length >= 2) {
          const p1 = room.points[hoveredEdge.edgeIdx];
          const p2 = room.points[(hoveredEdge.edgeIdx + 1) % room.points.length];
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 4 / view.scale;
          ctx.stroke();
        }

        drawOpenings(ctx, room);

        if (room.points.length >= 3) {
          const cx = room.points.reduce((s, p) => s + p.x, 0) / room.points.length;
          const cy = room.points.reduce((s, p) => s + p.y, 0) / room.points.length;
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          const sp = imageToScreen(cx, cy);
          ctx.fillStyle = '#333';
          ctx.font = 'bold 13px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(room.name, sp.x, sp.y);
          ctx.font = '11px sans-serif';
          ctx.fillStyle = '#666';
          ctx.fillText(`${room.area.toFixed(2)} ㎡`, sp.x, sp.y + 14);
          ctx.restore();
        }
      });

      if (pendingPoints.length > 0) {
        ctx.beginPath();
        pendingPoints.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        if (pendingPoints.length >= 3) {
          const dist = distance(pendingPoints[pendingPoints.length - 1], pendingPoints[0]);
          if (dist < 15 / view.scale) {
            ctx.closePath();
            ctx.fillStyle = 'rgba(74,144,217,0.2)';
            ctx.fill();
          } else {
            const mp = screenToImage(mousePos.x, mousePos.y);
            ctx.lineTo(mp.x, mp.y);
          }
        } else {
          const mp = screenToImage(mousePos.x, mousePos.y);
          ctx.lineTo(mp.x, mp.y);
        }
        ctx.strokeStyle = '#4A90D9';
        ctx.lineWidth = 2 / view.scale;
        ctx.setLineDash([5 / view.scale, 3 / view.scale]);
        ctx.stroke();
        ctx.setLineDash([]);

        pendingPoints.forEach((p, i) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5 / view.scale, 0, Math.PI * 2);
          ctx.fillStyle = '#fff';
          ctx.fill();
          ctx.strokeStyle = '#4A90D9';
          ctx.lineWidth = 2 / view.scale;
          ctx.stroke();

          if (i > 0) {
            const prev = pendingPoints[i - 1];
            const mid = lerp(prev, p, 0.5);
            const d = pixelsToMeters(distance(prev, p), scale);
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            const s = imageToScreen(mid.x, mid.y);
            ctx.fillStyle = '#4A90D9';
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${d.toFixed(2)}m`, s.x, s.y - 6);
            ctx.restore();
          }
        });
      }

      ctx.restore();

      if (imageUrl && pendingPoints.length === 0) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const mx = mousePos.x - rect.left;
          const my = mousePos.y - rect.top;
          ctx.strokeStyle = 'rgba(74,144,217,0.5)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(mx, 0);
          ctx.lineTo(mx, canvas.height);
          ctx.moveTo(0, my);
          ctx.lineTo(canvas.width, my);
          ctx.stroke();
        }
      }

      if (dragMode.type === 'vertex') {
        const room = rooms.find((r) => r.id === dragMode.roomId);
        if (room) {
          const curIdx = dragMode.pointIdx;
          const prevIdx = (curIdx - 1 + room.points.length) % room.points.length;
          const nextIdx = (curIdx + 1) % room.points.length;
          const cur = room.points[curIdx];
          const d1 = pixelsToMeters(distance(cur, room.points[prevIdx]), scale);
          const d2 = pixelsToMeters(distance(cur, room.points[nextIdx]), scale);
          const mp = screenToImage(mousePos.x, mousePos.y);
          const sp = imageToScreen(mp.x, mp.y);
          ctx.fillStyle = '#E74C3C';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`边1: ${d1.toFixed(2)}m | 边2: ${d2.toFixed(2)}m`, sp.x, sp.y - 14);
        }
      }
    }
  }, [
    view,
    rooms,
    pendingPoints,
    mousePos,
    hoveredVertex,
    hoveredEdge,
    hoveredRegion,
    detectedRegions,
    selectedRoomId,
    animatingRoomIds,
    dragMode,
    imageUrl,
    scale,
    screenToImage,
    imageToScreen,
  ]);

  const drawOpenings = (ctx: CanvasRenderingContext2D, room: Room) => {
    room.openings.forEach((op) => {
      const p1 = room.points[op.edgeIndex];
      const p2 = room.points[(op.edgeIndex + 1) % room.points.length];
      const edgeLen = distance(p1, p2);
      const halfW = Math.min(op.width / 2, edgeLen * 0.45);
      const centerPos = Math.max(halfW / edgeLen, Math.min(1 - halfW / edgeLen, op.position));
      const center = lerp(p1, p2, centerPos);
      const left = lerp(p1, p2, Math.max(0, centerPos - halfW / edgeLen));
      const right = lerp(p1, p2, Math.min(1, centerPos + halfW / edgeLen));

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;

      ctx.strokeStyle = '#222';
      ctx.lineWidth = 2.5 / view.scale;
      ctx.beginPath();
      ctx.moveTo(left.x, left.y);
      ctx.lineTo(right.x, right.y);
      ctx.stroke();

      if (op.type === 'single_door') {
        ctx.beginPath();
        ctx.moveTo(right.x, right.y);
        ctx.arc(right.x, right.y, distance(left, right), Math.atan2(-ny, -nx), Math.atan2(dy, dx), true);
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1.5 / view.scale;
        ctx.setLineDash([3 / view.scale, 2 / view.scale]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(left.x, left.y);
        ctx.lineTo(left.x + nx * distance(left, right), left.y + ny * distance(left, right));
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2 / view.scale;
        ctx.stroke();
      } else if (op.type === 'double_door') {
        const mid = lerp(left, right, 0.5);
        const d = distance(left, mid);
        ctx.beginPath();
        ctx.moveTo(mid.x, mid.y);
        ctx.arc(mid.x, mid.y, d, Math.atan2(-ny, -nx), Math.atan2(dy, dx), true);
        ctx.moveTo(mid.x, mid.y);
        ctx.arc(mid.x, mid.y, d, Math.atan2(dy, dx), Math.atan2(ny, nx), false);
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1.5 / view.scale;
        ctx.setLineDash([3 / view.scale, 2 / view.scale]);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        const inset = 4 / view.scale;
        ctx.beginPath();
        ctx.moveTo(left.x + nx * inset, left.y + ny * inset);
        ctx.lineTo(right.x + nx * inset, right.y + ny * inset);
        ctx.moveTo(left.x - nx * inset, left.y - ny * inset);
        ctx.lineTo(right.x - nx * inset, right.y - ny * inset);
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2 / view.scale;
        ctx.stroke();

        if (op.type === 'sliding_window') {
          const wm = lerp(left, right, 0.5);
          ctx.beginPath();
          ctx.moveTo(wm.x + nx * inset, wm.y + ny * inset);
          ctx.lineTo(wm.x - nx * inset, wm.y - ny * inset);
          ctx.strokeStyle = '#222';
          ctx.lineWidth = 1.5 / view.scale;
          ctx.stroke();
        }
      }
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageUrl) return;
    const pt = screenToImage(e.clientX, e.clientY);

    if (detectedRegions.length > 0) {
      for (let i = 0; i < detectedRegions.length; i++) {
        if (pointInPolygon(pt, detectedRegions[i].points)) {
          onConfirmRegion(detectedRegions[i]);
          return;
        }
      }
    }

    for (const room of rooms) {
      for (let i = 0; i < room.points.length; i++) {
        if (distance(pt, room.points[i]) * view.scale < 8) {
          if (room.id === selectedRoomId) {
            setDragMode({ type: 'vertex', roomId: room.id, pointIdx: i });
            return;
          }
        }
      }
    }

    for (const room of rooms) {
      for (const op of room.openings) {
        const p1 = room.points[op.edgeIndex];
        const p2 = room.points[(op.edgeIndex + 1) % room.points.length];
        const center = lerp(p1, p2, op.position);
        if (distance(pt, center) * view.scale < 10) {
          setDragMode({ type: 'opening', roomId: room.id, openingId: op.id });
          return;
        }
      }
    }

    if (e.button === 1 || e.shiftKey) {
      setDragMode({ type: 'pan', startX: e.clientX, startY: e.clientY, ox: view.offsetX, oy: view.offsetY });
      return;
    }

    for (const room of rooms) {
      for (let i = 0; i < room.points.length; i++) {
        const p1 = room.points[i];
        const p2 = room.points[(i + 1) % room.points.length];
        const res = pointToLineDistance(pt, p1, p2);
        if (res.distance * view.scale < 6) {
          setDialog({ type: 'opening', roomId: room.id, edgeIndex: i, position: res.position });
          return;
        }
      }
    }

    for (const room of rooms) {
      if (pointInPolygon(pt, room.points)) {
        onRoomSelect(room.id);
        setDragMode({
          type: 'room',
          roomId: room.id,
          startMousePt: pt,
          startPts: room.points.map((p) => ({ ...p })),
        });
        return;
      }
    }

    if (pendingPoints.length > 0) {
      const first = pendingPoints[0];
      if (distance(pt, first) * view.scale < 12 && pendingPoints.length >= 3) {
        finalizePendingRoom();
        return;
      }
    }
    setPendingPoints((prev) => [...prev, pt]);
  };

  const finalizePendingRoom = () => {
    if (pendingPoints.length < 3) return;
    const usedColors = rooms.map((r) => r.color);
    const color = getNextColor(usedColors);
    const id = generateId();
    const newRoom: Room = {
      id,
      name: `房间 ${rooms.length + 1}`,
      color,
      points: [...pendingPoints],
      area: polygonAreaSquareMeters(pendingPoints, scale),
      openings: [],
    };
    onRoomsChange([...rooms, newRoom]);
    setPendingPoints([]);
    setAnimatingRoomIds((prev) => {
      const s = new Set(prev);
      s.add(id);
      return s;
    });
    setTimeout(() => {
      setAnimatingRoomIds((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    }, 300);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    const pt = screenToImage(e.clientX, e.clientY);

    if (dragMode.type === 'pan') {
      setView((v) => ({
        ...v,
        offsetX: dragMode.ox + (e.clientX - dragMode.startX),
        offsetY: dragMode.oy + (e.clientY - dragMode.startY),
      }));
      return;
    }

    if (dragMode.type === 'vertex') {
      const newRooms = rooms.map((r) => {
        if (r.id !== dragMode.roomId) return r;
        const newPts = [...r.points];
        newPts[dragMode.pointIdx] = pt;
        return { ...r, points: newPts, area: polygonAreaSquareMeters(newPts, scale) };
      });
      onRoomsChange(newRooms);
      return;
    }

    if (dragMode.type === 'room') {
      const dx = pt.x - dragMode.startMousePt.x;
      const dy = pt.y - dragMode.startMousePt.y;
      const newRooms = rooms.map((r) => {
        if (r.id !== dragMode.roomId) return r;
        return {
          ...r,
          points: dragMode.startPts.map((p) => ({ x: p.x + dx, y: p.y + dy })),
        };
      });
      onRoomsChange(newRooms);
      return;
    }

    if (dragMode.type === 'opening') {
      const newRooms = rooms.map((r) => {
        if (r.id !== dragMode.roomId) return r;
        const newOps = r.openings.map((op) => {
          if (op.id !== dragMode.openingId) return op;
          const p1 = r.points[op.edgeIndex];
          const p2 = r.points[(op.edgeIndex + 1) % r.points.length];
          const res = pointToLineDistance(pt, p1, p2);
          return { ...op, position: res.position };
        });
        return { ...r, openings: newOps };
      });
      onRoomsChange(newRooms);
      return;
    }

    let hv: { roomId: string; idx: number } | null = null;
    let he: { roomId: string; edgeIdx: number } | null = null;
    let hr = -1;

    if (selectedRoomId) {
      const room = rooms.find((r) => r.id === selectedRoomId);
      if (room) {
        for (let i = 0; i < room.points.length; i++) {
          if (distance(pt, room.points[i]) * view.scale < 8) {
            hv = { roomId: room.id, idx: i };
            break;
          }
        }
      }
    }

    if (!hv) {
      outer: for (const room of rooms) {
        for (let i = 0; i < room.points.length; i++) {
          const p1 = room.points[i];
          const p2 = room.points[(i + 1) % room.points.length];
          const res = pointToLineDistance(pt, p1, p2);
          if (res.distance * view.scale < 6) {
            he = { roomId: room.id, edgeIdx: i };
            break outer;
          }
        }
      }
    }

    if (!hv && !he) {
      for (let i = 0; i < detectedRegions.length; i++) {
        if (pointInPolygon(pt, detectedRegions[i].points)) {
          hr = i;
          break;
        }
      }
    }

    setHoveredVertex(hv);
    setHoveredEdge(he);
    setHoveredRegion(hr);
  };

  const handleMouseUp = () => {
    setDragMode({ type: 'none' });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!imageUrl) return;
    const pt = screenToImage(e.clientX, e.clientY);
    for (const room of rooms) {
      if (pointInPolygon(pt, room.points)) {
        onRoomSelect(room.id);
        return;
      }
    }
    onRoomSelect(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    const factor = 1 + delta;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setView((v) => {
      const newScale = Math.max(0.1, Math.min(5, v.scale * factor));
      const ratio = newScale / v.scale;
      return {
        scale: newScale,
        offsetX: mx - (mx - v.offsetX) * ratio,
        offsetY: my - (my - v.offsetY) * ratio,
      };
    });
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPendingPoints([]);
        onRoomSelect(null);
        setDialog(null);
        onClearDetected();
      }
      if (e.key === 'Enter' && pendingPoints.length >= 4) {
        finalizePendingRoom();
      }
    },
    [pendingPoints, onRoomSelect, onClearDetected, rooms, scale, onRoomsChange]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleAddOpening = (type: OpeningType) => {
    if (!dialog) return;
    const defaultWidth = type.includes('door') ? 0.9 : 1.2;
    const pxWidth = (defaultWidth * scale.pixels) / scale.meters;
    const newOp: Opening = {
      id: generateId(),
      type,
      edgeIndex: dialog.edgeIndex,
      position: dialog.position,
      width: pxWidth,
    };
    const newRooms = rooms.map((r) =>
      r.id === dialog.roomId ? { ...r, openings: [...r.openings, newOp] } : r
    );
    onRoomsChange(newRooms);
    setDialog(null);
  };

  return (
    <div ref={containerRef} style={styles.container}>
      {!imageUrl && (
        <div style={styles.placeholder}>
          <div style={styles.placeholderIcon}>🏠</div>
          <div style={styles.placeholderTitle}>请上传平面图</div>
          <div style={styles.placeholderHint}>支持 JPG/PNG 格式，大小不超过 10MB</div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={canvasSize.w}
        height={canvasSize.h}
        style={{
          ...styles.canvas,
          cursor: dragMode.type === 'pan' ? 'grabbing' : hoveredVertex ? 'move' : hoveredEdge ? 'pointer' : 'crosshair',
          display: imageUrl ? 'block' : 'none',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
      />
      {pendingPoints.length > 0 && imageUrl && (
        <div style={styles.markerHint}>
          已标记 {pendingPoints.length} 个点，{pendingPoints.length >= 3 ? '点击起点或按 Enter 闭合房间' : '继续点击标记下一个墙角'}
          <button style={styles.cancelBtn} onClick={() => setPendingPoints([])}>取消 (Esc)</button>
        </div>
      )}
      {detectedRegions.length > 0 && (
        <div style={styles.detectHint}>
          检测到 {detectedRegions.length} 个候选区域，点击区域确认 ·
          <button style={styles.cancelBtn} onClick={onClearDetected}>清除</button>
        </div>
      )}
      {dialog && (
        <div style={styles.dialogOverlay} onClick={() => setDialog(null)}>
          <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <div style={styles.dialogTitle}>添加门窗</div>
            <div style={{ ...styles.dialogSub, marginBottom: 12 }}>选择类型:</div>
            <div style={styles.openingTypeGrid}>
              {(Object.keys(OPENING_TYPE_LABELS) as OpeningType[]).map((t) => (
                <button key={t} style={styles.openingTypeBtn} onClick={() => handleAddOpening(t)}>
                  {OPENING_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            <button style={styles.cancelBtn} onClick={() => setDialog(null)}>
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  canvas: {
    display: 'block',
    width: '100%',
    height: '100%',
    backgroundColor: '#FAFAFA',
    userSelect: 'none',
  },
  placeholder: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    color: '#999',
  },
  placeholderIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#666',
    marginBottom: 8,
  },
  placeholderHint: {
    fontSize: 13,
    color: '#999',
  },
  markerHint: {
    position: 'absolute',
    top: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#4A90D9',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: 8,
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    boxShadow: '0 4px 12px rgba(74,144,217,0.3)',
  },
  detectHint: {
    position: 'absolute',
    top: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#2ECC71',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: 8,
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    boxShadow: '0 4px 12px rgba(46,204,113,0.3)',
  },
  cancelBtn: {
    background: 'rgba(255,255,255,0.2)',
    border: '1px solid rgba(255,255,255,0.4)',
    color: '#fff',
    padding: '2px 10px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 12,
  },
  dialogOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  dialog: {
    background: '#fff',
    padding: 20,
    borderRadius: 12,
    minWidth: 280,
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#333',
    marginBottom: 4,
  },
  dialogSub: {
    fontSize: 13,
    color: '#666',
  },
  openingTypeGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    marginBottom: 12,
  },
  openingTypeBtn: {
    padding: '10px 12px',
    border: '1px solid #ddd',
    background: '#fafafa',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13,
    color: '#333',
  },
};
