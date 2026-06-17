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

const CLIP_LABELS = ['片段1', '片段2', '片段3', '片段4'];

const App: React.FC = () => {
  const [initialClips] = useState(createInitialClips);
  const [clips, setClips] = useState<IVideoClip[]>(() => [...initialClips]);
  const [transitions, setTransitions] = useState<Record<string, EffectType>>(() =>
    createInitialTransitions(initialClips)
  );
  const [previewTransition, setPreviewTransition] = useState<{
    key: string;
    effect: EffectType;
  } | null>(null);

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    setClips((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const handleTransitionChange = useCallback(
    (key: string, effect: EffectType) => {
      setTransitions((prev) => ({ ...prev, [key]: effect }));
    },
    []
  );

  const handleTransitionPreview = useCallback(
    (key: string, effect: EffectType) => {
      setPreviewTransition({ key, effect });
    },
    []
  );

  const [resetKey, setResetKey] = useState(0);

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
              className="material-item"
              style={{ background: clip.color }}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', clip.id);
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
