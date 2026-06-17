import React, { useCallback, useRef, useState } from 'react';
import { IVideoClip, EffectType } from './types';

interface TimelineProps {
  clips: IVideoClip[];
  transitions: Record<string, EffectType>;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onAddClip: (clipId: string, atIndex: number) => void;
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
  onAddClip,
  onTransitionChange,
  onTransitionPreview,
}) => {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [isExternalDrag, setIsExternalDrag] = useState(false);
  const dragRef = useRef<number | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const handleDragStart = useCallback((index: number) => {
    dragRef.current = index;
    setDragIndex(index);
    setIsExternalDrag(false);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dragRef.current !== null) {
        if (dragRef.current !== index) {
          setDropIndex(index);
        }
      } else {
        setIsExternalDrag(true);
        setDropIndex(index);
      }
    },
    []
  );

  const handleTrackDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragRef.current === null) {
      setIsExternalDrag(true);
      if (dropIndex === null) {
        setDropIndex(clips.length);
      }
    }
  }, [clips.length, dropIndex]);

  const handleTrackDragLeave = useCallback((e: React.DragEvent) => {
    if (trackRef.current && !trackRef.current.contains(e.relatedTarget as Node)) {
      if (dragRef.current === null) {
        setIsExternalDrag(false);
        setDropIndex(null);
      }
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragRef.current !== null && dropIndex !== null && dragRef.current !== dropIndex) {
      onReorder(dragRef.current, dropIndex);
    }
    setDragIndex(null);
    setDropIndex(null);
    setIsExternalDrag(false);
    dragRef.current = null;
  }, [dropIndex, onReorder]);

  const handleDrop = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (dragRef.current === null) {
        const clipId = e.dataTransfer.getData('text/plain');
        if (clipId) {
          onAddClip(clipId, index);
        }
      }
      setDragIndex(null);
      setDropIndex(null);
      setIsExternalDrag(false);
      dragRef.current = null;
    },
    [onAddClip]
  );

  const handleTrackDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (dragRef.current === null) {
        const clipId = e.dataTransfer.getData('text/plain');
        if (clipId) {
          onAddClip(clipId, clips.length);
        }
      }
      setDragIndex(null);
      setDropIndex(null);
      setIsExternalDrag(false);
      dragRef.current = null;
    },
    [onAddClip, clips.length]
  );

  const handleTransitionChange = useCallback(
    (key: string, effect: EffectType) => {
      onTransitionChange(key, effect);
      onTransitionPreview(key, effect);
    },
    [onTransitionChange, onTransitionPreview]
  );

  const getTransitionKey = (i: number) => `${clips[i].id}->${clips[i + 1].id}`;

  const showPlaceholder = (index: number) => {
    if (dropIndex !== index) return false;
    if (dragRef.current !== null) return dragRef.current !== index;
    return isExternalDrag;
  };

  const showEndPlaceholder = dropIndex === clips.length && (dragRef.current !== null || isExternalDrag);

  return (
    <div className="timeline-container">
      <h3>时间线</h3>
      <div
        className="timeline-track"
        ref={trackRef}
        onDragOver={handleTrackDragOver}
        onDragLeave={handleTrackDragLeave}
        onDrop={handleTrackDrop}
      >
        {clips.map((clip, index) => {
          const isDragging = dragIndex === index;
          const transitionKey = index < clips.length - 1 ? getTransitionKey(index) : null;

          return (
            <React.Fragment key={clip.id}>
              {showPlaceholder(index) && <div className="drop-placeholder" />}
              <div
                className={`timeline-clip ${isDragging ? 'dragging' : ''}`}
                style={{ background: clip.color }}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, index)}
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
        {showEndPlaceholder && <div className="drop-placeholder" />}
      </div>
    </div>
  );
};

export default Timeline;
