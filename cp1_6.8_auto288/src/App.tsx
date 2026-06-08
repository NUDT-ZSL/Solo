import React, { useState, useRef, useCallback, useEffect } from 'react';
import GameCanvas from './GameCanvas';
import { AudioController } from './audioController';

type GameScreen = 'menu' | 'playing' | 'gameover';

const UNLOCK_SCORE = 50;
const MAX_LEVEL = 5;

export default function App() {
  const [screen, setScreen] = useState<GameScreen>('menu');
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [timeLeft, setTimeLeft] = useState(60);
  const [unlockedLevel, setUnlockedLevel] = useState(1);
  const [waveformData, setWaveformData] = useState<Uint8Array>(new Uint8Array(0));
  const audioRef = useRef<AudioController | null>(null);

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new AudioController(120 + level * 8);
    }
    return audioRef.current;
  }, [level]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (screen !== 'playing') return;
    let running = true;
    const tick = () => {
      if (!running) return;
      const audio = audioRef.current;
      if (audio) {
        setWaveformData(audio.getWaveform());
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => { running = false; };
  }, [screen]);

  const handleStart = useCallback(
    async (lvl: number) => {
      const audio = getAudio();
      audio.setBPM(120 + lvl * 8);
      await audio.start();
      setLevel(lvl);
      setScore(0);
      setHealth(100);
      setTimeLeft(60);
      setScreen('playing');
    },
    [getAudio]
  );

  const handleGameOver = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.stop();
    }
    if (score >= UNLOCK_SCORE && level < MAX_LEVEL) {
      setUnlockedLevel((prev) => Math.max(prev, level + 1));
    }
    setScreen('gameover');
  }, [score, level]);

  const handleScoreChange = useCallback((s: number) => setScore(s), []);
  const handleHealthChange = useCallback((h: number) => setHealth(h), []);
  const handleTimeChange = useCallback((t: number) => setTimeLeft(t), []);

  const healthPercent = Math.max(0, health);
  const healthColor =
    healthPercent > 60 ? '#00ffd5' : healthPercent > 30 ? '#ffaa00' : '#ff2244';

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: '#000011',
      }}
    >
      {screen === 'playing' && (
        <GameCanvas
          isPlaying={true}
          level={level}
          onScoreChange={handleScoreChange}
          onHealthChange={handleHealthChange}
          onTimeChange={handleTimeChange}
          onGameOver={handleGameOver}
          audioController={getAudio()}
        />
      )}

      {screen === 'playing' && (
        <>
          <div
            style={{
              position: 'absolute',
              top: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: 32,
              alignItems: 'center',
              zIndex: 10,
              pointerEvents: 'none',
            }}
          >
            <div style={hudStyle}>
              <span style={{ color: '#00ffd5', fontSize: 14, letterSpacing: 2 }}>分数</span>
              <span style={{ color: '#fff', fontSize: 28, fontWeight: 700, textShadow: '0 0 10px #00ffd5' }}>
                {score}
              </span>
            </div>
            <div style={hudStyle}>
              <span style={{ color: healthColor, fontSize: 14, letterSpacing: 2 }}>生命</span>
              <div
                style={{
                  width: 120,
                  height: 10,
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: 5,
                  overflow: 'hidden',
                  border: `1px solid ${healthColor}44`,
                }}
              >
                <div
                  style={{
                    width: `${healthPercent}%`,
                    height: '100%',
                    background: healthColor,
                    borderRadius: 5,
                    transition: 'width 0.3s, background 0.3s',
                    boxShadow: `0 0 8px ${healthColor}`,
                  }}
                />
              </div>
            </div>
            <div style={hudStyle}>
              <span style={{ color: '#7b8fff', fontSize: 14, letterSpacing: 2 }}>时间</span>
              <span style={{ color: '#fff', fontSize: 28, fontWeight: 700, textShadow: '0 0 10px #7b8fff' }}>
                {timeLeft}
              </span>
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '60%',
              maxWidth: 500,
              height: 40,
              zIndex: 10,
              pointerEvents: 'none',
            }}
          >
            <svg width="100%" height="100%" preserveAspectRatio="none">
              <polyline
                fill="none"
                stroke="rgba(120,80,255,0.6)"
                strokeWidth="2"
                points={Array.from(waveformData)
                  .map((v, i) => {
                    const x = (i / waveformData.length) * 100;
                    const y = ((v / 255) * 100 * 0.5 + 25);
                    return `${x}%,${y}%`;
                  })
                  .join(' ')}
              />
              {waveformData.length > 0 && (
                <polyline
                  fill="none"
                  stroke="rgba(0,200,255,0.3)"
                  strokeWidth="1"
                  points={Array.from(waveformData)
                    .map((v, i) => {
                      const x = (i / waveformData.length) * 100;
                      const y = 100 - ((v / 255) * 100 * 0.5 + 25);
                      return `${x}%,${y}%`;
                    })
                    .join(' ')}
                />
              )}
            </svg>
          </div>

          <div
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              color: '#7b8fff88',
              fontSize: 13,
              zIndex: 10,
              pointerEvents: 'none',
              letterSpacing: 1,
            }}
          >
            第 {level} 关
          </div>
        </>
      )}

      {screen === 'menu' && (
        <div style={overlayStyle}>
          <div style={{ textAlign: 'center' }}>
            <h1
              style={{
                fontSize: 'clamp(36px, 8vw, 72px)',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #00ffd5, #7b2ff7, #ff6bf5)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: 'none',
                marginBottom: 8,
                letterSpacing: 4,
              }}
            >
              幻音捕手
            </h1>
            <p style={{ color: '#7b8fff99', fontSize: 16, marginBottom: 48, letterSpacing: 2 }}>
              在音符的浪潮中，捕捉每一个旋律
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
              {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => handleStart(lvl)}
                  disabled={lvl > unlockedLevel}
                  style={{
                    ...buttonStyle,
                    opacity: lvl > unlockedLevel ? 0.3 : 1,
                    cursor: lvl > unlockedLevel ? 'not-allowed' : 'pointer',
                    background:
                      lvl <= unlockedLevel
                        ? 'linear-gradient(135deg, rgba(0,255,213,0.15), rgba(123,47,247,0.15))'
                        : 'rgba(255,255,255,0.05)',
                  }}
                >
                  <span style={{ color: lvl <= unlockedLevel ? '#00ffd5' : '#555' }}>
                    第 {lvl} 关
                  </span>
                  {lvl > unlockedLevel && (
                    <span style={{ color: '#ff224488', fontSize: 12, marginLeft: 8 }}>🔒</span>
                  )}
                </button>
              ))}
            </div>
            <p style={{ color: '#7b8fff55', fontSize: 13, marginTop: 32 }}>
              鼠标 / 触摸移动 · WASD / 方向键控制
            </p>
          </div>
        </div>
      )}

      {screen === 'gameover' && (
        <div style={overlayStyle}>
          <div style={{ textAlign: 'center' }}>
            <h2
              style={{
                fontSize: 'clamp(28px, 6vw, 48px)',
                fontWeight: 700,
                color: score >= UNLOCK_SCORE ? '#00ffd5' : '#ff6bf5',
                textShadow: `0 0 20px ${score >= UNLOCK_SCORE ? '#00ffd5' : '#ff6bf5'}44`,
                marginBottom: 16,
              }}
            >
              {score >= UNLOCK_SCORE ? '🎵 演奏成功!' : '💫 再来一次'}
            </h2>
            <p style={{ color: '#fff', fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
              {score} 分
            </p>
            <p style={{ color: '#7b8fff88', fontSize: 14, marginBottom: 36 }}>
              {score >= UNLOCK_SCORE && level < MAX_LEVEL
                ? `已解锁第 ${level + 1} 关!`
                : score >= UNLOCK_SCORE && level === MAX_LEVEL
                ? '恭喜通关所有关卡!'
                : `需要 ${UNLOCK_SCORE} 分解锁下一关`}
            </p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => handleStart(level)} style={buttonStyle}>
                <span style={{ color: '#00ffd5' }}>重新挑战</span>
              </button>
              <button
                onClick={() => setScreen('menu')}
                style={{ ...buttonStyle, background: 'rgba(255,255,255,0.05)' }}
              >
                <span style={{ color: '#7b8fff' }}>返回菜单</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const hudStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
};

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'radial-gradient(ellipse at center, rgba(5,5,32,0.95) 0%, rgba(0,0,11,0.98) 100%)',
  zIndex: 20,
};

const buttonStyle: React.CSSProperties = {
  padding: '12px 40px',
  border: '1px solid rgba(0,255,213,0.3)',
  borderRadius: 8,
  background: 'linear-gradient(135deg, rgba(0,255,213,0.15), rgba(123,47,247,0.15))',
  color: '#00ffd5',
  fontSize: 18,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
  letterSpacing: 2,
  outline: 'none',
};
