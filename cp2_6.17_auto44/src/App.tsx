import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Tower,
  TowerType,
  TideState,
  HexCoord,
  INITIAL_COINS,
  PLACE_COST,
  UPGRADE_COSTS,
  TIDE_CYCLE,
  TOWER_INFO,
  GRID_ROWS,
  GRID_COLS,
} from './types';
import { computeTideState, calculateTowerOutput, countAdjacentTowers } from './TideSystem';
import GameGrid, { buildHexCoords } from './GameGrid';

const HEX_COORDS = buildHexCoords();

let towerIdCounter = 0;

function createTower(type: TowerType, coord: HexCoord): Tower {
  return {
    id: `tower_${towerIdCounter++}`,
    type,
    level: 1,
    efficiency: 1,
    accumulatedEnergy: 0,
    position: coord,
    scaleAnim: 0,
  };
}

const TideClock: React.FC<{ tideState: TideState }> = ({ tideState }) => {
  const progress = 1 - tideState.cycleTime / TIDE_CYCLE;
  const tideNorm = (tideState.tideHeight - 0.5) / 4.0;
  const r = Math.round(79 + (2 - 79) * tideNorm);
  const g = Math.round(195 + (136 - 195) * tideNorm);
  const b = Math.round(247 + (209 - 247) * tideNorm);
  const progressColor = `rgb(${r},${g},${b})`;
  const size = 60;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#263238"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke 0.3s ease, stroke-dashoffset 0.3s ease' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#fff',
          fontSize: 12,
          fontFamily: "'Courier New', monospace",
        }}
      >
        {Math.ceil(tideState.cycleTime)}s
      </div>
    </div>
  );
};

const CurrentIndicator: React.FC<{ tideState: TideState }> = ({ tideState }) => {
  const dir = tideState.currentDirection;
  const speed = tideState.currentSpeed;
  const baseLen = 24;
  const len = baseLen * (speed / 1.0);
  const rad = (dir * Math.PI) / 180;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <svg width={40} height={40} viewBox="-20 -20 40 40">
        <line
          x1={0}
          y1={0}
          x2={Math.cos(rad) * len * 0.5}
          y2={Math.sin(rad) * len * 0.5}
          stroke="#26c6da"
          strokeWidth={2}
          strokeLinecap="round"
          style={{ transition: 'all 0.5s ease' }}
        />
        <polygon
          points={`${Math.cos(rad) * len * 0.5},${Math.sin(rad) * len * 0.5} ${Math.cos(rad - 0.4) * (len * 0.5 - 5)},${Math.sin(rad - 0.4) * (len * 0.5 - 5)} ${Math.cos(rad + 0.4) * (len * 0.5 - 5)},${Math.sin(rad + 0.4) * (len * 0.5 - 5)}`}
          fill="#26c6da"
          style={{ transition: 'all 0.5s ease' }}
        />
      </svg>
      <span style={{ color: '#26c6da', fontSize: 11, fontFamily: "'Courier New', monospace" }}>
        {speed.toFixed(1)}m/s
      </span>
    </div>
  );
};

