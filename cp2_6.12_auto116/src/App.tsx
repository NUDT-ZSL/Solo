import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameLoop } from './gameLoop';
import { castRays, LightSegment, HitGlow, SplitParticle } from './lightEngine';
import { ComponentManager } from './componentManager';
import { Renderer, TransitionState } from './renderer';
import { levels, LevelConfig } from './data/levels';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameLoopRef = useRef<GameLoop | null>(null);
  const componentManagerRef = useRef<ComponentManager | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const accumulatedGlowsRef = useRef<HitGlow[]>([]);
  const accumulatedParticlesRef = useRef<SplitParticle[]>([]);
  const latestSegmentsRef = useRef<LightSegment[]>([]);
  const latestReceivedRef = useRef<number>(0);
  const transitionRef = useRef<TransitionState>({
    active: false,
    startTime: 0,
    duration: 500,
    isFadeOut: true,
  });
  const pendingLevelRef = useRef<number | null>(null);

  const [currentLevelIdx, setCurrentLevelIdx] = useState<number>(0);
  const [unlockedLevel, setUnlockedLevel] = useState<number>(0);
  const [receivedEnergy, setReceivedEnergy] = useState<number>(0);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [typewriterText, setTypewriterText] = useState<string>('');
  const [levelCompleted, setLevelCompleted] = useState<boolean>(false);
  const typewriterTimerRef = useRef<number | null>(null);

  const currentLevel: LevelConfig = levels[currentLevelIdx];

  const runTypewriter = useCallback((text: string) => {
    if (typewriterTimerRef.current !== null) {
      clearInterval(typewriterTimerRef.current);
    }
    setTypewriterText('');
    let i = 0;
    typewriterTimerRef.current = window.setInterval(() => {
      i++;
      setTypewriterText(text.slice(0, i));
      if (i >= text.length) {
        if (typewriterTimerRef.current !== null) {
          clearInterval(typewriterTimerRef.current);
          typewriterTimerRef.current = null;
        }
      }
    }, 50);
  }, []);

  useEffect(() => {
    return () => {
      if (typewriterTimerRef.current !== null) {
        clearInterval(typewriterTimerRef.current);
      }
    };
  }, []);

  const loadLevel = useCallback((idx: number) => {
    const level = levels[idx];
    if (!level) return;
    const cm = componentManagerRef.current;
    if (cm) cm.loadLevel(level);
    accumulatedGlowsRef.current = [];
    accumulatedParticlesRef.current = [];
    latestSegmentsRef.current = [];
    latestReceivedRef.current = 0;
    setReceivedEnergy(0);
    setLevelCompleted(false);
    setCurrentLevelIdx(idx);
  }, []);

  const triggerLevelTransition = useCallback(
    (targetIdx: number) => {
      if (targetIdx < 0 || targetIdx >= levels.length) return;
      pendingLevelRef.current = targetIdx;
      transitionRef.current = {
        active: true,
        startTime: performance.now(),
        duration: 500,
        isFadeOut: true,
      };
    },
    []
  );

  const resetLevel = useCallback(() => {
    triggerLevelTransition(currentLevelIdx);
  }, [currentLevelIdx, triggerLevelTransition]);

  const nextLevel = useCallback(() => {
    if (currentLevelIdx + 1 < levels.length) {
      triggerLevelTransition(currentLevelIdx + 1);
    }
  }, [currentLevelIdx, triggerLevelTransition]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (rendererRef.current) {
          rendererRef.current.resize(w, h);
        }
      }
    };

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    resize();
    window.addEventListener('resize', resize);

    rendererRef.current = new Renderer(ctx, window.innerWidth, window.innerHeight);

    const cm = new ComponentManager();
    componentManagerRef.current = cm;
    cm.loadLevel(currentLevel);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (cm.handleMouseMove(x, y)) {
        canvas.style.cursor = cm.dragInfo ? 'grabbing' : cm.hoverId ? 'grab' : 'default';
      }
    };
    const handleMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (cm.handleMouseDown(x, y)) {
        canvas.style.cursor = 'grabbing';
      }
    };
    const handleMouseUp = () => {
      cm.handleMouseUp();
      canvas.style.cursor = cm.hoverId ? 'grab' : 'default';
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const t = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const x = t.clientX - rect.left;
        const y = t.clientY - rect.top;
        cm.handleMouseMove(x, y);
        e.preventDefault();
      }
    };
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const t = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const x = t.clientX - rect.left;
        const y = t.clientY - rect.top;
        cm.handleMouseDown(x, y);
      }
    };
    const handleTouchEnd = () => {
      cm.handleMouseUp();
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchend', handleTouchEnd);

    const loop = new GameLoop(60);
    gameLoopRef.current = loop;

    loop.addCallback((_delta, nowTime) => {
      const renderer = rendererRef.current;
      if (!renderer) return;

      const w = window.innerWidth;
      const h = window.innerHeight;

      const transition = transitionRef.current;
      if (transition.active) {
        const elapsed = nowTime - transition.startTime;
        if (elapsed >= transition.duration) {
          if (transition.isFadeOut && pendingLevelRef.current !== null) {
            loadLevel(pendingLevelRef.current);
            pendingLevelRef.current = null;
            transitionRef.current = {
              active: true,
              startTime: nowTime,
              duration: 500,
              isFadeOut: false,
            };
          } else {
            transitionRef.current = {
              ...transition,
              active: false,
            };
          }
        }
      }

      const result = castRays(
        w,
        h,
        cm.state.lightSource,
        cm.state.receiver,
        cm.state.mirrors,
        cm.state.prisms,
        cm.state.obstacles,
        nowTime
      );
      latestSegmentsRef.current = result.segments;
      latestReceivedRef.current = result.receivedIntensity;
      accumulatedGlowsRef.current.push(...result.hitGlows);
      accumulatedParticlesRef.current.push(...result.splitParticles);
      accumulatedGlowsRef.current = accumulatedGlowsRef.current.filter(
        (g) => nowTime - g.startTime < g.duration
      );
      accumulatedParticlesRef.current = accumulatedParticlesRef.current.filter(
        (p) => nowTime - p.startTime < p.duration
      );

      const energyPct = Math.min(1, result.receivedIntensity);
      setReceivedEnergy(energyPct);
      if (energyPct >= 0.7 && !levelCompleted) {
        setLevelCompleted(true);
        setUnlockedLevel((prev) => Math.max(prev, currentLevelIdx + 1));
      }

      renderer.clear();
      renderer.drawGrid();
      renderer.drawLightSegments(latestSegmentsRef.current);
      renderer.drawObstacles(cm.state);
      renderer.drawMirrors(cm.state, cm.hoverId);
      renderer.drawPrisms(cm.state, cm.hoverId);
      renderer.drawLightSource(cm.state, nowTime);
      renderer.drawReceiver(cm.state, nowTime, result.receivedIntensity > 0.01);
      renderer.drawHitGlows(accumulatedGlowsRef.current, nowTime);
      renderer.drawSplitParticles(accumulatedParticlesRef.current, nowTime);
      renderer.drawTransition(transitionRef.current, nowTime);
    });

    loop.start();

    return () => {
      loop.dispose();
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (showHelp) {
      runTypewriter(currentLevel.hint);
    }
  }, [showHelp, currentLevel, runTypewriter]);

  const energyPercent = Math.round(receivedEnergy * 100);
  const isPassed = receivedEnergy >= 0.7;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas ref={canvasRef} />

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pointerEvents: 'none',
          background: 'linear-gradient(180deg, rgba(10,14,39,0.85) 0%, rgba(10,14,39,0) 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 1,
              color: '#ffdd33',
              textShadow: '0 0 10px rgba(255,221,51,0.6)',
            }}
          >
            第 {currentLevel.id} 关 · {currentLevel.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, opacity: 0.8 }}>光线能量</span>
            <div
              style={{
                width: 200,
                height: 14,
                background: 'rgba(255,255,255,0.1)',
                borderRadius: 7,
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <div
                style={{
                  width: `${energyPercent}%`,
                  height: '100%',
                  background: isPassed
                    ? 'linear-gradient(90deg, #44ff88, #88ffaa)'
                    : 'linear-gradient(90deg, #ff8844, #ffdd33)',
                  transition: 'width 0.15s ease-out',
                  boxShadow: isPassed
                    ? '0 0 10px rgba(68,255,136,0.8)'
                    : '0 0 8px rgba(255,221,51,0.6)',
                }}
              />
            </div>
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: isPassed ? '#44ff88' : '#ffdd33',
                minWidth: 44,
                textAlign: 'right',
              }}
            >
              {energyPercent}%
            </span>
            {isPassed && (
              <span
                style={{
                  fontSize: 12,
                  padding: '3px 10px',
                  background: 'rgba(68,255,136,0.2)',
                  border: '1px solid #44ff88',
                  color: '#44ff88',
                  borderRadius: 10,
                }}
              >
                通关!
              </span>
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 12,
          pointerEvents: 'auto',
        }}
      >
        {levels.map((lv, idx) => {
          const locked = idx > unlockedLevel;
          const isCurrent = idx === currentLevelIdx;
          return (
            <div
              key={lv.id}
              onClick={() => {
                if (!locked && !transitionRef.current.active) {
                  triggerLevelTransition(idx);
                }
              }}
              style={{
                width: 130,
                height: 82,
                borderRadius: 8,
                padding: 10,
                cursor: locked ? 'not-allowed' : 'pointer',
                opacity: locked ? 0.4 : 1,
                background: isCurrent
                  ? 'linear-gradient(145deg, rgba(255,200,60,0.25), rgba(255,160,40,0.15))'
                  : 'linear-gradient(145deg, rgba(30,40,80,0.85), rgba(20,25,55,0.85))',
                border: isCurrent
                  ? '2px solid #ffcc44'
                  : '2px solid rgba(255,255,255,0.15)',
                boxShadow: isCurrent
                  ? '0 0 18px rgba(255,204,68,0.5)'
                  : '0 4px 14px rgba(0,0,0,0.4)',
                color: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {lv.id}. {lv.name}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: '#ffcc44', letterSpacing: 1 }}>
                  {'★'.repeat(lv.difficulty)}
                  <span style={{ color: 'rgba(255,255,255,0.2)' }}>
                    {'★'.repeat(Math.max(0, 4 - lv.difficulty))}
                  </span>
                </div>
                {locked && <span style={{ fontSize: 12, opacity: 0.7 }}>🔒</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          display: 'flex',
          gap: 10,
          pointerEvents: 'auto',
        }}
      >
        <button
          onClick={resetLevel}
          style={{
            padding: '10px 18px',
            fontSize: 14,
            borderRadius: 6,
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#ffffff',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
          }}
        >
          重置关卡
        </button>
        {levelCompleted && currentLevelIdx + 1 < levels.length && (
          <button
            onClick={nextLevel}
            style={{
              padding: '10px 18px',
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 6,
              background: 'linear-gradient(90deg, #44aa55, #66cc77)',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              boxShadow: '0 0 12px rgba(68,255,136,0.5)',
            }}
          >
            下一关 →
          </button>
        )}
        <button
          onClick={() => setShowHelp(true)}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            fontSize: 18,
            fontWeight: 700,
            background: 'linear-gradient(145deg, #4477ff, #6699ff)',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            boxShadow: '0 0 12px rgba(80,120,255,0.6)',
          }}
          title="操作提示"
        >
          ?
        </button>
      </div>

      {showHelp && (
        <div
          onClick={() => {
            setShowHelp(false);
            if (typewriterTimerRef.current !== null) {
              clearInterval(typewriterTimerRef.current);
              typewriterTimerRef.current = null;
            }
          }}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            cursor: 'pointer',
            pointerEvents: 'auto',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 560,
              width: '85%',
              padding: 32,
              borderRadius: 12,
              background: 'linear-gradient(145deg, #1a1f45, #121638)',
              border: '1px solid rgba(120,160,255,0.4)',
              boxShadow: '0 10px 50px rgba(80,120,255,0.3)',
              color: '#ffffff',
            }}
          >
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                marginBottom: 16,
                color: '#ffdd33',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              💡 第 {currentLevel.id} 关提示
            </div>
            <div
              style={{
                fontSize: 16,
                lineHeight: 1.8,
                minHeight: 60,
                color: '#dde4ff',
                letterSpacing: 0.3,
              }}
            >
              {typewriterText}
              <span style={{ opacity: typewriterText.length < currentLevel.hint.length ? 1 : 0 }}>
                |
              </span>
            </div>
            <div style={{ marginTop: 28, textAlign: 'right' }}>
              <button
                onClick={() => {
                  setShowHelp(false);
                  if (typewriterTimerRef.current !== null) {
                    clearInterval(typewriterTimerRef.current);
                    typewriterTimerRef.current = null;
                  }
                }}
                style={{
                  padding: '8px 22px',
                  fontSize: 14,
                  borderRadius: 6,
                  background: 'rgba(120,160,255,0.25)',
                  border: '1px solid rgba(120,160,255,0.5)',
                  color: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
