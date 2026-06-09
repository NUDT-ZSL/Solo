import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import {
  GRID_ROWS,
  GRID_COLS,
  CELL_SIZE,
  NODE_RADIUS,
  MAX_DRAG_DISTANCE,
  GRID_ROWS as ROWS,
  GRID_COLS as COLS,
  CELL_SIZE as CELL,
  type GridNode,
  type WeaveSegment,
  type WorkerResult
} from '../utils/types';

export interface LoomCanvasHandle {
  triggerLockFlash: () => void;
}

interface LoomCanvasProps {
  nodes: GridNode[];
  segments: WeaveSegment[];
  selectedColor: string;
  readOnly: boolean;
  onUpdate: (result: WorkerResult) => void;
}

const CANVAS_WIDTH = (COLS - 1) * CELL + CELL;
const CANVAS_HEIGHT = (ROWS - 1) * CELL + CELL;
const PADDING = CELL / 2;

function gridToCanvas(row: number, col: number) {
  return {
    x: PADDING + col * CELL,
    y: PADDING + row * CELL
  };
}

function canvasToGrid(x: number, y: number) {
  const col = Math.round((x - PADDING) / CELL);
  const row = Math.round((y - PADDING) / CELL);
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return null;
  return { row, col };
}

function findClosestNode(x: number, y: number, nodes: GridNode[]) {
  let best: { row: number; col: number; dist: number } | null = null;
  for (const n of nodes) {
    const p = gridToCanvas(n.row, n.col);
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (!best || d < best.dist) best = { row: n.row, col: n.col, dist: d };
  }
  if (best && best.dist <= (CELL * 0.6) ** 2) return best;
  return null;
}

