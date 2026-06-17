import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import type { KnowledgePoint, Relation, Difficulty } from '../types';
import { DIFFICULTY_COLORS } from '../types';

export interface KnowledgeGraphHandle {
  updateNodePosition: (id: string, x: number, y: number) => void;
}

interface KnowledgeGraphProps {
  knowledgePoints: KnowledgePoint[];
  relations: Relation[];
  mode?: 'view' | 'edit';
  filterTags?: string[];
  highlightPath?: string[];
  activeNodeId?: string;
  onNodeClick?: (kp: KnowledgePoint) => void;
  onNodeMove?: (id: string, x: number, y: number) => void;
  onCreateRelation?: (sourceId: string, targetId: string) => void;
  onUpdateRelationCurvature?: (relId: string, curvature: number) => void;
}

const NODE_RADIUS = 18;
const ARROW_SIZE = 8;
const ANCHOR_RADIUS = 6;

interface DragState {
  type: 'node' | 'anchor' | 'create' | null;
  nodeId?: string;
  relId?: string;
  offsetX?: number;
  offsetY?: number;
  startNodeId?: string;
  mouseX?: number;
  mouseY?: number;
}

const KnowledgeGraph = forwardRef<KnowledgeGraphHandle, KnowledgeGraphProps>(function KnowledgeGraph(
  {
    knowledgePoints,
    relations,
    mode = 'view',
    filterTags = [],
    highlightPath = [],
    activeNodeId,
    onNodeClick,
    onNodeMove,
    onCreateRelation,
    onUpdateRelationCurvature,
  },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const kpsRef = useRef<KnowledgePoint[]>(knowledgePoints);
  const relsRef = useRef<Relation[]>(relations);
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState>({ type: null });
  const dragRef = useRef<DragState>({ type: null });
  const hoverRef = useRef<string | null>(null);
  const animFrameRef = useRef<number>(0);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const scaleRef = useRef(1);

  useEffect(() => {
    kpsRef.current = knowledgePoints;
  }, [knowledgePoints]);

  useEffect(() => {
    relsRef.current = relations;
  }, [relations]);

  useEffect(() => {
    hoverRef.current = hoverNodeId;
  }, [hoverNodeId]);

  useImperativeHandle(ref, () => ({
    updateNodePosition: (id: string, x: number, y: number) => {
      const kps = kpsRef.current;
      const idx = kps.findIndex((k) => k.id === id);
      if (idx !== -1) {
        kps[idx] = { ...kps[idx], x, y };
      }
    },
  }));

  const isNodeFiltered = useCallback((kp: KnowledgePoint): boolean => {
    if (!filterTags || filterTags.length === 0) return false;
    return !filterTags.some((t) => kp.tags.includes(t));
  }, [filterTags]);

  const getNodeScale = useCallback((id: string): number => {
    if (hoverRef.current === id) return 1.2;
    return 1;
  }, []);

  const getColorForDifficulty = (d: Difficulty): string => DIFFICULTY_COLORS[d];

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setSize({ w: rect.width, h: rect.height });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    scaleRef.current = dpr;
  }, [size]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = scaleRef.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);

    // grid background
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    const gridStep = 40;
    for (let x = 0; x < size.w; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size.h);
      ctx.stroke();
    }
    for (let y = 0; y < size.h; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size.w, y);
      ctx.stroke();
    }

    const kps = kpsRef.current;
    const rels = relsRef.current;
    const kpMap = new Map(kps.map((k) => [k.id, k]));

    const highlightSet = new Set(highlightPath);
    const highlightEdgeSet = new Set<string>();
    for (let i = 0; i < highlightPath.length - 1; i++) {
      highlightEdgeSet.add(`${highlightPath[i]}->${highlightPath[i + 1]}`);
    }

    // Draw relations
    for (const rel of rels) {
      const source = kpMap.get(rel.sourceId);
      const target = kpMap.get(rel.targetId);
      if (!source || !target) continue;
      const sourceFiltered = isNodeFiltered(source);
      const targetFiltered = isNodeFiltered(target);
      if (sourceFiltered || targetFiltered) continue;

      const sx = source.x;
      const sy = source.y;
      const tx = target.x;
      const ty = target.y;
      const midX = (sx + tx) / 2;
      const midY = (sy + ty) / 2;
      const dx = tx - sx;
      const dy = ty - sy;
      const len = Math.sqrt(dx * dx + dy * dy);
      const nx = len > 0 ? -dy / len : 0;
      const ny = len > 0 ? dx / len : 0;
      const curvature = rel.curvature || 0;
      const cx = midX + nx * curvature * 80;
      const cy = midY + ny * curvature * 80;

      const isHighlightEdge = highlightEdgeSet.has(`${rel.sourceId}->${rel.targetId}`);
      const isExistRelation = true;

      // Draw bezier
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(cx, cy, tx, ty);
      if (isHighlightEdge) {
        ctx.strokeStyle = '#f44336';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
      } else if (mode === 'edit' && isExistRelation) {
        ctx.strokeStyle = '#1976d2';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = '#bdbdbd';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([]);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Arrow at end
      const tApprox = 0.92;
      const ax = (1 - tApprox) * (1 - tApprox) * sx + 2 * (1 - tApprox) * tApprox * cx + tApprox * tApprox * tx;
      const ay = (1 - tApprox) * (1 - tApprox) * sy + 2 * (1 - tApprox) * tApprox * cy + tApprox * tApprox * ty;
      const dx2 = tx - ax;
      const dy2 = ty - ay;
      const alen = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      if (alen > 0) {
        const ux = dx2 / alen;
        const uy = dy2 / alen;
        const px = -uy;
        const py = ux;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(ax - ux * ARROW_SIZE + px * ARROW_SIZE * 0.6, ay - uy * ARROW_SIZE + py * ARROW_SIZE * 0.6);
        ctx.lineTo(ax - ux * ARROW_SIZE - px * ARROW_SIZE * 0.6, ay - uy * ARROW_SIZE - py * ARROW_SIZE * 0.6);
        ctx.closePath();
        ctx.fillStyle = isHighlightEdge ? '#f44336' : mode === 'edit' ? '#1976d2' : '#bdbdbd';
        ctx.fill();
      }

      // Anchor for curvature in edit mode
      if (mode === 'edit') {
        ctx.beginPath();
        ctx.arc(cx, cy, ANCHOR_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#1976d2';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // Draw create line preview
    const d = dragRef.current;
    if (d.type === 'create' && d.startNodeId && d.mouseX !== undefined && d.mouseY !== undefined) {
      const start = kpMap.get(d.startNodeId);
      if (start) {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(d.mouseX, d.mouseY);
        ctx.strokeStyle = '#00bcd4';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw nodes
    for (const kp of kps) {
      const filtered = isNodeFiltered(kp);
      const scale = getNodeScale(kp.id);
      const r = NODE_RADIUS * scale;
      const isHighlight = highlightSet.has(kp.id);
      const isActive = activeNodeId === kp.id;

      // Shadow
      if (!filtered) {
        ctx.beginPath();
        ctx.arc(kp.x + 2, kp.y + 3, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fill();
      }

      // Circle fill
      ctx.beginPath();
      ctx.arc(kp.x, kp.y, r, 0, Math.PI * 2);
      if (filtered) {
        ctx.fillStyle = 'rgba(158,158,158,0.3)';
      } else {
        ctx.fillStyle = getColorForDifficulty(kp.difficulty);
      }
      ctx.fill();

      // Highlight border (gold glow animation for path)
      if (isHighlight || isActive) {
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, r + 3, 0, Math.PI * 2);
        const time = Date.now() / 300;
        const pulse = isHighlight ? 0.6 + 0.4 * Math.sin(time) : 1;
        ctx.strokeStyle = isHighlight ? `rgba(255,215,0,${pulse})` : '#1a237e';
        ctx.lineWidth = isHighlight ? 4 : 3;
        ctx.stroke();

        if (isHighlight) {
          ctx.beginPath();
          ctx.arc(kp.x, kp.y, r + 7, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255,215,0,${pulse * 0.4})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      } else if (!filtered) {
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Title label
      ctx.fillStyle = filtered ? 'rgba(158,158,158,0.6)' : '#fff';
      ctx.font = `bold ${Math.round(11 * scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const shortTitle = kp.title.length > 4 ? kp.title.slice(0, 4) + '…' : kp.title;
      ctx.fillText(shortTitle, kp.x, kp.y);

      // Full title above
      if (!filtered) {
        ctx.fillStyle = '#424242';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        const tw = ctx.measureText(kp.title).width;
        const pad = 6;
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(kp.x - tw / 2 - pad, kp.y - r - 20, tw + pad * 2, 16);
        ctx.fillStyle = '#424242';
        ctx.fillText(kp.title, kp.x, kp.y - r - 12);
      }
    }
  }, [size, isNodeFiltered, getNodeScale, highlightPath, activeNodeId, mode]);

  useEffect(() => {
    let running = true;
    const loop = () => {
      if (!running) return;
      draw();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [draw]);

  const getMousePos = (e: React.MouseEvent | MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const findNodeAt = (x: number, y: number): KnowledgePoint | null => {
    const kps = kpsRef.current;
    for (let i = kps.length - 1; i >= 0; i--) {
      const kp = kps[i];
      const dx = x - kp.x;
      const dy = y - kp.y;
      const scale = getNodeScale(kp.id);
      const r = NODE_RADIUS * scale;
      if (dx * dx + dy * dy <= r * r) return kp;
    }
    return null;
  };

  const findAnchorAt = (x: number, y: number): { relId: string } | null => {
    if (mode !== 'edit') return null;
    const rels = relsRef.current;
    const kpMap = new Map(kpsRef.current.map((k) => [k.id, k]));
    for (const rel of rels) {
      const s = kpMap.get(rel.sourceId);
      const t = kpMap.get(rel.targetId);
      if (!s || !t) continue;
      const midX = (s.x + t.x) / 2;
      const midY = (s.y + t.y) / 2;
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const nx = len > 0 ? -dy / len : 0;
      const ny = len > 0 ? dx / len : 0;
      const curvature = rel.curvature || 0;
      const cx = midX + nx * curvature * 80;
      const cy = midY + ny * curvature * 80;
      const ddx = x - cx;
      const ddy = y - cy;
      if (ddx * ddx + ddy * ddy <= (ANCHOR_RADIUS + 4) * (ANCHOR_RADIUS + 4)) {
        return { relId: rel.id };
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getMousePos(e);
    const node = findNodeAt(x, y);
    if (node) {
      if (mode === 'edit' && e.shiftKey) {
        const nd: DragState = { type: 'create', startNodeId: node.id, mouseX: x, mouseY: y };
        setDrag(nd);
        dragRef.current = nd;
      } else {
        const nd: DragState = {
          type: 'node',
          nodeId: node.id,
          offsetX: x - node.x,
          offsetY: y - node.y,
        };
        setDrag(nd);
        dragRef.current = nd;
      }
      return;
    }
    const anchor = findAnchorAt(x, y);
    if (anchor) {
      const nd: DragState = { type: 'anchor', relId: anchor.relId, mouseX: x, mouseY: y };
      setDrag(nd);
      dragRef.current = nd;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const { x, y } = getMousePos(e);

    // hover detection
    const node = findNodeAt(x, y);
    const newHover = node ? node.id : null;
    if (newHover !== hoverRef.current) {
      setHoverNodeId(newHover);
      hoverRef.current = newHover;
    }

    const d = dragRef.current;
    if (d.type === 'node' && d.nodeId) {
      const kps = kpsRef.current;
      const idx = kps.findIndex((k) => k.id === d.nodeId);
      if (idx !== -1) {
        const nx = Math.max(NODE_RADIUS, Math.min(size.w - NODE_RADIUS, x - (d.offsetX || 0)));
        const ny = Math.max(NODE_RADIUS + 24, Math.min(size.h - NODE_RADIUS, y - (d.offsetY || 0)));
        kps[idx] = { ...kps[idx], x: nx, y: ny };
        if (onNodeMove) onNodeMove(d.nodeId, nx, ny);
      }
    } else if (d.type === 'create') {
      const nd: DragState = { ...d, mouseX: x, mouseY: y };
      dragRef.current = nd;
      setDrag(nd);
    } else if (d.type === 'anchor' && d.relId) {
      const rels = relsRef.current;
      const idx = rels.findIndex((r) => r.id === d.relId);
      if (idx !== -1) {
        const rel = rels[idx];
        const kpMap = new Map(kpsRef.current.map((k) => [k.id, k]));
        const s = kpMap.get(rel.sourceId);
        const t = kpMap.get(rel.targetId);
        if (s && t) {
          const midX = (s.x + t.x) / 2;
          const midY = (s.y + t.y) / 2;
          const dx = t.x - s.x;
          const dy = t.y - s.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len > 0) {
            const nx = -dy / len;
            const ny = dx / len;
            const anchorOffsetX = x - midX;
            const anchorOffsetY = y - midY;
            const curv = (anchorOffsetX * nx + anchorOffsetY * ny) / 80;
            const clamped = Math.max(-2, Math.min(2, curv));
            rels[idx] = { ...rel, curvature: clamped };
            if (onUpdateRelationCurvature) onUpdateRelationCurvature(rel.id, clamped);
          }
        }
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const { x, y } = getMousePos(e);
    const d = dragRef.current;
    if (d.type === 'create' && d.startNodeId) {
      const target = findNodeAt(x, y);
      if (target && target.id !== d.startNodeId && onCreateRelation) {
        onCreateRelation(d.startNodeId, target.id);
      }
    } else if (d.type === null) {
      const node = findNodeAt(x, y);
      if (node && onNodeClick) {
        onNodeClick(node);
      }
    }
    const nd: DragState = { type: null };
    setDrag(nd);
    dragRef.current = nd;
  };

  const handleMouseLeave = () => {
    setHoverNodeId(null);
    hoverRef.current = null;
    const d = dragRef.current;
    if (d.type !== 'create' && d.type !== 'anchor') {
      const nd: DragState = { type: null };
      setDrag(nd);
      dragRef.current = nd;
    }
  };

  return (
    <div className="graph-canvas-wrapper" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="graph-canvas"
        style={{ transition: 'filter 0.3s ease, opacity 0.3s ease' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  );
});

export default KnowledgeGraph;
