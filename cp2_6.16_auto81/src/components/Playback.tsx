import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Note, Track, DURATION_MAP, Duration, pitchToName } from '../types';

interface PlaybackProps {
  notes: Note[];
  tracks: Track[];
  isPlaying: boolean;
  onPlayToggle: () => void;
  onStop: () => void;
  playbackPosition: number;
  onPlaybackPositionChange: (pos: number) => void;
}

const FREQ_MAP: Record<string, number> = {
  'C': 261.63, 'D': 293.66, 'E': 329.63, 'F': 349.23,
  'G': 392.00, 'A': 440.00, 'B': 493.88,
};

function getFrequency(pitch: number, sharp: boolean, flat: boolean): number {
  const nameIdx = ((pitch % 7) + 7) % 7;
  const octave = Math.floor(pitch / 7) + 4;
  const names = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  let freq = FREQ_MAP[names[nameIdx]];
  if (sharp) freq *= 1.0595;
  if (flat) freq /= 1.0595;
  return freq * Math.pow(2, octave - 4);
}

export default function Playback({ notes, tracks, isPlaying, onPlayToggle, onStop, playbackPosition, onPlaybackPositionChange }: PlaybackProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const pauseTimeRef = useRef(0);
  const playedNotesRef = useRef<Set<string>>(new Set());
  const progressBarRef = useRef<HTMLDivElement>(null);

  const totalDuration = useCallback(() => {
    if (notes.length === 0) return 4;
    const maxPos = Math.max(...notes.map(n => n.position));
    const lastNote = notes.filter(n => n.position === maxPos)[0];
    return (maxPos + (lastNote ? DURATION_MAP[lastNote.duration] * 4 : 4)) * 0.3;
  }, [notes]);

  const playNoteSound = useCallback((note: Note) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    const freq = getFrequency(note.pitch, note.sharp, note.flat);

    const track = tracks.find(t => t.id === note.trackId);
    if (track?.mute && !track?.solo) return;

    const hasSolo = tracks.some(t => t.solo);
    if (hasSolo && !track?.solo) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    const duration = DURATION_MAP[note.duration] * 0.3;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }, [tracks]);

  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(animRef.current);
      return;
    }

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }

    startTimeRef.current = audioCtxRef.current.currentTime - pauseTimeRef.current;
    playedNotesRef.current = new Set();

    const tick = () => {
      if (!audioCtxRef.current) return;
      const elapsed = audioCtxRef.current.currentTime - startTimeRef.current;
      const total = totalDuration();

      setCurrentTime(elapsed);
      onPlaybackPositionChange((elapsed / total) * 120);

      notes.forEach(note => {
        const noteTime = note.position * 0.3;
        if (elapsed >= noteTime && !playedNotesRef.current.has(note.id)) {
          playedNotesRef.current.add(note.id);
          playNoteSound(note);
        }
      });

      if (elapsed >= total) {
        onPlayToggle();
        pauseTimeRef.current = 0;
        setCurrentTime(0);
        onPlaybackPositionChange(0);
        return;
      }

      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, notes, totalDuration, playNoteSound, onPlaybackPositionChange, onPlayToggle]);

  const handlePause = useCallback(() => {
    if (audioCtxRef.current) {
      pauseTimeRef.current = audioCtxRef.current.currentTime - startTimeRef.current;
    }
    onPlayToggle();
  }, [onPlayToggle]);

  const handleStop = useCallback(() => {
    pauseTimeRef.current = 0;
    setCurrentTime(0);
    playedNotesRef.current = new Set();
    onStop();
  }, [onStop]);

  const progress = totalDuration() > 0 ? (currentTime / totalDuration()) * 100 : 0;

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressBarRef.current;
    if (!bar || totalDuration() === 0) return;
    const rect = bar.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const newTime = ratio * totalDuration();
    pauseTimeRef.current = newTime;
    setCurrentTime(newTime);
    onPlaybackPositionChange((newTime / totalDuration()) * 120);
  }, [totalDuration, onPlaybackPositionChange]);

  return (
    <div style={{
      height: 80,
      background: '#16213e',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: 16,
      borderTop: '1px solid #0f3460',
      flexShrink: 0,
    }}>
      <button
        onClick={isPlaying ? handlePause : onPlayToggle}
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          background: '#e94560',
          border: 'none',
          color: '#fff',
          fontSize: 18,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          flexShrink: 0,
        }}
        onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
        onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
        onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>
      <button
        onClick={handleStop}
        style={{
          width: 42,
          height: 30,
          borderRadius: 8,
          background: '#0f3460',
          border: 'none',
          color: '#fff',
          fontSize: 14,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          flexShrink: 0,
        }}
        onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
        onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        ⏹
      </button>
      <div style={{ fontSize: 13, color: '#888', minWidth: 80, flexShrink: 0 }}>
        {currentTime.toFixed(1)}s / {totalDuration().toFixed(1)}s
      </div>
      <div
        ref={progressBarRef}
        onClick={handleProgressClick}
        style={{
          flex: 1,
          height: 4,
          background: '#4a4a6a',
          borderRadius: 2,
          position: 'relative',
          cursor: 'pointer',
        }}
      >
        <div style={{
          height: 4,
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #e94560, #ff6b6b)',
          borderRadius: 2,
          transition: 'width 0.1s linear',
        }} />
        <div style={{
          position: 'absolute',
          left: `${progress}%`,
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#ffffff',
          boxShadow: '0 0 4px #00000033',
          transition: 'left 0.1s linear',
        }} />
      </div>
    </div>
  );
}
