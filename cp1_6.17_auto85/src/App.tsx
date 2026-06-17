import React, { useCallback, useMemo, useState } from 'react';
import Timeline from './Timeline';
import PreviewPanel from './PreviewPanel';
import { IVideoClip, EffectType } from './types';

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];

const createInitialClips = (): IVideoClip[] =>
  COLORS.map((color, i) => ({
    id: `clip-${i + 1}`,
    color,
    duration: Math.round((3 + Math.random() * 4) * 10) / 10,
  }));

const createInitialTransitions = (clips: IVideoClip[]): Record<string, EffectType> => {
  const t: Record<string, EffectType> = {};
  for (let i = 0; i < clips.length - 1; i++) {
    t[`${clips[i].id}->${clips[i + 1].id}`] = EffectType.None;
  }
  return t;
};

const rebuildTransitions = (clips: IVideoClip[], oldTransitions: Record<string, EffectType>): Record<string, EffectType> => {
  const t: Record<string, EffectType> = {};
  for (let i = 0; i < clips.length - 1; i++) {
    const key = `${clips[i].id}->${clips[i + 1].id}`;
    t[key] = oldTransitions[key] ?? EffectType.None;
  }
  return t;
};

const CLIP_LABELS = ['片段1', '片段2', '片段3', '片段4'];

let clipCounter = 4;

const App: React.FC = () => {
  const [initialClips] = useState(createInitialClips);
  const [clips, setClips] = useState<IVideoClip[]>(() => [...initialClips]);
  const [transitions, setTransitions] = useState<Record<string, EffectType>>(() =>
    createInitialTransitions(initialClips)
  );
  const [previewTransition, setPreviewTransition] = useState<{
    key: string;
    effect: EffectType;
    id: number;
  } | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [libraryDragId, setLibraryDragId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState(0);

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    setClips((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const handleAddClip = useCallback(
    (sourceClipId: string, atIndex: number) => {
      const sourceClip = initialClips.find((c) => c.id === sourceClipId);
      if (!sourceClip) return;

      clipCounter++;
      const newClip: IVideoClip = {
        id: `clip-${clipCounter}`,
        color: sourceClip.color,
        duration: sourceClip.duration,
      };

      setClips((prev) => {
        const next = [...prev];
        next.splice(atIndex, 0, newClip);
        return next;
      });

      setTransitions((prev) => {
        const tempClips = [...clips];
        tempClips.splice(atIndex, 0, newClip);
        return rebuildTransitions(tempClips, prev);
      });
    },
    [initialClips, clips]
  );

  const handleTransitionChange = useCallback(
    (key: string, effect: EffectType) => {
      setTransitions((prev) => ({ ...prev, [key]: effect }));
    },
    []
  );

  const handleTransitionPreview = useCallback(
    (key: string, effect: EffectType) => {
      setPreviewId((id) => id + 1);
      setPreviewTransition({ key, effect, id: previewId + 1 });
    },
    [previewId]
  );

  const handleReset = useCallback(() => {
    setClips([...initialClips]);
    setTransitions(createInitialTransitions(initialClips));
    setPreviewTransition(null);
    setResetKey((k) => k + 1);
  }, [initialClips]);

  const materialItems = useMemo(
    () =>
      initialClips.map((clip, i) => ({
        clip,
        label: CLIP_LABELS[i],
      })),
    [initialClips]
  );

  return (
    <div>
      <h1 className="app-title">视频拼接台</h1>
      <div className="app-layout">
        <div className="material-library">
          <h3>素材库</h3>
          {materialItems.map(({ clip, label }) => (
            <div
              key={clip.id}
              className={`material-item ${libraryDragId === clip.id ? 'dragging' : ''}`}
              style={{ background: clip.color }}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', clip.id);
                e.dataTransfer.effectAllowed = 'copy';
                setLibraryDragId(clip.id);
              }}
              onDragEnd={() => {
                setLibraryDragId(null);
              }}
            >
              <span className="clip-label">{label}</span>
              <span className="clip-duration">{clip.duration.toFixed(1)}s</span>
            </div>
          ))}
        </div>
        <div className="main-area">
          <Timeline
            clips={clips}
            transitions={transitions}
            onReorder={handleReorder}
            onAddClip={handleAddClip}
            onTransitionChange={handleTransitionChange}
            onTransitionPreview={handleTransitionPreview}
          />
          <PreviewPanel
            clips={clips}
            transitions={transitions}
            previewTransition={previewTransition}
            resetKey={resetKey}
          />
          <div className="controls" style={{ marginTop: 0 }}>
            <button className="btn-reset" onClick={handleReset}>
              重置序列
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
