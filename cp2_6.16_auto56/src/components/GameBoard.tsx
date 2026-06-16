import { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, GameState } from '../game/GameEngine';
import {
  TowerConfigs,
  TowerType,
  GRID_COLS,
  GRID_ROWS,
  CELL_SIZE,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GAME_WIDTH,
  GAME_HEIGHT,
  GRID_OFFSET_X,
  GRID_OFFSET_Y,
  isPathCell,
  getTowerConfig,
  getUpgradeCost,
} from '../game/tower';

interface LevelInfo {
  id: string;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  initialGold: number;
  waveCount: number;
}

interface Props {
  engine: GameEngine;
  levelInfo: LevelInfo;
  onBack: () => void;
  onLevelComplete: () => void;
}

interface DragState {
  isDragging: boolean;
  towerType: TowerType | null;
  startX: number;
  startY: number;
}

type WavePhase = 'idle' | 'preparing' | 'wave_active' | 'cooldown' | 'complete';

export default function GameBoard({ engine, levelInfo, onBack, onLevelComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<GameState>(engine.getState());
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    towerType: null,
    startX: 0,
    startY: 0,
  });
  const [hoverTowerType, setHoverTowerType] = useState<TowerType | null>(null);
  const [scale, setScale] = useState(1);
  const [isNarrow, setIsNarrow] = useState(false);
  const [wavePhase, setWavePhase] = useState<WavePhase>('idle');
  const [serverCountdown, setServerCountdown] = useState(0);
  const [waveStartError, setWaveStartError] = useState<string | null>(null);
  const levelCompleteNotified = useRef(false);
  const countdownTimerRef = useRef<number | null>(null);

  useEffect(() => {
    engine.start();
    const unsubscribe = engine.subscribe((state) => {
      setGameState(state);
    });
    return () => {
      unsubscribe();
      engine.stop();
    };
  }, [engine]);

  useEffect(() => {
    if (gameState.isLevelComplete && !levelCompleteNotified.current) {
      levelCompleteNotified.current = true;
      setWavePhase('complete');
      onLevelComplete();
    }
  }, [gameState.isLevelComplete, onLevelComplete]);

  useEffect(() => {
    const handleResize = () => {
      const maxW = Math.min(window.innerWidth - 40, 1200);
      const aspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
      let newScale = maxW / CANVAS_WIDTH;
      const displayWidth = CANVAS_WIDTH * newScale;
      const displayHeight = displayWidth / aspectRatio;

      if (displayHeight > window.innerHeight - 200) {
        newScale = (window.innerHeight - 200) / CANVAS_HEIGHT;
      }

      newScale = Math.max(newScale, 640 / CANVAS_WIDTH);
      setScale(newScale);
      setIsNarrow(window.innerWidth < 800);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    render(ctx);
  }, [gameState, scale, dragState, hoverTowerType]);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  const startServerCountdown = useCallback((duration: number) => {
    setServerCountdown(duration);
    setWavePhase('preparing');
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    const startTime = Date.now();
    countdownTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      setServerCountdown(remaining);
      if (remaining <= 0) {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        setWavePhase('idle');
      }
    }, 100);
  }, []);

  const render = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, CANVAS_WIDTH * scale, CANVAS_HEIGHT * scale);
    ctx.save();
    ctx.scale(scale, scale);

    ctx.fillStyle = '#2d2d3e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    drawSidePanels(ctx);
    drawSideDecorations(ctx);

    ctx.save();
    ctx.translate(GRID_OFFSET_X, GRID_OFFSET_Y);

    drawGameBackground(ctx);
    drawGrid(ctx);
    drawPath(ctx);
    drawSelectedTowerRange(ctx);

    if (dragState.isDragging && dragState.towerType) {
      drawDragPreview(ctx);
    }

    drawTowers(ctx);
    drawPlacementAnimations(ctx);
    drawEnemies(ctx);
    drawProjectiles(ctx);
    drawParticles(ctx);

    ctx.restore();

    drawCountdownOverlay(ctx);

    ctx.restore();
  };

  const drawSidePanels = (ctx: CanvasRenderingContext2D) => {
    const grad1 = ctx.createLinearGradient(0, 0, GRID_OFFSET_X, 0);
    grad1.addColorStop(0, '#1a1a2e');
    grad1.addColorStop(1, '#252540');
    ctx.fillStyle = grad1;
    ctx.fillRect(0, 0, GRID_OFFSET_X, CANVAS_HEIGHT);

    const grad2 = ctx.createLinearGradient(GRID_OFFSET_X + GAME_WIDTH, 0, CANVAS_WIDTH, 0);
    grad2.addColorStop(0, '#252540');
    grad2.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = grad2;
    ctx.fillRect(GRID_OFFSET_X + GAME_WIDTH, 0, GRID_OFFSET_X, CANVAS_HEIGHT);
  };

  const drawSideDecorations = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = 'rgba(212, 175, 55, 0.15)';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';

    ctx.save();
    ctx.translate(60, CANVAS_HEIGHT / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('← 入口', 0, 0);
    ctx.restore();

    ctx.save();
    ctx.translate(CANVAS_WIDTH - 60, CANVAS_HEIGHT / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillText('出口 →', 0, 0);
    ctx.restore();

    for (let i = 0; i < 3; i++) {
      const y = 80 + i * 160;
      ctx.fillStyle = 'rgba(212, 175, 55, 0.08)';
      ctx.fillRect(30, y, 60, 4);
      ctx.fillRect(CANVAS_WIDTH - 90, y, 60, 4);
    }
  };

  const drawGameBackground = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#2d2d3e';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  };

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.2)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= GRID_COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL_SIZE, 0);
      ctx.lineTo(x * CELL_SIZE, GAME_HEIGHT);
      ctx.stroke();
    }

    for (let y = 0; y <= GRID_ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL_SIZE);
      ctx.lineTo(GAME_WIDTH, y * CELL_SIZE);
      ctx.stroke();
    }
  };

  const drawPath = (ctx: CanvasRenderingContext2D) => {
    for (let y = 2; y <= 4; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        ctx.fillStyle = '#4a4a5e';
        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }

    const midY = 3 * CELL_SIZE + CELL_SIZE / 2;
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(GAME_WIDTH, midY);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const drawTowers = (ctx: CanvasRenderingContext2D) => {
    const placingIds = new Set(gameState.placingTowerIds);

    for (const tower of gameState.towers) {
      if (placingIds.has(tower.id)) continue;

      const cx = tower.gridX * CELL_SIZE + CELL_SIZE / 2;
      const cy = tower.gridY * CELL_SIZE + CELL_SIZE / 2;
      const size = 28;

      ctx.save();
      ctx.shadowColor = tower.color;
      ctx.shadowBlur = 4;
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = tower.color;
      ctx.beginPath();
      ctx.arc(cx, cy, size + 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = tower.color;
      ctx.beginPath();
      ctx.arc(cx, cy, size, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath();
      ctx.arc(cx, cy, size - 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = tower.color;
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const symbols: Record<TowerType, string> = {
        archer: '箭',
        mage: '魔',
        cannon: '炮',
        ice: '冰',
      };
      ctx.fillText(symbols[tower.type], cx, cy);

      ctx.fillStyle = '#d4af37';
      ctx.font = 'bold 12px Arial';
      ctx.textBaseline = 'top';
      const levelStars = '★'.repeat(tower.level);
      ctx.fillText(levelStars, cx, cy + size + 2);

      if (gameState.selectedTowerId === tower.id) {
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(cx, cy, size + 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (tower.targetId) {
        const target = gameState.enemies.find((e) => e.id === tower.targetId);
        if (target) {
          ctx.strokeStyle = tower.color;
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = 0.3;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }
  };

  const drawSelectedTowerRange = (ctx: CanvasRenderingContext2D) => {
    if (!gameState.selectedTowerId) return;
    const tower = gameState.towers.find((t) => t.id === gameState.selectedTowerId);
    if (!tower) return;
    if (gameState.placingTowerIds.includes(tower.id)) return;

    const cx = tower.gridX * CELL_SIZE + CELL_SIZE / 2;
    const cy = tower.gridY * CELL_SIZE + CELL_SIZE / 2;

    ctx.save();
    ctx.strokeStyle = tower.color;
    ctx.fillStyle = tower.color;
    ctx.globalAlpha = 0.08;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, tower.range, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.4;
    ctx.stroke();
    ctx.restore();
  };

  const drawPlacementAnimations = (ctx: CanvasRenderingContext2D) => {
    for (const anim of gameState.placementAnimations) {
      const progress = Math.min(anim.progress, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const x = anim.fromX + (anim.toX - anim.fromX) * easeProgress;
      const y = anim.fromY + (anim.toY - anim.fromY) * easeProgress;
      const alpha = 1 - progress * 0.3;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = anim.color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = anim.color;
      ctx.beginPath();
      ctx.arc(x, y, 24, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1a1a2e';
      ctx.globalAlpha = alpha * 0.8;
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = anim.color;
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const symbols: Record<TowerType, string> = {
        archer: '箭',
        mage: '魔',
        cannon: '炮',
        ice: '冰',
      };
      ctx.fillText(symbols[anim.towerType], x, y);
      ctx.restore();
    }
  };

  const drawEnemies = (ctx: CanvasRenderingContext2D) => {
    for (const enemy of gameState.enemies) {
      if (!enemy.alive) continue;

      ctx.save();
      ctx.shadowColor = enemy.color;
      ctx.shadowBlur = 4;
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (enemy.slowTimer > 0) {
        ctx.strokeStyle = '#1abc9c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.size + 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      const barWidth = enemy.size * 2;
      const barHeight = 4;
      const barX = enemy.x - barWidth / 2;
      const barY = enemy.y - enemy.size - 8;

      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      const hpPercent = enemy.hp / enemy.maxHp;
      const hpColor = hpPercent > 0.5 ? '#27ae60' : hpPercent > 0.25 ? '#f39c12' : '#e74c3c';
      ctx.fillStyle = hpColor;
      ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);

      if (enemy.type === 'pharaoh') {
        ctx.fillStyle = '#f39c12';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('BOSS', enemy.x, enemy.y + enemy.size + 12);
      }
    }
  };

  const drawProjectiles = (ctx: CanvasRenderingContext2D) => {
    for (const proj of gameState.projectiles) {
      ctx.save();
      ctx.shadowColor = proj.color;
      ctx.shadowBlur = 6;
      ctx.fillStyle = proj.color;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  const drawParticles = (ctx: CanvasRenderingContext2D) => {
    for (const particle of gameState.particles) {
      const alpha = particle.life / particle.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 3;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * (0.3 + 0.7 * alpha), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  const drawDragPreview = (ctx: CanvasRenderingContext2D) => {
    if (!dragState.towerType) return;

    for (let gx = 0; gx < GRID_COLS; gx++) {
      for (let gy = 0; gy < GRID_ROWS; gy++) {
        if (isPathCell(gx, gy)) continue;
        if (gameState.towers.some((t) => t.gridX === gx && t.gridY === gy)) continue;

        ctx.fillStyle = 'rgba(212, 175, 55, 0.12)';
        ctx.fillRect(gx * CELL_SIZE + 2, gy * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      }
    }
  };

  const drawCountdownOverlay = (ctx: CanvasRenderingContext2D) => {
    if (wavePhase === 'preparing' && serverCountdown > 0) {
      const seconds = Math.ceil(serverCountdown / 1000);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(GRID_OFFSET_X, 0, GAME_WIDTH, 30);
      ctx.fillStyle = '#ecf0f1';
      ctx.font = '18px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`下一波倒计时：${seconds}秒`, GRID_OFFSET_X + GAME_WIDTH / 2, 15);
    }
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale - GRID_OFFSET_X,
      y: (e.clientY - rect.top) / scale - GRID_OFFSET_Y,
    };
  };

  const getGridCell = (canvasX: number, canvasY: number) => {
    return {
      gridX: Math.floor(canvasX / CELL_SIZE),
      gridY: Math.floor(canvasY / CELL_SIZE),
    };
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragState.isDragging) return;

    const { x, y } = getCanvasCoords(e);
    const { gridX, gridY } = getGridCell(x, y);

    if (gridX < 0 || gridX >= GRID_COLS || gridY < 0 || gridY >= GRID_ROWS) {
      engine.selectTower(null);
      return;
    }

    const clickedTower = gameState.towers.find(
      (t) => t.gridX === gridX && t.gridY === gridY
    );

    if (clickedTower) {
      if (gameState.selectedTowerId === clickedTower.id) {
        if (clickedTower.level < 3) {
          const cost = getUpgradeCost(clickedTower.type, clickedTower.level);
          if (gameState.gold >= cost) {
            engine.upgradeTowerById(clickedTower.id);
          }
        }
      } else {
        engine.selectTower(clickedTower.id);
      }
    } else {
      engine.selectTower(null);
    }
  };

  const handleTowerCardMouseDown = (e: React.MouseEvent<HTMLDivElement>, type: TowerType) => {
    const config = getTowerConfig(type);
    if (gameState.gold < config.cost) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cardRect = e.currentTarget.getBoundingClientRect();

    setDragState({
      isDragging: true,
      towerType: type,
      startX: (cardRect.left + cardRect.width / 2 - rect.left) / scale - GRID_OFFSET_X,
      startY: (cardRect.top + cardRect.height / 2 - rect.top) / scale - GRID_OFFSET_Y,
    });
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragState.isDragging || !dragState.towerType) {
      setDragState({ isDragging: false, towerType: null, startX: 0, startY: 0 });
      return;
    }

    const { x, y } = getCanvasCoords(e);
    const { gridX, gridY } = getGridCell(x, y);

    engine.placeTower(dragState.towerType, gridX, gridY, dragState.startX, dragState.startY);

    setDragState({ isDragging: false, towerType: null, startX: 0, startY: 0 });
  };

  const handleMouseLeave = () => {
    setDragState({ isDragging: false, towerType: null, startX: 0, startY: 0 });
  };

  const startNextWave = useCallback(async () => {
    if (gameState.isWaveActive) return;
    if (wavePhase === 'preparing' && serverCountdown > 0) return;
    if (wavePhase === 'complete') return;

    setWaveStartError(null);

    try {
      const res = await fetch(`/api/levels/${levelInfo.id}/waves`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.waveState === 'preparing' && data.countdown > 0) {
          startServerCountdown(data.countdown);
          return;
        }
        setWaveStartError(data.error || '无法开始下一波');
        return;
      }

      if (data.waveState === 'preparing') {
        startServerCountdown(data.countdown);
        return;
      }

      if (data.waveState === 'wave_active') {
        setWavePhase('wave_active');
        engine.startWave(data.wave);
      }
    } catch {
      setWaveStartError('连接服务器失败');
    }
  }, [engine, levelInfo.id, wavePhase, serverCountdown, gameState.isWaveActive, startServerCountdown]);

  const skipCountdown = useCallback(async () => {
    try {
      const res = await fetch(`/api/levels/${levelInfo.id}/waves/skip`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.waveState === 'wave_active') {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        setServerCountdown(0);
        setWavePhase('wave_active');
        engine.startWave(data.wave);
      }
    } catch {
      setWaveStartError('跳过倒计时失败');
    }
  }, [engine, levelInfo.id]);

  const handleWaveComplete = useCallback(async () => {
    try {
      await fetch(`/api/levels/${levelInfo.id}/waves/complete`, {
        method: 'POST',
      });
    } catch {}
  }, [levelInfo.id]);

  useEffect(() => {
    if (wavePhase === 'wave_active' && !gameState.isWaveActive && !gameState.isLevelComplete && !gameState.isGameOver) {
      setWavePhase('cooldown');
      handleWaveComplete();
    }
  }, [gameState.isWaveActive, gameState.isLevelComplete, gameState.isGameOver, wavePhase, handleWaveComplete]);

  const selectedTower = gameState.selectedTowerId
    ? gameState.towers.find((t) => t.id === gameState.selectedTowerId)
    : null;

  const canStartWave = !gameState.isWaveActive && wavePhase !== 'preparing' && gameState.waveIndex < gameState.totalWaves && !gameState.isGameOver && !gameState.isLevelComplete;

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1a1a2e',
        padding: '12px',
        gap: '8px',
        overflow: 'auto',
      }}
    >
      <div
        style={{
          width: CANVAS_WIDTH * scale,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={onBack}
            style={{
              padding: '6px 14px',
              borderRadius: '16px',
              border: 'none',
              backgroundColor: '#3e3e5e',
              color: '#ecf0f1',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ← 返回
          </button>
          <span style={{ color: '#d4af37', fontSize: '18px', fontWeight: 'bold' }}>
            {levelInfo.name}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <span style={{ color: '#f1c40f', fontSize: '18px', fontWeight: 'bold' }}>
            💰 {gameState.gold}
          </span>
          <span style={{ color: '#e74c3c', fontSize: '18px', fontWeight: 'bold' }}>
            ❤ {gameState.lives}
          </span>
          <span style={{ color: '#ecf0f1', fontSize: '18px', fontWeight: 'bold' }}>
            波次 {gameState.waveIndex}/{gameState.totalWaves}
          </span>
          <span style={{ color: '#3498db', fontSize: '18px', fontWeight: 'bold' }}>
            得分 {gameState.score}
          </span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH * scale}
        height={CANVAS_HEIGHT * scale}
        onClick={handleCanvasClick}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          cursor: dragState.isDragging ? 'crosshair' : 'pointer',
        }}
      />

      {selectedTower && (
        <div
          style={{
            padding: '10px 16px',
            backgroundColor: '#2d2d3e',
            borderRadius: '8px',
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            color: '#ecf0f1',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ color: selectedTower.color, fontWeight: 'bold' }}>
            {getTowerConfig(selectedTower.type).name} Lv.{selectedTower.level}
          </span>
          <span>攻击: {selectedTower.damage}</span>
          <span>射程: {selectedTower.range}</span>
          <span>间隔: {(selectedTower.attackInterval / 1000).toFixed(2)}s</span>
          {selectedTower.level < 3 ? (
            <button
              onClick={() => engine.upgradeTowerById(selectedTower.id)}
              disabled={gameState.gold < getUpgradeCost(selectedTower.type, selectedTower.level)}
              style={{
                padding: '6px 14px',
                borderRadius: '16px',
                border: 'none',
                backgroundColor:
                  gameState.gold >= getUpgradeCost(selectedTower.type, selectedTower.level)
                    ? '#d4af37'
                    : '#555',
                color: '#1a1a2e',
                cursor:
                  gameState.gold >= getUpgradeCost(selectedTower.type, selectedTower.level)
                    ? 'pointer'
                    : 'not-allowed',
                fontWeight: 'bold',
              }}
            >
              升级 Lv.{selectedTower.level + 1} ({getUpgradeCost(selectedTower.type, selectedTower.level)}💰)
            </button>
          ) : (
            <span style={{ color: '#d4af37' }}>已满级 ★★★</span>
          )}
          <button
            onClick={() => engine.selectTower(null)}
            style={{
              padding: '4px 10px',
              borderRadius: '12px',
              border: '1px solid #555',
              backgroundColor: 'transparent',
              color: '#aaa',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            取消选择
          </button>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: isNarrow ? 'wrap' : 'nowrap',
          justifyContent: 'center',
          maxWidth: CANVAS_WIDTH * scale,
        }}
      >
        {TowerConfigs.map((config) => {
          const canAfford = gameState.gold >= config.cost;
          return (
            <div
              key={config.type}
              onMouseDown={(e) => canAfford && handleTowerCardMouseDown(e, config.type)}
              onMouseEnter={() => setHoverTowerType(config.type)}
              onMouseLeave={() => setHoverTowerType(null)}
              style={{
                width: '80px',
                height: '100px',
                borderRadius: '8px',
                backgroundColor: '#3e3e5e',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: canAfford ? 'grab' : 'not-allowed',
                opacity: canAfford ? 1 : 0.5,
                transition: 'transform 0.15s',
                transform: hoverTowerType === config.type ? 'scale(1.1)' : 'scale(1)',
                position: 'relative',
                userSelect: 'none',
                border: `2px solid ${config.color}40`,
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: config.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 0 8px ${config.color}99`,
                  marginBottom: '4px',
                }}
              >
                <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '16px' }}>
                  {config.type === 'archer' ? '箭' : config.type === 'mage' ? '魔' : config.type === 'cannon' ? '炮' : '冰'}
                </span>
              </div>
              <span style={{ color: '#ecf0f1', fontSize: '12px' }}>{config.name}</span>
              <span style={{ color: '#f1c40f', fontSize: '12px', fontWeight: 'bold' }}>
                💰{config.cost}
              </span>

              {hoverTowerType === config.type && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '110px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#1a1a2e',
                    border: `1px solid ${config.color}`,
                    borderRadius: '6px',
                    padding: '8px 12px',
                    minWidth: '160px',
                    zIndex: 100,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
                  }}
                >
                  <div style={{ color: config.color, fontWeight: 'bold', marginBottom: '4px' }}>
                    {config.name}
                  </div>
                  <div style={{ color: '#ecf0f1', fontSize: '12px', lineHeight: '1.6' }}>
                    <div>攻击力: {config.baseDamage}</div>
                    <div>射程: {config.baseRange}</div>
                    <div>攻击间隔: {(config.baseAttackInterval / 1000).toFixed(2)}s</div>
                    <div style={{ marginTop: '4px', color: '#bdc3c7' }}>{config.description}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {wavePhase === 'preparing' && serverCountdown > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: '#ecf0f1', fontSize: '14px' }}>
              准备中 {Math.ceil(serverCountdown / 1000)}s
            </span>
            <button
              onClick={skipCountdown}
              style={{
                width: '120px',
                height: '40px',
                borderRadius: '20px',
                border: 'none',
                backgroundColor: '#27ae60',
                color: '#fff',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              跳过倒计时
            </button>
          </div>
        ) : (
          <button
            onClick={startNextWave}
            disabled={!canStartWave}
            style={{
              width: '120px',
              height: '40px',
              borderRadius: '20px',
              border: 'none',
              backgroundColor: !canStartWave ? '#555' : '#e74c3c',
              color: '#fff',
              fontWeight: 'bold',
              cursor: !canStartWave ? 'not-allowed' : 'pointer',
              fontSize: '14px',
            }}
          >
            {gameState.isWaveActive
              ? '战斗中...'
              : gameState.waveIndex >= gameState.totalWaves
              ? '已完成'
              : '开始下一波'}
          </button>
        )}
      </div>

      {waveStartError && (
        <div style={{ color: '#e74c3c', fontSize: '14px' }}>{waveStartError}</div>
      )}

      {gameState.isGameOver && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <h1 style={{ color: '#e74c3c', fontSize: '48px', marginBottom: '16px' }}>游戏结束</h1>
          <p style={{ color: '#ecf0f1', fontSize: '24px', marginBottom: '24px' }}>
            最终得分：{gameState.score}
          </p>
          <button
            onClick={onBack}
            style={{
              padding: '12px 32px',
              borderRadius: '24px',
              border: 'none',
              backgroundColor: '#d4af37',
              color: '#1a1a2e',
              fontWeight: 'bold',
              fontSize: '18px',
              cursor: 'pointer',
            }}
          >
            返回主菜单
          </button>
        </div>
      )}

      {gameState.isLevelComplete && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <h1 style={{ color: '#d4af37', fontSize: '48px', marginBottom: '16px' }}>
            🏆 关卡通过！
          </h1>
          <p style={{ color: '#ecf0f1', fontSize: '24px', marginBottom: '24px' }}>
            最终得分：{gameState.score}
          </p>
          <button
            onClick={onBack}
            style={{
              padding: '12px 32px',
              borderRadius: '24px',
              border: 'none',
              backgroundColor: '#d4af37',
              color: '#1a1a2e',
              fontWeight: 'bold',
              fontSize: '18px',
              cursor: 'pointer',
            }}
          >
            返回主菜单
          </button>
        </div>
      )}
    </div>
  );
}
