import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { KnowledgePoint, Relation, Difficulty } from '../types';
import { DIFFICULTY_COLORS } from '../types';

interface KnowledgeGraphProps {
  knowledgePoints: KnowledgePoint[];
  relations: Relation[];
  highlightPath?: string[];
  currentPathIndex?: number;
  filterTag?: string;
  isTeacher?: boolean;
  onNodeClick?: (kp: KnowledgePoint) => void;
  onNodeMove?: (id: string, x: number, y: number) => void;
  onRelationCreate?: (sourceId: string, targetId: string) => void;
  onRelationCurveChange?: (relationId: string, curve: number) => void;
}

const NODE_RADIUS = 18;
const ARROW_SIZE = 8;
const CURVE_HANDLE_RADIUS = 6;

function getDifficultyColor(difficulty: Difficulty): string {
  return DIFFICULTY_COLORS[difficulty];
}

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  knowledgePoints,
  relations,
  highlightPath = [],
  currentPathIndex = -1,
  filterTag = '',
  isTeacher = false,
  onNodeClick,
  onNodeMove,
  onRelationCreate,
  onRelationCurveChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [creatingRelation, setCreatingRelation] = useState<{ sourceId: string; x: number; y: number } | null>(null);
  const [draggingCurve, setDraggingCurve] = useState<{ relationId: string } | null>(null);
  const [animationTime, setAnimationTime] = useState(0);
  const kpPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  useEffect(() => {
    knowledgePoints.forEach(kp => {
      if (!kpPositionsRef.current.has(kp.id)) {
        kpPositionsRef.current.set(kp.id, { x: kp.x, y: kp.y });
      }
    });
    knowledgePoints.forEach(kp => {
      kpPositionsRef.current.set(kp.id, { x: kp.x, y: kp.y });
    });
  }, [knowledgePoints]);

  useEffect(() => {
    let frameId: number;
    const animate = () => {
      setAnimationTime(prev => prev + 1);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const getNodeVisibility = useCallback((kp: KnowledgePoint) => {
    if (!filterTag) return { visible: true, dimmed: false };
    const hasTag = kp.tags.some(t => t.includes(filterTag) || filterTag.includes(t));
    return { visible: true, dimmed: !hasTag };
  }, [filterTag]);

  const drawArrow = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, color: string) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-ARROW_SIZE, -ARROW_SIZE / 2);
    ctx.lineTo(-ARROW_SIZE, ARROW_SIZE / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }, []);

  const getBezierPoints = useCallback((sx: number, sy: number, tx: number, ty: number, curve: number) => {
    const midX = (sx + tx) / 2;
    const midY = (sy + ty) / 2;
    const dx = tx - sx;
    const dy = ty - sy;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return { cx: midX, cy: midY };
    const nx = -dy / len;
    const ny = dx / len;
    const offset = curve * 80;
    return { cx: midX + nx * offset, cy: midY + ny * offset };
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < rect.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rect.height);
      ctx.stroke();
    }
    for (let y = 0; y < rect.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
    }

    const pathRelSet = new Set<string>();
    for (let i = 0; i < highlightPath.length - 1; i++) {
      const sourceId = highlightPath[i];
      const targetId = highlightPath[i + 1];
      const rel = relations.find(r => r.sourceId === sourceId && r.targetId === targetId);
      if (rel) pathRelSet.add(rel.id);
    }
    const pathNodeSet = new Set(highlightPath);

    relations.forEach(rel => {
      const source = kpPositionsRef.current.get(rel.sourceId);
      const target = kpPositionsRef.current.get(rel.targetId);
      if (!source || !target) return;

      const sourceKp = knowledgePoints.find(kp => kp.id === rel.sourceId);
      const targetKp = knowledgePoints.find(kp => kp.id === rel.targetId);
      if (!sourceKp || !targetKp) return;

      const sourceVis = getNodeVisibility(sourceKp);
      const targetVis = getNodeVisibility(targetKp);
      if (sourceVis.dimmed || targetVis.dimmed) return;

      const { cx, cy } = getBezierPoints(source.x, source.y, target.x, target.y, rel.curve);

      const isOnPath = pathRelSet.has(rel.id);
      const isHovered = draggingCurve?.relationId === rel.id;

      if (isOnPath) {
        ctx.save();
        ctx.strokeStyle = '#f44336';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.lineDashOffset = -(animationTime % 24);
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.quadraticCurveTo(cx, cy, target.x, target.y);
        ctx.stroke();
        ctx.restore();

        const t = 0.9;
        const ax = (1 - t) * (1 - t) * source.x + 2 * (1 - t) * t * cx + t * t * target.x;
        const ay = (1 - t) * (1 - t) * source.y + 2 * (1 - t) * t * cy + t * t * target.y;
        const angle = Math.atan2(target.y - cy, target.x - cx);
        drawArrow(ctx, ax, ay, angle, '#f44336');
      } else {
        const lineColor = isTeacher ? '#1976d2' : '#bdbdbd';
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = isHovered ? 3 : 2;
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.quadraticCurveTo(cx, cy, target.x, target.y);
        ctx.stroke();

        const t = 0.9;
        const ax = (1 - t) * (1 - t) * source.x + 2 * (1 - t) * t * cx + t * t * target.x;
        const ay = (1 - t) * (1 - t) * source.y + 2 * (1 - t) * t * cy + t * t * target.y;
        const angle = Math.atan2(
          2 * t * (target.y - cy) + 2 * (1 - t) * (cy - source.y),
          2 * t * (target.x - cx) + 2 * (1 - t) * (cx - source.x)
        );
        drawArrow(ctx, ax, ay, angle, lineColor);

        if (isTeacher && isHovered) {
          ctx.fillStyle = '#00bcd4';
          ctx.beginPath();
          ctx.arc(cx, cy, CURVE_HANDLE_RADIUS + 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });

    if (creatingRelation) {
      const source = kpPositionsRef.current.get(creatingRelation.sourceId);
      if (source) {
        ctx.save();
        ctx.strokeStyle = '#00bcd4';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(creatingRelation.x, creatingRelation.y);
        ctx.stroke();
        ctx.restore();
      }
    }

    knowledgePoints.forEach(kp => {
      const pos = kpPositionsRef.current.get(kp.id);
      if (!pos) return;

      const vis = getNodeVisibility(kp);
      const isHovered = hoveredNode === kp.id;
      const isOnPath = pathNodeSet.has(kp.id);
      const isCurrentPath = highlightPath[currentPathIndex] === kp.id;

      const radius = isHovered ? NODE_RADIUS * 1.2 : NODE_RADIUS;
      const color = getDifficultyColor(kp.difficulty);

      ctx.save();

      if (vis.dimmed) {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#9e9e9e';
      } else {
        if (isHovered) {
          ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
          ctx.shadowBlur = 12;
          ctx.shadowOffsetY = 3;
        }
        ctx.fillStyle = color;
      }

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fill();

      if (isOnPath && !vis.dimmed) {
        const pulse = Math.sin(animationTime * 0.1) * 0.3 + 0.7;
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = isCurrentPath ? 4 : 3;
        ctx.globalAlpha = pulse;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius + 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      ctx.shadowColor = 'transparent';
      ctx.fillStyle = vis.dimmed ? '#616161' : '#ffffff';
      ctx.font = `bold ${Math.floor(radius * 0.7)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const displayText = kp.title.length > 2 ? kp.title.slice(0, 2) : kp.title;
      ctx.fillText(displayText, pos.x, pos.y);

      ctx.fillStyle = vis.dimmed ? '#9e9e9e' : '#424242';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(kp.title, pos.x, pos.y + radius + 6);

      ctx.restore();
    });
  }, [knowledgePoints, relations, highlightPath, currentPathIndex, hoveredNode, creatingRelation, draggingCurve, animationTime, getNodeVisibility, getBezierPoints, drawArrow, isTeacher]);

  useEffect(() => {
    render();
  }, [render]);

  useEffect(() => {
    const handleResize = () => render();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [render]);

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const findNodeAt = (x: number, y: number): KnowledgePoint | null => {
    for (let i = knowledgePoints.length - 1; i >= 0; i--) {
      const kp = knowledgePoints[i];
      const pos = kpPositionsRef.current.get(kp.id);
      if (!pos) continue;
      const dx = x - pos.x;
      const dy = y - pos.y;
      if (dx * dx + dy * dy <= NODE_RADIUS * NODE_RADIUS) {
        return kp;
      }
    }
    return null;
  };

  const findCurveHandleAt = (x: number, y: number): Relation | null => {
    if (!isTeacher) return null;
    for (const rel of relations) {
      const source = kpPositionsRef.current.get(rel.sourceId);
      const target = kpPositionsRef.current.get(rel.targetId);
      if (!source || !target) continue;
      const { cx, cy } = getBezierPoints(source.x, source.y, target.x, target.y, rel.curve);
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= (CURVE_HANDLE_RADIUS + 6) * (CURVE_HANDLE_RADIUS + 6)) {
        return rel;
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);
    const node = findNodeAt(pos.x, pos.y);
    if (node) {
      if (isTeacher && e.shiftKey) {
        setCreatingRelation({ sourceId: node.id, x: pos.x, y: pos.y });
      } else {
        setDraggingNode(node.id);
        const nodePos = kpPositionsRef.current.get(node.id);
        if (nodePos) {
          setDragOffset({ x: pos.x - nodePos.x, y: pos.y - nodePos.y });
        }
      }
      return;
    }
    if (isTeacher) {
      const curveRel = findCurveHandleAt(pos.x, pos.y);
      if (curveRel) {
        setDraggingCurve({ relationId: curveRel.id });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);

    if (creatingRelation) {
      setCreatingRelation({ ...creatingRelation, x: pos.x, y: pos.y });
      return;
    }

    if (draggingNode) {
      const newX = pos.x - dragOffset.x;
      const newY = pos.y - dragOffset.y;
      kpPositionsRef.current.set(draggingNode, { x: newX, y: newY });
      onNodeMove?.(draggingNode, newX, newY);
      return;
    }

    if (draggingCurve && isTeacher) {
      const rel = relations.find(r => r.id === draggingCurve.relationId);
      if (rel) {
        const source = kpPositionsRef.current.get(rel.sourceId);
        const target = kpPositionsRef.current.get(rel.targetId);
        if (source && target) {
          const midX = (source.x + target.x) / 2;
          const midY = (source.y + target.y) / 2;
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len > 0) {
            const nx = -dy / len;
            const ny = dx / len;
            const offsetX = pos.x - midX;
            const offsetY = pos.y - midY;
            const curve = Math.max(-1, Math.min(1, (offsetX * nx + offsetY * ny) / 80));
            onRelationCurveChange?.(rel.id, curve);
          }
        }
      }
      return;
    }

    const node = findNodeAt(pos.x, pos.y);
    setHoveredNode(node?.id ?? null);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);

    if (creatingRelation) {
      const targetNode = findNodeAt(pos.x, pos.y);
      if (targetNode && targetNode.id !== creatingRelation.sourceId) {
        const exists = relations.some(
          r => r.sourceId === creatingRelation.sourceId && r.targetId === targetNode.id
        );
        if (!exists) {
          onRelationCreate?.(creatingRelation.sourceId, targetNode.id);
        }
      }
      setCreatingRelation(null);
      return;
    }

    if (draggingNode) {
      setDraggingNode(null);
      return;
    }

    if (draggingCurve) {
      setDraggingCurve(null);
      return;
    }

    const node = findNodeAt(pos.x, pos.y);
    if (node && !isTeacher) {
      onNodeClick?.(node);
    } else if (node && isTeacher && !e.shiftKey) {
      onNodeClick?.(node);
    }
  };

  const handleMouseLeave = () => {
    setHoveredNode(null);
    setDraggingNode(null);
    setCreatingRelation(null);
    setDraggingCurve(null);
  };

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        className="graph-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  );
};
