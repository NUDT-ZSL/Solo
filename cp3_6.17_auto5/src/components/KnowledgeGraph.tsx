import React, { useRef, useEffect, useState, useCallback } from 'react';
import { KnowledgePoint, KnowledgeRelation, Difficulty } from '../types';

interface KnowledgeGraphProps {
  points: KnowledgePoint[];
  relations: KnowledgeRelation[];
  recommendPath: string[];
  filterTag: string | null;
  isTeacher: boolean;
  onPointClick: (point: KnowledgePoint) => void;
  onPointMove: (pointId: string, x: number, y: number) => void;
  onRelationCreate: (sourceId: string, targetId: string) => void;
  onRelationUpdate: (relationId: string, curvature: number) => void;
}

const NODE_RADIUS = 18;
const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  '初级': '#81c784',
  '中级': '#ffb74d',
  '高级': '#e57373',
};

const KNOWLEDGE_RELATION_COLOR = '#bdbdbd';
const EXISTING_RELATION_HIGHLIGHT = '#1976d2';
const PATH_HIGHLIGHT_COLOR = '#f44336';
const FILTERED_OPACITY = 0.3;
const FILTERED_COLOR = '#9e9e9e';

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  points,
  relations,
  recommendPath,
  filterTag,
  isTeacher,
  onPointClick,
  onPointMove,
  onRelationCreate,
  onRelationUpdate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [creatingRelation, setCreatingRelation] = useState<{
    sourceId: string;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const [editingRelation, setEditingRelation] = useState<{
    relationId: string;
    controlX: number;
    controlY: number;
  } | null>(null);
  const [animationTime, setAnimationTime] = useState(0);

  const getCanvasCoords = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    []
  );

  const findNodeAt = useCallback(
    (x: number, y: number) => {
      for (let i = points.length - 1; i >= 0; i--) {
        const point = points[i];
        const dx = x - point.x;
        const dy = y - point.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= NODE_RADIUS * 1.5) {
          return point;
        }
      }
      return null;
    },
    [points]
  );

  const findRelationControlAt = useCallback(
    (x: number, y: number, mouseX: number, mouseY: number) => {
      const controlRadius = 10;
      const dx = mouseX - x;
      const dy = mouseY - y;
      return Math.sqrt(dx * dx + dy * dy) <= controlRadius;
    },
    []
  );

  const drawArrowHead = useCallback(
    (ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, color: string) => {
      const arrowLength = 12;
      const arrowAngle = Math.PI / 6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(
        x - arrowLength * Math.cos(angle - arrowAngle),
        y - arrowLength * Math.sin(angle - arrowAngle)
      );
      ctx.lineTo(
        x - arrowLength * Math.cos(angle + arrowAngle),
        y - arrowLength * Math.sin(angle + arrowAngle)
      );
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    },
    []
  );

  const drawBezierCurve = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      sourceX: number,
      sourceY: number,
      targetX: number,
      targetY: number,
      curvature: number,
      color: string,
      isDashed: boolean = false,
      lineWidth: number = 2
    ) => {
      const midX = (sourceX + targetX) / 2;
      const midY = (sourceY + targetY) / 2;
      const dx = targetX - sourceX;
      const dy = targetY - sourceY;
      const len = Math.sqrt(dx * dx + dy * dy);
      const normalX = -dy / len;
      const normalY = dx / len;
      const controlX = midX + normalX * curvature * 80;
      const controlY = midY + normalY * curvature * 80;

      ctx.beginPath();
      ctx.moveTo(sourceX, sourceY);
      ctx.quadraticCurveTo(controlX, controlY, targetX, targetY);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      if (isDashed) {
        ctx.setLineDash([8, 4]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      const t = 0.95;
      const tangentX = 2 * (1 - t) * (controlX - sourceX) + 2 * t * (targetX - controlX);
      const tangentY = 2 * (1 - t) * (controlY - sourceY) + 2 * t * (targetY - controlY);
      const angle = Math.atan2(tangentY, tangentX);
      const endX = Math.pow(1 - t, 2) * sourceX + 2 * (1 - t) * t * controlX + Math.pow(t, 2) * targetX;
      const endY = Math.pow(1 - t, 2) * sourceY + 2 * (1 - t) * t * controlY + Math.pow(t, 2) * targetY;
      drawArrowHead(ctx, endX, endY, angle, color);

      return { controlX, controlY };
    },
    [drawArrowHead]
  );

  const isPointFiltered = useCallback(
    (point: KnowledgePoint) => {
      if (!filterTag) return false;
      return !point.tags.includes(filterTag);
    },
    [filterTag]
  );

  const isInPath = useCallback(
    (pointId: string) => {
      return recommendPath.includes(pointId);
    },
    [recommendPath]
  );

  const isRelationInPath = useCallback(
    (sourceId: string, targetId: string) => {
      for (let i = 0; i < recommendPath.length - 1; i++) {
        if (recommendPath[i] === sourceId && recommendPath[i + 1] === targetId) {
          return true;
        }
      }
      return false;
    },
    [recommendPath]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pathSet = new Set(recommendPath);

    relations.forEach((relation) => {
      const source = points.find((p) => p.id === relation.sourceId);
      const target = points.find((p) => p.id === relation.targetId);
      if (!source || !target) return;

      const sourceFiltered = isPointFiltered(source);
      const targetFiltered = isPointFiltered(target);
      if (sourceFiltered || targetFiltered) return;

      const inPath = isRelationInPath(relation.sourceId, relation.targetId);
      const color = inPath ? PATH_HIGHLIGHT_COLOR : EXISTING_RELATION_HIGHLIGHT;
      const isDashed = inPath;
      const lineWidth = inPath ? 3 : 2;

      drawBezierCurve(
        ctx,
        source.x,
        source.y,
        target.x,
        target.y,
        relation.curvature,
        color,
        isDashed,
        lineWidth
      );

      if (isTeacher && !inPath) {
        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2;
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const normalX = -dy / len;
        const normalY = dx / len;
        const controlX = midX + normalX * relation.curvature * 80;
        const controlY = midY + normalY * relation.curvature * 80;

        ctx.beginPath();
        ctx.arc(controlX, controlY, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = EXISTING_RELATION_HIGHLIGHT;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    if (creatingRelation) {
      const source = points.find((p) => p.id === creatingRelation.sourceId);
      if (source) {
        drawBezierCurve(
          ctx,
          source.x,
          source.y,
          creatingRelation.currentX,
          creatingRelation.currentY,
          0.3,
          EXISTING_RELATION_HIGHLIGHT,
          true,
          2
        );
      }
    }

    points.forEach((point) => {
      const filtered = isPointFiltered(point);
      const inPath = isInPath(point.id);
      const hovered = hoveredNodeId === point.id;
      const dragging = draggingNodeId === point.id;

      const radius = hovered || dragging ? NODE_RADIUS * 1.2 : NODE_RADIUS;
      const color = filtered ? FILTERED_COLOR : DIFFICULTY_COLORS[point.difficulty];
      const opacity = filtered ? FILTERED_OPACITY : 1;

      ctx.globalAlpha = opacity;

      if (hovered || dragging) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius + 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      if (inPath) {
        const pulsePhase = (animationTime % 2000) / 2000;
        const pulseWidth = 3 + Math.sin(pulsePhase * Math.PI * 2) * 2;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius + pulseWidth, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.5 + Math.sin(pulsePhase * Math.PI * 2) * 0.5;
        ctx.stroke();
        ctx.globalAlpha = opacity;
      }

      ctx.beginPath();
      ctx.arc(point.x, point.y, radius - 2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = opacity * 0.3;
      ctx.fill();
      ctx.globalAlpha = opacity;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const displayText = point.title.length > 4 ? point.title.slice(0, 4) + '...' : point.title;
      ctx.fillText(displayText, point.x, point.y);

      ctx.globalAlpha = 1;
    });
  }, [
    points,
    relations,
    recommendPath,
    hoveredNodeId,
    draggingNodeId,
    creatingRelation,
    animationTime,
    isPointFiltered,
    isInPath,
    isRelationInPath,
    drawBezierCurve,
    isTeacher,
  ]);

  useEffect(() => {
    let lastTime = performance.now();
    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      setAnimationTime((prev) => prev + deltaTime);
      lastTime = currentTime;
      draw();
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const { x, y } = getCanvasCoords(e);
      
      if (isTeacher) {
        for (const relation of relations) {
          const source = points.find((p) => p.id === relation.sourceId);
          const target = points.find((p) => p.id === relation.targetId);
          if (!source || !target) continue;

          const midX = (source.x + target.x) / 2;
          const midY = (source.y + target.y) / 2;
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const normalX = -dy / len;
          const normalY = dx / len;
          const controlX = midX + normalX * relation.curvature * 80;
          const controlY = midY + normalY * relation.curvature * 80;

          if (findRelationControlAt(controlX, controlY, x, y)) {
            setEditingRelation({
              relationId: relation.id,
              controlX,
              controlY,
            });
            return;
          }
        }
      }

      const node = findNodeAt(x, y);
      if (node) {
        if (e.button === 2 && isTeacher) {
          e.preventDefault();
          setCreatingRelation({
            sourceId: node.id,
            startX: node.x,
            startY: node.y,
            currentX: x,
            currentY: y,
          });
        } else {
          setDraggingNodeId(node.id);
          setDragOffset({ x: x - node.x, y: y - node.y });
        }
      }
    },
    [getCanvasCoords, findNodeAt, findRelationControlAt, relations, points, isTeacher]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const { x, y } = getCanvasCoords(e);

      if (creatingRelation) {
        setCreatingRelation((prev) =>
          prev ? { ...prev, currentX: x, currentY: y } : null
        );
        return;
      }

      if (editingRelation) {
        const relation = relations.find((r) => r.id === editingRelation.relationId);
        const source = points.find((p) => p.id === relation?.sourceId);
        const target = points.find((p) => p.id === relation?.targetId);
        if (relation && source && target) {
          const midX = (source.x + target.x) / 2;
          const midY = (source.y + target.y) / 2;
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const normalX = -dy / len;
          const normalY = dx / len;
          
          const projected = (x - midX) * normalX + (y - midY) * normalY;
          const newCurvature = Math.max(-1, Math.min(1, projected / 80));
          onRelationUpdate(relation.id, newCurvature);
        }
        return;
      }

      if (draggingNodeId) {
        const newX = x - dragOffset.x;
        const newY = y - dragOffset.y;
        onPointMove(draggingNodeId, newX, newY);
        return;
      }

      const node = findNodeAt(x, y);
      setHoveredNodeId(node?.id || null);
    },
    [getCanvasCoords, creatingRelation, editingRelation, draggingNodeId, dragOffset, findNodeAt, relations, points, onRelationUpdate, onPointMove]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      const { x, y } = getCanvasCoords(e);

      if (creatingRelation) {
        const targetNode = findNodeAt(x, y);
        if (targetNode && targetNode.id !== creatingRelation.sourceId) {
          onRelationCreate(creatingRelation.sourceId, targetNode.id);
        }
        setCreatingRelation(null);
        return;
      }

      if (editingRelation) {
        setEditingRelation(null);
        return;
      }

      if (draggingNodeId) {
        const node = points.find((p) => p.id === draggingNodeId);
        if (node && Math.abs(x - dragOffset.x - node.x) < 3 && Math.abs(y - dragOffset.y - node.y) < 3) {
          onPointClick(node);
        }
        setDraggingNodeId(null);
        setDragOffset({ x: 0, y: 0 });
      }
    },
    [getCanvasCoords, creatingRelation, editingRelation, draggingNodeId, dragOffset, findNodeAt, points, onRelationCreate, onPointClick]
  );

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      style={{ minHeight: '400px' }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
        style={{ transition: 'filter 0.3s ease' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setHoveredNodeId(null);
          setCreatingRelation(null);
          setEditingRelation(null);
          setDraggingNodeId(null);
        }}
        onContextMenu={handleContextMenu}
      />
      {isTeacher && (
        <div className="absolute bottom-4 left-4 text-xs text-gray-500 bg-white/90 px-3 py-2 rounded-lg shadow">
          <p>左键拖拽移动节点，右键拖拽创建关系</p>
          <p>拖动连线中点可调节曲率</p>
        </div>
      )}
    </div>
  );
};
