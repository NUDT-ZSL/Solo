import { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './gameEngine';
import { Renderer } from './renderer';
import { GameState, ModuleType, GameModule, HexCoord, MODULE_COLORS } from './types';

const MODULE_OPTIONS: Array<{ type: ModuleType; name: string; color: string }> = [
  { type: 'harvester', name: '采集器', color: MODULE_COLORS.harvester },
  { type: 'tower', name: '能量塔', color: MODULE_COLORS.tower },
  { type: 'portal', name: '传送门', color: MODULE_COLORS.portal },
  { type: 'shield', name: '护盾', color: MODULE_COLORS.shield }
];

const MODULE_TYPE_NAMES: Record<ModuleType, string> = {
  harvester: '采集器',
  tower: '能量塔',
  portal: '传送门',
  shield: '护盾'
};

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [menuCoord, setMenuCoord] = useState<HexCoord | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredModule, setHoveredModule] = useState<GameModule | null>(null);
  const [hoveredPos, setHoveredPos] = useState<{ x: number; y: number } | null>(null);
  const [upgradeCoord, setUpgradeCoord] = useState<HexCoord | null>(null);
  const [upgradePos, setUpgradePos] = useState<{ x: number; y: number } | null>(null);
  const [score, setScore] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const initGame = useCallback(() => {
    const engine = new GameEngine();
    const canvas = canvasRef.current!;
    const renderer = new Renderer(canvas, engine);

    const resize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      const hexSize = width < 768 ? 20 : 30;
      engine.setHexSize(hexSize);
      renderer.resize(width, height);
    };

    resize();
    window.addEventListener('resize', resize);

    engine.setStateChangeListener((state) => {
      setGameState({ ...state });
    });

    engine.start();
    engineRef.current = engine;
    rendererRef.current = renderer;

    const renderLoop = () => {
      const now = performance.now();
      setCurrentTime(now);
      if (rendererRef.current) {
        rendererRef.current.render(now);
      }
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };
    animationFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      engine.stop();
    };
  }, []);

  useEffect(() => {
    const cleanup = initGame();
    return cleanup;
  }, [initGame]);

  const closeMenus = useCallback(() => {
    setMenuCoord(null);
    setMenuPos(null);
    setUpgradeCoord(null);
    setUpgradePos(null);
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!engineRef.current || !rendererRef.current || !containerRef.current) return;
    if (gameState?.isGameOver) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const module = rendererRef.current.getModuleAtScreen(x, y);
    if (module) {
      setHoveredModule(null);
      setHoveredPos(null);
      setMenuCoord(null);
      setMenuPos(null);
      setUpgradeCoord(module.coord);
      setUpgradePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      return;
    }

    const coord = rendererRef.current.getCellAtScreen(x, y);
    if (coord) {
      const cell = engineRef.current.getCell(coord);
      if (cell && !cell.module && !cell.isShadow && !cell.isCore && !cell.isShieldProtected) {
        engineRef.current.selectCell(coord);
        setMenuCoord(coord);
        setMenuPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        setUpgradeCoord(null);
        setUpgradePos(null);
      } else {
        engineRef.current.selectCell(null);
        closeMenus();
      }
    } else {
      engineRef.current.selectCell(null);
      closeMenus();
    }
  }, [gameState?.isGameOver, closeMenus]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!rendererRef.current || !containerRef.current || gameState?.isGameOver) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const module = rendererRef.current.getModuleAtScreen(x, y);
    if (module) {
      setHoveredModule(module);
      setHoveredPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    } else {
      setHoveredModule(null);
      setHoveredPos(null);
    }
  }, [gameState?.isGameOver]);

  const handlePlaceModule = useCallback((type: ModuleType) => {
    if (!engineRef.current || !menuCoord) return;
    const success = engineRef.current.placeModule(menuCoord, type);
    if (success) {
      setMenuCoord(null);
      setMenuPos(null);
      engineRef.current.selectCell(null);
    }
  }, [menuCoord]);

  const handleUpgradeModule = useCallback(() => {
    if (!engineRef.current || !upgradeCoord) return;
    const success = engineRef.current.upgradeModule(upgradeCoord);
    if (success) {
      setUpgradeCoord(null);
      setUpgradePos(null);
    }
  }, [upgradeCoord]);

  const handleRestart = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.reset();
    engineRef.current.start();
    closeMenus();
    setHoveredModule(null);
    setHoveredPos(null);
    setScore(0);
  }, [closeMenus]);

  useEffect(() => {
    if (gameState?.isGameOver && engineRef.current) {
      setScore(engineRef.current.calculateScore());
    }
  }, [gameState?.isGameOver]);

  const averageInput = hoveredModule && engineRef.current
    ? engineRef.current.getAverageInput(hoveredModule, currentTime)
    : 0;
  const averageOutput = hoveredModule && engineRef.current
    ? engineRef.current.getAverageOutput(hoveredModule, currentTime)
    : 0;

  const getValueClass = (val: number): string => {
    if (val >= 5) return 'high';
    if (val >= 2) return 'mid';
    return 'low';
  };

  const upgradeModule = upgradeCoord ? engineRef.current?.getCell(upgradeCoord)?.module : null;

  return (
    <div
      className="game-container"
      ref={containerRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          engineRef.current?.selectCell(null);
          closeMenus();
        }
      }}
    >
      <canvas
        ref={canvasRef}
        className="game-canvas"
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={() => {
          setHoveredModule(null);
          setHoveredPos(null);
        }}
      />

      {gameState && (
        <div className="top-ui">
          <div className="stat-item stat-energy">
            <span className="stat-label">能量</span>
            <span>{gameState.energy}</span>
          </div>
          <div className="stat-item stat-credits">
            <span className="stat-label">额度</span>
            <span>{gameState.moduleCredits}</span>
          </div>
          <div className="stat-item stat-level">
            <span className="stat-label">等级</span>
            <span>{gameState.currentLevel}</span>
          </div>
          <div className="stat-item stat-time">
            <span className="stat-label">时间</span>
            <span>{gameState.survivalTime}s</span>
          </div>
        </div>
      )}

      {menuCoord && menuPos && gameState && (
        <div
          className="module-menu"
          style={{
            left: Math.min(menuPos.x + 10, window.innerWidth - 320),
            top: Math.min(menuPos.y + 10, window.innerHeight - 120)
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="close-btn"
            onClick={closeMenus}
          >
            ×
          </button>
          {MODULE_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              className="module-option"
              disabled={gameState.moduleCredits < 1}
              onClick={() => handlePlaceModule(opt.type)}
              title={`${opt.name}（消耗1额度）`}
            >
              <div
                className="module-icon"
                style={{
                  background: `radial-gradient(circle, ${opt.color}, ${opt.color}88)`,
                  boxShadow: `0 0 12px ${opt.color}`
                }}
              />
              <span className="module-name">{opt.name}</span>
            </button>
          ))}
        </div>
      )}

      {hoveredModule && hoveredPos && engineRef.current && (
        <div
          className="module-info-popup"
          style={{
            left: Math.min(hoveredPos.x + 20, window.innerWidth - 220),
            top: Math.min(hoveredPos.y + 20, window.innerHeight - 180)
          }}
        >
          <div className="info-title">
            {MODULE_TYPE_NAMES[hoveredModule.type]}
          </div>
          <div className="info-row">
            <span className="info-label">等级</span>
            <span className="info-value">{hoveredModule.level} / 5</span>
          </div>
          <div className="info-row">
            <span className="info-label">存储能量</span>
            <span className="info-value">{hoveredModule.storedEnergy.toFixed(1)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">传入能量</span>
            <span className={`info-value ${getValueClass(averageInput)}`}>
              {averageInput.toFixed(2)}/s
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">输出能量</span>
            <span className={`info-value ${getValueClass(averageOutput)}`}>
              {averageOutput.toFixed(2)}/s
            </span>
          </div>
          {hoveredModule.isWarning && (
            <div className="info-row" style={{ color: '#FF4444', fontWeight: 700, marginTop: 4 }}>
              ⚠ 能量循环警告
            </div>
          )}
        </div>
      )}

      {upgradeCoord && upgradePos && upgradeModule && gameState && (
        <div
          className="upgrade-panel"
          style={{
            left: Math.min(upgradePos.x + 10, window.innerWidth - 240),
            top: Math.min(upgradePos.y + 10, window.innerHeight - 200)
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="close-btn" onClick={closeMenus}>×</button>
          <div className="upgrade-title">
            <span>{MODULE_TYPE_NAMES[upgradeModule.type]}</span>
            <span className="level-badge">Lv.{upgradeModule.level}</span>
          </div>
          <div className="energy-stored">
            存储能量：{upgradeModule.storedEnergy.toFixed(1)} 单位
          </div>
          <button
            className="upgrade-btn"
            disabled={
              upgradeModule.level >= 5 ||
              gameState.energy < 3
            }
            onClick={handleUpgradeModule}
          >
            {upgradeModule.level >= 5 ? (
              '已达最高等级'
            ) : (
              <>
                <span>升级</span>
                <span style={{ opacity: 0.8 }}>（消耗 3 能量）</span>
              </>
            )}
          </button>
        </div>
      )}

      {gameState?.isGameOver && (
        <div className="game-over-overlay">
          <div className="game-over-modal">
            <div className="game-over-title">核心水晶已陨落</div>
            <div className="game-over-subtitle">天穹被暗影吞噬，但星尘仍在等待...</div>
            <div className="final-score">{score}</div>
            <div className="score-label">最终得分</div>
            <div className="score-breakdown">
              <div className="breakdown-row">
                <span>存活时间</span>
                <span className="breakdown-value">
                  {gameState.survivalTime}s × 100 = {gameState.survivalTime * 100}
                </span>
              </div>
              <div className="breakdown-row">
                <span>抵御入侵</span>
                <span className="breakdown-value">
                  {gameState.invasionsRepelled}次 × 50 = {gameState.invasionsRepelled * 50}
                </span>
              </div>
            </div>
            <button className="restart-btn" onClick={handleRestart}>
              ✦ 重新开始 ✦
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
