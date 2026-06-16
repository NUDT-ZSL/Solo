import { useRef, useCallback, useEffect, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import { useGlobalStore, TOTAL_YEARS, START_YEAR } from '../store/useGlobalStore';

const TICK_INTERVAL_MS = 1000;

export function Timeline() {
  const currentYear = useGlobalStore(s => s.currentYear);
  const isPlaying = useGlobalStore(s => s.isPlaying);
  const setIsPlaying = useGlobalStore(s => s.setIsPlaying);
  const setCurrentYear = useGlobalStore(s => s.setCurrentYear);
  const tickYear = useGlobalStore(s => s.tickYear);

  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const playIntervalRef = useRef<number | null>(null);

  const endYear = START_YEAR + TOTAL_YEARS - 1;
  const progress = (currentYear - START_YEAR) / (endYear - START_YEAR);

  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = window.setInterval(() => {
        tickYear();
      }, TICK_INTERVAL_MS);
    }
    return () => {
      if (playIntervalRef.current !== null) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    };
  }, [isPlaying, tickYear]);

  const handleSeek = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const ratio = x / rect.width;
      const year = Math.round(START_YEAR + ratio * (endYear - START_YEAR));
      setCurrentYear(Math.max(START_YEAR, Math.min(endYear, year)));
    },
    [setCurrentYear, endYear]
  );

  const handlePointerDown = useCallback((clientX: number) => {
    draggingRef.current = true;
    setIsPlaying(false);
    handleSeek(clientX);
  }, [handleSeek, setIsPlaying]);

  const handlePointerUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  const handlePointerMove = useCallback((clientX: number) => {
    if (draggingRef.current) {
      handleSeek(clientX);
    }
  }, [handleSeek]);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      handlePointerMove(e.clientX);
    }
    function onMouseUp() {
      handlePointerUp();
    }
    function onTouchMove(e: TouchEvent) {
      if (e.touches[0]) {
        e.preventDefault();
        handlePointerMove(e.touches[0].clientX);
      }
    }
    function onTouchEnd() {
      handlePointerUp();
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      if (playIntervalRef.current !== null) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    };
  }, [handlePointerMove, handlePointerUp]);

  const toggle = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying, setIsPlaying]);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentYear(START_YEAR);
  }, [setCurrentYear, setIsPlaying]);

  const stepForward = useCallback(() => {
    if (currentYear < endYear) setCurrentYear(currentYear + 1);
  }, [currentYear, endYear, setCurrentYear]);

  const stepBackward = useCallback(() => {
    if (currentYear > START_YEAR) setCurrentYear(currentYear - 1);
  }, [currentYear, setCurrentYear]);

  const yearLabels: number[] = [];
  for (let y = START_YEAR; y <= endYear; y++) yearLabels.push(y);

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <div style={styles.buttonRow}>
          <button
            aria-label="重置"
            style={styles.iconBtn}
            onTouchStart={e => { e.preventDefault(); reset(); }}
            onTouchEnd={e => e.preventDefault()}
            onClick={reset}
            title="重置到2020年"
          >
            <RotateCcw size={16} />
          </button>
          <button
            aria-label="上一年"
            style={styles.iconBtn}
            onTouchStart={e => { e.preventDefault(); stepBackward(); }}
            onTouchEnd={e => e.preventDefault()}
            onClick={stepBackward}
          >
            <SkipBack size={16} />
          </button>
          <button
            aria-label={isPlaying ? '暂停' : '播放'}
            style={{
              ...styles.iconBtn,
              ...styles.playBtn,
              background: isPlaying ? '#ff6b6b' : '#4ecdc4'
            }}
            onTouchStart={e => { e.preventDefault(); toggle(); }}
            onTouchEnd={e => e.preventDefault()}
            onClick={toggle}
          >
            {isPlaying ? <Pause size={18} color="#fff" /> : <Play size={18} color="#fff" />}
          </button>
          <button
            aria-label="下一年"
            style={styles.iconBtn}
            onTouchStart={e => { e.preventDefault(); stepForward(); }}
            onTouchEnd={e => e.preventDefault()}
            onClick={stepForward}
          >
            <SkipForward size={16} />
          </button>
        </div>

        <div style={styles.sliderArea}>
          <div
            ref={trackRef}
            style={styles.track}
            onMouseDown={e => handlePointerDown(e.clientX)}
            onTouchStart={e => {
              if (e.touches[0]) {
                e.preventDefault();
                handlePointerDown(e.touches[0].clientX);
              }
            }}
          >
            <div style={{ ...styles.fill, width: `${progress * 100}%` }} />
            {yearLabels.map(y => {
              const left = ((y - START_YEAR) / (endYear - START_YEAR)) * 100;
              const active = y === currentYear;
              return (
                <div
                  key={y}
                  style={{
                    ...styles.yearDot,
                    left: `${left}%`,
                    background: active ? '#fff' : '#5a5a7a',
                    boxShadow: active ? '0 0 8px #4ecdc4' : 'none',
                    transform: `translateX(-50%) scale(${active ? 1.4 : 1})`
                  }}
                />
              );
            })}
            <div
              style={{
                ...styles.thumb,
                left: `${progress * 100}%`,
                background: currentYearColor(currentYear)
              }}
            />
          </div>
          <div style={styles.yearLabels}>
            {yearLabels.filter(y => y % 2 === 0).map(y => (
              <span
                key={y}
                style={{
                  ...styles.yearLabel,
                  left: `${((y - START_YEAR) / (endYear - START_YEAR)) * 100}%`,
                  color: y === currentYear ? currentYearColor(currentYear) : '#8b949e',
                  fontWeight: y === currentYear ? 700 : 400
                }}
              >
                {y}
              </span>
            ))}
          </div>
        </div>

        <div style={styles.currentYearBadge}>
          <div style={{ fontSize: 10, color: '#8b949e', letterSpacing: 1 }}>当前年份</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: currentYearColor(currentYear) }}>
            {currentYear}
          </div>
        </div>
      </div>
    </div>
  );
}