export const LoomCanvas = forwardRef<LoomCanvasHandle, LoomCanvasProps>(function LoomCanvas(
  { nodes, segments, selectedColor, readOnly, onUpdate },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ row: number; col: number } | null>(null);
  const dragCurrentRef = useRef<{ row: number; col: number } | null>(null);
  const flashPhaseRef = useRef(0);
  const flashActiveRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const nodesRef = useRef(nodes);
  const segmentsRef = useRef(segments);

  nodesRef.current = nodes;
  segmentsRef.current = segments;

  useImperativeHandle(ref, () => ({
    triggerLockFlash: () => {
      flashActiveRef.current = true;
      flashPhaseRef.current = 0;
    }
  }));

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../utils/weaveWorker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current.onmessage = (e: MessageEvent<WorkerResult>) => {
      onUpdate(e.data);
    };
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [onUpdate]);

  const sendToWorker = useCallback((action: unknown) => {
    if (!workerRef.current) return;
    const payload = {
      ...(action as Record<string, unknown>),
      rows: ROWS,
      cols: COLS,
      maxDist: MAX_DRAG_DISTANCE,
      thickness: 3,
      nodes: nodesRef.current,
      segments: segmentsRef.current
    };
    workerRef.current.postMessage(payload);
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== CANVAS_WIDTH * dpr || canvas.height !== CANVAS_HEIGHT * dpr) {
      canvas.width = CANVAS_WIDTH * dpr;
      canvas.height = CANVAS_HEIGHT * dpr;
      canvas.style.width = `${CANVAS_WIDTH}px`;
      canvas.style.height = `${CANVAS_HEIGHT}px`;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = 'rgba(139, 125, 60, 0.3)';
    ctx.lineWidth = 1;
    for (let c = 0; c < COLS; c++) {
      const p = gridToCanvas(0, c);
      ctx.beginPath();
      ctx.moveTo(p.x, PADDING);
      ctx.lineTo(p.x, PADDING + (ROWS - 1) * CELL);
      ctx.stroke();
    }
    for (let r = 0; r < ROWS; r++) {
      const p = gridToCanvas(r, 0);
      ctx.beginPath();
      ctx.moveTo(PADDING, p.y);
      ctx.lineTo(PADDING + (COLS - 1) * CELL, p.y);
      ctx.stroke();
    }

    const curNodes = nodesRef.current;
    const curSegs = segmentsRef.current;

    for (const s of curSegs) {
      const start = gridToCanvas(s.startRow, s.startCol);
      const end = gridToCanvas(s.endRow, s.endCol);
      const steps = Math.ceil(Math.hypot(end.x - start.x, end.y - start.y));
      const reg = /hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/;
      const m1 = s.startColor.match(reg);
      const m2 = s.endColor.match(reg);
      for (let i = 0; i < steps; i++) {
        const t = i / Math.max(1, steps - 1);
        let colorStr = s.startColor;
        if (m1 && m2) {
          const h = parseFloat(m1[1]) + (parseFloat(m2[1]) - parseFloat(m1[1])) * t;
          const sa = parseFloat(m1[2]) + (parseFloat(m2[2]) - parseFloat(m1[2])) * t;
          const l = parseFloat(m1[3]) + (parseFloat(m2[3]) - parseFloat(m1[3])) * t;
          colorStr = `hsl(${h}, ${sa}%, ${l}%)`;
        }
        ctx.fillStyle = colorStr;
        const px = start.x + (end.x - start.x) * t;
        const py = start.y + (end.y - start.y) * t;
        ctx.beginPath();
        ctx.arc(px, py, s.thickness / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (isDraggingRef.current && dragStartRef.current && dragCurrentRef.current) {
      const start = gridToCanvas(dragStartRef.current.row, dragStartRef.current.col);
      const end = gridToCanvas(dragCurrentRef.current.row, dragCurrentRef.current.col);
      const startColor = curNodes[dragStartRef.current.row * COLS + dragStartRef.current.col].color;
      const endColor = curNodes[dragCurrentRef.current.row * COLS + dragCurrentRef.current.col].color || startColor;
      if (startColor) {
        const grad = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
        grad.addColorStop(0, startColor);
        grad.addColorStop(1, endColor!);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    const flashAlpha = flashActiveRef.current
      ? (() => {
          const t = flashPhaseRef.current;
          if (t < 0.25) return 1 - t * 1.2;
          if (t < 0.5) return 0.7 + (t - 0.25) * 1.2;
          flashActiveRef.current = false;
          return 1;
        })()
      : 1;

    for (const n of curNodes) {
      const pos = gridToCanvas(n.row, n.col);
      let drawAlpha = n.color ? n.colorOpacity : 1;
      drawAlpha *= flashAlpha;

      if (n.color) {
        ctx.globalAlpha = drawAlpha;
        ctx.fillStyle = n.color;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, NODE_RADIUS + 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, NODE_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }

      if (n.locked) {
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(pos.x - 5, pos.y - 5, 10, 10);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y - 2, 2.5, Math.PI, 0);
        ctx.stroke();
      }
    }

    if (flashActiveRef.current) {
      flashPhaseRef.current += 1 / 30;
    }
    rafRef.current = requestAnimationFrame(render);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(render);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [render]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    const { x, y } = getMousePos(e);
    const hit = findClosestNode(x, y, nodesRef.current);
    if (!hit) return;
    const node = nodesRef.current[hit.row * COLS + hit.col];
    if (node.locked) return;

    if (node.color) {
      isDraggingRef.current = true;
      dragStartRef.current = { row: hit.row, col: hit.col };
      dragCurrentRef.current = { row: hit.row, col: hit.col };
    } else {
      sendToWorker({
        type: 'colorNode',
        row: hit.row,
        col: hit.col,
        color: selectedColor
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const { x, y } = getMousePos(e);
    const hit = findClosestNode(x, y, nodesRef.current);
    if (hit) dragCurrentRef.current = { row: hit.row, col: hit.col };
  };

  const handleMouseUp = () => {
    if (!isDraggingRef.current || !dragStartRef.current || !dragCurrentRef.current) {
      isDraggingRef.current = false;
      dragStartRef.current = null;
      dragCurrentRef.current = null;
      return;
    }
    const start = dragStartRef.current;
    const end = dragCurrentRef.current;
    isDraggingRef.current = false;
    dragStartRef.current = null;
    dragCurrentRef.current = null;
    if (start.row === end.row && start.col === end.col) return;
    sendToWorker({
      type: 'dragSegment',
      startRow: start.row,
      startCol: start.col,
      endRow: end.row,
      endCol: end.col
    });
  };

  return (
    <div
      className="loom-canvas-wrapper"
      style={{
        padding: 16,
        borderRadius: 8,
        backgroundColor: '#16162a',
        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)',
        display: 'inline-block'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          borderRadius: 4,
          cursor: readOnly ? 'default' : 'crosshair'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
});

export default LoomCanvas;
