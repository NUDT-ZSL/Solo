import React, { useState, useEffect, useRef, useCallback } from 'react';
import Board from './Board';
import DicePanel from './DicePanel';
import GameOverModal from './GameOverModal';
import {
  createInitialState,
  selectDice,
  getSelectedDice,
  mergeDice,
  spawnWave,
  startCountdown,
  updateGame,
  clearDiceMergeFlags,
  calculateScore,
  getWaveCountdownNumber,
  type GameState,
} from './GameLogic';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(createInitialState());
  const [showGameOver, setShowGameOver] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const waveTimerRef = useRef<number>(0);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(res => res.json())
      .then(data => setLeaderboard(data))
      .catch(() => {});
  }, []);

  const gameLoop = useCallback((currentTime: number) => {
    if (lastTimeRef.current === 0) {
      lastTimeRef.current = currentTime;
    }
    const deltaTime = currentTime - lastTimeRef.current;
    lastTimeRef.current = currentTime;

    setGameState(prev => {
      if (prev.isGameOver) return prev;

      const updated = updateGame(prev, deltaTime, currentTime);

      if (!updated.waveInProgress && !updated.isCountingDown && updated.wave > 0 && updated.enemies.length === 0) {
        waveTimerRef.current += deltaTime;
        if (waveTimerRef.current >= 5000) {
          waveTimerRef.current = 0;
          return startCountdown(updated);
        }
      }

      return updated;
    });

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, []);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameLoop]);

  useEffect(() => {
    if (gameState.isGameOver && !showGameOver) {
      setShowGameOver(true);
      submitScore();
    }
  }, [gameState.isGameOver]);

  useEffect(() => {
    if (gameState.dice.some(d => d.isNew)) {
      const timer = setTimeout(() => {
        setGameState(prev => clearDiceMergeFlags(prev));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [gameState.dice]);

  const submitScore = async () => {
    try {
      const score = calculateScore(gameState);
      const response = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '玩家',
          score,
          wave: gameState.wave,
          merges: gameState.mergeCount,
        }),
      });
      const result = await response.json();
      if (result.success) {
        const lbResponse = await fetch('/api/leaderboard');
        const lbData = await lbResponse.json();
        setLeaderboard(lbData);
      }
    } catch (err) {
      console.error('Failed to submit score:', err);
    }
  };

  const handleDiceClick = (diceId: string) => {
    setGameState(prev => selectDice(prev, diceId));
  };

  const handleMerge = () => {
    const selected = getSelectedDice(gameState);
    if (selected.length !== 2) return;

    setGameState(prev => mergeDice(prev, selected[0].id, selected[1].id));
  };

  const handleStartWave = () => {
    if (gameState.waveInProgress || gameState.isCountingDown) return;
    waveTimerRef.current = 0;
    if (gameState.wave === 0) {
      setGameState(prev => spawnWave(prev));
    } else {
      setGameState(prev => startCountdown(prev));
    }
  };

  const handleRestart = () => {
    setGameState(createInitialState());
    setShowGameOver(false);
    waveTimerRef.current = 0;
    lastTimeRef.current = 0;
  };

  const selectedDice = getSelectedDice(gameState);
  const canMerge = selectedDice.length === 2;

  const countdownNumber = getWaveCountdownNumber(gameState);

  return (
    <div className="app-container">
      <h1 className="game-title">命运轮盘：骰子塔防</h1>
      <Board
        guards={gameState.guards}
        enemies={gameState.enemies}
        luck={gameState.luck}
        lives={gameState.lives}
        wave={gameState.wave}
        onCellClick={() => {}}
        waveInProgress={gameState.waveInProgress}
        isCountingDown={gameState.isCountingDown}
        countdownNumber={countdownNumber}
        onStartWave={handleStartWave}
      />
      <DicePanel
        dice={gameState.dice}
        onDiceClick={handleDiceClick}
        onMerge={handleMerge}
        selectedCount={selectedDice.length}
        canMerge={canMerge}
      />
      {showGameOver && (
        <GameOverModal
          score={calculateScore(gameState)}
          wave={gameState.wave}
          merges={gameState.mergeCount}
          luck={gameState.luck}
          leaderboard={leaderboard}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
};

export default App;
