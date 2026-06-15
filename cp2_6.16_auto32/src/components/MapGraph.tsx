import { useEffect, useRef, useState, useCallback } from 'react';
import { KnowledgeNode, ProgressRecord } from '../App';

interface MapGraphProps {
  nodes: KnowledgeNode[];
  progress: ProgressRecord[];
  onNodeClick: (nodeId: string) => void;
  onNodesChange: () => void;
}

const NODE_RADIUS = 30;
const HOVER_SCALE = 1.1;

const CATEGORY_COLORS: Record<string, string> = {
  '编程': '#4caf50',
  '数学': '#2196f3',
  '设计': '#ff9800',
};

interface NodeState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export default function MapGraph({ nodes, progress, onNodeClick, onNodesChange }: MapGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const nodeStatesRef = useRef<Map<string, NodeState>>(new Map());
  const animationRef = useRef<number>(0);
  const lastPositionRef = useRef<{ x: number; y: number } | null>(null);
  const progressMap = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    progressMap.current = new Map(progress.map(p => [p.nodeId, p.status]));
  }, [progress]);

  useEffect(() => {
    const states = nodeStatesRef.current;
    for (const node of nodes) {
      if (!states.has(node.id)) {
        states.set(node.id, {
          x: node.x || Math.random() * 800,
          y: node.y || Math.random() * 600,
          vx: 0,
          vy: 0,
        });
      }
    }
  }, [nodes]);

  const getNodeAt = useCallback((x: number, y: number): KnowledgeNode | null => {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      const state = nodeStatesRef.current.get(node.id);
      if (!state) continue;
      const dx = x - state.x;
      const dy = y - state.y;
      if (dx * dx + dy * dy <= NODE_RADIUS * NODE_RADIUS) {
        return node;
      }
    }
    return null;
  }, [nodes]);

  const savePosition = useCallback((nodeId: string, x: number, y: number) => {
    fetch(`/api/nodes/${nodeId}/position`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x, y }),
    }).then(() => {
      onNodesChange();
    });
  }, [onNodesChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    function simulate() {
      if (!running) return;

      const states = nodeStatesRef.current;
      const width = canvas.width;
      const height = canvas.height;

      for (const node of nodes) {
        const state = states.get(node.id);
        if (!state || draggingNode === node.id) continue;

        state.vx = 0;
        state.vy = 0;

        for (const other of nodes) {
          if (other.id === node.id) continue;
          const otherState = states.get(other.id);
          if (!otherState) continue;

          const dx = state.x - otherState.x;
          const dy = state.y - otherState.y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const force = 8000 / (dist * dist);
          state.vx += (dx / dist) * force;
          state.vy += (dy / dist) * force;
        }

        for (const prereqId of node.prerequisites) {
          const prereqState = states.get(prereqId);
          if (!prereqState) continue;
          const dx = prereqState.x - state.x;
          const dy = prereqState.y - state.y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const targetDist = 180;
          const force = (dist - targetDist) * 0.01;
          state.vx += (dx / dist) * force;
          state.vy += (dy / dist) * force;
        }

        const otherNodes = nodes.filter(n => n.prerequisites.includes(node.id));
        for (const other of otherNodes) {
          const otherState = states.get(other.id);
          if (!otherState) continue;
          const dx = otherState.x - state.x;
          const dy = otherState.y - state.y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const targetDist = 180;
          const force = (dist - targetDist) * 0.01;
          state.vx += (dx / dist) * force;
          state.vy += (dy / dist) * force;
        }

        const centerX = width / 2;
        const centerY = height / 2;
        state.vx += (centerX - state.x) * 0.005;
        state.vy += (centerY - state.y) * 0.005;

        state.vx *= 0.9;
        state.vy *= 0.9;

        state.x += state.vx;
        state.y += state.vy;

        state.x = Math.max(NODE_RADIUS, Math.min(width - NODE_RADIUS, state.x));
        state.y = Math.max(NODE_RADIUS, Math.min(height - NODE_RADIUS, state.y));
      }

      render();
      animationRef.current = requestAnimationFrame(simulate);
    }

    function render() {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const node of nodes) {
        const state = nodeStatesRef.current.get(node.id);
        if (!state) continue;

        for (const prereqId of node.prerequisites) {
          const prereqState = nodeStatesRef.current.get(prereqId);
          if (!prereqState) continue;

          ctx.beginPath();
          ctx.strokeStyle = '#888';
          ctx.lineWidth = 1;
          ctx.moveTo(prereqState.x, prereqState.y);
          ctx.lineTo(state.x, state.y);
          ctx.stroke();
        }
      }

      for (const node of nodes) {
        const state = nodeStatesRef.current.get(node.id);
        if (!state) continue;

        const isHovered = hoveredNode === node.id;
        const radius = isHovered ? NODE_RADIUS * HOVER_SCALE : NODE_RADIUS;
        const color = CATEGORY_COLORS[node.category] || '#64b5f6';
        const status = progressMap.current.get(node.id);

        if (isHovered) {
          ctx.beginPath();
          ctx.fillStyle = 'rgba(100, 181, 246, 0.3)';
          ctx.arc(state.x, state.y, radius + 12, 0, Math.PI * 2);
          ctx.fill();
        }

        if (status === 'completed') {
          ctx.beginPath();
          ctx.strokeStyle = '#4caf50';
          ctx.lineWidth = 4;
          ctx.arc(state.x, state.y, radius + 4, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(state.x, state.y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.name, state.x, state.y);
      }
    }

    simulate();

    return () => {
      running = false;
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [nodes, hoveredNode, draggingNode]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (draggingNode) {
      const state = nodeStatesRef.current.get(draggingNode);
      if (state) {
        state.x = x;
        state.y = y;
        state.vx = 0;
        state.vy = 0;
      }
      lastPositionRef.current = { x, y };
    } else {
      const node = getNodeAt(x, y);
      setHoveredNode(node ? node.id : null);
    }
  }, [draggingNode, getNodeAt]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const node = getNodeAt(x, y);
    if (node) {
      setDraggingNode(node.id);
      lastPositionRef.current = { x, y };
    }
  }, [getNodeAt]);

  const handleMouseUp = useCallback(() => {
    if (draggingNode && lastPositionRef.current) {
      savePosition(draggingNode, lastPositionRef.current.x, lastPositionRef.current.y);
    }
    setDraggingNode(null);
    lastPositionRef.current = null;
  }, [draggingNode, savePosition]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggingNode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const node = getNodeAt(x, y);
    if (node) {
      onNodeClick(node.id);
    }
  }, [draggingNode, getNodeAt, onNodeClick]);

  return (
    <div>
      <h1 className="page-title">知识图谱</h1>
      <div style={{ marginBottom: '16px', display: 'flex', gap: '24px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#4caf50' }}></div>
          <span style={{ fontSize: '14px', color: '#888' }}>编程</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#2196f3' }}></div>
          <span style={{ fontSize: '14px', color: '#888' }}>数学</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#ff9800' }}></div>
          <span style={{ fontSize: '14px', color: '#888' }}>设计</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '3px solid #4caf50', background: 'transparent' }}></div>
          <span style={{ fontSize: '14px', color: '#888' }}>已完成</span>
        </div>
      </div>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: 'calc(100vh - 250px)',
          backgroundColor: '#1e1e1e',
          borderRadius: '12px',
          border: '1px solid #333',
          overflow: 'hidden',
          cursor: draggingNode ? 'grabbing' : hoveredNode ? 'pointer' : 'default',
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleClick}
          style={{ display: 'block' }}
        />
      </div>
      <p style={{ marginTop: '12px', fontSize: '13px', color: '#666' }}>
        提示：拖拽节点调整位置，点击节点生成学习路径
      </p>
    </div>
  );
}
