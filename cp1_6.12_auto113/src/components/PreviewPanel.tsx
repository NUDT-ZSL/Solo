import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from 'react';
import {
  KeyframeNode,
  keyframesToCSS,
  durationForSpeed,
} from '../utils/animationEngine';

interface PreviewPanelProps {
  keyframes: KeyframeNode[];
  durationMs: number;
  isPlaying: boolean;
  speed: number;
  currentTimePercent: number;
  animationName: string;
  onPlayPause: () => void;
  onSpeedChange: (speed: number) => void;
  onTimeChange: (percent: number) => void;
  onRestart: () => void;
}

const ANIMATION_CLASS = 'kf-target-element';

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  keyframes,
  durationMs,
  isPlaying,
  speed,
  currentTimePercent,
  animationName,
  onPlayPause,
  onSpeedChange,
  onTimeChange,
  onRestart,
}) => {
  const styleRef = useRef<HTMLStyleElement | null>(null);
  const targetRef = useRef<HTMLDivElement>(null);

  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const startPercentRef = useRef<number>(0);
  const [, forceRender] = useState(0);

  const adjustedDuration = useMemo(
    () => durationForSpeed(durationMs, speed),
    [durationMs, speed]
  );

  const keyframesCSS = useMemo(() => {
    return keyframesToCSS(keyframes, animationName);
  }, [keyframes, animationName]);

  useEffect(() => {
    let styleEl = styleRef.current;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.setAttribute('data-kf-preview', 'true');
      document.head.appendChild(styleEl);
      styleRef.current = styleEl;
    }
    styleEl.textContent = keyframesCSS;
  }, [keyframesCSS]);

  const applyTimeToTarget = useCallback(
    (percent: number) => {
      const t = targetRef.current;
      if (!t) return;
      if (!isPlaying) {
        t.style.animationPlayState = 'paused';
        const negativeDelay = -(adjustedDuration * (percent / 100));
        t.style.animationDelay = `${negativeDelay}ms`;
      }
    },
    [isPlaying, adjustedDuration]
  );

  useEffect(() => {
    applyTimeToTarget(currentTimePercent);
  }, [applyTimeToTarget, currentTimePercent]);

  useEffect(() => {
    const t = targetRef.current;
    if (!t) return;
    t.style.animationName = animationName;
    t.style.animationDuration = `${adjustedDuration}ms`;
    t.style.animationIterationCount = 'infinite';
    t.style.animationFillMode = 'both';
    t.style.animationTimingFunction = 'linear';
  }, [animationName, adjustedDuration]);

  useEffect(() => {
    const t = targetRef.current;
    if (!t) return;
    if (isPlaying) {
      const restartFrom = startPercentRef.current;
      const negativeDelay = -(adjustedDuration * (restartFrom / 100));
      t.style.animationPlayState = 'running';
      t.style.animationDelay = `${negativeDelay}ms`;
      t.style.animationName = 'none';
      void t.offsetWidth;
      t.style.animationName = animationName;
    } else {
      t.style.animationPlayState = 'paused';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, animationName, adjustedDuration]);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      startTimeRef.current = null;
      return;
    }

    startTimeRef.current = performance.now();
    startPercentRef.current = currentTimePercent;

    const tick = (now: number) => {
      const start = startTimeRef.current!;
      const elapsed = now - start;
      const startPct = startPercentRef.current;
      const rawPct = startPct + (elapsed / adjustedDuration) * 100;
      const wrapPct = ((rawPct % 100) + 100) % 100;

      onTimeChange(wrapPct);
      forceRender((n) => (n + 1) % 1_000_000);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isPlaying, adjustedDuration, onTimeChange, currentTimePercent]);

  const progressBarRef = useRef<HTMLDivElement>(null);

  const handleProgressPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const bar = progressBarRef.current;
    if (!bar) return;
    const updateFromEvent = (evt: PointerEvent) => {
      const rect = bar.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (evt.clientX - rect.left) / rect.width));
      const pct = ratio * 100;
      onTimeChange(pct);
      if (!isPlaying) {
        startPercentRef.current = pct;
        applyTimeToTarget(pct);
      } else {
        startTimeRef.current = performance.now();
        startPercentRef.current = pct;
      }
    };
    updateFromEvent(e as any);

    const onMove = (evt: PointerEvent) => updateFromEvent(evt);
    const onUp = (evt: PointerEvent) => {
      window.removeEventListener('pointermove', onMove, { passive: true } as any);
      window.removeEventListener('pointerup', onUp as any, { passive: true } as any);
    };
    window.addEventListener('pointermove', onMove as any, { passive: true });
    window.addEventListener('pointerup', onUp as any, { passive: true });
  };

  return (
    <div
      style={{
        background: '#16213E',
        borderRadius: 12,
        padding: 16,
        height: 300,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: '#E0E0E0', fontSize: 16, fontWeight: 600 }}>
          Preview
        </h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: '#8A8FBD', fontSize: 12 }}>
            Base {durationMs}ms · {speed.toFixed(2)}x speed → {adjustedDuration}ms
          </span>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          background: '#0F1626',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid #2C2C54',
        }}
      >
        <div
          ref={targetRef}
          className={ANIMATION_CLASS}
          style={{
            width: 200,
            height: 200,
            borderRadius: 16,
            background: '#6C63FF',
            boxShadow: '0 10px 30px rgba(108, 99, 255, 0.35)',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div
          ref={progressBarRef}
          onPointerDown={handleProgressPointerDown}
          style={{
            position: 'relative',
            height: 10,
            background: '#2C2C54',
            borderRadius: 999,
            cursor: 'pointer',
            overflow: 'hidden',
            touchAction: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              background: 'linear-gradient(90deg, #6C63FF, #FF6584)',
              width: `${currentTimePercent}%`,
              borderRadius: 999,
              transition: isPlaying ? 'none' : 'width 0.08s linear',
              willChange: isPlaying ? 'width' : 'auto',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: `calc(${currentTimePercent}% - 7px)`,
              top: -3,
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: '#fff',
              boxShadow: '0 0 0 3px #6C63FF, 0 2px 6px rgba(0,0,0,0.4)',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            justifyContent: 'space-between',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onRestart}
              style={ctrlBtn}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              title="Restart"
            >
              ↺
            </button>
            <button
              onClick={onPlayPause}
              style={{
                ...ctrlBtn,
                background: isPlaying ? '#FF6584' : '#6C63FF',
                minWidth: 72,
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {isPlaying ? '❚❚ Pause' : '▶ Play'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, maxWidth: 320, minWidth: 200 }}>
            <span style={{ color: '#8A8FBD', fontSize: 12, minWidth: 48 }}>
              Speed
            </span>
            <input
              type="range"
              min={0.25}
              max={4}
              step={0.05}
              value={speed}
              onChange={(e) => {
                const newSpeed = parseFloat(e.target.value);
                if (isNaN(newSpeed) || newSpeed <= 0) return;
                onSpeedChange(newSpeed);
              }}
              style={{
                flex: 1,
                accentColor: '#6C63FF',
              }}
            />
            <span
              style={{
                color: '#E0E0E0',
                fontSize: 12,
                minWidth: 40,
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
                fontWeight: 600,
              }}
            >
              {speed.toFixed(2)}x
            </span>
          </div>

          <span
            style={{
              color: '#8A8FBD',
              fontSize: 12,
              fontVariantNumeric: 'tabular-nums',
              minWidth: 70,
              textAlign: 'right',
            }}
          >
            {currentTimePercent.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};

const ctrlBtn: React.CSSProperties = {
  background: '#2C2C54',
  color: '#fff',
  border: 'none',
  padding: '8px 12px',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
  transition: 'transform 0.1s ease, background 0.15s ease',
  transform: 'scale(1)',
  fontFamily: 'inherit',
};
