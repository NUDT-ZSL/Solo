import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import './styles.css';
import { Plant, EnvironmentThreat, LineageNode, MutationDeltas, Genes } from './types';
import {
  createSeedPlant,
  growPlant,
  checkThreatEffects,
  generateRandomThreat,
  isThreatActive,
  crossBreed,
  buildLineageTree,
  checkAchievement,
} from './PlantEngine';
import { render, getPlantAt, computeCanvasSize } from './PlantRenderer';
import UIControls from './UIControls';

const BASE_CYCLE = 5000;
const ACHIEVEMENT_KEY = 'plant-evolution-achievements';

function loadAchievement(): boolean {
  try {
    const raw = localStorage.getItem(ACHIEVEMENT_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    return !!data?.superPlant;
  } catch {
    return false;
  }
}

function saveAchievement() {
  try {
    const data = { superPlant: true, unlockedAt: Date.now() };
    localStorage.setItem(ACHIEVEMENT_KEY, JSON.stringify(data));
  } catch {
    // noop
  }
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameAreaRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const startTimeRef = useRef<number>(performance.now());
  const cycleStartRef = useRef<number>(performance.now());
  const lastThreatSpawnRef = useRef<number>(0);
  const nextPlantIndexRef = useRef<number>(0);

  const [plants, setPlants] = useState<Plant[]>([]);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [threat, setThreat] = useState<EnvironmentThreat | null>(null);
  const [cycle, setCycle] = useState(0);
  const [cycleTimeLeft, setCycleTimeLeft] = useState(BASE_CYCLE);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedPlantIds, setSelectedPlantIds] = useState<string[]>([]);
  const [viewedPlantId, setViewedPlantId] = useState<string | null>(null);
  const [hoveredPlantId, setHoveredPlantId] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 1000, h: 700 });
  const [lineageExpanded, setLineageExpanded] = useState(false);
  const [latestMutation, setLatestMutation] = useState<MutationDeltas | null>(null);
  const [lastChildGenes, setLastChildGenes] = useState<Genes | null>(null);
  const [achievementUnlocked, setAchievementUnlocked] = useState<boolean>(false);
  const [showAchievement, setShowAchievement] = useState(false);
  const [hasCheckedAchievement, setHasCheckedAchievement] = useState(false);

  // Init first plant
  useEffect(() => {
    setPlants([createSeedPlant(280, 550)]);
    setAchievementUnlocked(loadAchievement());
    nextPlantIndexRef.current = 1;
  }, []);

  // Resize canvas
  useEffect(() => {
    const handleResize = () => {
      if (!gameAreaRef.current) return;
      const rect = gameAreaRef.current.getBoundingClientRect();
      const size = computeCanvasSize(rect.width, rect.height);
      setCanvasSize(size);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Game loop
  useEffect(() => {
    let mounted = true;

    const loop = (t: number) => {
      if (!mounted) return;
      const dtReal = t - lastTimeRef.current;
      lastTimeRef.current = t;
      const elapsed = t - startTimeRef.current;
      const dt = dtReal * speedMultiplier;

      setCurrentTime(elapsed);

      // Cycle timer
      const cycleElapsed = (t - cycleStartRef.current) * speedMultiplier;
      const left = Math.max(0, BASE_CYCLE - cycleElapsed);
      setCycleTimeLeft(left);

      if (cycleElapsed >= BASE_CYCLE) {
        cycleStartRef.current = t;
        setCycle((c) => c + 1);
      }

      // Threat management
      setThreat((prevThreat) => {
        const active = isThreatActive(prevThreat, elapsed);
        if (!active && elapsed - lastThreatSpawnRef.current > 6000) {
          if (Math.random() < 0.015) {
            const newThreat = generateRandomThreat(elapsed);
            if (newThreat) {
              lastThreatSpawnRef.current = elapsed;
              return newThreat;
            }
          }
        }
        return active;
      });

      // Update plants
      setPlants((prev) =>
        prev.map((plant) => {
          const eff = checkThreatEffects(plant, threatRef.current, dt);
          const p1 = { ...plant, health: eff.health, grayLevel: eff.grayLevel };
          return growPlant(
            p1,
            dt * eff.growthSlowdown,
            1
          );
        })
      );

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      mounted = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [speedMultiplier]);

  // Threat ref for loop closure
  const threatRef = useRef<EnvironmentThreat | null>(null);
  useEffect(() => {
    threatRef.current = threat;
  }, [threat]);

  // Achievement check
  useEffect(() => {
    if (hasCheckedAchievement || achievementUnlocked) return;
    if (plants.length < 1) return;
    if (checkAchievement(plants)) {
      setAchievementUnlocked(true);
      setShowAchievement(true);
      saveAchievement();
      setHasCheckedAchievement(true);
    }
  }, [plants, hasCheckedAchievement, achievementUnlocked]);

  // Canvas render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = canvasSize.w;
    canvas.height = canvasSize.h;
    render(ctx, canvasSize.w, canvasSize.h, plants, threat, currentTime, hoveredPlantId);
  }, [plants, canvasSize, threat, currentTime, hoveredPlantId]);

  const lineageTree: LineageNode[] = useMemo(() => buildLineageTree(plants), [plants]);

  const selectedPlants = useMemo(
    () => selectedPlantIds.map((id) => plants.find((p) => p.id === id)).filter(Boolean) as Plant[],
    [selectedPlantIds, plants]
  );
  const viewedPlant = useMemo(
    () => plants.find((p) => p.id === viewedPlantId) ?? null,
    [plants, viewedPlantId]
  );

  // Canvas mouse handling
  const getCanvasPos = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * sx,
      y: (e.clientY - rect.top) * sy,
    };
  }, []);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      const { x, y } = getCanvasPos(e);
      const hit = getPlantAt(plants, x, y, canvasSize.w, canvasSize.h);
      if (hit) {
        setViewedPlantId(hit.id);
        setSelectedPlantIds((prev) => {
          const idx = prev.indexOf(hit.id);
          if (idx >= 0) {
            return prev.filter((id) => id !== hit.id);
          }
          const next = [...prev, hit.id];
          if (next.length > 2) return [next[1], next[2]];
          return next;
        });
        setPlants((ps) =>
          ps.map((p) => ({
            ...p,
            isSelected: selectedPlantIds.includes(p.id) || p.id === hit.id
              ? !(p.id === hit.id && selectedPlantIds.includes(p.id))
              : (p.id === hit.id ? true : selectedPlantIds.includes(p.id)),
          }))
        );
      } else {
        setSelectedPlantIds([]);
        setPlants((ps) => ps.map((p) => ({ ...p, isSelected: false })));
      }
    },
    [plants, canvasSize, getCanvasPos, selectedPlantIds]
  );

  // Sync isSelected flag with selectedPlantIds
  useEffect(() => {
    setPlants((ps) =>
      ps.map((p) => ({ ...p, isSelected: selectedPlantIds.includes(p.id) }))
    );
  }, [selectedPlantIds]);

  const handleCanvasMove = useCallback(
    (e: React.MouseEvent) => {
      const { x, y } = getCanvasPos(e);
      const hit = getPlantAt(plants, x, y, canvasSize.w, canvasSize.h);
      setHoveredPlantId(hit ? hit.id : null);
      if (canvasRef.current) {
        canvasRef.current.style.cursor = hit ? 'pointer' : 'default';
      }
    },
    [plants, canvasSize, getCanvasPos]
  );

  // Hybridd
  const handleHybrid = useCallback(() => {
    if (selectedPlants.length !== 2) return;
    const [p1, p2] = selectedPlants;
    const idx = nextPlantIndexRef.current;
    nextPlantIndexRef.current += 1;
    const cols = 5;
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = 180 + col * 140;
    const y = 550 - row * 30;

    const child = crossBreed(p1, p2, cycle + 1, x, y);
    setPlants((prev) => [...prev, child]);
    setLatestMutation(child.mutationDeltas);
    setLastChildGenes({ ...child.genes });
    setSelectedPlantIds([child.id]);
    setViewedPlantId(child.id);
  }, [selectedPlants, cycle]);

  const closeAchievement = () => setShowAchievement(false);

  const cyclePct = ((BASE_CYCLE - cycleTimeLeft) / BASE_CYCLE) * 100;
  const cycleDotWarn = cycleTimeLeft < BASE_CYCLE * 0.3;

  return (
    <div className="app-container">
      <div className="game-area" ref={gameAreaRef}>
        <div className="canvas-wrap">
          <canvas
            ref={canvasRef}
            className="game-canvas"
            style={{
              width: `${canvasSize.w}px`,
              height: `${canvasSize.h}px`,
              maxWidth: '100%',
              maxHeight: '100%',
            }}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMove}
            onMouseLeave={() => setHoveredPlantId(null)}
          />
        </div>

        <div className="timer-hud">
          <span className={`cycle-dot ${cycleDotWarn ? 'warning' : ''}`} />
          <span>周期 {cycle + 1}</span>
          <span style={{ color: '#64748b', fontSize: 12 }}>
            {(cycleTimeLeft / 1000).toFixed(1)}s
          </span>
          <div
            style={{
              width: 80,
              height: 6,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${cyclePct}%`,
                height: '100%',
                background: cycleDotWarn ? '#f59e0b' : '#22c55e',
                transition: 'width 0.1s',
              }}
            />
          </div>
        </div>

        <div className="hint-hud">
          💡 点击植物选择（最多2株），然后在右侧执行杂交
        </div>

        <div className="cycle-info">
          <div>
            <span className="label">生长周期</span>
            <span className="value">#{cycle + 1}</span>
          </div>
          <div>
            <span className="label">植物总数</span>
            <span className="value">{plants.length}</span>
          </div>
          <div>
            <span className="label">最高代数</span>
            <span className="value">
              G{plants.length > 0 ? Math.max(...plants.map((p) => p.generation)) : 0}
            </span>
          </div>
          <div>
            <span className="label">成就状态</span>
            <span className="value" style={{ color: achievementUnlocked ? '#fbbf24' : '#64748b' }}>
              {achievementUnlocked ? '🏆 已达成' : '🔒 未达成'}
            </span>
          </div>
        </div>
      </div>

      <UIControls
        speedMultiplier={speedMultiplier}
        onSpeedChange={setSpeedMultiplier}
        threat={threat}
        currentTime={currentTime}
        selectedPlants={selectedPlants}
        plants={plants}
        onHybrid={handleHybrid}
        viewedPlant={viewedPlant}
        lineageTree={lineageTree}
        lineageExpanded={lineageExpanded}
        onLineageToggle={() => setLineageExpanded((v) => !v)}
        latestMutation={latestMutation}
        lastChildGenes={lastChildGenes}
      />

      {showAchievement && (
        <div className="achievement-backdrop" onClick={closeAchievement}>
          <div className="achievement-pop" onClick={(e) => e.stopPropagation()}>
            <div className="achievement-badge">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="achievement-check"
                style={{ color: 'white' }}
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="achievement-title">🏆 成就解锁</div>
            <div className="achievement-sub">
              🌿 培育出三属性超过70的超级植物！
            </div>
            <button className="achievement-close" onClick={closeAchievement}>
              太棒了！
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
