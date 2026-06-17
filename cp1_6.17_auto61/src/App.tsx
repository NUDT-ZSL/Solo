import { useEffect, useRef, useState, useCallback } from 'react';
import { MazeGenerator, Wall, Gem, MAZE_SIZE } from './MazeGen';
import { SoundWaveEngine, SoundWave, WaveGemHit } from './SoundWaveEngine';
import { GameContext } from './GameContext';
import './App.css';

const GAME_DURATION = 60;
const GEM_COLLECT_RADIUS = 25;
const GEM_GLOW_DURATION = 1500;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mazeGenRef = useRef<MazeGenerator>(new MazeGenerator());
  const soundEngineRef = useRef<SoundWaveEngine>(new SoundWaveEngine());

  const [walls, setWalls] = useState<Wall[]>([]);
  const [gems, setGems] = useState<Gem[]>([]);
  const [waves, setWaves] = useState<SoundWave[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameState, setGameState] = useState<'playing' | 'ended'>('playing');
  const [playerX, setPlayerX] = useState(0);
  const [playerY, setPlayerY] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [mazeOffsetX, setMazeOffsetX] = useState(0);
  const [mazeOffsetY, setMazeOffsetY] = useState(0);
  const [collectedGems, setCollectedGems] = useState(0);

  const mouseDownTimeRef = useRef<number>(0);
  const isMouseDownRef = useRef<boolean>(false);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const gameStartTimeRef = useRef<number>(0);
  const gemsRef = useRef<Gem[]>([]);
  const collectingGemsRef = useRef<Map<number, { startTime: number; scale: number }>>(new Map());

  const initGame = useCallback(() => {
    const mazeGen = mazeGenRef.current;
    const result = mazeGen.generate();
    setWalls(result.gems ? [] : result.walls);
    setWalls(result.walls);
    setGems(result.gems);
    gemsRef.current = result.gems;
    setPlayerX(result.startX);
    setPlayerY(result.startY);
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setGameState('playing');
    setCollectedGems(0);
    collectingGemsRef.current.clear();

    const soundEngine = soundEngineRef.current;
    soundEngine.reset();
    soundEngine.setWalls(result.walls);
    soundEngine.setGems(result.gems);

    gameStartTimeRef.current = performance.now();
    lastTimeRef.current = performance.now();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setCanvasSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const offsetX = (canvasSize.width - MAZE_SIZE) / 2;
    const offsetY = (canvasSize.height - MAZE_SIZE) / 2 + 30;
    setMazeOffsetX(offsetX);
    setMazeOffsetY(offsetY);
  }, [canvasSize]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = (currentTime: number) => {
      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      if (gameState === 'playing') {
        const elapsed = (currentTime - gameStartTimeRef.current) / 1000;
        const remaining = Math.max(0, GAME_DURATION - elapsed);
        setTimeLeft(remaining);

        if (remaining <= 0) {
          setGameState('ended');
        }

        const gemHits: WaveGemHit[] = soundEngineRef.current.update(deltaTime);

        if (gemHits.length > 0) {
          const now = performance.now();
          const updatedGems = gemsRef.current.map(gem => {
            const hit = gemHits.find(h => h.gemId === gem.id);
            if (hit && !gem.collected) {
              return { ...gem, glowStartTime: now };
            }
            return gem;
          });
          gemsRef.current = updatedGems;
          setGems([...updatedGems]);
        }

        const currentWaves = soundEngineRef.current.getWaves();
        setWaves(currentWaves);

        const collecting = collectingGemsRef.current;
        const now = performance.now();
        let needUpdateGems = false;
        collecting.forEach((info, gemId) => {
          const elapsed = (now - info.startTime) / 300;
          if (elapsed >= 1) {
            collecting.delete(gemId);
            const g = gemsRef.current.find(g => g.id === gemId);
            if (g && !g.collected) {
              g.collected = true;
              needUpdateGems = true;
            }
          }
        });
        if (needUpdateGems) {
          setGems([...gemsRef.current]);
        }
      }

      render(ctx);

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gameState, mazeOffsetX, mazeOffsetY, canvasSize]);

  const render = (ctx: CanvasRenderingContext2D) => {
    const { width, height } = canvasSize;
    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(mazeOffsetX, mazeOffsetY);

    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(0, 0, MAZE_SIZE, MAZE_SIZE);

    ctx.fillStyle = '#333333';
    for (const wall of walls) {
      ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
    }

    for (const wave of waves) {
      drawWave(ctx, wave);
    }

    const now = performance.now();
    for (const gem of gems) {
      if (gem.collected) continue;

      const collectingInfo = collectingGemsRef.current.get(gem.id);
      if (collectingInfo) {
        const scale = 1 - (now - collectingInfo.startTime) / 300;
        if (scale > 0) {
          drawGem(ctx, gem, Math.max(0, scale), false);
        }
      } else {
        const isGlowing =
          gem.glowStartTime !== null &&
          now - gem.glowStartTime < GEM_GLOW_DURATION;
        drawGem(ctx, gem, 1, isGlowing);
      }
    }

    ctx.restore();
  };

  const drawWave = (ctx: CanvasRenderingContext2D, wave: SoundWave) => {
    if (wave.radius <= 0) return;

    ctx.save();

    const gradient = ctx.createRadialGradient(
      wave.x, wave.y, Math.max(0, wave.radius - 20),
      wave.x, wave.y, wave.radius
    );

    const color = wave.color;
    gradient.addColorStop(0, hexToRgba(color, 0));
    gradient.addColorStop(0.5, hexToRgba(color, wave.opacity * 0.5));
    gradient.addColorStop(1, hexToRgba(color, wave.opacity));

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = hexToRgba(color, wave.opacity * 0.3);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, wave.radius - 3, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  };

  const drawGem = (
    ctx: CanvasRenderingContext2D,
    gem: Gem,
    scale: number,
    isGlowing: boolean
  ) => {
    ctx.save();
    ctx.translate(gem.x, gem.y);
    ctx.scale(scale, scale);

    const size = 8;

    if (isGlowing) {
      ctx.shadowColor = '#FFFF00';
      ctx.shadowBlur = 20;
    }

    let color = '#4488FF';
    if (gem.type === 'green') color = '#44CC44';
    if (gem.type === 'purple') color = '#AA44FF';

    if (isGlowing) {
      color = '#FFFF00';
    }

    ctx.fillStyle = color;

    if (gem.type === 'blue') {
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fill();
    } else if (gem.type === 'green') {
      drawStar(ctx, 0, 0, 5, size, size / 2);
      ctx.fill();
    } else if (gem.type === 'purple') {
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.7, 0);
      ctx.lineTo(0, size);
      ctx.lineTo(-size * 0.7, 0);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  };

  const drawStar = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    spikes: number,
    outerRadius: number,
    innerRadius: number
  ) => {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  };

  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left - mazeOffsetX,
      y: e.clientY - rect.top - mazeOffsetY
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing') return;
    if (e.button !== 0) return;

    const pos = getMousePos(e);
    mousePosRef.current = pos;
    mouseDownTimeRef.current = performance.now();
    isMouseDownRef.current = true;
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing') return;
    if (e.button !== 0) return;
    if (!isMouseDownRef.current) return;

    isMouseDownRef.current = false;

    const pos = getMousePos(e);
    const now = performance.now();
    const pressDuration = now - mouseDownTimeRef.current;
    const isLongPulse = pressDuration >= 500;

    let gemClicked = false;
    for (const gem of gemsRef.current) {
      if (gem.collected) continue;
      if (gem.glowStartTime === null) continue;
      if (now - gem.glowStartTime > GEM_GLOW_DURATION) continue;

      const dx = gem.x - pos.x;
      const dy = gem.y - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= GEM_COLLECT_RADIUS) {
        collectingGemsRef.current.set(gem.id, { startTime: now, scale: 1 });
        setScore(prev => prev + gem.score);
        setCollectedGems(prev => prev + 1);
        gemClicked = true;
        break;
      }
    }

    if (!gemClicked) {
      soundEngineRef.current.emitPulse(pos.x, pos.y, isLongPulse);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    mousePosRef.current = getMousePos(e);
  };

  const handleRestart = () => {
    initGame();
  };

  const [pulseTick, setPulseTick] = useState(0);

  const timeDisplay = Math.ceil(timeLeft);
  const timeColor = timeLeft <= 10 ? '#FF0000' : '#FFFFFF';
  const isLast10 = timeLeft <= 10 && gameState === 'playing';

  const contextValue = {
    walls,
    gems,
    waves,
    score,
    timeLeft,
    gameState,
    playerX,
    playerY,
    mazeOffsetX,
    mazeOffsetY
  };

  return (
    <GameContext.Provider value={contextValue}>
      <div className="game-container">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onContextMenu={e => e.preventDefault()}
        />

        <div className="top-bar">
          <div className="score">得分: {score}</div>
          <div
            className={`timer ${isLast10 ? 'pulse' : ''}`}
            style={{ color: timeColor }}
          >
            {timeDisplay}
          </div>
          <button className="reset-btn" onClick={handleRestart}>
            重置
          </button>
        </div>

        {gameState === 'ended' && (
          <div className="game-over-overlay">
            <div className="game-over-panel">
              <h2>游戏结束</h2>
              <p className="result-text">
                收集宝石: <span>{collectedGems}</span> 颗
              </p>
              <p className="result-text">
                总分: <span className="score-highlight">{score}</span> 分
              </p>
              <button className="restart-btn" onClick={handleRestart}>
                再来一次
              </button>
            </div>
          </div>
        )}
      </div>
    </GameContext.Provider>
  );
}