function currentYearColor(year: number): string {
  const t = (year - START_YEAR) / (TOTAL_YEARS - 1);
  const r = Math.round(78 + (255 - 78) * t);
  const g = Math.round(205 + (107 - 205) * t);
  const b = Math.round(196 + (107 - 196) * t);
  return `rgb(${r},${g},${b})`;
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'fixed',
    bottom: 24,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 100,
    width: 'min(680px, 92vw)',
    pointerEvents: 'auto'
  },
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    background: '#2a2a3a',
    borderRadius: 8,
    padding: '10px 16px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
    backdropFilter: 'blur(12px)'
  },
  buttonRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0
  },
  iconBtn: {
    width: 44,
    height: 44,
    minWidth: 44,
    minHeight: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    borderRadius: 6,
    background: '#161b22',
    color: '#c9d1d9',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    touchAction: 'manipulation',
    padding: 0
  },
  playBtn: {
    width: 48,
    height: 48,
    minWidth: 48,
    minHeight: 48
  },
  sliderArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    minWidth: 0
  },
  track: {
    position: 'relative',
    width: '100%',
    height: 14,
    background: '#161b22',
    borderRadius: 7,
    cursor: 'pointer',
    touchAction: 'none',
    padding: '2px 0'
  },
  fill: {
    position: 'absolute',
    top: '50%',
    left: 0,
    height: 10,
    transform: 'translateY(-50%)',
    background: 'linear-gradient(90deg, #4ecdc4, #ff6b6b)',
    borderRadius: 5,
    transition: 'width 0.15s ease'
  },
  yearDot: {
    position: 'absolute',
    top: '50%',
    width: 6,
    height: 6,
    borderRadius: '50%',
    transition: 'all 0.2s ease',
    pointerEvents: 'none',
    zIndex: 2
  },
  thumb: {
    position: 'absolute',
    top: '50%',
    width: 20,
    height: 20,
    borderRadius: '50%',
    transform: 'translate(-50%, -50%)',
    boxShadow: '0 0 12px rgba(255,255,255,0.3), 0 2px 6px rgba(0,0,0,0.4)',
    transition: 'left 0.15s ease',
    pointerEvents: 'none',
    zIndex: 3
  },
  yearLabels: {
    position: 'relative',
    width: '100%',
    height: 18
  },
  yearLabel: {
    position: 'absolute',
    transform: 'translateX(-50%)',
    fontSize: 11,
    fontFamily: "'SF Mono', Menlo, monospace",
    transition: 'all 0.2s ease'
  },
  currentYearBadge: {
    flexShrink: 0,
    textAlign: 'center',
    padding: '4px 12px',
    background: '#161b22',
    borderRadius: 6,
    fontFamily: "'SF Mono', Menlo, monospace",
    lineHeight: 1.2,
    minWidth: 64
  }
};
