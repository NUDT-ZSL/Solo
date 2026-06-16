import React, { useEffect, useReducer, useRef, useCallback, useMemo } from 'react';
import { GameEngine } from './core/GameEngine';
import { StatusBar } from './components/StatusBar';
import { GameBoard } from './components/GameBoard';
import { HeroPanel } from './components/HeroPanel';
import { ResultModal } from './components/ResultModal';
import { GameState, Position, HeroData } from './types';

type Action =
  | { type: 'SET_STATE'; payload: Partial<GameState> }
  | { type: 'SELECT_HERO'; payload: string | null };

const initialBoard = (): (HeroData | null)[][] => {
  const board: (HeroData | null)[][] = [];
  for (let y = 0; y < 6; y++) {
    board[y] = [];
    for (let x = 0; x < 6; x++) {
      board[y][x] = null;
    }
  }
  return board;
};

const initialState: GameState = {
  gold: 5,
  round: 1,
  winStreak: 0,
  phase: 'prepare',
  heroes: [],
  enemies: [],
  boardHeroes: initialBoard(),
  selectedHeroId: null,
  resultMessage: null,
  isVictory: null,
  boardHeroCount: 0,
};

function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'SET_STATE':
      return { ...state, ...action.payload };
    case 'SELECT_HERO':
      return { ...state, selectedHeroId: action.payload };
    default:
      return state;
  }
}

const App: React.FC = () => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const engineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    const engine = new GameEngine();
    engineRef.current = engine;

    (window as unknown as { __gameEngine: GameEngine }).__gameEngine = engine;

    const handleStateUpdate = (data: unknown) => {
      dispatch({ type: 'SET_STATE', payload: data as Partial<GameState> });
    };

    engine.on('stateUpdate', handleStateUpdate);

    setTimeout(() => {
      const initState = engine.getState();
      dispatch({ type: 'SET_STATE', payload: initState as unknown as Partial<GameState> });
    }, 0);

    return () => {
      engine.off('stateUpdate', handleStateUpdate);
      engine.destroy();
      engineRef.current = null;
      delete (window as unknown as { __gameEngine?: GameEngine }).__gameEngine;
    };
  }, []);

  const heroTemplates = engineRef.current?.getHeroTemplates() ?? [
    { name: '战士', emoji: '⚔️', cost: 1, baseAtk: 8, baseHp: 60, range: 1, speed: 1 },
    { name: '弓手', emoji: '🏹', cost: 2, baseAtk: 12, baseHp: 35, range: 2, speed: 1 },
    { name: '法师', emoji: '🔮', cost: 3, baseAtk: 18, baseHp: 25, range: 2, speed: 1 },
    { name: '骑士', emoji: '🛡️', cost: 2, baseAtk: 6, baseHp: 90, range: 1, speed: 1 },
    { name: '刺客', emoji: '🗡️', cost: 3, baseAtk: 20, baseHp: 30, range: 1, speed: 1 },
  ];

  const canUpgrade = useMemo(() => {
    const engine = engineRef.current;
    if (!engine) return heroTemplates.map(() => false);
    return heroTemplates.map((_, i) => engine.canUpgradeHero(i));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroTemplates, state.heroes, state.phase, state.boardHeroCount]);

  const handleBuyHero = (index: number) => {
    engineRef.current?.buyHero(index);
  };

  const handleUpgradeHero = (index: number) => {
    engineRef.current?.upgradeHero(index);
  };

  const handleCellClick = (pos: Position) => {
    const engine = engineRef.current;
    if (!engine) return;
    if (state.phase !== 'prepare') return;

    const cellHero = state.boardHeroes[pos.y]?.[pos.x] ?? null;
    const selectedId = state.selectedHeroId;

    if (selectedId) {
      if (cellHero && cellHero.id === selectedId) {
        engine.selectHero(null);
        return;
      }
      if (cellHero && cellHero.isEnemy) {
        return;
      }
      const ok = engine.placeHero(selectedId, pos);
      if (ok) {
        engine.selectHero(null);
      }
      return;
    }

    if (cellHero && !cellHero.isEnemy) {
      engine.selectHero(cellHero.id);
    } else {
      const unplacedHero = state.heroes.find(h => !h.pos && !h.isEnemy);
      if (unplacedHero) {
        engine.placeHero(unplacedHero.id, pos);
      }
    }
  };

  const handleStartRound = () => {
    engineRef.current?.startRound();
  };

  const handleNextRound = () => {
    engineRef.current?.nextRound();
  };

  const handleRestart = () => {
    engineRef.current?.restartGame();
  };

  const canStartRound = state.phase === 'prepare' && (state.boardHeroCount ?? 0) > 0;
  const showResultModal = state.phase === 'roundEnd' || state.phase === 'gameOver';

  return (
    <div style={styles.appContainer}>
      <StatusBar
        gold={state.gold}
        round={state.round}
        boardHeroCount={state.boardHeroCount ?? 0}
        maxHeroes={6}
      />

      <div style={styles.mainContent}>
        <div style={styles.gameArea}>
          <GameBoard
            boardHeroes={state.boardHeroes}
            selectedHeroId={state.selectedHeroId}
            onCellClick={handleCellClick}
            disabled={state.phase !== 'prepare'}
          />

          <div style={styles.sideColumn}>
            <button
              style={{
                ...styles.startButton,
                opacity: canStartRound ? 1 : 0.45,
                cursor: canStartRound ? 'pointer' : 'not-allowed',
                boxShadow: canStartRound ? '0 4px 16px rgba(198, 40, 40, 0.5)' : 'none',
              }}
              onClick={handleStartRound}
              disabled={!canStartRound}
            >
              开始回合
            </button>
            <div style={styles.phaseLabel}>
              {state.phase === 'prepare' && <span style={{ color: '#4caf50' }}>准备阶段</span>}
              {state.phase === 'battle' && <span style={{ color: '#ff9800' }}>战斗中...</span>}
              {state.phase === 'roundEnd' && <span style={{ color: '#2196f3' }}>回合结束</span>}
              {state.phase === 'gameOver' && <span style={{ color: '#f44336' }}>游戏结束</span>}
            </div>
            {state.winStreak > 0 && state.phase !== 'gameOver' && (
              <div style={styles.streak}>
                🔥 连胜 {state.winStreak}
              </div>
            )}
          </div>
        </div>

        <HeroPanel
          heroTemplates={heroTemplates}
          gold={state.gold}
          canUpgrade={canUpgrade}
          onBuyHero={handleBuyHero}
          onUpgradeHero={handleUpgradeHero}
          disabled={state.phase !== 'prepare'}
        />
      </div>

      <ResultModal
        isVisible={showResultModal}
        isVictory={state.isVictory}
        message={state.resultMessage ?? ''}
        onClose={handleNextRound}
        onRestart={handleRestart}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    width: '100%',
    height: '100%',
    minHeight: '100vh',
    backgroundColor: '#0d0d0d',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'monospace',
    overflow: 'hidden',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    padding: '16px 20px',
  },
  gameArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 40,
  },
  sideColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    minWidth: 120,
  },
  startButton: {
    width: 120,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#c62828',
    color: '#ffffff',
    border: 'none',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    transition: 'all 0.2s ease',
    letterSpacing: 1,
  },
  phaseLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  streak: {
    fontSize: 14,
    color: '#ff9800',
    fontWeight: 'bold',
    padding: '4px 12px',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    border: '1px solid rgba(255, 152, 0, 0.3)',
  },
};

export default App;
