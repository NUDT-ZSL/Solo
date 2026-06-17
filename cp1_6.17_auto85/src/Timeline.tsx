import React, { useCallback, useRef, useState } from 'react';
import { IVideoClip, EffectType } from './types';

interface TimelineProps {
  clips: IVideoClip[];
  transitions: Record<string, EffectType>;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onTransitionChange: (key: string, effect: EffectType) => void;
  onTransitionPreview: (key: string, effect: EffectType) => void;
}

const CLIP_LABELS: Record<string, string> = {};

const getClipLabel = (id: string): string => {
  if (!CLIP_LABELS[id]) {
    const num = parseInt(id.replace('clip-', ''), 10);
    CLIP_LABELS[id] = `片段${num}`;
  }
  return CLIP_LABELS[id];
};

const Timeline: React.FC<TimelineProps> = ({
  clips,
  transitions,
  onReorder,
  onTransitionChange,
  onTransitionPreview,
}) => {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
    dragRef.current = index;
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (dragRef.current !== null && dragRef.current !== index) {
        setDropIndex(index);
      }
    },
    []
  );

  const handleDragEnd = useCallback(() => {
    if (dragRef.current !== null && dropIndex !== null && dragRef.current !== dropIndex) {
      onReorder(dragRef.current, dropIndex);
    }
    setDragIndex(null);
    setDropIndex(null);
    dragRef.current = null;
  }, [dropIndex, onReorder]);

  const handleTransitionChange = useCallback(
    (key: string, effect: EffectType) => {
      onTransitionChange(key, effect);
      onTransitionPreview(key, effect);
    },
    [onTransitionChange, onTransitionPreview]
  );

  const getTransitionKey = (i: number) => `${clips[i].id}->${clips[i + 1].id}`;

  return (
    <div className="timeline-container">
      <h3>时间线</h3>
      <div className="timeline-track">
        {clips.map((clip, index) => {
          const isDragging = dragIndex === index;
          const showPlaceholder = dropIndex === index && dragIndex !== null && dragIndex !== index;
          const transitionKey = index < clips.length - 1 ? getTransitionKey(index) : null;

          return (
            <React.Fragment key={clip.id}>
              {showPlaceholder && <div className="drop-placeholder" />}
              <div
                className={`timeline-clip ${isDragging ? 'dragging' : ''}`}
                style={{ background: clip.color }}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
              >
                <span className="clip-label">{getClipLabel(clip.id)}</span>
                <span className="clip-duration">{clip.duration.toFixed(1)}s</span>
              </div>
              {transitionKey && (
                <select
                  className="transition-selector"
                  value={transitions[transitionKey] ?? EffectType.None}
                  onChange={(e) =>
                    handleTransitionChange(transitionKey, e.target.value as EffectType)
                  }
                >
                  <option value={EffectType.None}>无</option>
                  <option value={EffectType.Fade}>淡入淡出</option>
                  <option value={EffectType.Slide}>滑动</option>
                  <option value={EffectType.Scale}>缩放</option>
                </select>
              )}
            </React.Fragment>
          );
        })}
        {dropIndex === clips.length && dragIndex !== null && (
          <div className="drop-placeholder" />
        )}
      </div>
    </div>
  );
};

export default Timeline;
