import { useRef, useEffect, useState, useCallback } from 'react';
import type { KnowledgePoint, Relation, Difficulty } from '../types';
import KnowledgeDetailModal from './KnowledgeDetailModal';
import './KnowledgeGraph.css';

interface KnowledgeGraphProps {
  points: KnowledgePoint[];
  relations: Relation[];
  highlightPath?: string[];
  filterTag?: string | null;
  mode?: 'view' | 'edit';
  onPointClick?: (point: KnowledgePoint) => void;
  onPointMove?: (pointId: string, x: number, y: number) => void;
  onRelationCreate?: (sourceId: string, targetId: string) => void;
  onRelationUpdate?: (relationId: string, curvature: number) => void;
  reviewedIds?: string[];
}

const NODE_RADIUS = 18;
const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  '初级': '#81c784',
  '中级': '#ffb74d',
  '高级': '#e57373'
};

function KnowledgeGraph({
  points,
  relations,
  highlightPath = [],
  filterTag = null,
  mode = 'view',
  onPointClick,
  onPointMove,
  onRelationCreate,
  onRelationUpdate,
  reviewedIds = []
}: KnowledgeGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const [selectedPoint, setSelectedPoint] = useState<KnowledgePoint | null>(null);
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);
  const [draggingPointId, setDraggingPointId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [creatingRelation, setCreatingRelation] = useState<{
    sourceId: string;
    startX: number;
    startY: number;
    mouseX: number;
    mouseY: number;
  } | null>(null);
  const [draggingAnchor, setDraggingAnchor] = useState<{
    relationId: string;
  } | null>(null);
  const [filterAnimProgress, setFilterAnimProgress] = useState(1);
  const [pulsePhase, setPulsePhase] = useState(0);

  const getFilteredOpacity = useCallback((point: KnowledgePoint): number => {
    if (!filterTag) return 1;
    const matches = point.tags.includes(filterTag);
    const targetOpacity = matches ? 1 : 0.3;
    return targetOpacity;
  }, [filterTag]);

  const isRelationVisible = useCallback((rel: Relation, pointMap: Map<string, KnowledgePoint>): boolean => {
    if (!filterTag) return true;
    const source = pointMap.get(rel.sourceId);
    const target = pointMap.get(rel.targetId);
    if (!source || !target) return false;
    return source.tags.includes(filterTag) && target.tags.includes(filterTag);
  }, [filterTag]);

  useEffect(() => {
    const duration = 300;
    const startTime = performance.now();
    const startProgress = filterAnimProgress;

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setFilterAnimProgress(startProgress + (1 - startProgress) * easeProgress);
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }, [filterTag]);

  useEffect(() => {
    function animatePulse() {
      setPulsePhase(prev => (prev + 0.05) % (Math.PI * 2));
      animationRef.current = requestAnimationFrame(animatePulse);
    }
    animationRef.current = requestAnimationFrame(animatePulse);
    return () => cancelAnimationFrame(animationRef.current);
  }, []);

  const getPointMap = useCallback((): Map<string, KnowledgePoint> => {
    const map = new Map<string, KnowledgePoint>();
    points.forEach(p => map.set(p.id, p));
    return map;
  }, [points]);

  const drawArrow = useCallback((
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string
  ) => {
    const headLength = 10;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  }, []);

  const getControlPoint = useCallback((
    source: KnowledgePoint,
    target: KnowledgePoint,
    curvature: number
  ) => {
    const midX = (source.x + target.x) / 2;
    const midY = (source.y + target.y) / 2;
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const perpX = -dy;
    const perpY = dx;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return { x: midX, y: midY };
    const offset = curvature * length * 0.3;
    return {
      x: midX + (perpX / length) * offset,
      y: midY + (perpY / length) * offset
    };
  }, []);

  const drawBezierCurve = useCallback((
    ctx: CanvasRenderingContext2D,
    source: KnowledgePoint,
    target: KnowledgePoint,
    curvature: number,
    color: string,
    lineWidth: number,
    dashed: boolean = false
  ) => {
    const control = getControlPoint(source, target, curvature);

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    if (dashed) {
      ctx.setLineDash([8, 6]);
    } else {
      ctx.setLineDash([]);
    }

    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.quadraticCurveTo(control.x, control.y, target.x, target.y);
    ctx.stroke();
    ctx.setLineDash([]);

    const t = 0.92;
    const arrowStartX = (1 - t) * (1 - t) * source.x + 2 * (1 - t) * t * control.x + t * t * target.x;
    const arrowStartY = (1 - t) * (1 - t) * source.y + 2 * (1 - t) * t * control.y + t * t * target.y;

    drawArrow(ctx, arrowStartX, arrowStartY, target.x, target.y, color);
  }, [getControlPoint, drawArrow]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ratio = window.devicePixelRatio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    const pointMap = getPointMap();

    relations.forEach(rel => {
      const source = pointMap.get(rel.sourceId);
      const target = pointMap.get(rel.targetId);
      if (!source || !target) return;

      const visible = isRelationVisible(rel, pointMap);
      if (!visible) return;

      const sourceOpacity = getFilteredOpacity(source);
      const targetOpacity = getFilteredOpacity(target);
      const opacity = Math.min(sourceOpacity, targetOpacity);

      if (opacity < 0.5) return;

      const isInPath = highlightPath.length >= 2 &&
        highlightPath.some((id, idx) =>
          idx < highlightPath.length - 1 &&
          highlightPath[idx] === rel.sourceId &&
          highlightPath[idx + 1] === rel.targetId
        );

      if (isInPath) {
        ctx.globalAlpha = 1;
        drawBezierCurve(ctx, source, target, rel.curvature, '#f44336', 3, true);
      } else {
        ctx.globalAlpha = opacity;
        drawBezierCurve(ctx, source, target, rel.curvature, '#bdbdbd', 2, false);
      }
      ctx.globalAlpha = 1;
    });

    if (creatingRelation) {
      const source = pointMap.get(creatingRelation.sourceId);
      if (source) {
        ctx.strokeStyle = '#1976d2';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(creatingRelation.mouseX, creatingRelation.mouseY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    points.forEach(point => {
      const opacity = getFilteredOpacity(point);
      const baseColor = filterTag && !point.tags.includes(filterTag)
        ? '#9e9e9e'
        : DIFFICULTY_COLORS[point.difficulty];

      const isInPath = highlightPath.includes(point.id);
      const isHovered = hoveredPointId === point.id;
      const isReviewed = reviewedIds.includes(point.id);

      const scale = isHovered ? 1.2 : 1;
      const radius = NODE_RADIUS * scale;

      ctx.globalAlpha = opacity;

      if (isHovered) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 3;
      }

      if (isInPath) {
        const pulseIntensity = (Math.sin(pulsePhase) + 1) / 2;
        const goldBorderWidth = 3 + pulseIntensity * 2;

        ctx.beginPath();
        ctx.arc(point.x, point.y, radius + goldBorderWidth, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 215, 0, ${0.3 + pulseIntensity * 0.4})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = baseColor;
        ctx.fill();

        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 3;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = baseColor;
        ctx.fill();

        if (isReviewed) {
          ctx.strokeStyle = '#4caf50';
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      }

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const displayText = point.title.length > 4 ? point.title.slice(0, 4) : point.title;
      ctx.fillText(displayText, point.x, point.y);

      ctx.globalAlpha = 1;

      if (isHovered) {
        ctx.fillStyle = '#212121';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        const textWidth = ctx.measureText(point.title).width;
        const bgX = point.x - textWidth / 2 - 8;
        const bgY = point.y - radius - 28;
        const bgWidth = textWidth + 16;
        const bgHeight = 22;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        ctx.roundRect(bgX, bgY, bgWidth, bgHeight, 4);
        ctx.fill();

        ctx.fillStyle = '#212121';
        ctx.fillText(point.title, point.x, point.y - radius - 14);
      }
    });

    if (mode === 'edit') {
      relations.forEach(rel => {
        const source = pointMap.get(rel.sourceId);
        const target = pointMap.get(rel.targetId);
        if (!source || !target) return;
        if (!isRelationVisible(rel, pointMap)) return;

        const control = getControlPoint(source, target, rel.curvature);

        ctx.fillStyle = '#1976d2';
        ctx.beginPath();
        ctx.arc(control.x, control.y, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(control.x, control.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }

  }, [points, relations, highlightPath, hoveredPointId, getPointMap, getFilteredOpacity,
      isRelationVisible, drawBezierCurve, creatingRelation, pulsePhase, mode,
      getControlPoint, reviewedIds]);

  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement> | MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }, []);

  const findPointAtPos = useCallback((x: number, y: number): KnowledgePoint | null => {
    for (let i = points.length - 1; i >= 0; i--) {
      const point = points[i];
      const dx = x - point.x;
      const dy = y - point.y;
      if (dx * dx + dy * dy <= NODE_RADIUS * NODE_RADIUS * 1.44) {
        return point;
      }
    }
    return null;
  }, [points]);

  const findAnchorAtPos = useCallback((x: number, y: number): Relation | null => {
    const pointMap = getPointMap();
    for (const rel of relations) {
      const source = pointMap.get(rel.sourceId);
      const target = pointMap.get(rel.targetId);
      if (!source || !target) continue;
      const control = getControlPoint(source, target, rel.curvature);
      const dx = x - control.x;
      const dy = y - control.y;
      if (dx * dx + dy * dy <= 36) {
        return rel;
      }
    }
    return null;
  }, [relations, getPointMap, getControlPoint]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getMousePos(e);
    const point = findPointAtPos(x, y);

    if (mode === 'edit' && e.button === 2) {
      e.preventDefault();
      if (point) {
        setCreatingRelation({
          sourceId: point.id,
          startX: point.x,
          startY: point.y,
          mouseX: x,
          mouseY: y
        });
      }
      return;
    }

    if (mode === 'edit') {
      const anchor = findAnchorAtPos(x, y);
      if (anchor) {
        setDraggingAnchor({ relationId: anchor.id });
        return;
      }
    }

    if (point) {
      setDraggingPointId(point.id);
      setDragOffset({
        x: x - point.x,
        y: y - point.y
      });
    }
  }, [getMousePos, findPointAtPos, findAnchorAtPos, mode]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getMousePos(e);

    if (creatingRelation) {
      setCreatingRelation(prev => prev ? { ...prev, mouseX: x, mouseY: y } : null);
      return;
    }

    if (draggingPointId && onPointMove) {
      const newX = x - dragOffset.x;
      const newY = y - dragOffset.y;
      onPointMove(draggingPointId, newX, newY);
      return;
    }

    if (draggingAnchor && onRelationUpdate) {
      const rel = relations.find(r => r.id === draggingAnchor.relationId);
      const pointMap = getPointMap();
      if (rel) {
        const source = pointMap.get(rel.sourceId);
        const target = pointMap.get(rel.targetId);
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const midX = (source.x + target.x) / 2;
          const midY = (source.y + target.y) / 2;
          const perpX = -dy / length;
          const perpY = dx / length;
          const offsetX = x - midX;
          const offsetY = y - midY;
          const offset = offsetX * perpX + offsetY * perpY;
          const curvature = offset / (length * 0.3);
          const clampedCurvature = Math.max(-2, Math.min(2, curvature));
          onRelationUpdate(rel.id, clampedCurvature);
        }
      }
      return;
    }

    const point = findPointAtPos(x, y);
    setHoveredPointId(point ? point.id : null);
  }, [getMousePos, findPointAtPos, creatingRelation, draggingPointId, dragOffset,
      onPointMove, draggingAnchor, onRelationUpdate, relations, getPointMap]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getMousePos(e);

    if (creatingRelation) {
      const targetPoint = findPointAtPos(x, y);
      if (targetPoint && targetPoint.id !== creatingRelation.sourceId && onRelationCreate) {
        onRelationCreate(creatingRelation.sourceId, targetPoint.id);
      }
      setCreatingRelation(null);
      return;
    }

    if (draggingPointId) {
      if (!onPointMove || Math.abs(x - dragOffset.x - (points.find(p => p.id === draggingPointId)?.x || 0)) < 3) {
        const point = points.find(p => p.id === draggingPointId);
        if (point) {
          setSelectedPoint(point);
          onPointClick?.(point);
        }
      }
      setDraggingPointId(null);
    }

    if (draggingAnchor) {
      setDraggingAnchor(null);
    }
  }, [creatingRelation, draggingPointId, dragOffset, findPointAtPos, onRelationCreate,
      onPointMove, points, onPointClick, draggingAnchor]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedPoint(null);
  }, []);

  return (
    <div ref={containerRef} className="knowledge-graph-container">
      <canvas
        ref={canvasRef}
        className="knowledge-graph-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
      />
      {mode === 'edit' && (
        <div className="graph-edit-hint">
          💡 提示：右键拖拽节点创建关系，拖拽蓝色锚点调整曲线
        </div>
      )}
      <KnowledgeDetailModal
        point={selectedPoint}
        onClose={handleCloseModal}
      />
    </div>
  );
}

export default KnowledgeGraph;
