import React, { useState, useCallback, useRef, useEffect } from 'react';
import GameBoard from './GameBoard';
import CardHand from './CardHand';
import {
  GameState,
  initGameState,
  placePlant,
  processCombatFrame,
  buildSpawnQueue,
  createEnemyInstance,
  isWaveComplete,
  drawRandomHand,
  PATH,
  canPlacePlant,
  cellCenter,
} from './utils/gameLogic';
import { PLANTS, WAVES } from './utils/plants';

const App: React.FC = () => {
  const [state, setState] = useState<GameState>(initGameState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const handleCellClick = useCallback(
    (col: number, row: number) => {
      if (state.phase !== 'planning' || !state.selectedCard) return;

      const result = placePlant(state.grid, state.plants, state.selectedCard, col, row, state.gold);
      if (result.success) {
        setState(prev => ({
          ...prev,
          grid: result.grid,
          plants: result.plants,
          gold: result.gold,
          selectedCard: null,
        }));
      }
    },
    [state]
  );

  const handleCellHover = useCallback((col: number | null, row: number | null) => {
    setState(prev => ({
      ...prev,
      hoveredCell: col !== null && row !== null ? { col, row } : null,
    }));
  }, []);

  const handleSelectCard = useCallback((plantId: string | null) => {
    setState(prev => ({
      ...prev,
      selectedCard: plantId === prev.selectedCard ? null : plantId,
    }));
  }, []);

  const handleHoverCard = useCallback((plantId: string | null) => {
    setState(prev => ({
      ...prev,
      hoveredCard: plantId,
    }));
  }, []);

  const handleStartWave = useCallback(() => {
    if (state.phase !== 'planning') return;

    const waveIndex = state.wave;
    if (waveIndex >= WAVES.length) return;

    const spawnQueue = buildSpawnQueue(waveIndex);

    setState(prev => ({
      ...prev,
      phase: 'combat',
      spawnQueue,
      combatStartTime: performance.now(),
      lastTimestamp: performance.now(),
    }));
  }, [state]);

  const handleNextHand = useCallback(() => {
    setState(prev => ({
      ...prev,
      hand: drawRandomHand(4),
    }));
  }, []);

  const gameLoopRef = useRef<number>(0);

  useEffect(() => {
    if (state.phase !== 'combat') return;

    const loop = () => {
      const now = performance.now();
      const currentState = stateRef.current;

      if (currentState.phase !== 'combat') return;

      const dt = Math.min(now - currentState.lastTimestamp, 50);

      let newEnemies = [...currentState.enemies];
      let newSpawnQueue = [...currentState.spawnQueue];
      let newGold = currentState.gold;
      let newLives = currentState.lives;
      let newScore = currentState.score;
      let newGrid = currentState.grid;

      const combatElapsed = now - currentState.combatStartTime;

      while (newSpawnQueue.length > 0 && newSpawnQueue[0].spawnTime <= combatElapsed) {
        const spawn = newSpawnQueue.shift()!;
        const startPos = PATH[0];
        const enemy = createEnemyInstance(spawn.enemyId, startPos.x, startPos.y);
        if (enemy) {
          newEnemies.push(enemy);
        }
      }

      const combatResult = processCombatFrame(
        currentState.plants,
        newEnemies,
        currentState.effects,
        now,
        dt
      );

      newEnemies = combatResult.enemies;
      newGold += combatResult.goldGained;
      newLives -= combatResult.livesLost;
      newScore += combatResult.goldGained * 10;

      for (const enemy of newEnemies) {
        if (!enemy.alive && enemy.dissolving && enemy.config.season === undefined) {
          const col = Math.floor(enemy.x / 72);
          const row = Math.floor(enemy.y / 72);
        }
      }

      const waveDone = isWaveComplete(newEnemies, newSpawnQueue);

      if (newLives <= 0) {
        setState(prev => ({
          ...prev,
          enemies: newEnemies,
          effects: combatResult.effects,
          gold: newGold,
          lives: 0,
          score: newScore,
          phase: 'gameover',
          lastTimestamp: now,
        }));
        return;
      }

      if (waveDone) {
        const nextWave = currentState.wave + 1;
        if (nextWave >= WAVES.length) {
          setState(prev => ({
            ...prev,
            enemies: [],
            effects: [],
            plants: combatResult.plants,
            gold: newGold,
            lives: newLives,
            score: newScore,
            phase: 'victory',
            wave: nextWave,
            lastTimestamp: now,
          }));
        } else {
          setState(prev => ({
            ...prev,
            enemies: [],
            effects: [],
            plants: combatResult.plants,
            gold: newGold + 30,
            lives: newLives,
            score: newScore,
            phase: 'planning',
            wave: nextWave,
            turn: prev.turn + 1,
            hand: drawRandomHand(4),
            selectedCard: null,
            spawnQueue: [],
            lastTimestamp: now,
          }));
        }
        return;
      }

      setState(prev => ({
        ...prev,
        plants: combatResult.plants,
        enemies: newEnemies,
        effects: combatResult.effects,
        gold: newGold,
        lives: newLives,
        score: newScore,
        spawnQueue: newSpawnQueue,
        lastTimestamp: now,
      }));

      gameLoopRef.current = requestAnimationFrame(loop);
    };

    gameLoopRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(gameLoopRef.current);
  }, [state.phase]);

  const handleRestart = useCallback(() => {
    setState(initGameState());
  }, []);

  const waveProgress = state.phase === 'combat'
    ? `${state.enemies.filter(e => e.alive).length} 敌人存活`
    : `准备阶段`;

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a1a0a 0%, #1a2e1a 30%, #2a3e1a 60%, #3a2e1a 100%)',
        fontFamily: "'Segoe UI', 'Microsoft YaHei', sans-serif",
        color: '#e0e8d8',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(ellipse at 30% 20%, rgba(80, 160, 80, 0.05) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(200, 160, 60, 0.05) 0%, transparent 50%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          marginBottom: '12px',
          position: 'relative',
        }}
      >
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #7ecf7e, #d4a24e, #7ec8e3)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '4px',
            textShadow: 'none',
          }}
        >
          四季之森
        </h1>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '20px',
          alignItems: 'center',
          marginBottom: '12px',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '16px',
            padding: '8px 20px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.06)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <span style={{ fontSize: '14px' }}>
            🌊 第 <b style={{ color: '#7ec8e3' }}>{state.wave + 1}</b> 波
          </span>
          <span style={{ fontSize: '14px' }}>
            💰 <b style={{ color: '#ffcc00' }}>{state.gold}</b>
          </span>
          <span style={{ fontSize: '14px' }}>
            ❤️ <b style={{ color: '#ff6666' }}>{state.lives}</b>
          </span>
          <span style={{ fontSize: '14px' }}>
            ⭐ <b style={{ color: '#d4a24e' }}>{state.score}</b>
          </span>
        </div>

        <div
          style={{
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.4)',
            padding: '6px 12px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.04)',
          }}
        >
          {waveProgress}
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <GameBoard
          state={state}
          onCellClick={handleCellClick}
          onCellHover={handleCellHover}
        />

        {state.phase === 'gameover' && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(8px)',
              borderRadius: '12px',
              zIndex: 10,
            }}
          >
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>💀</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#ff6666', marginBottom: '8px' }}>
              森林沦陷
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '16px' }}>
              得分: {state.score}
            </div>
            <button
              onClick={handleRestart}
              style={{
                padding: '10px 28px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #ff6666, #cc4444)',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'transform 0.2s',
              }}
              onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.05)')}
              onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              重新开始
            </button>
          </div>
        )}

        {state.phase === 'victory' && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(8px)',
              borderRadius: '12px',
              zIndex: 10,
            }}
          >
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>🌳</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#7ecf7e', marginBottom: '8px' }}>
              森林守护成功!
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '16px' }}>
              得分: {state.score}
            </div>
            <button
              onClick={handleRestart}
              style={{
                padding: '10px 28px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #7ecf7e, #4a8f4a)',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'transform 0.2s',
              }}
              onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.05)')}
              onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              再来一局
            </button>
          </div>
        )}
      </div>

      <div style={{ marginTop: '12px', position: 'relative' }}>
        <CardHand
          hand={state.hand}
          selectedCard={state.selectedCard}
          gold={state.gold}
          onSelectCard={handleSelectCard}
          hoveredCard={state.hoveredCard}
          onHoverCard={handleHoverCard}
        />
      </div>

      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginTop: '12px',
          position: 'relative',
        }}
      >
        {state.phase === 'planning' && (
          <>
            <button
              onClick={handleStartWave}
              style={{
                padding: '10px 32px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #7ecf7e, #4a8f4a)',
                color: 'white',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(126, 207, 126, 0.3)',
                transition: 'all 0.2s',
                letterSpacing: '2px',
              }}
              onMouseOver={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 24px rgba(126, 207, 126, 0.4)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(126, 207, 126, 0.3)';
              }}
            >
              ⚔️ 开始战斗
            </button>
            <button
              onClick={handleNextHand}
              style={{
                padding: '10px 24px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'rgba(255, 255, 255, 0.06)',
                backdropFilter: 'blur(8px)',
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
              }}
            >
              🔄 换手牌
            </button>
          </>
        )}
      </div>

      <div
        style={{
          marginTop: '10px',
          fontSize: '11px',
          color: 'rgba(255, 255, 255, 0.25)',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        选择种子 → 点击空地种植 → 开始战斗 🌿🔥🍂❄️
      </div>
    </div>
  );
};

export default App;
