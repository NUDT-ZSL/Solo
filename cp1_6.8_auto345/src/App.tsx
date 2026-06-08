import React, { useState, useRef, useCallback, useEffect } from 'react';
import ShadowStage, { createCharacter, type PuppetCharacter, type Keyframe } from './ShadowStage';
import ControlPanel from './ControlPanel';

const App: React.FC = () => {
  const [characters, setCharacters] = useState<PuppetCharacter[]>([]);
  const [lightPos, setLightPos] = useState<{ x: number; y: number }>({ x: 600, y: 100 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [keyframes, setKeyframes] = useState<Keyframe[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(10);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playAnimRef = useRef<number>(0);
  const playStartRef = useRef<number>(0);

  const handleAddCharacter = useCallback((type: string, name: string) => {
    setCharacters((prev) => {
      if (prev.length >= 10) return prev;
      const newChar = createCharacter(type, name, 300 + Math.random() * 300, 200 + Math.random() * 200);
      return [...prev, newChar];
    });
  }, []);

  const handleRemoveCharacter = useCallback((id: string) => {
    setCharacters((prev) => prev.filter((c) => c.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
  }, []);

  const handleAddKeyframe = useCallback((kf: Keyframe) => {
    setKeyframes((prev) => {
      const existing = prev.findIndex((k) => Math.abs(k.time - kf.time) < 0.01);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = kf;
        return next.sort((a, b) => a.time - b.time);
      }
      return [...prev, kf].sort((a, b) => a.time - b.time);
    });
  }, []);

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      cancelAnimationFrame(playAnimRef.current);
      return;
    }

    if (keyframes.length < 2) return;

    setIsPlaying(true);
    setCurrentTime(0);
    playStartRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = (now - playStartRef.current) / 1000;
      const progress = Math.min(elapsed / totalDuration, 1);
      setCurrentTime(progress);

      if (progress >= 1) {
        setIsPlaying(false);
        setCurrentTime(0);
        return;
      }
      playAnimRef.current = requestAnimationFrame(animate);
    };

    playAnimRef.current = requestAnimationFrame(animate);
  }, [isPlaying, keyframes, totalDuration]);

  useEffect(() => {
    return () => cancelAnimationFrame(playAnimRef.current);
  }, []);

  const handleCharacterMove = useCallback((_id: string, _x: number, _y: number, _rotation: number, _scale: number) => {
  }, []);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        overflow: 'hidden',
        background: '#1a1208',
        fontFamily: '"PingFang SC", "Microsoft YaHei", "SimHei", sans-serif',
      }}
    >
      <div style={{ flex: 1, position: 'relative' }}>
        <ShadowStage
          characters={characters}
          setCharacters={setCharacters}
          lightPos={lightPos}
          setLightPos={setLightPos}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          isPlaying={isPlaying}
          keyframes={keyframes}
          currentTime={currentTime}
          totalDuration={totalDuration}
          canvasRef={canvasRef}
          onCharacterMove={handleCharacterMove}
        />

        {isPlaying && (
          <div
            style={{
              position: 'absolute',
              top: '16px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(220, 60, 60, 0.15)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1.5px solid rgba(220, 80, 60, 0.4)',
              borderRadius: '24px',
              padding: '6px 20px',
              color: '#e8a070',
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '1px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              zIndex: 20,
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#e06040',
                animation: 'pulse 1s infinite',
              }}
            />
            播放中 · {(currentTime * totalDuration).toFixed(1)}s / {totalDuration}s
          </div>
        )}
      </div>

      <ControlPanel
        characters={characters}
        onAddCharacter={handleAddCharacter}
        onRemoveCharacter={handleRemoveCharacter}
        selectedId={selectedId}
        lightPos={lightPos}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        keyframes={keyframes}
        onAddKeyframe={handleAddKeyframe}
        currentTime={currentTime}
        totalDuration={totalDuration}
        onSetCurrentTime={setCurrentTime}
        onSetTotalDuration={setTotalDuration}
        canvasRef={canvasRef}
      />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
        *::-webkit-scrollbar {
          width: 4px;
        }
        *::-webkit-scrollbar-track {
          background: transparent;
        }
        *::-webkit-scrollbar-thumb {
          background: rgba(180, 140, 80, 0.3);
          border-radius: 4px;
        }
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          background: rgba(180, 140, 80, 0.2);
          border-radius: 2px;
          outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #c8a860;
          cursor: pointer;
          border: 2px solid rgba(220, 190, 120, 0.8);
          box-shadow: 0 0 6px rgba(200, 168, 96, 0.4);
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #c8a860;
          cursor: pointer;
          border: 2px solid rgba(220, 190, 120, 0.8);
          box-shadow: 0 0 6px rgba(200, 168, 96, 0.4);
        }
        button {
          font-family: inherit;
        }
        button:active {
          transform: scale(0.95) !important;
        }
      `}</style>
    </div>
  );
};

export default App;
