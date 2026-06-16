import React, { useReducer, useEffect, useRef, useCallback, useState } from 'react';
import { BacteriaSimulation, SimulationStats, InterventionType } from './dish/BacteriaSimulation';
import { StatsPanel } from './components/StatsPanel';
import { ControlBar } from './components/ControlBar';

interface AppState {
  stats: SimulationStats;
  antibioticCooldown: number;
  nutrientCooldown: number;
  winner: 'red' | 'blue' | null;
  showVictory: boolean;
  resetTrigger: number;
}

type Action =
  | { type: 'UPDATE_STATS'; stats: SimulationStats }
  | { type: 'TICK_COOLDOWNS'; delta: number }
  | { type: 'USE_ANTIBIOTIC' }
  | { type: 'USE_NUTRIENT' }
  | { type: 'SHOW_VICTORY'; winner: 'red' | 'blue' }
  | { type: 'HIDE_VICTORY' }
  | { type: 'RESET' };

const ANTIBIOTIC_COOLDOWN = 8;
const NUTRIENT_COOLDOWN = 5;

const initialState: AppState = {
  stats: {
    redCount: 20,
    blueCount: 20,
    nutrientCount: 0,
    elapsedSeconds: 0,
    winner: null,
  },
  antibioticCooldown: 0,
  nutrientCooldown: 0,
  winner: null,
  showVictory: false,
  resetTrigger: 0,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'UPDATE_STATS':
      return { ...state, stats: action.stats };
    case 'TICK_COOLDOWNS': {
      const newAntibioticCd = Math.max(0, state.antibioticCooldown - action.delta);
      const newNutrientCd = Math.max(0, state.nutrientCooldown - action.delta);
      return {
        ...state,
        antibioticCooldown: newAntibioticCd,
        nutrientCooldown: newNutrientCd,
      };
    }
    case 'USE_ANTIBIOTIC':
      if (state.antibioticCooldown > 0) return state;
      return { ...state, antibioticCooldown: ANTIBIOTIC_COOLDOWN };
    case 'USE_NUTRIENT':
      if (state.nutrientCooldown > 0) return state;
      return { ...state, nutrientCooldown: NUTRIENT_COOLDOWN };
    case 'SHOW_VICTORY':
      return { ...state, winner: action.winner, showVictory: true };
    case 'HIDE_VICTORY':
      return { ...state, showVictory: false };
    case 'RESET':
      return {
        ...initialState,
        resetTrigger: state.resetTrigger + 1,
      };
    default:
      return state;
  }
}

