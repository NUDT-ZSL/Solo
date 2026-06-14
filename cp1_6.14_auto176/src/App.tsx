import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TrackGenerator, TrackData, TrackSegment } from './TrackGenerator';
import { DriftPhysics, PhysicsState, eventBus } from './DriftPhysics';
import { formatTime, lerp } from './utils';

const TOTAL_LAPS = 3;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const physicsRef = useRef<DriftPhysics | null>(null);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const [hudData, setHudData] = useState({
    time: '00:00.00',
    orbsPercent: 0,
    lap: 1,
    isFinished: false
  });
  const screenFlashRef = useRef(false);
  const screenFlashTimerRef = useRef<number>(0);

  const mouseStateRef = useRef({
    isDown: false,
    lastX: 0,
    deltaX: 0
  });

  const cameraRef = useRef({
    x: 1000,
    y: 1000,
    angle: 0,
    targetAngle: 0
  });

  const fpsRef = useRef({
    frames: 0,
    lastFpsUpdate: 0,
    current: 60
  });

  const initGame = useCallback(() => {
    const generator = new TrackGenerator(1);
    const trackData: TrackData = generator.generate();
    physicsRef.current = new DriftPhysics(trackData);
    
    const startPoint = trackData.trackPoints[0];
    cameraRef.current = {
      x: startPoint.x,
      y: startPoint.y,
      angle: 0,
      targetAngle: 0
    };
    
    mouseStateRef.current = {
      isDown: false,
      lastX: 0,
      deltaX: 0
    };
    
    isPausedRef.current = false;
    setIsPaused(false);
    setHudData({
      time: '00:00.00',
      orbsPercent: 0,
      lap: 1,
      isFinished: false
    });
  }, []);

  const drawTrack = useCallback((
    ctx: CanvasRenderingContext2D,
    segments: TrackSegment[],
    trackPoints: { x: number; y: number }[]
  ) => {
    const pointsPerSegment = Math.floor(trackPoints.length / segments.length);
    
    for (let segIdx = 0; segIdx < segments.length; segIdx++) {
      const startIdx = segIdx * pointsPerSegment;
      const endIdx = Math.min(startIdx + pointsPerSegment, trackPoints.length);
      
      const curveIntensity = Math.abs(segIdx % 2 === 0 ? 1 : 0.5);
      const baseWidth = 4 + curveIntensity * 4;
      const baseColor = curveIntensity > 0.7 ? '#c084fc' : '#a855f7';

      for (let i = startIdx; i < endIdx; i++) {
        const t = (i - startIdx) / pointsPerSegment;
        
        const widthFactor = Math.sin(t * Math.PI);
        const lineWidth = baseWidth + widthFactor * 4;
        const color = baseColor;

        const p1 = trackPoints[i];
        const p2 = trackPoints[(i + 1) % trackPoints.length];

        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        if (widthFactor > 0.3) {
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
          ctx.lineWidth = lineWidth + 6;
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }
    
    ctx.shadowBlur = 0;
  }, []);

  const drawFinishLine = useCallback((
    ctx: CanvasRenderingContext2D,
    finishLine: { start: { x: number; y: number }; end: { x: number; y: number } },
    time: number
  ) => {
    const { start, end } = finishLine;
    const dashLength = 10;
    const gapLength = 8;
    const offset = (time * 50) % (dashLength + gapLength);

    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 10;
    ctx.lineDashOffset = -offset;
    ctx.setLineDash([dashLength, gapLength]);

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    ctx.lineDashOffset = 0;
  }, []);

  const drawShip = useCallback((
    ctx: CanvasRenderingContext2D,
    state: PhysicsState,
    time: number
  ) => {
    const { ship } = state;
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle + ship.driftAngle * 0.5);

    if (ship.isColliding) {
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 20;
    }

    if (ship.boostActive) {
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 15;
    }

    const shipColor = ship.isColliding ? '#ef4444' : '#1e3a8a';
    ctx.fillStyle = shipColor;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-12, -12);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-12, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const speedFactor = Math.min(ship.speed / 200, 1);
    const flameLength = 15 + speedFactor * 15 + Math.sin(time * 30) * 3;
    
    const gradient = ctx.createLinearGradient(-6, 0, -6 - flameLength, 0);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(0.3, 'rgba(251, 191, 36, 0.7)');
    gradient.addColorStop(0.6, 'rgba(249, 115, 22, 0.5)');
    gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(-6, -5);
    ctx.lineTo(-6 - flameLength, 0);
    ctx.lineTo(-6, 5);
    ctx.closePath();
    ctx.fill();

    if (ship.isDrifting) {
      ctx.fillStyle = 'rgba(168, 85, 247, 0.6)';
      for (let i = 0; i < 3; i++) {
        const offsetX = -10 - i * 8;
        const offsetY = (i % 2 === 0 ? -1 : 1) * (8 + i * 2);
        ctx.beginPath();
        ctx.arc(offsetX, offsetY, 4 - i, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
    ctx.shadowBlur = 0;
  }, []);

  const drawObstacles = useCallback((
    ctx: CanvasRenderingContext2D,
    obstacles: { x: number; y: number; rotation: number }[],
    time: number
  ) => {
    obstacles.forEach((obs, index) => {
      ctx.save();
      ctx.translate(obs.x, obs.y);
      ctx.rotate(obs.rotation + time * 0.5 + index * 0.1);

      ctx.fillStyle = '#ef4444';
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 8;

      const size = 14;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const x = Math.cos(angle) * size;
        const y = Math.sin(angle) * size;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fca5a5';
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const x = Math.cos(angle) * (size * 0.5);
        const y = Math.sin(angle) * (size * 0.5);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    });
    ctx.shadowBlur = 0;
  }, []);

  const drawEnergyOrbs = useCallback((
    ctx: CanvasRenderingContext2D,
    orbs: { x: number; y: number; collected: boolean }[],
    time: number
  ) => {
    orbs.forEach((orb, index) => {
      if (orb.collected) return;

      ctx.save();
      ctx.translate(orb.x, orb.y);
      ctx.rotate(time * 2 + index * 0.5);

      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 15;

      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.rotate(-time * 4 - index * 0.3);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * 10, Math.sin(angle) * 10);
        ctx.lineTo(Math.cos(angle) * 14, Math.sin(angle) * 14);
        ctx.stroke();
      }

      ctx.restore();
    });
    ctx.shadowBlur = 0;
  }, []);

  const drawScreenFlash = useCallback((
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    intensity: number
  ) => {
    if (intensity <= 0) return;
    ctx.strokeStyle = `rgba(239, 68, 68, ${intensity})`;
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, width - 10, height - 10);
  }, []);

  const render = useCallback((
    ctx: CanvasRenderingContext2D,
    physics: DriftPhysics,
    state: PhysicsState,
    time: number,
    width: number,
    height: number
  ) => {
    ctx.fillStyle = 'transparent';
    ctx.clearRect(0, 0, width, height);

    const camera = cameraRef.current;
    
    camera.x = lerp(camera.x, state.ship.x, 0.08);
    camera.y = lerp(camera.y, state.ship.y, 0.08);
    camera.targetAngle = -state.ship.angle - Math.PI / 2;
    camera.angle = lerp(camera.angle, camera.targetAngle, 0.03);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(camera.angle);
    ctx.translate(-camera.x, -camera.y);

    const trackData = physics.getTrackData();
    drawTrack(ctx, trackData.segments, trackData.trackPoints);
    drawFinishLine(ctx, trackData.finishLine, time);
    drawObstacles(ctx, trackData.obstacles, time);
    drawEnergyOrbs(ctx, trackData.energyOrbs, time);
    drawShip(ctx, state, time);

    ctx.restore();

    if (screenFlashRef.current) {
      drawScreenFlash(ctx, width, height, screenFlashTimerRef.current / 200);
    }
  }, [drawTrack, drawFinishLine, drawObstacles, drawEnergyOrbs, drawShip, drawScreenFlash]);

  const gameLoop = useCallback((currentTime: number) => {
    if (!canvasRef.current || !physicsRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const physics = physicsRef.current;

    fpsRef.current.frames++;
    if (currentTime - fpsRef.current.lastFpsUpdate >= 1000) {
      fpsRef.current.current = fpsRef.current.frames;
      fpsRef.current.frames = 0;
      fpsRef.current.lastFpsUpdate = currentTime;
    }

    let deltaTime = lastTimeRef.current ? (currentTime - lastTimeRef.current) / 1000 : 0.016;
    deltaTime = Math.min(deltaTime, 0.05);
    lastTimeRef.current = currentTime;

    if (screenFlashRef.current) {
      screenFlashTimerRef.current -= deltaTime * 1000;
      if (screenFlashTimerRef.current <= 0) {
        screenFlashRef.current = false;
      }
    }

    if (!isPausedRef.current) {
      const mouseDelta = mouseStateRef.current.isDown ? mouseStateRef.current.deltaX : 0;
      physics.setInput({
        isMouseDown: mouseStateRef.current.isDown,
        mouseDeltaX: mouseDelta,
        screenCenterX: canvas.width / 2
      });
      mouseStateRef.current.deltaX = 0;

      physics.update(deltaTime, currentTime);

      const state = physics.getState();
      const orbsPercent = state.totalOrbs > 0 
        ? Math.round((state.collectedOrbs / state.totalOrbs) * 100) 
        : 0;
      
      setHudData({
        time: formatTime(state.raceTime),
        orbsPercent,
        lap: Math.min(state.lap, TOTAL_LAPS),
        isFinished: state.isFinished
      });

      render(ctx, physics, state, currentTime / 1000, canvas.width, canvas.height);
    }

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [render]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPausedRef.current) return;
    mouseStateRef.current.isDown = true;
    mouseStateRef.current.lastX = e.clientX;
    mouseStateRef.current.deltaX = 0;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!mouseStateRef.current.isDown || isPausedRef.current) return;
    const delta = (e.clientX - mouseStateRef.current.lastX) / 200;
    mouseStateRef.current.deltaX += delta;
    mouseStateRef.current.lastX = e.clientX;
  }, []);

  const handleMouseUp = useCallback(() => {
    mouseStateRef.current.isDown = false;
    mouseStateRef.current.deltaX = 0;
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key.toLowerCase() === 'r') {
      initGame();
    } else if (e.key.toLowerCase() === 'p') {
      const newPaused = !isPausedRef.current;
      isPausedRef.current = newPaused;
      setIsPaused(newPaused);
    }
  }, [initGame]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  useEffect(() => {
    eventBus.on('collision', () => {
      screenFlashRef.current = true;
      screenFlashTimerRef.current = 200;
    });

    return () => {
      eventBus.off('collision', () => {});
    };
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameLoop]);

  const handleRestart = () => {
    initGame();
  };

  const handlePauseResume = () => {
    const newPaused = !isPausedRef.current;
    isPausedRef.current = newPaused;
    setIsPaused(newPaused);
  };

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, #0a0a2e 0%, #1a0030 100%)',
          zIndex: 0
        }}
      />

      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
          cursor: mouseStateRef.current.isDown ? 'grabbing' : 'grab'
        }}
      />

      <div style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        display: 'flex',
        gap: '20px',
        alignItems: 'center',
        padding: '8px 16px',
        background: 'rgba(0, 0, 0, 0.4)',
        borderRadius: '8px',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px'
      }}>
        <div>
          <span style={{ opacity: 0.7, marginRight: '8px' }}>时间:</span>
          <span style={{ fontWeight: 'bold' }}>{hudData.time}</span>
        </div>
        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.3)' }} />
        <div>
          <span style={{ opacity: 0.7, marginRight: '8px' }}>能量球:</span>
          <span style={{ fontWeight: 'bold', color: '#fbbf24' }}>{hudData.orbsPercent}%</span>
        </div>
        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.3)' }} />
        <div>
          <span style={{ opacity: 0.7, marginRight: '8px' }}>圈数:</span>
          <span style={{ fontWeight: 'bold', color: '#a855f7' }}>{hudData.lap}/{TOTAL_LAPS}</span>
        </div>
      </div>

      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        zIndex: 10,
        display: 'flex',
        gap: '10px'
      }}>
        <button
          onClick={handleRestart}
          style={{
            padding: '8px 16px',
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            color: 'white',
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(168, 85, 247, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.4)';
          }}
        >
          重新开始 (R)
        </button>
        <button
          onClick={handlePauseResume}
          style={{
            padding: '8px 16px',
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            color: 'white',
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(168, 85, 247, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.4)';
          }}
        >
          {isPaused ? '继续 (P)' : '暂停 (P)'}
        </button>
      </div>

      {isPaused && !hudData.isFinished && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20
        }}>
          <div style={{
            color: 'white',
            fontFamily: 'Arial, sans-serif',
            fontSize: '48px',
            fontWeight: 'bold',
            textShadow: '0 0 20px rgba(168, 85, 247, 0.8)'
          }}>
            游戏暂停
          </div>
          <div style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontFamily: 'Arial, sans-serif',
            fontSize: '18px',
            marginTop: '16px'
          }}>
            按 P 键继续游戏
          </div>
        </div>
      )}

      {hudData.isFinished && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20
        }}>
          <div style={{
            color: '#fbbf24',
            fontFamily: 'Arial, sans-serif',
            fontSize: '56px',
            fontWeight: 'bold',
            textShadow: '0 0 30px rgba(251, 191, 36, 0.8)',
            marginBottom: '20px'
          }}>
            🏆 比赛完成！
          </div>
          <div style={{
            color: 'white',
            fontFamily: 'Arial, sans-serif',
            fontSize: '24px',
            marginBottom: '10px'
          }}>
            总用时: <span style={{ color: '#a855f7', fontWeight: 'bold' }}>{hudData.time}</span>
          </div>
          <div style={{
            color: 'white',
            fontFamily: 'Arial, sans-serif',
            fontSize: '20px',
            marginBottom: '30px'
          }}>
            能量球收集: <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{hudData.orbsPercent}%</span>
          </div>
          <button
            onClick={handleRestart}
            style={{
              padding: '12px 32px',
              background: 'linear-gradient(135deg, #a855f7, #c084fc)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontFamily: 'Arial, sans-serif',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 0 20px rgba(168, 85, 247, 0.5)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            再来一局 (R)
          </button>
        </div>
      )}

      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        zIndex: 10,
        color: 'rgba(255, 255, 255, 0.5)',
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px'
      }}>
        <div>🎮 鼠标拖拽转向 | 释放惯性漂移</div>
        <div>⏱️ 3圈完成比赛 | 收集能量球加速</div>
      </div>
    </div>
  );
}
