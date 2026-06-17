import React, { useRef, useEffect, useState, useCallback } from 'react';
import { KnowledgePoint, Relation, DIFFICULTY_COLORS, Difficulty } from '../types';

interface KnowledgeGraphProps {
  points: KnowledgePoint[];
  relations: Relation[];
  selectedPointId: string | null;
  onPointClick: (point: KnowledgePoint) => void;
  onPointMove: (pointId: string, x: number, y: number) => void;
  onRelationCreate?: (sourceId: string, targetId: string) => void;
  onRelationUpdate?: (relationId: string, controlX: number, controlY: number) => void;
  filterTag: string | null;
  highlightPath: string[];
  isTeacherMode?: boolean;
  reviewedPointIds?: string[];
}

const NODE_RADIUS = 18;
const HOVER_SCALE = 1.2;
const CONTROL_POINT_RADIUS = 6;

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  points,
  relations,
  selectedPointId,
  onPointClick,
  onPointMove,
  onRelationCreate,
  onRelationUpdate,
  filterTag,
  highlightPath,
  isTeacherMode = false,
  reviewedPointIds = []
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);
  const [draggingPointId, setDraggingPointId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [creatingRelation, setCreatingRelation] = useState<{ sourceId: string; x: number; y: number } | null>(null);
  const [draggingControl, setDraggingControl] = useState<{ relationId: string } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const animationRef = useRef<number>();
  const timeRef = useRef(0);

  const getPointById = useCallback((id: string) => points.find(p => p.id === id), [points]);

  const isFilteredOut = useCallback((point: KnowledgePoint) => {
    if (!filterTag) return false;
    return !point.tags.includes(filterTag);
  }, [filterTag]);

  const isInPath = useCallback((pointId: string) => {
    return highlightPath.includes(pointId);
  }, [highlightPath]);

  const isRelationInPath = useCallback((rel: Relation) => {
    for (let i = 0; i < highlightPath.length - 1; i++) {
      if (highlightPath[i] === rel.sourceId && highlightPath[i + 1] === rel.targetId) {
        return true;
      }
    }
    return false;
  }, [highlightPath]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setCanvasSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.width * dpr;
    canvas.height = canvasSize.height * dpr;
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;
    ctx.scale(dpr, dpr);

    const draw = () => {
      timeRef.current += 0.016;
      const time = timeRef.current;

      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

      relations.forEach(rel => {
        const source = getPointById(rel.sourceId);
        const target = getPointById(rel.targetId);
        if (!source || !target) return;

        const sourceFiltered = isFilteredOut(source);
        const targetFiltered = isFilteredOut(target);
        if (sourceFiltered || targetFiltered) return;

        const inPath = isRelationInPath(rel);
        const isSelected = selectedPointId === source.id || selectedPointId === target.id;

        let ctrlX = rel.controlX ?? (source.x + target.x) / 2;
        let ctrlY = rel.controlY ?? (source.y + target.y) / 2 - 50;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.quadraticCurveTo(ctrlX, ctrlY, target.x, target.y);

        if (inPath) {
          ctx.strokeStyle = '#f44336';
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 6]);
        } else if (isSelected || (isTeacherMode && rel.id === draggingControl?.relationId)) {
          ctx.strokeStyle = '#1976d2';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([]);
        } else {
          ctx.strokeStyle = '#bdbdbd';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([]);
        }
        ctx.stroke();

        const angle = Math.atan2(target.y - ctrlY, target.x - ctrlX);
        const arrowSize = 10;
        const arrowX = target.x - NODE_RADIUS * Math.cos(angle);
        const arrowY = target.y - NODE_RADIUS * Math.sin(angle);

        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(
          arrowX - arrowSize * Math.cos(angle - Math.PI / 6),
          arrowY - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          arrowX - arrowSize * Math.cos(angle + Math.PI / 6),
          arrowY - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fillStyle = inPath ? '#f44336' : (isSelected ? '#1976d2' : '#bdbdbd');
        ctx.fill();

        ctx.restore();

        if (isTeacherMode) {
          ctx.beginPath();
          ctx.arc(ctrlX, ctrlY, CONTROL_POINT_RADIUS, 0, Math.PI * 2);
          ctx.fillStyle = '#1976d2';
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });

      if (creatingRelation) {
        const source = getPointById(creatingRelation.sourceId);
        if (source) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          const midX = (source.x + creatingRelation.x) / 2;
          const midY = (source.y + creatingRelation.y) / 2 - 30;
          ctx.quadraticCurveTo(midX, midY, creatingRelation.x, creatingRelation.y);
          ctx.strokeStyle = '#00bcd4';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.stroke();
          ctx.restore();
        }
      }

      points.forEach(point => {
        const filtered = isFilteredOut(point);
        const isHover = hoveredPointId === point.id;
        const isSelected = selectedPointId === point.id;
        const inPath = isInPath(point.id);
        const isReviewed = reviewedPointIds.includes(point.id);
        const scale = isHover ? HOVER_SCALE : 1;
        const radius = NODE_RADIUS * scale;

        ctx.save();

        if (filtered) {
          ctx.globalAlpha = 0.3;
        }

        if (isHover) {
          ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
          ctx.shadowBlur = 10;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
        }

        if (inPath && !filtered) {
          const pulse = Math.sin(time * 3) * 0.5 + 0.5;
          ctx.beginPath();
          ctx.arc(point.x, point.y, radius + 4 + pulse * 3, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 193, 7, ${0.5 + pulse * 0.5})`;
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);

        const baseColor = DIFFICULTY_COLORS[point.difficulty as Difficulty];
        ctx.fillStyle = filtered ? '#9e9e9e' : baseColor;
        ctx.fill();

        if (isSelected) {
          ctx.strokeStyle = '#1a237e';
          ctx.lineWidth = 3;
          ctx.stroke();
        } else if (inPath && !filtered) {
          ctx.strokeStyle = '#ffc107';
          ctx.lineWidth = 3;
          ctx.stroke();
        } else if (isReviewed) {
          ctx.strokeStyle = '#4caf50';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        if (isReviewed) {
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('✓', point.x, point.y);
        } else {
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const displayTitle = point.title.length > 3 ? point.title.substring(0, 3) + '...' : point.title;
          ctx.fillText(displayTitle, point.x, point.y);
        }

        ctx.restore();
      });

      points.forEach(point => {
        if (isFilteredOut(point)) return;
        
        ctx.save();
        ctx.fillStyle = '#212121';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        const displayTitle = point.title.length > 8 ? point.title.substring(0, 8) + '...' : point.title;
        ctx.fillText(displayTitle, point.x, point.y + NODE_RADIUS + 5);
        ctx.restore();
      });

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    points, relations, hoveredPointId, selectedPointId,
    creatingRelation, draggingControl, canvasSize, isTeacherMode,
    isFilteredOut, isInPath, isRelationInPath, getPointById,
    highlightPath, reviewedPointIds
  ]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const hitTestPoint = (x: number, y: number): KnowledgePoint | null => {
    for (let i = points.length - 1; i >= 0; i--) {
      const point = points[i];
      const dx = x - point.x;
      const dy = y - point.y;
      if (dx * dx + dy * dy <= NODE_RADIUS * NODE_RADIUS) {
        return point;
      }
    }
    return null;
  };

  const hitTestControl = (x: number, y: number): Relation | null => {
    if (!isTeacherMode) return null;
    for (const rel of relations) {
      const ctrlX = rel.controlX ?? 0;
      const ctrlY = rel.controlY ?? 0;
      const dx = x - ctrlX;
      const dy = y - ctrlY;
      if (dx * dx + dy * dy <= CONTROL_POINT_RADIUS * CONTROL_POINT_RADIUS) {
        return rel;
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);

    if (isTeacherMode) {
      const controlRel = hitTestControl(pos.x, pos.y);
      if (controlRel) {
        setDraggingControl({ relationId: controlRel.id });
        return;
      }
    }

    const hitPoint = hitTestPoint(pos.x, pos.y);
    if (hitPoint) {
      if (isTeacherMode && e.button === 0 && e.shiftKey) {
        setCreatingRelation({ sourceId: hitPoint.id, x: pos.x, y: pos.y });
      } else {
        setDraggingPointId(hitPoint.id);
        setDragOffset({
          x: pos.x - hitPoint.x,
          y: pos.y - hitPoint.y
        });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);

    if (draggingPointId) {
      const newX = pos.x - dragOffset.x;
      const newY = pos.y - dragOffset.y;
      onPointMove(draggingPointId, newX, newY);
      return;
    }

    if (draggingControl && onRelationUpdate) {
      onRelationUpdate(draggingControl.relationId, pos.x, pos.y);
      return;
    }

    if (creatingRelation) {
      setCreatingRelation({ ...creatingRelation, x: pos.x, y: pos.y });
      return;
    }

    const hitPoint = hitTestPoint(pos.x, pos.y);
    setHoveredPointId(hitPoint ? hitPoint.id : null);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);

    if (draggingControl) {
      setDraggingControl(null);
      return;
    }

    if (creatingRelation) {
      const targetPoint = hitTestPoint(pos.x, pos.y);
      if (targetPoint && targetPoint.id !== creatingRelation.sourceId && onRelationCreate) {
        onRelationCreate(creatingRelation.sourceId, targetPoint.id);
      }
      setCreatingRelation(null);
      return;
    }

    if (draggingPointId) {
      setDraggingPointId(null);
      return;
    }

    const hitPoint = hitTestPoint(pos.x, pos.y);
    if (hitPoint && !isFilteredOut(hitPoint)) {
      onPointClick(hitPoint);
    }
  };

  const handleMouseLeave = () => {
    setHoveredPointId(null);
    if (creatingRelation) setCreatingRelation(null);
    if (draggingPointId) setDraggingPointId(null);
    if (draggingControl) setDraggingControl(null);
  };

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{
          cursor: draggingPointId || draggingControl ? 'grabbing' : (creatingRelation ? 'crosshair' : 'default')
        }}
      />
    </div>
  );
};

export default KnowledgeGraph;