const App: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulationRef = useRef<BacteriaSimulation | null>(null);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [dragging, setDragging] = useState<InterventionType | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const victoryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const winnerNotifiedRef = useRef<boolean>(false);

  const handleStatsChange = useCallback((stats: SimulationStats) => {
    dispatch({ type: 'UPDATE_STATS', stats });

    if (stats.winner && !winnerNotifiedRef.current) {
      winnerNotifiedRef.current = true;
      dispatch({ type: 'SHOW_VICTORY', winner: stats.winner });

      if (victoryTimerRef.current) {
        clearTimeout(victoryTimerRef.current);
      }
      victoryTimerRef.current = setTimeout(() => {
        dispatch({ type: 'HIDE_VICTORY' });
      }, 3000);
    }
  }, []);

  useEffect(() => {
    const sim = new BacteriaSimulation(handleStatsChange);
    simulationRef.current = sim;
    winnerNotifiedRef.current = false;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    lastTimeRef.current = performance.now();

    const animate = (time: number) => {
      const deltaTime = Math.min((time - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = time;

      dispatch({ type: 'TICK_COOLDOWNS', delta: deltaTime });

      if (simulationRef.current) {
        simulationRef.current.step(deltaTime);
        simulationRef.current.render(ctx);
      }

      if (mousePos && dragging) {
        const radius = dragging === 'antibiotic' ? 40 : 30;
        const color = dragging === 'antibiotic'
          ? 'rgba(42, 157, 143, 0.2)'
          : 'rgba(244, 162, 97, 0.3)';
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(mousePos.x, mousePos.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [state.resetTrigger, handleStatsChange]);

  useEffect(() => {
    return () => {
      if (victoryTimerRef.current) {
        clearTimeout(victoryTimerRef.current);
      }
    };
  }, []);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>, type: InterventionType) => {
    const canUse = type === 'antibiotic'
      ? state.antibioticCooldown <= 0
      : state.nutrientCooldown <= 0;
    if (!canUse) return;

    setDragging(type);
    const coords = getCanvasCoords(e);
    setMousePos(coords);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging) return;
    const coords = getCanvasCoords(e);
    setMousePos(coords);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging || !simulationRef.current || !mousePos) {
      setDragging(null);
      setMousePos(null);
      return;
    }

    const coords = getCanvasCoords(e);
    const success = simulationRef.current.addIntervention(dragging, coords.x, coords.y);

    if (success) {
      if (dragging === 'antibiotic') {
        dispatch({ type: 'USE_ANTIBIOTIC' });
      } else {
        dispatch({ type: 'USE_NUTRIENT' });
      }
    }

    setDragging(null);
    setMousePos(null);
  };

  const handleMouseLeave = () => {
    setDragging(null);
    setMousePos(null);
  };

  const handleReset = () => {
    winnerNotifiedRef.current = false;
    if (victoryTimerRef.current) {
      clearTimeout(victoryTimerRef.current);
    }
    dispatch({ type: 'RESET' });
  };

  const antibioticReady = state.antibioticCooldown <= 0;
  const nutrientReady = state.nutrientCooldown <= 0;

  return (
    <>
      <style>{`
        @keyframes fadeInBounce {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          60% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.5); }
          50% { box-shadow: 0 0 40px rgba(255, 215, 0, 0.9); }
        }
      `}</style>

      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#1d3557',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ height: 30 }} />

        <StatsPanel
          redCount={state.stats.redCount}
          blueCount={state.stats.blueCount}
          nutrientCount={state.stats.nutrientCount}
          elapsedSeconds={state.stats.elapsedSeconds}
          winner={state.winner}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 30,
            width: '100%',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              width: 120,
              marginLeft: 20,
              fontSize: 14,
              color: '#a8dadc',
              textAlign: 'center',
              lineHeight: 1.6,
              userSelect: 'none',
              opacity: antibioticReady ? 1 : 0.4,
              transition: 'opacity 0.3s',
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>�</div>
            <div style={{ color: '#2a9d8f', fontWeight: 'bold', marginBottom: 4 }}>抗生素</div>
            <div style={{ fontSize: 13 }}>
              拖拽抗生素
              <br />
              （冷却{state.antibioticCooldown > 0 ? state.antibioticCooldown.toFixed(1) : '0'}秒）
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <canvas
              ref={canvasRef}
              width={600}
              height={600}
              style={{
                width: 600,
                height: 600,
                borderRadius: '50%',
                cursor: dragging ? 'crosshair' : 'default',
                boxShadow: '0 0 40px rgba(142, 202, 230, 0.3)',
              }}
              onMouseDown={(e) => {
                if (e.button === 0) {
                  handleMouseDown(e, 'antibiotic');
                } else if (e.button === 2) {
                  handleMouseDown(e, 'nutrient');
                }
              }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onContextMenu={(e) => e.preventDefault()}
            />

            {state.showVictory && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: 300,
                  height: 80,
                  borderRadius: 16,
                  backgroundColor: '#1d3557',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  fontWeight: 'bold',
                  animation: 'fadeInBounce 0.5s ease-out forwards',
                  zIndex: 100,
                  border: '3px solid #ffd700',
                  boxShadow: '0 0 30px rgba(255, 215, 0, 0.6)',
                  opacity: 0,
                  transform: 'translate(-50%, -50%) scale(0.5)',
                }}
              >
                {state.winner === 'red' ? '🔴 红色噬硫菌胜利！' : '🔵 蓝色噬磷菌胜利！'}
              </div>
            )}
          </div>

          <div
            style={{
              position: 'absolute',
              right: 0,
              width: 120,
              marginRight: 20,
              fontSize: 14,
              color: '#a8dadc',
              textAlign: 'center',
              lineHeight: 1.6,
              userSelect: 'none',
              opacity: nutrientReady ? 1 : 0.4,
              transition: 'opacity 0.3s',
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>�</div>
            <div style={{ color: '#f4a261', fontWeight: 'bold', marginBottom: 4 }}>营养剂</div>
            <div style={{ fontSize: 13 }}>
              拖拽营养剂
              <br />
              （冷却{state.nutrientCooldown > 0 ? state.nutrientCooldown.toFixed(1) : '0'}秒）
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <ControlBar onReset={handleReset} />

        <div style={{ height: 40 }} />

        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 12,
            color: '#a8dadc',
            opacity: 0.6,
          }}
        >
          左键拖拽投放抗生素 | 右键拖拽投放营养剂
        </div>
      </div>
    </>
  );
};

export default App;
