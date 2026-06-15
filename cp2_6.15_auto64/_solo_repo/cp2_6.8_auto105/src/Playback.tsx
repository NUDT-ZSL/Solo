import { useEffect, useRef } from 'react';
import type { Stroke } from './App';

interface PlaybackProps {
  strokes: Stroke[];
  isPlaying: boolean;
  onPlayStateChange: (playing: boolean) => void;
  onProgressChange: (progress: number) => void;
}

function Playback({
  strokes,
  isPlaying,
  onPlayStateChange,
  onProgressChange,
}: PlaybackProps) {
  const progressRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const animate = (now: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = now;
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      let startTime = Infinity;
      let endTime = 0;
      for (const s of strokes) {
        if (s.startTime < startTime) startTime = s.startTime;
        if (s.endTime > endTime) endTime = s.endTime;
      }

      const totalDuration = (endTime - startTime) / 1000;
      const maxPlaybackDuration = 60;
      const playbackDuration = Math.min(totalDuration / 2, maxPlaybackDuration);

      if (playbackDuration > 0 && totalDuration > 0) {
        progressRef.current += delta / playbackDuration;

        if (progressRef.current >= 1) {
          progressRef.current = 1;
          onProgressChange(1);
          onPlayStateChange(false);
          progressRef.current = 0;
          return;
        }
        onProgressChange(progressRef.current);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = 0;
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, strokes, onPlayStateChange, onProgressChange]);

  const handlePlayPause = () => {
    if (strokes.length === 0) return;
    if (progressRef.current >= 1) {
      progressRef.current = 0;
      onProgressChange(0);
    }
    onPlayStateChange(!isPlaying);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    progressRef.current = value;
    onProgressChange(value);
  };

  const hasStrokes = strokes.length > 0;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(255,255,255,0.95)',
        borderRadius: 16,
        padding: '12px 20px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        zIndex: 100,
        minWidth: 320,
        backdropFilter: 'blur(8px)',
      }}
    >
      <button
        onClick={handlePlayPause}
        disabled={!hasStrokes}
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: 'none',
          background: hasStrokes ? '#339AF0' : '#DEE2E6',
          color: '#FFFFFF',
          cursor: hasStrokes ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          transition: 'all 0.2s ease',
          opacity: hasStrokes ? 1 : 0.5,
          padding: 0,
        }}
        onMouseEnter={(e) => {
          if (hasStrokes) {
            (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
            (e.target as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(51,154,240,0.4)';
          }
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
          (e.target as HTMLButtonElement).style.boxShadow = 'none';
        }}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <span style={{
          fontSize: 12,
          color: '#6C757D',
          minWidth: 40,
          textAlign: 'right',
        }}>
          {Math.round(isPlaying || progressRef.current > 0 ? progressRef.current * 100 : 0)}%
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={isPlaying || progressRef.current > 0 ? progressRef.current : 0}
          onChange={handleSliderChange}
          disabled={!hasStrokes}
          style={{
            flex: 1,
            height: 6,
            borderRadius: 3,
            cursor: hasStrokes ? 'pointer' : 'not-allowed',
            outline: 'none',
            accentColor: '#339AF0',
            transition: 'all 0.2s ease',
            opacity: hasStrokes ? 1 : 0.5,
          }}
        />
        <span style={{
          fontSize: 12,
          color: '#6C757D',
          minWidth: 30,
        }}>
          2x
        </span>
      </div>
    </div>
  );
}

export default Playback;