const RightPanel: React.FC<{
  tower: Tower | null;
  tideState: TideState;
  towers: Map<string, Tower>;
  energyCoins: number;
  onUpgrade: () => void;
  onDemolish: () => void;
  onClose: () => void;
}> = ({ tower, tideState, towers, energyCoins, onUpgrade, onDemolish, onClose }) => {
  if (!tower) return null;

  const info = TOWER_INFO[tower.type];
  const adjCount = countAdjacentTowers(tower, towers);
  const output = calculateTowerOutput(tower, tideState, adjCount);
  const upgradeCost = UPGRADE_COSTS[tower.level] || null;
  const canUpgrade = upgradeCost !== null && energyCoins >= upgradeCost && tower.level < 3;
  const demolishReturn = Math.round(PLACE_COST * tower.level * 0.5);

  return (
    <div
      style={{
        width: 240,
        background: '#0f0f1a',
        padding: 16,
        borderRadius: '10px 0 0 10px',
        borderLeft: '1px solid #263238',
        fontFamily: "'Courier New', monospace",
        color: '#ccc',
        fontSize: 13,
        lineHeight: 1.8,
        position: 'relative' as const,
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute' as const,
          top: 8,
          right: 8,
          background: 'none',
          border: 'none',
          color: '#888',
          cursor: 'pointer',
          fontSize: 16,
          lineHeight: 1,
        }}
      >
        ✕
      </button>
      <div style={{ color: info.color, fontWeight: 'bold', fontSize: 15, marginBottom: 8 }}>
        {info.name}
      </div>
      <div>等级: Lv.{tower.level}</div>
      <div>效率: {(tower.efficiency * 100).toFixed(0)}%</div>
      <div>
        实时功率:{' '}
        <span style={{ color: '#4fc3f7' }}>{output.toFixed(1)}</span> 单位/秒
      </div>
      <div>累计发电: {tower.accumulatedEnergy.toFixed(1)}</div>
      {tower.type === TowerType.OSCILLATING_WATER_COLUMN && (
        <div>相邻塔: {adjCount} (+{Math.min(adjCount, 5) * 10}%)</div>
      )}
      {tower.type === TowerType.STORAGE_TOWER && (
        <div>储能: {tower.accumulatedEnergy.toFixed(0)} / 1000</div>
      )}

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {canUpgrade && (
          <button
            onClick={onUpgrade}
            style={{
              background: '#1a3a5f',
              border: '1px solid #4a4a6a',
              borderRadius: 6,
              color: '#4fc3f7',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: "'Courier New', monospace",
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.background = '#2a4a6f';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = '#1a3a5f';
            }}
          >
            升级 Lv.{tower.level + 1} (消耗 {upgradeCost})
          </button>
        )}
        {upgradeCost === null && tower.level >= 3 && (
          <div style={{ color: '#4fc3f7', fontSize: 11 }}>已达最高等级</div>
        )}
        <button
          onClick={onDemolish}
          style={{
            background: '#3a1a1a',
            border: '1px solid #6a4a4a',
            borderRadius: 6,
            color: '#ef9a9a',
            padding: '8px 12px',
            cursor: 'pointer',
            fontSize: 12,
            fontFamily: "'Courier New', monospace",
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.background = '#5a2a2a';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.background = '#3a1a1a';
          }}
        >
          拆除 (返还 {demolishReturn})
        </button>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [towers, setTowers] = useState<Map<string, Tower>>(new Map());
  const [energyCoins, setEnergyCoins] = useState(INITIAL_COINS);
  const [totalEnergy, setTotalEnergy] = useState(0);
  const [paused, setPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [tideState, setTideState] = useState<TideState>(computeTideState(0));
  const [selectedTowerId, setSelectedTowerId] = useState<string | null>(null);
  const [placementMenu, setPlacementMenu] = useState<{ coord: HexCoord; x: number; y: number } | null>(null);
  const [hoveredTowerId, setHoveredTowerId] = useState<string | null>(null);
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);

  const towersRef = useRef(towers);
  towersRef.current = towers;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const gameLoopRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    const loop = (timestamp: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
      const delta = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      if (!pausedRef.current && delta < 0.5) {
        const newElapsed = elapsedTime + delta;
        setElapsedTime(newElapsed);
        const newTide = computeTideState(newElapsed);
        setTideState(newTide);

        const currentTowers = towersRef.current;
        if (currentTowers.size > 0) {
          let frameEnergy = 0;
          const updated = new Map<string, Tower>();
          currentTowers.forEach((tower) => {
            const adjCount = countAdjacentTowers(tower, currentTowers);
            const eff = calculateTowerOutput(tower, newTide, adjCount) / 10;
            const newAccum = tower.accumulatedEnergy + eff * delta;
            const newScale = Math.min(1, tower.scaleAnim + delta * 5);
            updated.set(`${tower.position.row},${tower.position.col}`, {
              ...tower,
              efficiency: eff,
              accumulatedEnergy: newAccum,
              scaleAnim: newScale,
            });
            frameEnergy += eff * delta;
          });
          setTowers(updated);
          setTotalEnergy((prev) => prev + frameEnergy);
        }
      }

      gameLoopRef.current = requestAnimationFrame(loop);
    };

    gameLoopRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(gameLoopRef.current);
  }, [elapsedTime]);

  const handleHexClick = useCallback(
    (coord: HexCoord) => {
      setPlacementMenu(null);
      const canvas = document.querySelector('canvas');
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const menuX = (coord.pixelX / scaleX) + rect.left - rect.width / 2 + 60;
      const menuY = (coord.pixelY / (canvas.height / rect.height)) + rect.top - 50;
      setPlacementMenu({ coord, x: coord.pixelX + 20, y: coord.pixelY - 20 });
    },
    []
  );

  const handleTowerClick = useCallback((towerId: string) => {
    setPlacementMenu(null);
    setSelectedTowerId(towerId);
    setPanelOpen(true);
  }, []);

  const handleTowerHover = useCallback((towerId: string | null, mx: number, my: number) => {
    setHoveredTowerId(towerId);
    setMouseX(mx);
    setMouseY(my);
  }, []);

  const handlePlaceTower = useCallback(
    (type: TowerType) => {
      if (!placementMenu) return;
      if (energyCoins < PLACE_COST) {
        setPlacementMenu(null);
        return;
      }
      const key = `${placementMenu.coord.row},${placementMenu.coord.col}`;
      if (towers.has(key)) return;

      const newTower = createTower(type, placementMenu.coord);
      setTowers((prev) => {
        const next = new Map(prev);
        next.set(key, newTower);
        return next;
      });
      setEnergyCoins((prev) => prev - PLACE_COST);
      setPlacementMenu(null);
    },
    [placementMenu, energyCoins, towers]
  );

  const handleCloseMenu = useCallback(() => {
    setPlacementMenu(null);
  }, []);

  const handleUpgrade = useCallback(() => {
    if (!selectedTowerId) return;
    setTowers((prev) => {
      const next = new Map(prev);
      let towerKey = '';
      prev.forEach((t, k) => {
        if (t.id === selectedTowerId) towerKey = k;
      });
      if (!towerKey) return prev;
      const tower = next.get(towerKey)!;
      const cost = UPGRADE_COSTS[tower.level];
      if (cost === undefined || energyCoins < cost) return prev;
      next.set(towerKey, { ...tower, level: tower.level + 1 });
      setEnergyCoins((c) => c - cost);
      return next;
    });
  }, [selectedTowerId, energyCoins]);

  const handleDemolish = useCallback(() => {
    if (!selectedTowerId) return;
    setTowers((prev) => {
      const next = new Map(prev);
      let foundKey: string | null = null;
      let foundTower: Tower | undefined;
      prev.forEach((t, k) => {
        if (t.id === selectedTowerId) {
          foundKey = k;
          foundTower = t;
        }
      });
      if (!foundKey || !foundTower) return prev;
      const refund = Math.round(PLACE_COST * foundTower.level * 0.5);
      next.delete(foundKey);
      setEnergyCoins((c) => c + refund);
      setSelectedTowerId(null);
      return next;
    });
  }, [selectedTowerId]);

  const selectedTower = selectedTowerId
    ? Array.from(towers.values()).find((t) => t.id === selectedTowerId) || null
    : null;

  const energyBarPercent = Math.min(100, (totalEnergy / 500) * 100);

  return (
    <div
      style={{
        background: '#0f0f1a',
        minHeight: '100vh',
        color: '#fff',
        fontFamily: "'Segoe UI', sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* 顶部工具栏 */}
      <div
        style={{
          height: 60,
          background: '#1a1a2e',
          borderBottom: '1px solid #37474f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
        }}
      >
        {/* 左侧：潮汐时钟 + 洋流 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <TideClock tideState={tideState} />
          <div>
            <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>潮高</div>
            <div style={{ fontSize: 13, color: '#4fc3f7', fontFamily: "'Courier New', monospace" }}>
              {tideState.tideHeight.toFixed(1)}m
            </div>
          </div>
          <CurrentIndicator tideState={tideState} />
        </div>

        {/* 中间：能量条 + 能量币 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div
            style={{
              width: 400,
              height: 30,
              borderRadius: 15,
              background: '#1e3a5f',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                width: `${energyBarPercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #4fc3f7, #0288d1)',
                borderRadius: 15,
                transition: 'width 0.3s ease',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: 12,
                fontFamily: "'Courier New', monospace",
                color: '#fff',
                textShadow: '0 1px 3px rgba(0,0,0,0.5)',
              }}
            >
              {totalEnergy.toFixed(0)} 单位
            </div>
          </div>
          <div style={{ color: '#fbc02d', fontSize: 20, fontWeight: 'bold' }}>
            ⬡ {energyCoins}
          </div>
        </div>

        {/* 右侧：暂停按钮 */}
        <button
          onClick={() => setPaused((p) => !p)}
          style={{
            background: '#37474f',
            border: 'none',
            borderRadius: 6,
            color: '#fff',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: 16,
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.background = '#546e7a';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.background = '#37474f';
          }}
        >
          {paused ? '▶' : '⏸'}
        </button>
      </div>

      {/* 主内容区域 */}
      <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', overflow: 'auto' }}>
          <GameGrid
            towers={towers}
            tideState={tideState}
            selectedTowerId={selectedTowerId}
            onHexClick={handleHexClick}
            onTowerClick={handleTowerClick}
            onTowerHover={handleTowerHover}
            placementMenu={placementMenu}
            onPlaceTower={handlePlaceTower}
            onCloseMenu={handleCloseMenu}
            hoveredTowerId={hoveredTowerId}
            mouseX={mouseX}
            mouseY={mouseY}
          />
        </div>

        {/* 右侧面板 */}
        {window.innerWidth >= 900 && panelOpen && (
          <div style={{ position: 'sticky', top: 0, alignSelf: 'flex-start' }}>
            <RightPanel
              tower={selectedTower}
              tideState={tideState}
              towers={towers}
              energyCoins={energyCoins}
              onUpgrade={handleUpgrade}
              onDemolish={handleDemolish}
              onClose={() => {
                setSelectedTowerId(null);
                setPanelOpen(false);
              }}
            />
          </div>
        )}

        {/* 小屏幕悬浮按钮 */}
        {window.innerWidth < 900 && selectedTower && (
          <div
            onClick={() => setPanelOpen(!panelOpen)}
            style={{
              position: 'fixed',
              bottom: 20,
              right: 20,
              width: 48,
              height: 48,
              borderRadius: 24,
              background: '#1a3a5f',
              border: '1px solid #4a4a6a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 20,
              zIndex: 300,
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            }}
          >
            ⓘ
          </div>
        )}
      </div>

      {/* 底部状态栏 */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 28,
          background: '#1a1a2e',
          borderTop: '1px solid #263238',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          fontSize: 11,
          color: '#666',
          fontFamily: "'Courier New', monospace",
        }}
      >
        <span>塔数: {towers.size}/{GRID_ROWS * GRID_COLS}</span>
        <span>潮汐: {tideState.tideHeight.toFixed(1)}m</span>
        <span>洋流: {tideState.currentSpeed.toFixed(1)}m/s</span>
        <span>{paused ? '已暂停' : '运行中'}</span>
      </div>
    </div>
  );
};

export default App;
