import React, { useState, useRef, useEffect, useCallback } from 'react';
import LyricLine from './LyricLine';
import PlayerControls from './PlayerControls';
import './App.css';

interface LyricItem {
  time: number;
  text: string;
}

const BACKGROUND_COLORS = ['#00C9A7', '#845EC2', '#FF6B6B', '#008F7A'];

function parseLRC(lrcText: string): LyricItem[] {
  const lines = lrcText.split('\n');
  const result: LyricItem[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

  for (const line of lines) {
    const text = line.replace(timeRegex, '').trim();
    if (!text) continue;

    let match;
    timeRegex.lastIndex = 0;
    while ((match = timeRegex.exec(line)) !== null) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const ms = parseInt(match[3].padEnd(3, '0'), 10);
      const time = minutes * 60 + seconds + ms / 1000;
      result.push({ time, text });
    }
  }

  return result.sort((a, b) => a.time - b.time);
}

function findCurrentLyricIndex(lyrics: LyricItem[], currentTime: number): number {
  let left = 0;
  let right = lyrics.length - 1;
  let result = -1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (lyrics[mid].time <= currentTime) {
      result = mid;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return result;
}

const App: React.FC = () => {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioName, setAudioName] = useState<string>('');
  const [lyrics, setLyrics] = useState<LyricItem[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);
  const [bgColorIndex, setBgColorIndex] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);
  const volumeTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const currentLyricIndex = findCurrentLyricIndex(lyrics, currentTime);

  useEffect(() => {
    if (currentLyricIndex >= 0) {
      setBgColorIndex(currentLyricIndex % BACKGROUND_COLORS.length);
    }
  }, [currentLyricIndex]);

  useEffect(() => {
    if (showVolumeIndicator) {
      if (volumeTimerRef.current) {
        window.clearTimeout(volumeTimerRef.current);
      }
      volumeTimerRef.current = window.setTimeout(() => {
        setShowVolumeIndicator(false);
      }, 1500);
    }
    return () => {
      if (volumeTimerRef.current) {
        window.clearTimeout(volumeTimerRef.current);
      }
    };
  }, [showVolumeIndicator, volume]);

  const updateProgress = useCallback(() => {
    if (!audioRef.current) return;
    const now = performance.now();
    if (now - lastUpdateRef.current >= 16) {
      setCurrentTime(audioRef.current.currentTime);
      lastUpdateRef.current = now;
    }
    rafRef.current = requestAnimationFrame(updateProgress);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      rafRef.current = requestAnimationFrame(updateProgress);
    } else if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isPlaying, updateProgress]);

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setAudioName(file.name);
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const handleLyricFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseLRC(text);
      setLyrics(parsed);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (newVolume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    setShowVolumeIndicator(true);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const newMuted = !isMuted;
    audioRef.current.muted = newMuted;
    setIsMuted(newMuted);
    setShowVolumeIndicator(true);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      audioRef.current.volume = volume;
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const bgColor = BACKGROUND_COLORS[bgColorIndex];

  return (
    <div
      className="app-container"
      style={{
        background: `linear-gradient(135deg, #1A1A2E 0%, ${bgColor}33 100%)`
      }}
    >
      <div
        className="bg-overlay"
        style={{
          backgroundColor: bgColor,
          transition: 'background-color 0.5s ease-out'
        }}
      />

      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      <div className="file-selectors">
        <label className="file-label">
          <input
            type="file"
            accept="audio/*"
            onChange={handleAudioFileChange}
            style={{ display: 'none' }}
          />
          <span className="file-btn">🎵 选择音乐</span>
        </label>
        <label className="file-label">
          <input
            type="file"
            accept=".lrc,text/plain"
            onChange={handleLyricFileChange}
            style={{ display: 'none' }}
          />
          <span className="file-btn">📝 选择歌词</span>
        </label>
        {audioName && <span className="audio-name">{audioName}</span>}
      </div>

      <div className="lyrics-container" ref={lyricsContainerRef}>
        {lyrics.length === 0 ? (
          <div className="no-lyrics">
            {audioUrl ? '请加载 LRC 歌词文件' : '请选择音乐和歌词文件开始播放'}
          </div>
        ) : (
          <div className="lyrics-scroll">
            {lyrics.map((lyric, index) => (
              <LyricLine
                key={index}
                text={lyric.text}
                isActive={index === currentLyricIndex}
                index={index}
                containerRef={lyricsContainerRef}
                totalLines={lyrics.length}
              />
            ))}
          </div>
        )}
      </div>

      {showVolumeIndicator && (
        <div className="volume-indicator">
          <div className="volume-circle">
            <div
              className="volume-fill"
              style={{ height: `${(isMuted ? 0 : volume) * 100}%` }}
            />
            <span className="volume-text">
              {Math.round((isMuted ? 0 : volume) * 100)}%
            </span>
          </div>
        </div>
      )}

      <PlayerControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        onTogglePlay={togglePlay}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
        onToggleMute={toggleMute}
        hasAudio={!!audioUrl}
      />
    </div>
  );
};

export default App;
