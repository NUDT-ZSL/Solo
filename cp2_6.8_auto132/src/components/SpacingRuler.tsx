import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Ruler, Trash2 } from 'lucide-react';
import type { GuideLine, SpacingValue, GuideLineType } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, MAX_GUIDELINES } from '../types';
import { generateId } from '../utils/colorUtils';

interface SpacingRulerProps {
  guidelines: GuideLine[];
  spacings: SpacingValue[];
  visible: boolean;
  onGuidelinesChange: (guidelines: GuideLine[]) => void;
  onSpacingsChange: (spacings: SpacingValue[]) => void;
}

interface DragState {
  isDragging: boolean;
  guidelineId: string | null;
  isNew: boolean;
  startX: number;
  startY: number;
  createType: GuideLineType | null;
}

const SpacingRuler: React.FC<SpacingRulerProps> = ({
  guidelines,
  spacings,
  visible,
  onGuidelinesChange,
  onSpacingsChange,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    guidelineId: null,
    isNew: false,
    startX: 0,
    startY: 0,
    createType: null,
  });

  const calculateSpacings = useCallback(
    (lines: GuideLine[]): SpacingValue[] => {
      const result: SpacingValue[] = [];
      const sortedHorizontal = lines
        .filter((l) => l.type === 'horizontal')
        .sort((a, b) => a.position - b.position);
      const sortedVertical = lines
        .filter((l) => l.type === 'vertical')
        .sort((a, b) => a.position - b.position);

      for (let i = 0; i < sortedHorizontal.length - 1; i++) {
        result.push({
          id: generateId(),
          fromId: sortedHorizontal[i].id,
          toId: sortedHorizontal[i + 1].id,
          distance: Math.round(
            sortedHorizontal[i + 1].position - sortedHorizontal[i].position,
          ),
          orientation: 'horizontal',
        });
      }

      for (let i = 0; i < sortedVertical.length - 1; i++) {
        result.push({
          id: generateId(),
          fromId: sortedVertical[i].id,
          toId: sortedVertical[i + 1].id,
          distance: Math.round(
            sortedVertical[i + 1].position - sortedVertical[i].position,
          ),
          orientation: 'vertical',
        });
      }

      return result;
    },
    [],
  );

  const getCanvasCoords = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(e.clientX - rect.left, CANVAS_WIDTH)),
      y: Math.max(0, Math.min(e.clientY - rect.top, CANVAS_HEIGHT)),
    };
  }, []);

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!visible || guidelines.length >= MAX_GUIDELINES) return;
      const { x, y } = getCanvasCoords(e);
      const threshold = 40;
      let createType: GuideLineType | null = null;

      if (y < threshold || y > CANVAS_HEIGHT - threshold) {
        createType = 'horizontal';
      } else if (x < threshold || x > CANVAS_WIDTH - threshold) {
        createType = 'vertical';
      }

      if (createType) {
        const position = createType === 'horizontal' ? y : x;
        const newGuideline: GuideLine = {
          id: generateId(),
          type: createType,
          position,
        };
        const newGuidelines = [...guidelines, newGuideline];
        onGuidelinesChange(newGuidelines);
        onSpacingsChange(calculateSpacings(newGuidelines));
        setDragState({
          isDragging: true,
          guidelineId: newGuideline.id,
          isNew: true,
          startX: x,
          startY: y,
          createType,
        });
      }
    },
    [visible, guidelines, getCanvasCoords, onGuidelinesChange, onSpacingsChange, calculateSpacings],
  );

  const handleGuidelineMouseDown = useCallback(
    (e: React.MouseEvent, guideline: GuideLine) => {
      e.stopPropagation();
      const { x, y } = getCanvasCoords(e);
      setDragState({
        isDragging: true,
        guidelineId: guideline.id,
        isNew: false,
        startX: x,
        startY: y,
        createType: guideline.type,
      });
    },
    [getCanvasCoords],
  );

  useEffect(() => {
    if (!dragState.isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const { x, y } = getCanvasCoords(e);
      const newPosition = dragState.createType === 'horizontal' ? y : x;

      const updated = guidelines.map((g) =>
        g.id === dragState.guidelineId ? { ...g, position: newPosition } : g,
      );
      onGuidelinesChange(updated);
      onSpacingsChange(calculateSpacings(updated));
    };

    const handleMouseUp = () => {
      setDragState({
        isDragging: false,
        guidelineId: null,
        isNew: false,
        startX: 0,
        startY: 0,
        createType: null,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, guidelines, getCanvasCoords, onGuidelinesChange, onSpacingsChange, calculateSpacings]);

  const handleDeleteGuideline = (id: string) => {
    const updated = guidelines.filter((g) => g.id !== id);
    onGuidelinesChange(updated);
    onSpacingsChange(calculateSpacings(updated));
  };

  if (!visible) {
    return (
      <div className="spacing-ruler-empty">
        <Ruler size={40} className="empty-icon" />
        <p>点击顶部工具栏启用标尺</p>
        <p className="hint">从画布边缘拖拽创建参考线</p>
      </div>
    );
  }

  return (
    <div className="spacing-ruler">
      <div className="ruler-info">
        <Ruler size={14} />
        <span>参考线: {guidelines.length}/{MAX_GUIDELINES}</span>
        <span className="hint">从画布边缘拖拽创建，双击删除</span>
      </div>

      <div
        ref={canvasRef}
        className="ruler-canvas"
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
        onMouseDown={handleCanvasMouseDown}
      >
        {guidelines.map((guideline) =>
          guideline.type === 'horizontal' ? (
            <React.Fragment key={guideline.id}>
              <div
                className="guideline horizontal"
                style={{ top: guideline.position }}
                onMouseDown={(e) => handleGuidelineMouseDown(e, guideline)}
                onDoubleClick={() => handleDeleteGuideline(guideline.id)}
              >
                <div className="guideline-arrow left" />
                <div className="guideline-line" />
                <div className="guideline-arrow right" />
              </div>
              <button
                className="guideline-delete"
                style={{ top: guideline.position - 10, left: 4 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteGuideline(guideline.id);
                }}
              >
                <Trash2 size={12} />
              </button>
            </React.Fragment>
          ) : (
            <React.Fragment key={guideline.id}>
              <div
                className="guideline vertical"
                style={{ left: guideline.position }}
                onMouseDown={(e) => handleGuidelineMouseDown(e, guideline)}
                onDoubleClick={() => handleDeleteGuideline(guideline.id)}
              >
                <div className="guideline-arrow top" />
                <div className="guideline-line-vertical" />
                <div className="guideline-arrow bottom" />
              </div>
              <button
                className="guideline-delete"
                style={{ top: 4, left: guideline.position - 10 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteGuideline(guideline.id);
                }}
              >
                <Trash2 size={12} />
              </button>
            </React.Fragment>
          ),
        )}

        {spacings.map((spacing) => {
          const fromLine = guidelines.find((g) => g.id === spacing.fromId);
          const toLine = guidelines.find((g) => g.id === spacing.toId);
          if (!fromLine || !toLine) return null;

          if (spacing.orientation === 'horizontal') {
            const midY = (fromLine.position + toLine.position) / 2;
            return (
              <div
                key={spacing.id}
                className="spacing-label horizontal"
                style={{ top: midY - 12 }}
              >
                {spacing.distance}px
              </div>
            );
          } else {
            const midX = (fromLine.position + toLine.position) / 2;
            return (
              <div
                key={spacing.id}
                className="spacing-label vertical"
                style={{ left: midX - 20 }}
              >
                {spacing.distance}px
              </div>
            );
          }
        })}
      </div>
    </div>
  );
};

export default SpacingRuler;
