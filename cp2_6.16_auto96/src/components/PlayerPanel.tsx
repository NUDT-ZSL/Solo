import { useEffect, useRef, useState, useCallback } from 'react';
import { AlbumDetail } from '@/types';

interface PlayerPanelProps {
  albumId: string | null;
  onClose: () => void;
  onListen: (albumId: string, trackTitle: string, duration: number) => void;
}

export default function PlayerPanel({ albumId, onClose, onListen }: PlayerPanelProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const listenTriggeredRef = useRef<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const frequencyDataRef = useRef<Uint8Array | null>(null);

  const [album, setAlbum] = useState<AlbumDetail | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(30);
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);

  const barCount = 12;
  const barHeights = useRef<number[]>(new Array(barCount).fill(20));

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!albumId) {
      setIsVisible(false);
      setAlbum(null);
      setCurrentTime(0);
      setIsPlaying(false);
      listenTriggeredRef.current = false;
      cleanupAudioContext();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      return;
    }

    const fetchAlbum = async () => {
      try {
        const res = await fetch(`/api/album/${albumId}`);
        const data = await res.json();
        setAlbum(data);
        setIsVisible(true);
        listenTriggeredRef.current = false;
      } catch (error) {
        console.error('Failed to fetch album:', error);
      }
    };

    fetchAlbum();
  }, [albumId]);

  const cleanupAudioContext = () => {
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    frequencyDataRef.current = null;
  };

  const setupAudioContext = useCallback(() => {
    if (!audioRef.current) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (!sourceRef.current) {
      const ctx = audioContextRef.current;
      analyserRef.current = ctx.createAnalyser();
      analyserRef.current.fftSize = 64;
      analyserRef.current.smoothingTimeConstant = 0.8;

      sourceRef.current = ctx.createMediaElementSource(audioRef.current);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(ctx.destination);

      const bufferLength = analyserRef.current.frequencyBinCount;
      frequencyDataRef.current = new Uint8Array(bufferLength);
    }

    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, []);

  useEffect(() => {
    if (!album || !album.audioBase64) return;

    const audio = new Audio(`data:audio/mp3;base64,${album.audioBase64}`);
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);

      if (audio.currentTime >= 20 && !listenTriggeredRef.current) {
        listenTriggeredRef.current = true;
        onListen(album.id, album.title, Math.floor(audio.currentTime));
      }

      if (audio.currentTime >= duration) {
        audio.pause();
        audio.currentTime = 0;
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      cleanupAudioContext();
      audioRef.current = null;
    };
  }, [album, duration, onListen]);

  const drawSpectrum = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, width, height);

    const barWidth = width / barCount;
    const gap = 4;

    let frequencyData: number[] = [];
    if (analyserRef.current && frequencyDataRef.current) {
      analyserRef.current.getByteFrequencyData(frequencyDataRef.current as Uint8Array<ArrayBuffer>);
      const data = frequencyDataRef.current;
      const step = Math.floor(data.length / barCount);
      for (let i = 0; i < barCount; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) {
          sum += data[i * step + j] || 0;
        }
        frequencyData.push((sum / step) / 255);
      }
    }

    for (let i = 0; i < barCount; i++) {
      let targetHeight: number;
      if (isPlaying && frequencyData.length === barCount) {
        const freqVal = isNaN(frequencyData[i]) ? 0 : frequencyData[i];
        targetHeight = Math.max(8, freqVal * (height - 10) + 5);
      } else if (isPlaying) {
        targetHeight = 10 + Math.random() * 15;
      } else {
        targetHeight = 8;
      }
      if (isNaN(targetHeight) || !isFinite(targetHeight)) {
        targetHeight = 10;
      }
      barHeights.current[i] += (targetHeight - barHeights.current[i]) * 0.25;
      if (isNaN(barHeights.current[i]) || !isFinite(barHeights.current[i])) {
        barHeights.current[i] = 10;
      }

      const x = i * barWidth + gap / 2;
      const barH = Math.max(5, Math.min(height, barHeights.current[i]));
      const y = height - barH;

      const gradient = ctx.createLinearGradient(x, y, x, height);
      gradient.addColorStop(0, '#ff6b6b');
      gradient.addColorStop(1, '#feca57');

      ctx.shadowColor = 'rgba(254, 202, 87, 0.5)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth - gap, barH);

      ctx.shadowBlur = 0;
    }

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(drawSpectrum);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(drawSpectrum);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, drawSpectrum]);

  const togglePlay = async () => {
    if (!audioRef.current) return;

    setupAudioContext();

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      try {
        await audioRef.current.play();
      } catch (e) {
        console.error('Play failed:', e);
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleClose = () => {
    setIsVisible(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    setDragStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile) return;
    const delta = dragStartY - e.touches[0].clientY;
    if (delta < 0) {
      setDragOffset(-delta);
    }
  };

  const handleTouchEnd = () => {
    if (!isMobile) return;
    if (dragOffset > 100) {
      handleClose();
    }
    setDragOffset(0);
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const desktopStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    right: 0,
    width: '400px',
    height: '100vh',
    backgroundColor: 'var(--player-bg)',
    borderRadius: '24px 0 0 24px',
    boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.5)',
    transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
    transition: 'transform 0.4s ease-out, background-color 1s ease',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    padding: '24px',
  };

  const mobileStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    width: '100%',
    height: '60vh',
    backgroundColor: 'var(--player-bg)',
    borderRadius: '24px 24px 0 0',
    boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.5)',
    transform: isVisible ? `translateY(${dragOffset}px)` : 'translateY(100%)',
    transition: 'transform 0.4s ease-out, background-color 1s ease',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    padding: '24px',
  };

  if (!album) return null;

  return (
    <div
      style={isMobile ? mobileStyle : desktopStyle}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {isMobile && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '4px',
              backgroundColor: 'rgba(255,255,255,0.35)',
              borderRadius: '9999px',
            }}
          />
        </div>
      )}

      <div className="flex justify-between items-start mb-6">
        <h2 style={{ color: '#ffffff', fontWeight: 700, fontSize: '20px', margin: 0 }}>
          {album.title}
        </h2>
        <button
          onClick={handleClose}
          style={{
            color: 'rgba(255,255,255,0.5)',
            transition: 'color 0.2s ease',
            fontSize: '24px',
            lineHeight: 1,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
          }}
        >
          ×
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
        <canvas
          ref={canvasRef}
          width={360}
          height={80}
          style={{ borderRadius: '8px' }}
        />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <div
          onClick={handleProgressClick}
          style={{
            width: '100%',
            height: '8px',
            backgroundColor: 'rgba(255,255,255,0.12)',
            borderRadius: '9999px',
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          <div
            style={{
              height: '100%',
              borderRadius: '9999px',
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${(currentTime / duration) * 100}%`,
              background: 'linear-gradient(90deg, #ff6b6b, #feca57)',
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '14px',
            marginTop: '8px',
          }}
        >
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={togglePlay}
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '9999px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s ease',
            background: 'linear-gradient(135deg, #ff6b6b, #feca57)',
            border: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
        >
          {isPlaying ? (
            <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
      </div>

      <div
        style={{
          marginTop: 'auto',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.35)',
          fontSize: '14px',
        }}
      >
        <p style={{ margin: 0 }}>曲目列表：</p>
        <ul style={{ marginTop: '8px', padding: 0, listStyle: 'none' }}>
          {album.trackList.slice(0, 3).map((track, idx) => (
            <li
              key={idx}
              style={{
                color: 'rgba(255,255,255,0.5)',
                marginTop: idx > 0 ? '4px' : 0,
              }}
            >
              {track}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
