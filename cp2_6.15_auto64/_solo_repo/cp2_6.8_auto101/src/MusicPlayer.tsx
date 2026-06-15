import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import type { Song } from './types';

interface Props {
  song: Song | null;
  playlistSongs: Song[];
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSongEnd: () => void;
  onPlayNext: () => void;
  onPlayPrev: () => void;
}

const formatTime = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const MusicPlayer: React.FC<Props> = ({
  song,
  isPlaying,
  onTogglePlay,
  onSongEnd,
  onPlayNext,
  onPlayPrev,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const animationRef = useRef<number>(0);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (!song) {
      setProgress(0);
      setCurrentTime(0);
      return;
    }
    setProgress(0);
    setCurrentTime(0);

    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;

    if (oscillatorRef.current) {
      oscillatorRef.current.stop();
      oscillatorRef.current.disconnect();
    }
    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const analyser = ctx.createAnalyser();

    analyser.fftSize = 256;

    oscillator.type = 'sine';
    oscillator.frequency.value = 220 + Math.random() * 300;
    gainNode.gain.value = 0.03;

    oscillator.connect(gainNode);
    gainNode.connect(analyser);
    analyser.connect(ctx.destination);

    oscillator.start();

    oscillatorRef.current = oscillator;
    gainNodeRef.current = gainNode;
    analyserRef.current = analyser;

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    return () => {
      if (oscillatorRef.current) {
        try {
          oscillatorRef.current.stop();
        } catch {}
        oscillatorRef.current.disconnect();
        oscillatorRef.current = null;
      }
    };
  }, [song?.id]);

  useEffect(() => {
    if (!gainNodeRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;

    if (isPlaying) {
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      gainNodeRef.current.gain.setTargetAtTime(0.03, ctx.currentTime, 0.02);
    } else {
      gainNodeRef.current.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying && song) {
      progressIntervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 0.1;
          if (next >= song.duration) {
            onSongEnd();
            return 0;
          }
          setProgress((next / song.duration) * 100);
          return next;
        });
      }, 100);
    }
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying, song, onSongEnd]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    const barCount = 128;
    const barWidth = 2;
    const gap = 1;
    const totalWidth = barCount * barWidth + (barCount - 1) * gap;
    const offsetX = (width - totalWidth) / 2;

    let simulatedData = new Uint8Array(barCount);
    for (let i = 0; i < barCount; i++) {
      simulatedData[i] = 10 + Math.random() * 30;
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      const analyser = analyserRef.current;
      const dataArray = new Uint8Array(barCount);

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(dataArray);
        for (let i = 0; i < barCount; i++) {
          const target = dataArray[i] || 0;
          simulatedData[i] = simulatedData[i] + (target - simulatedData[i]) * 0.2;
        }
      } else {
        for (let i = 0; i < barCount; i++) {
          const jitter = (Math.random() - 0.5) * 10;
          simulatedData[i] = Math.max(5, Math.min(60, simulatedData[i] + jitter) * 0.95 + 8);
        }
      }

      for (let i = 0; i < barCount; i++) {
        const value = simulatedData[i];
        const barHeight = (value / 255) * height * (isPlaying ? 0.95 : 0.25);
        const x = offsetX + i * (barWidth + gap);
        const y = height - barHeight;

        const gradient = ctx.createLinearGradient(0, y, 0, height);
        gradient.addColorStop(0, '#F6E05E');
        gradient.addColorStop(1, '#E53E3E');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 1);
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  if (!song) return null;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!song) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * song.duration;
    setCurrentTime(newTime);
    setProgress(percent * 100);
  };

  return (
    <div className="player-bar">
      <div className="player-content">
        <div
          className="player-cover"
          style={{ background: song.coverColor }}
        />
        <div className="player-info">
          <div className="player-title">{song.title}</div>
          <div className="player-artist">{song.artist}</div>
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '30px',
              marginTop: '4px',
              display: 'block',
            }}
          />
        </div>
        <div className="player-controls">
          <button className="btn-skip" onClick={onPlayPrev} title="上一首">
            <SkipBack size={18} />
          </button>
          <button className="btn-play" onClick={onTogglePlay} title={isPlaying ? '暂停' : '播放'}>
            {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" />}
          </button>
          <button className="btn-skip" onClick={onPlayNext} title="下一首">
            <SkipForward size={18} />
          </button>
        </div>
        <div className="player-right">
          <div className="progress-container">
            <span className="progress-time">{formatTime(currentTime)}</span>
            <div className="progress-bar" onClick={handleProgressClick}>
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="progress-time">{formatTime(song.duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicPlayer;
