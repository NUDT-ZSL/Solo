import React, { useEffect, useReducer, useRef, useCallback } from 'react';
import { GameEngine } from './core/GameEngine';
import { StatusBar } from './components/StatusBar';
import { GameBoard } from './components/GameBoard';
import { HeroPanel } from './components/HeroPanel';
import { ResultModal } from './components/ResultModal';
import { GameState, Position, HeroData } from './types';

type Action =
  | { type: 'SET_STATE'; payload: GameState }
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

    const handleStateUpdate = (data: unknown) => {
      const newState = data as GameState;
      dispatch({ type: 'SET_STATE', payload: newState });
    };

    engine.on('stateUpdate', handleStateUpdate);

    const initialStateData = engine.getState();
    dispatch({ type: 'SET_STATE', payload: initialStateData as unknown as GameState });

    return () => {
      engine.off('stateUpdate', handleStateUpdate);
      engine.destroy();
    };
  }, []);

  const handleBuyHero = useCallback((index: number) => {
    if (engineRef.current) {
      engineRef.current.buyHero(index);
    }
  }, []);

  const handleUpgradeHero = useCallback((index: number) => {
    if (engineRef.current) {
      engineRef.current.upgradeHero(index);
    }
  }, []);

  const handleCellClick = useCallback((pos: Position) => {
    if (!engineRef.current) return;
    if (state.phase !== 'prepare') return;

    const engine = engineRef.current;
    const cellHero = state.boardHeroes[pos.y][pos.x];

    if (state.selectedHeroId) {
      if (cellHero && cellHero.id === state.selectedHeroId) {
        engine.selectHero(null);
      } else {
        const success = engine.placeHero(state.selectedHeroId, pos);
        if (success) {
          engine.selectHero(null);
        }
      }
    } else {
      if (cellHero && !cellHero.isEnemy) {
        engine.selectHero(cellHero.id);
      }
    }
  }, [state.selectedHeroId, state.boardHeroes, state.phase]);

  const handleStartRound = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.startRound();
    }
  }, []);

  const handleNextRound = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.nextRound();
    }
  }, []);

  const handleRestart = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.restartGame();
    }
  }, []);

  const canUpgrade = state.heroes
    ? engineRef.current?.getHeroTemplates().map((_, i) =>
        engineRef.current?.canUpgradeHero(i) ?? false
      ) ?? []
    : [];

  const canStartRound = state.phase === 'prepare' && state.boardHeroCount > 0;
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

          <button
            style={{
              ...styles.startButton,
              opacity: canStartRound ? 1 : 0.5,
              cursor: canStartRound ? 'pointer' : 'not-allowed',
            }}
            onClick={handleStartRound}
            disabled={!canStartRound}
          >
            开始回合
          </button>
        </div>

        <HeroPanel
          heroTemplates={engineRef.current?.getHeroTemplates() ?? []}
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
    gap: 24,
    padding: 20,
  },
  gameArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 40,
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
  },
};

export default App;
