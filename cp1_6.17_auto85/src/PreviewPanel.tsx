import React, { useCallback, useEffect, useRef, useState } from 'react';
import { IVideoClip, EffectType } from './types';

interface PreviewPanelProps {
  clips: IVideoClip[];
  transitions: Record<string, EffectType>;
  previewTransition: { key: string; effect: EffectType } | null;
  resetKey: number;
}

const TRANSITION_DURATION = 0.5;

const getTransitionKey = (clipA: IVideoClip, clipB: IVideoClip) =>
  `${clipA.id}->${clipB.id}`;

const getEffectClass = (effect: EffectType): string => {
  switch (effect) {
    case EffectType.Fade:
      return 'fade-enter';
    case EffectType.Slide:
      return 'slide-enter';
    case EffectType.Scale:
      return 'scale-enter';
    default:
      return '';
  }
};

const getClipLabel = (id: string): string => {
  const num = parseInt(id.replace('clip-', ''), 10);
  return `片段${num}`;
};

const PreviewPanel: React.FC<PreviewPanelProps> = ({
  clips,
  transitions,
  previewTransition,
  resetKey,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationClass, setAnimationClass] = useState('');
  const [progress, setProgress] = useState(0);

  const playStateRef = useRef({
    clipIndex: 0,
    clipStartTime: 0,
    transitioning: false,
    transitionStartTime: 0,
    rafId: 0,
  });

  const totalDuration = clips.reduce((sum, c) => sum + c.duration, 0)
    + Math.max(0, clips.length - 1) * TRANSITION_DURATION;

  const stopPlayback = useCallback(() => {
    if (playStateRef.current.rafId) {
      cancelAnimationFrame(playStateRef.current.rafId);
      playStateRef.current.rafId = 0;
    }
    setIsPlaying(false);
    playStateRef.current.transitioning = false;
  }, []);

  const startPlayback = useCallback(() => {
    if (clips.length === 0) return;

    const state = playStateRef.current;
    state.clipIndex = 0;
    state.clipStartTime = performance.now();
    state.transitioning = false;

    setCurrentIndex(0);
    setAnimationClass('');
    setProgress(0);
    setIsPlaying(true);

    const tick = (now: number) => {
      const s = playStateRef.current;
      if (!s.transitioning) {
        const clipDuration = clips[s.clipIndex].duration * 1000;
        const elapsed = now - s.clipStartTime;
        const clipProgress = elapsed / clipDuration;

        const clipsBeforeDuration = clips
          .slice(0, s.clipIndex)
          .reduce((sum, c) => sum + c.duration, 0)
          + s.clipIndex * TRANSITION_DURATION;
        const globalProgress =
          (clipsBeforeDuration + clips[s.clipIndex].duration * Math.min(clipProgress, 1))
          / totalDuration;
        setProgress(Math.min(globalProgress * 100, 100));

        if (clipProgress >= 1) {
          if (s.clipIndex < clips.length - 1) {
            s.transitioning = true;
            s.transitionStartTime = now;
            const nextIndex = s.clipIndex + 1;
            const tKey = getTransitionKey(clips[s.clipIndex], clips[nextIndex]);
            const effect = transitions[tKey] ?? EffectType.None;
            setCurrentIndex(nextIndex);
            setAnimationClass(getEffectClass(effect));
          } else {
            setProgress(100);
            setIsPlaying(false);
            return;
          }
        }
      } else {
        const transElapsed = now - s.transitionStartTime;
        const transProgress = transElapsed / (TRANSITION_DURATION * 1000);

        const s2 = playStateRef.current;
        const clipsBeforeDuration = clips
          .slice(0, s2.clipIndex)
          .reduce((sum, c) => sum + c.duration, 0)
          + s2.clipIndex * TRANSITION_DURATION;
        const globalProgress =
          (clipsBeforeDuration + TRANSITION_DURATION * Math.min(transProgress, 1))
          / totalDuration;
        setProgress(Math.min(globalProgress * 100, 100));

        if (transProgress >= 1) {
          const s3 = playStateRef.current;
          s3.clipIndex = s3.clipIndex + 1;
          s3.clipStartTime = now;
          s3.transitioning = false;
          setAnimationClass('');

          if (s3.clipIndex >= clips.length - 1) {
            const remaining = clips[s3.clipIndex].duration * 1000;
            const finishClip = (finishNow: number) => {
              const s4 = playStateRef.current;
              const clipElapsed = finishNow - s4.clipStartTime;
              const cp = clipElapsed / remaining;
              const clipsBefore = clips
                .slice(0, s4.clipIndex)
                .reduce((sum, c) => sum + c.duration, 0)
                + s4.clipIndex * TRANSITION_DURATION;
              const gp =
                (clipsBefore + clips[s4.clipIndex].duration * Math.min(cp, 1))
                / totalDuration;
              setProgress(Math.min(gp * 100, 100));

              if (cp >= 1) {
                setProgress(100);
                setIsPlaying(false);
                return;
              }
              playStateRef.current.rafId = requestAnimationFrame(finishClip);
            };
            playStateRef.current.rafId = requestAnimationFrame(finishClip);
            return;
          }
        }
      }

      playStateRef.current.rafId = requestAnimationFrame(tick);
    };

    playStateRef.current.rafId = requestAnimationFrame(tick);
  }, [clips, transitions, totalDuration]);

  useEffect(() => {
    if (previewTransition && clips.length >= 2) {
      const { key, effect } = previewTransition;
      const parts = key.split('->');
      const fromIndex = clips.findIndex((c) => c.id === parts[0]);
      const toIndex = clips.findIndex((c) => c.id === parts[1]);

      if (fromIndex >= 0 && toIndex === fromIndex + 1) {
        stopPlayback();
        setCurrentIndex(toIndex);
        setAnimationClass(getEffectClass(effect));

        const timer = setTimeout(() => {
          setAnimationClass('');
        }, 600);

        return () => clearTimeout(timer);
      }
    }
  }, [previewTransition, clips, stopPlayback]);

  useEffect(() => {
    return () => {
      if (playStateRef.current.rafId) {
        cancelAnimationFrame(playStateRef.current.rafId);
      }
    };
  }, []);

  useEffect(() => {
    if (!isPlaying && currentIndex >= clips.length) {
      setCurrentIndex(0);
      setProgress(0);
    }
  }, [clips, currentIndex, isPlaying]);

  useEffect(() => {
    stopPlayback();
    setCurrentIndex(0);
    setProgress(0);
    setAnimationClass('');
  }, [resetKey, stopPlayback]);

  const currentClip = clips[currentIndex] ?? clips[0];

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  }, [isPlaying, startPlayback, stopPlayback]);

  return (
    <div className="preview-container">
      <div className="preview-canvas-wrap">
        {currentClip && (
          <div
            key={`preview-${currentClip.id}-${animationClass}`}
            className={`preview-clip ${animationClass}`}
            style={{ background: currentClip.color }}
          >
            {getClipLabel(currentClip.id)}
          </div>
        )}
      </div>
      <div className="progress-bar-container">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="controls">
        <button className="btn-play" onClick={handlePlayPause}>
          {isPlaying ? '⏸' : '▶'}
        </button>
      </div>
    </div>
  );
};

export default PreviewPanel;
