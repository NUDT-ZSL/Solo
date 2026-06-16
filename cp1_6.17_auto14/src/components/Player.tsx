import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AudioEngine, formatTime, frequencyToColor, getAverageFrequency } from '../business/audio-engine';
import type { Mixtape, Comment, Sticker, StickerType, Song } from '../types';
import { STICKER_COLORS, STICKER_EMOJIS, THEMES } from '../types';

interface PlayerProps {
  mixtape: Mixtape;
  initialComments: Comment[];
  initialStickers: Sticker[];
}

const Player: React.FC<PlayerProps> = ({ mixtape, initialComments, initialStickers }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const animationFrameRef = useRef<number>(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [stickers, setStickers] = useState<Sticker[]>(initialStickers);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [commentTimestamp, setCommentTimestamp] = useState(0);
  const [hoveredComment, setHoveredComment] = useState<string | null>(null);
  const [, setFrequencyData] = useState<Uint8Array>(new Uint8Array(128));
  const [draggedSticker, setDraggedSticker] = useState<StickerType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);

  const currentSong = mixtape.songs[currentSongIndex];
  const totalDuration = mixtape.totalDuration;

  const getAccumulatedTime = (songIndex: number): number => {
    return mixtape.songs.slice(0, songIndex).reduce((acc, song) => acc + song.duration, 0);
  };

  const getCurrentTotalTime = (): number => {
    return getAccumulatedTime(currentSongIndex) + currentTime;
  };

  const loadCurrentSong = useCallback(async () => {
    if (!audioEngineRef.current) return;
    setIsLoading(true);
    try {
      await audioEngineRef.current.loadAudio(currentSong.url);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load audio:', error);
      setIsLoading(false);
    }
  }, [currentSong.url]);

  useEffect(() => {
    audioEngineRef.current = new AudioEngine();
    return () => {
      if (audioEngineRef.current) {
        audioEngineRef.current.destroy();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    loadCurrentSong();
  }, [loadCurrentSong]);

  useEffect(() => {
    if (!canvasRef.current || !waveformContainerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const container = waveformContainerRef.current;
      if (container) {
        canvas.width = container.offsetWidth * window.devicePixelRatio;
        canvas.height = container.offsetHeight * window.devicePixelRatio;
        canvas.style.width = `${container.offsetWidth}px`;
        canvas.style.height = `${container.offsetHeight}px`;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const drawWaveform = () => {
      if (!canvasRef.current || !waveformContainerRef.current || !audioEngineRef.current) {
        animationFrameRef.current = requestAnimationFrame(drawWaveform);
        return;
      }

      const width = waveformContainerRef.current.offsetWidth;
      const height = waveformContainerRef.current.offsetHeight;
      const freqData = audioEngineRef.current.getFrequencyData();
      setFrequencyData(freqData);

      const avgFreq = getAverageFrequency(freqData);

      ctx.clearRect(0, 0, width, height);

      const barCount = 128;
      const barWidth = width / barCount;
      const barGap = 2;

      for (let i = 0; i < barCount; i++) {
        const barHeight = (freqData[i] / 255) * (height * 0.8) + 10;
        const x = i * barWidth;
        const y = (height - barHeight) / 2;

        const hue = 200 + (i / barCount) * 160 + (avgFreq / 255) * 40;
        const saturation = 70 + (freqData[i] / 255) * 20;
        const lightness = 40 + (freqData[i] / 255) * 20;

        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness}%, 0.9)`);
        gradient.addColorStop(1, `hsla(${hue}, ${saturation}%, ${lightness - 20}%, 0.5)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth - barGap, barHeight, 2);
        ctx.fill();
      }

      const progress = getCurrentTotalTime() / totalDuration;
      const progressX = progress * width;

      ctx.fillStyle = 'rgba(255, 107, 107, 0.3)';
      ctx.fillRect(0, 0, progressX, height);

      ctx.strokeStyle = 'var(--accent)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(progressX, 0);
      ctx.lineTo(progressX, height);
      ctx.stroke();

      if (isPlaying && audioEngineRef.current) {
        const engine = audioEngineRef.current;
        const currentSongTime = engine.getCurrentTime();
        engine.applyFadeGain(currentSong.fadeIn, currentSong.fadeOut, currentSongTime, currentSong.duration);
        setCurrentTime(currentSongTime);

        if (currentSongTime >= currentSong.duration && currentSongIndex < mixtape.songs.length - 1) {
          handleNextSong();
        }
      }

      animationFrameRef.current = requestAnimationFrame(drawWaveform);
    };

    animationFrameRef.current = requestAnimationFrame(drawWaveform);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, currentSongIndex, currentTime, totalDuration, currentSong, mixtape.songs.length]);

  const togglePlay = () => {
    if (!audioEngineRef.current || isLoading) return;

    if (isPlaying) {
      audioEngineRef.current.pause();
    } else {
      audioEngineRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleNextSong = useCallback(() => {
    if (currentSongIndex < mixtape.songs.length - 1) {
      if (audioEngineRef.current) {
        audioEngineRef.current.stop();
      }
      setCurrentSongIndex(prev => prev + 1);
      setCurrentTime(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [currentSongIndex, mixtape.songs.length]);

  const handlePrevSong = () => {
    if (currentSongIndex > 0) {
      if (audioEngineRef.current) {
        audioEngineRef.current.stop();
      }
      setCurrentSongIndex(prev => prev - 1);
      setCurrentTime(0);
      setIsPlaying(true);
    }
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!waveformContainerRef.current || !audioEngineRef.current) return;

    const rect = waveformContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const clickedTotalTime = percentage * totalDuration;

    let accumulatedTime = 0;
    let newSongIndex = 0;
    let songLocalTime = 0;

    for (let i = 0; i < mixtape.songs.length; i++) {
      const song = mixtape.songs[i];
      if (clickedTotalTime < accumulatedTime + song.duration) {
        newSongIndex = i;
        songLocalTime = clickedTotalTime - accumulatedTime;
        break;
      }
      accumulatedTime += song.duration;
    }

    if (newSongIndex !== currentSongIndex) {
      if (audioEngineRef.current) {
        audioEngineRef.current.stop();
      }
      setCurrentSongIndex(newSongIndex);
      setCurrentTime(songLocalTime);
      setTimeout(() => {
        if (audioEngineRef.current && isPlaying) {
          audioEngineRef.current.play(songLocalTime);
        }
      }, 100);
    } else {
      audioEngineRef.current.stop();
      audioEngineRef.current.play(songLocalTime);
      setCurrentTime(songLocalTime);
      setIsPlaying(true);
    }

    setCommentTimestamp(clickedTotalTime);
    setShowCommentInput(true);
  };

  const handleSubmitComment = async () => {
    if (!commentContent.trim() || commentContent.length > 140) return;

    try {
      const response = await fetch(`/api/mixtapes/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: commentTimestamp,
          content: commentContent.trim()
        })
      });

      if (response.ok) {
        const updatedComments: Comment[] = await response.json();
        setComments(updatedComments);
        setCommentContent('');
        setShowCommentInput(false);
      }
    } catch (error) {
      console.error('Failed to submit comment:', error);
    }
  };

  const handleStickerDragStart = (e: React.DragEvent<HTMLDivElement>, type: StickerType) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', type);
    setDraggedSticker(type);

    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    dragImage.style.opacity = '0.8';
    dragImage.style.transform = 'scale(1.2)';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 30, 30);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  const handleStickerDragLeave = () => {
    setIsDragOver(false);
    setDragPosition(null);
  };

  const handleStickerDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    setDragPosition(null);

    if (!draggedSticker || !waveformContainerRef.current || !id) {
      setDraggedSticker(null);
      return;
    }

    const rect = waveformContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const percentage = x / rect.width;
    const timestamp = percentage * totalDuration;

    const newX = percentage * 100;
    const newY = (y / rect.height) * 100;

    const existingStickers = stickers;
    const threshold = 15;
    let finalX = newX;
    let finalY = newY;
    let attempts = 0;

    while (attempts < 15) {
      const overlapping = existingStickers.some(s => {
        const dx = s.position.x - finalX;
        const dy = s.position.y - finalY;
        return Math.sqrt(dx * dx + dy * dy) < threshold;
      });

      if (!overlapping) break;

      const angle = Math.random() * Math.PI * 2;
      const distance = 10 + Math.random() * 10;
      finalX = newX + Math.cos(angle) * distance;
      finalY = newY + Math.sin(angle) * distance;
      finalX = Math.max(5, Math.min(95, finalX));
      finalY = Math.max(10, Math.min(90, finalY));
      attempts++;
    }

    try {
      const response = await fetch(`/api/mixtapes/${id}/stickers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: draggedSticker,
          timestamp,
          position: { x: finalX, y: finalY }
        })
      });

      if (response.ok) {
        const updatedStickers: Sticker[] = await response.json();
        setStickers(updatedStickers);
      }
    } catch (error) {
      console.error('Failed to add sticker:', error);
      addStickerLocally(draggedSticker, timestamp, finalX, finalY);
    }

    setDraggedSticker(null);
  };

  const handleStickerDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';

    if (!waveformContainerRef.current) return;
    const rect = waveformContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDragOver(true);
    setDragPosition({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100
    });
  };

  const addStickerLocally = (type: StickerType, timestamp: number, x: number, y: number) => {
    const newSticker: Sticker = {
      id: `local-${Date.now()}`,
      type,
      timestamp,
      position: { x, y },
      count: 1
    };
    setStickers(prev => [...prev, newSticker]);
  };

  const adjustStickerPosition = (stickers: Sticker[], newSticker: Sticker): { x: number; y: number } => {
    const threshold = 15;
    let { x, y } = newSticker.position;
    let attempts = 0;

    while (attempts < 15) {
      const overlapping = stickers.some(s => {
        if (s.id === newSticker.id) return false;
        const dx = s.position.x - x;
        const dy = s.position.y - y;
        return Math.sqrt(dx * dx + dy * dy) < threshold;
      });

      if (!overlapping) break;

      const angle = Math.random() * Math.PI * 2;
      const distance = 10 + Math.random() * 10;
      x = newSticker.position.x + Math.cos(angle) * distance;
      y = newSticker.position.y + Math.sin(angle) * distance;
      x = Math.max(5, Math.min(95, x));
      y = Math.max(10, Math.min(90, y));
      attempts++;
    }

    return { x, y };
  };

  const theme = THEMES[mixtape.theme];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      flexDirection: 'column',
      animation: 'fadeIn 0.5s ease'
    }}>
      <div style={{
        position: 'relative',
        height: '300px',
        overflow: 'hidden',
        background: theme.background
      }}>
        {currentSong.albumCover && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `url(${currentSong.albumCover})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(20px) brightness(0.4)',
            transform: 'scale(1.1)'
          }} />
        )}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(to bottom, transparent 0%, var(--bg-primary) 100%)'
        }} />

        <button
          onClick={() => navigate('/')}
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            padding: '8px 16px',
            background: 'rgba(0, 0, 0, 0.5)',
            borderRadius: 'var(--border-radius)',
            color: '#fff',
            fontSize: '14px',
            zIndex: 10
          }}
        >
          ← 返回广场
        </button>

        <div style={{
          position: 'relative',
          zIndex: 5,
          padding: '60px 20px 20px',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>
            {mixtape.title}
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', maxWidth: '600px', margin: '0 auto' }}>
            {mixtape.description}
          </p>
          <div style={{ marginTop: '16px', fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)' }}>
            {mixtape.songs.length} 首歌曲 · {formatTime(totalDuration)}
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        flex: 1,
        padding: '20px',
        gap: '20px',
        '@media (max-width: 768px)': {
          flexDirection: 'column'
        }
      } as React.CSSProperties}>
        <div style={{
          width: '120px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          flexShrink: 0
        }}>
          <h3 style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', textAlign: 'center' }}>
            情感贴纸
          </h3>
          {(Object.keys(STICKER_EMOJIS) as StickerType[]).map(type => (
            <div
              key={type}
              draggable
              onDragStart={(e) => handleStickerDragStart(e, type)}
              onDragEnd={() => setDraggedSticker(null)}
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: STICKER_COLORS[type],
                opacity: draggedSticker === type ? 0.3 : 0.7,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                cursor: 'grab',
                transition: 'all var(--transition-fast)',
                margin: '0 auto',
                userSelect: 'none',
                boxShadow: draggedSticker === type ? '0 0 20px rgba(255, 255, 255, 0.3)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (draggedSticker !== type) {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.transform = 'scale(1.1)';
                  e.currentTarget.style.boxShadow = `0 4px 15px ${STICKER_COLORS[type]}40`;
                }
              }}
              onMouseLeave={(e) => {
                if (draggedSticker !== type) {
                  e.currentTarget.style.opacity = '0.7';
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
              onDrag={(e) => {
                if (e.clientX > 0 && e.clientY > 0) {
                  e.currentTarget.style.opacity = '0.5';
                }
              }}
            >
              {STICKER_EMOJIS[type]}
            </div>
          ))}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            padding: '16px',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--border-radius)'
          }}>
            <img
              src={currentSong.albumCover}
              alt={currentSong.title}
              style={{
                width: '80px',
                height: '80px',
                borderRadius: 'var(--border-radius)',
                objectFit: 'cover'
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: 600,
                marginBottom: '4px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {currentSong.title}
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                {currentSong.artist}
              </p>
              <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                淡入: {currentSong.fadeIn}s · 淡出: {currentSong.fadeOut}s
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={handlePrevSong}
                disabled={currentSongIndex === 0}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: currentSongIndex === 0 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)',
                  fontSize: '18px',
                  cursor: currentSongIndex === 0 ? 'not-allowed' : 'pointer',
                  opacity: currentSongIndex === 0 ? 0.5 : 1
                }}
              >
                ⏮️
              </button>
              <button
                onClick={togglePlay}
                disabled={isLoading}
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  fontSize: '24px',
                  cursor: isLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {isLoading ? '⏳' : isPlaying ? '⏸️' : '▶️'}
              </button>
              <button
                onClick={handleNextSong}
                disabled={currentSongIndex === mixtape.songs.length - 1}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: currentSongIndex === mixtape.songs.length - 1 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)',
                  fontSize: '18px',
                  cursor: currentSongIndex === mixtape.songs.length - 1 ? 'not-allowed' : 'pointer',
                  opacity: currentSongIndex === mixtape.songs.length - 1 ? 0.5 : 1
                }}
              >
                ⏭️
              </button>
            </div>
          </div>

          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--border-radius)',
            padding: '20px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              marginBottom: '8px'
            }}>
              <span>{formatTime(getCurrentTotalTime())}</span>
              <span>{formatTime(totalDuration)}</span>
            </div>

            <div
              ref={waveformContainerRef}
              onClick={handleWaveformClick}
              onDrop={handleStickerDrop}
              onDragOver={handleStickerDragOver}
              onDragLeave={handleStickerDragLeave}
              style={{
                position: 'relative',
                height: '120px',
                borderRadius: 'var(--border-radius)',
                overflow: 'hidden',
                cursor: 'pointer',
                background: isDragOver
                  ? 'linear-gradient(135deg, rgba(255, 107, 107, 0.2) 0%, rgba(255, 200, 0, 0.2) 100%)'
                  : 'rgba(0, 0, 0, 0.3)',
                border: isDragOver ? '2px dashed var(--accent)' : '2px solid transparent',
                transition: 'all var(--transition-fast)'
              }}
            >
              <canvas ref={canvasRef} style={{ display: 'block' }} />

              {isDragOver && dragPosition && draggedSticker && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${dragPosition.x}%`,
                    top: `${dragPosition.y}%`,
                    transform: 'translate(-50%, -50%)',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: STICKER_COLORS[draggedSticker],
                    opacity: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    pointerEvents: 'none',
                    zIndex: 100,
                    animation: 'pulse 0.5s infinite'
                  }}
                >
                  {STICKER_EMOJIS[draggedSticker]}
                </div>
              )}

              {isDragOver && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0, 0, 0, 0.5)',
                    pointerEvents: 'none',
                    zIndex: 50,
                    animation: 'fadeIn 0.2s ease'
                  }}
                >
                  <span style={{ fontSize: '14px', color: '#fff' }}>
                    释放贴纸到这里 ✨
                  </span>
                </div>
              )}

              {comments.map(comment => {
                const position = (comment.timestamp / totalDuration) * 100;
                const isHovered = hoveredComment === comment.id;
                return (
                  <div
                    key={comment.id}
                    style={{
                      position: 'absolute',
                      left: `${position}%`,
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      zIndex: 10
                    }}
                    onMouseEnter={() => setHoveredComment(comment.id)}
                    onMouseLeave={() => setHoveredComment(null)}
                  >
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: 'var(--comment-anchor)',
                        border: '2px solid #fff',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)',
                        transform: isHovered ? 'scale(1.3)' : 'scale(1)'
                      }}
                    />
                    {isHovered && (
                      <div style={{
                        position: 'absolute',
                        bottom: '24px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(0, 0, 0, 0.9)',
                        padding: '10px 14px',
                        borderRadius: 'var(--border-radius)',
                        minWidth: '200px',
                        maxWidth: '300px',
                        fontSize: '13px',
                        lineHeight: 1.4,
                        animation: 'fadeIn 0.2s ease',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word'
                      }}>
                        <div style={{ fontSize: '11px', color: 'var(--comment-anchor)', marginBottom: '4px' }}>
                          {formatTime(comment.timestamp)}
                        </div>
                        {comment.content}
                        <div style={{
                          position: 'absolute',
                          bottom: '-6px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 0,
                          height: 0,
                          borderLeft: '6px solid transparent',
                          borderRight: '6px solid transparent',
                          borderTop: '6px solid rgba(0, 0, 0, 0.9)'
                        }} />
                      </div>
                    )}
                  </div>
                );
              })}

              {stickers.map(sticker => {
                const adjustedPos = adjustStickerPosition(stickers.filter(s => s.id !== sticker.id), sticker);
                return (
                  <div
                    key={sticker.id}
                    style={{
                      position: 'absolute',
                      left: `${adjustedPos.x}%`,
                      top: `${adjustedPos.y}%`,
                      transform: 'translate(-50%, -50%)',
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: STICKER_COLORS[sticker.type],
                      opacity: 0.7,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      zIndex: 5,
                      transition: 'all var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '0.7';
                      e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
                    }}
                  >
                    {STICKER_EMOJIS[sticker.type]}
                    {sticker.count > 1 && (
                      <span style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        background: '#fff',
                        color: '#000',
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 5px',
                        borderRadius: '10px',
                        minWidth: '18px',
                        textAlign: 'center'
                      }}>
                        {sticker.count}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {showCommentInput && (
            <div style={{
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--border-radius)',
              padding: '16px',
              animation: 'slideUp 0.3s ease'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  在 {formatTime(commentTimestamp)} 添加评论
                </span>
                <button
                  onClick={() => setShowCommentInput(false)}
                  style={{ color: 'var(--text-secondary)', fontSize: '14px' }}
                >
                  ✕
                </button>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <textarea
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  placeholder="写下你对这段音乐的感受..."
                  maxLength={140}
                  style={{
                    flex: 1,
                    minHeight: '60px',
                    padding: '12px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: 'var(--border-radius)',
                    fontSize: '14px',
                    resize: 'none'
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: '12px', color: commentContent.length > 120 ? 'var(--accent)' : 'var(--text-secondary)' }}>
                    {commentContent.length}/140
                  </span>
                  <button
                    onClick={handleSubmitComment}
                    disabled={!commentContent.trim()}
                    style={{
                      padding: '8px 20px',
                      background: 'var(--accent)',
                      borderRadius: 'var(--border-radius)',
                      fontSize: '14px',
                      fontWeight: 500,
                      opacity: commentContent.trim() ? 1 : 0.5,
                      cursor: commentContent.trim() ? 'pointer' : 'not-allowed'
                    }}
                  >
                    发布
                  </button>
                </div>
              </div>
            </div>
          )}

          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--border-radius)',
            padding: '16px',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
              歌曲列表
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {mixtape.songs.map((song: Song, index: number) => (
                <div
                  key={song.id}
                  onClick={() => {
                    if (audioEngineRef.current) {
                      audioEngineRef.current.stop();
                    }
                    setCurrentSongIndex(index);
                    setCurrentTime(0);
                    setTimeout(() => {
                      if (audioEngineRef.current) {
                        audioEngineRef.current.play();
                        setIsPlaying(true);
                      }
                    }, 100);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    borderRadius: 'var(--border-radius)',
                    background: index === currentSongIndex ? 'rgba(255, 107, 107, 0.2)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => {
                    if (index !== currentSongIndex) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (index !== currentSongIndex) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div style={{
                    width: '28px',
                    textAlign: 'center',
                    fontSize: '14px',
                    color: index === currentSongIndex ? 'var(--accent)' : 'var(--text-secondary)'
                  }}>
                    {index === currentSongIndex && isPlaying ? '▶' : index + 1}
                  </div>
                  <img
                    src={song.albumCover}
                    alt={song.title}
                    style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: index === currentSongIndex ? 'var(--accent)' : 'inherit'
                    }}>
                      {song.title}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {song.artist}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {formatTime(song.duration)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Player;
