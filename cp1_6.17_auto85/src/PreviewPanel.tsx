import React, { useCallback, useEffect, useRef, useState } from 'react';
import { IVideoClip, EffectType } from './types';

interface PreviewPanelProps {
  clips: IVideoClip[];
  transitions: Record<string, EffectType>;
  previewTransition: { key: string; effect: EffectType; id: number } | null;
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

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

interface SeekResult {
  clipIndex: number;
  clipElapsedRatio: number;
  inTransition: boolean;
  transitionProgress: number;
  transitionEffect: EffectType;
  transitionFromClip: number;
}

const computeSeekState = (
  clips: IVideoClip[],
  transitions: Record<string, EffectType>,
  seekSeconds: number
): SeekResult => {
  let remaining = seekSeconds;
  let clipIndex = 0;

  while (clipIndex < clips.length) {
    if (remaining <= clips[clipIndex].duration) {
      return {
        clipIndex,
        clipElapsedRatio: remaining / clips[clipIndex].duration,
        inTransition: false,
        transitionProgress: 0,
        transitionEffect: EffectType.None,
        transitionFromClip: clipIndex,
      };
    }
    remaining -= clips[clipIndex].duration;

    if (clipIndex < clips.length - 1) {
      if (remaining <= TRANSITION_DURATION) {
        const tKey = getTransitionKey(clips[clipIndex], clips[clipIndex + 1]);
        return {
          clipIndex: clipIndex + 1,
          clipElapsedRatio: 0,
          inTransition: true,
          transitionProgress: remaining / TRANSITION_DURATION,
          transitionEffect: transitions[tKey] ?? EffectType.None,
          transitionFromClip: clipIndex,
        };
      }
      remaining -= TRANSITION_DURATION;
    }
    clipIndex++;
  }

  return {
    clipIndex: Math.max(0, clips.length - 1),
    clipElapsedRatio: 1,
    inTransition: false,
    transitionProgress: 0,
    transitionEffect: EffectType.None,
    transitionFromClip: Math.max(0, clips.length - 1),
  };
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
  const [previewAnimKey, setPreviewAnimKey] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const playStateRef = useRef({
    clipIndex: 0,
    clipStartTime: 0,
    transitioning: false,
    transitionStartTime: 0,
    rafId: 0,
    wasPlayingBeforeDrag: false,
  });

  const progressBarRef = useRef<HTMLDivElement | null>(null);

  const totalDuration = clips.reduce((sum, c) => sum + c.duration, 0)
    + Math.max(0, clips.length - 1) * TRANSITION_DURATION;

  const currentTime = (progress / 100) * totalDuration;

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
    const now = performance.now();

    if (state.clipIndex === 0 && state.clipStartTime === 0 && progress === 0) {
      state.clipIndex = 0;
      state.clipStartTime = now;
      state.transitioning = false;
      setCurrentIndex(0);
      setAnimationClass('');
    } else {
      const seekResult = computeSeekState(clips, transitions, currentTime);
      state.clipIndex = seekResult.clipIndex;
      state.transitioning = seekResult.inTransition;
      if (seekResult.inTransition) {
        state.transitionStartTime = now - seekResult.transitionProgress * TRANSITION_DURATION * 1000;
        setCurrentIndex(seekResult.clipIndex);
        setAnimationClass(getEffectClass(seekResult.transitionEffect));
      } else {
        state.clipStartTime = now - seekResult.clipElapsedRatio * clips[seekResult.clipIndex].duration * 1000;
        setCurrentIndex(seekResult.clipIndex);
        setAnimationClass('');
      }
    }

    setIsPlaying(true);

    const tick = (nowMs: number) => {
      const s = playStateRef.current;
      if (!s.transitioning) {
        const clipDuration = clips[s.clipIndex].duration * 1000;
        const elapsed = nowMs - s.clipStartTime;
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
            s.transitionStartTime = nowMs;
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
        const transElapsed = nowMs - s.transitionStartTime;
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
          s3.clipStartTime = nowMs;
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
  }, [clips, transitions, totalDuration, progress, currentTime]);

  const seekToTime = useCallback(
    (newTime: number) => {
      const clampedTime = Math.max(0, Math.min(newTime, totalDuration));
      const newProgress = (clampedTime / totalDuration) * 100;
      setProgress(newProgress);

      const seekResult = computeSeekState(clips, transitions, clampedTime);
      setCurrentIndex(seekResult.clipIndex);
      if (seekResult.inTransition && seekResult.transitionEffect !== EffectType.None) {
        setAnimationClass(getEffectClass(seekResult.transitionEffect));
      } else {
        setAnimationClass('');
      }

      const state = playStateRef.current;
      const now = performance.now();
      state.clipIndex = seekResult.clipIndex;
      state.transitioning = seekResult.inTransition;
      if (seekResult.inTransition) {
        state.transitionStartTime = now - seekResult.transitionProgress * TRANSITION_DURATION * 1000;
      } else {
        state.clipStartTime = now - seekResult.clipElapsedRatio * clips[seekResult.clipIndex].duration * 1000;
      }
    },
    [clips, transitions, totalDuration]
  );

  const handleBarMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!progressBarRef.current) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      const newTime = ratio * totalDuration;

      const wasPlaying = isPlaying;
      if (wasPlaying) {
        stopPlayback();
      }
      playStateRef.current.wasPlayingBeforeDrag = wasPlaying;
      setIsDragging(true);
      seekToTime(newTime);
    },
    [totalDuration, isPlaying, stopPlayback, seekToTime]
  );

  const handleThumbMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const wasPlaying = isPlaying;
      if (wasPlaying) {
        stopPlayback();
      }
      playStateRef.current.wasPlayingBeforeDrag = wasPlaying;
      setIsDragging(true);
    },
    [isPlaying, stopPlayback]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!progressBarRef.current) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      const newTime = ratio * totalDuration;
      seekToTime(newTime);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (playStateRef.current.wasPlayingBeforeDrag) {
        startPlayback();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, totalDuration, seekToTime, startPlayback]);

  useEffect(() => {
    if (previewTransition && clips.length >= 2) {
      const { key, effect, id } = previewTransition;
      const parts = key.split('->');
      const fromIndex = clips.findIndex((c) => c.id === parts[0]);
      const toIndex = clips.findIndex((c) => c.id === parts[1]);

      if (fromIndex >= 0 && toIndex === fromIndex + 1) {
        stopPlayback();
        setCurrentIndex(toIndex);
        setAnimationClass(getEffectClass(effect));
        setPreviewAnimKey(id);

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
    playStateRef.current.clipIndex = 0;
    playStateRef.current.clipStartTime = 0;
    playStateRef.current.transitioning = false;
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
            key={`preview-${currentClip.id}-${animationClass}-${previewAnimKey}`}
            className={`preview-clip ${animationClass}`}
            style={{ background: currentClip.color }}
          >
            {getClipLabel(currentClip.id)}
          </div>
        )}
      </div>
      <div className="progress-wrapper">
        <div className="progress-time-row">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
        <div
          className="progress-bar-container"
          ref={progressBarRef}
          onMouseDown={handleBarMouseDown}
        >
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          <div
            className="progress-thumb"
            style={{ left: `${progress}%` }}
            onMouseDown={handleThumbMouseDown}
          />
        </div>
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
