import React, { useRef, useEffect, useState, useCallback } from 'react';
import { type GraphData, type GraphNode, applyForceLayout } from './GraphBuilder';

interface RoleGraphProps {
  graphData: GraphData;
  onRefresh: () => void;
  onNodeDoubleClick: (node: GraphNode) => void;
}

const RoleGraph: React.FC<RoleGraphProps> = ({ graphData, onRefresh, onNodeDoubleClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [spinning, setSpinning] = useState(false);

  const layoutData = useRef<GraphData>(graphData);

  useEffect(() => {
    if (graphData.nodes.length > 0) {
      layoutData.current = applyForceLayout(graphData, 120);
    } else {
      layoutData.current = graphData;
    }
  }, [graphData]);

  const worldToScreen = useCallback(
    (wx: number, wy: number, canvas: HTMLCanvasElement) => {
      return {
        x: (wx + offset.x) * scale + canvas.width / 2,
        y: (wy + offset.y) * scale + canvas.height / 2,
      };
    },
    [offset, scale]
  );

  const screenToWorld = useCallback(
    (sx: number, sy: number, canvas: HTMLCanvasElement) => {
      return {
        x: (sx - canvas.width / 2) / scale - offset.x,
        y: (sy - canvas.height / 2) / scale - offset.y,
      };
    },
    [offset, scale]
  );

  const findNodeAt = useCallback(
    (sx: number, sy: number, canvas: HTMLCanvasElement) => {
      const world = screenToWorld(sx, sy, canvas);
      for (const node of layoutData.current.nodes) {
        const dx = world.x - node.x;
        const dy = world.y - node.y;
        if (dx * dx + dy * dy < node.radius * node.radius) {
          return node;
        }
      }
      return null;
    },
    [screenToWorld]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = '#1A252F';
    ctx.fillRect(0, 0, rect.width, rect.height);

    const data = layoutData.current;

    for (const edge of data.edges) {
      const sourceNode = data.nodes.find((n) => n.id === edge.source);
      const targetNode = data.nodes.find((n) => n.id === edge.target);
      if (!sourceNode || !targetNode) continue;

      const src = worldToScreen(sourceNode.x, sourceNode.y, canvas);
      const tgt = worldToScreen(targetNode.x, targetNode.y, canvas);

      ctx.beginPath();
      ctx.moveTo(src.x / dpr, src.y / dpr);
      ctx.lineTo(tgt.x / dpr, tgt.y / dpr);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = edge.thickness * scale;
      ctx.stroke();

      const midX = (src.x / dpr + tgt.x / dpr) / 2;
      const midY = (src.y / dpr + tgt.y / dpr) / 2;
      ctx.font = `${Math.max(10, 11 * scale)}px sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.textAlign = 'center';
      ctx.fillText(edge.interactionType, midX, midY - 6 * scale);
    }

    for (const node of data.nodes) {
      const screen = worldToScreen(node.x, node.y, canvas);
      const sx = screen.x / dpr;
      const sy = screen.y / dpr;
      const r = node.radius * scale;

      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fillStyle = node.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = `bold ${Math.max(10, 13 * scale)}px sans-serif`;
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.name, sx, sy);

      ctx.font = `${Math.max(8, 10 * scale)}px sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText(`${node.appearanceCount}次`, sx, sy + r + 14 * scale);
    }
  }, [worldToScreen, screenToWorld, scale, offset]);

  useEffect(() => {
    let lastTime = performance.now();
    let frameCount = 0;

    const loop = () => {
      const now = performance.now();
      frameCount++;
      if (now - lastTime >= 1000) {
        lastTime = now;
        frameCount = 0;
      }

      draw();
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((s) => Math.max(0.2, Math.min(3, s * delta)));
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      const node = findNodeAt(sx, sy, canvas);
      if (node) {
        setDraggingNode(node.id);
      } else {
        setIsPanning(true);
        setPanStart({ x: e.clientX - offset.x * scale, y: e.clientY - offset.y * scale });
      }
    },
    [findNodeAt, offset, scale]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();

      if (draggingNode) {
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const world = screenToWorld(sx, sy, canvas);
        const node = layoutData.current.nodes.find((n) => n.id === draggingNode);
        if (node) {
          node.x = world.x;
          node.y = world.y;
        }
      } else if (isPanning) {
        setOffset({
          x: (e.clientX - panStart.x) / scale,
          y: (e.clientY - panStart.y) / scale,
        });
      }
    },
    [draggingNode, isPanning, panStart, screenToWorld, scale]
  );

  const handleMouseUp = useCallback(() => {
    setDraggingNode(null);
    setIsPanning(false);
  }, []);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const node = findNodeAt(sx, sy, canvas);
      if (node) {
        onNodeDoubleClick(node);
      }
    },
    [findNodeAt, onNodeDoubleClick]
  );

  const handleRefreshClick = () => {
    setSpinning(true);
    onRefresh();
    setTimeout(() => setSpinning(false), 500);
  };

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: '100%', background: '#2C3E50' }}
    >
      <canvas
        ref={canvasRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        style={{
          width: '100%',
          height: '100%',
          cursor: draggingNode ? 'grabbing' : isPanning ? 'move' : 'default',
        }}
      />
      <button
        onClick={handleRefreshClick}
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: 'none',
          background: '#3498DB',
          color: '#fff',
          fontSize: '16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.5s ease',
          transform: spinning ? 'rotate(180deg)' : 'rotate(0deg)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        }}
        title="刷新图谱"
      >
        ↻
      </button>
      <div
        style={{
          position: 'absolute',
          bottom: '8px',
          left: '8px',
          color: 'rgba(255,255,255,0.5)',
          fontSize: '11px',
        }}
      >
        滚轮缩放 · 拖拽移动 · 双击跳转
      </div>
    </div>
  );
};

export default RoleGraph;
