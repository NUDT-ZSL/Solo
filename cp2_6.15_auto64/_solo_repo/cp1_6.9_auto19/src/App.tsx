import React, { useState, useEffect, useRef, useCallback } from 'react';
import Game, { LevelConfig } from './Game';
import UI from './UI';
import { audioManager } from './AudioManager';

const LEVEL_CONFIGS: LevelConfig[] = [
  { level: 1, runeCount: 12, gridSize: 8 },
  { level: 2, runeCount: 14, gridSize: 8 },
  { level: 3, runeCount: 16, gridSize: 9 },
  { level: 4, runeCount: 18, gridSize: 9 },
  { level: 5, runeCount: 20, gridSize: 10 }
];

const TOTAL_LEVELS = LEVEL_CONFIGS.length;

const App: React.FC = () => {
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [resetCounter, setResetCounter] = useState(0);
  const [connectedCount, setConnectedCount] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [totalStars, setTotalStars] = useState(0);
  const [levelStars, setLevelStars] = useState<number[]>(Array(TOTAL_LEVELS).fill(0));
  const [gameOver, setGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalStars, setFinalStars] = useState(0);

  const [timeElapsed, setTimeElapsed] = useState(0);
  const timerActiveRef = useRef(false);
  const timerStartRef = useRef(0);
  const totalTimeRef = useRef(0);

  const levelConfig = LEVEL_CONFIGS[currentLevelIdx];

  const startTimer = useCallback(() => {
    if (timerActiveRef.current) return;
    timerActiveRef.current = true;
    timerStartRef.current = performance.now();
  }, []);

  useEffect(() => {
    let rafId = 0;
    const tick = () => {
      if (timerActiveRef.current) {
        const elapsed = (performance.now() - timerStartRef.current) / 1000;
        setTimeElapsed(prev => {
          const t = prev + elapsed - (prev % 1 > 0.016 ? 0 : elapsed);
          return Math.round(elapsed + (currentLevelIdx === 0 && prev === 0 ? 0 : Math.floor(prev)));
        });
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [currentLevelIdx]);

  useEffect(() => {
    let last = 0;
    const iv = setInterval(() => {
      if (timerActiveRef.current) {
        const now = performance.now();
        if (last > 0) {
          totalTimeRef.current += (now - last) / 1000;
          setTimeElapsed(Math.floor(totalTimeRef.current));
        }
        last = now;
      } else {
        last = 0;
      }
    }, 200);
    return () => clearInterval(iv);
  }, []);

  const stopTimer = useCallback(() => {
    timerActiveRef.current = false;
  }, []);

  const handleConnection = useCallback((count: number, total: number, streak: number) => {
    setConnectedCount(count);
    setCurrentStreak(streak);
  }, []);

  const handleRuneClicked = useCallback(() => {
    startTimer();
  }, [startTimer]);

  const handleResetRequest = useCallback(() => {
    const newVal = resetCounter + 1;
    return newVal;
  }, [resetCounter]);

  const handleReset = useCallback(() => {
    setResetCounter(c => c + 1);
    setConnectedCount(0);
    setCurrentStreak(0);
    setTimeElapsed(0);
    totalTimeRef.current = 0;
    timerActiveRef.current = false;
  }, []);

  const handleLevelComplete = useCallback((timeUsed: number, stars: number) => {
    stopTimer();
    setLevelStars(prev => {
      const next = [...prev];
      next[currentLevelIdx] = Math.max(next[currentLevelIdx], stars);
      return next;
    });
    setTotalStars(prev => prev + stars);

    setTimeout(() => {
      if (currentLevelIdx + 1 >= TOTAL_LEVELS) {
        const totalStarsNum = levelStars.reduce((a, b) => a + Math.max(b, stars), 0) + stars;
        const score = Math.round(
          totalStarsNum * 100 + Math.max(0, 3000 - Math.floor(totalTimeRef.current) * 10)
        );
        setFinalStars(Math.min(5, totalStarsNum));
        setFinalScore(score);
        setGameOver(true);
        audioManager.playSuccess();
      } else {
        setCurrentLevelIdx(prev => prev + 1);
        setResetCounter(c => c + 1);
        setConnectedCount(0);
        setCurrentStreak(0);
        setTimeElapsed(0);
        totalTimeRef.current = 0;
        timerActiveRef.current = false;
      }
    }, 500);
  }, [currentLevelIdx, levelStars, stopTimer]);

  const handleRestart = useCallback(() => {
    setCurrentLevelIdx(0);
    setResetCounter(c => c + 1);
    setConnectedCount(0);
    setCurrentStreak(0);
    setTotalStars(0);
    setLevelStars(Array(TOTAL_LEVELS).fill(0));
    setGameOver(false);
    setFinalScore(0);
    setFinalStars(0);
    setTimeElapsed(0);
    totalTimeRef.current = 0;
    timerActiveRef.current = false;
  }, []);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #0A0A2E 0%, #1A1A4E 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <UI
        currentLevel={currentLevelIdx + 1}
        totalLevels={TOTAL_LEVELS}
        timeElapsed={timeElapsed}
        totalStars={totalStars}
        connectedCount={connectedCount}
        totalRunes={levelConfig.runeCount}
        streak={currentStreak}
        onReset={handleReset}
        gameOver={gameOver}
        finalScore={finalScore}
        finalStars={finalStars}
        levelStars={levelStars}
        onRestart={handleRestart}
      />

      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 64,
          paddingBottom: 70,
          paddingLeft: 0,
          paddingRight: 0
        }}
      >
        <div
          style={{
            width: '80%',
            height: 'calc(100vh - 134px)',
            maxWidth: 'calc(100vh - 134px)',
            minWidth: 480,
            minHeight: 480
          }}
        >
          <Game
            key={`${currentLevelIdx}-${resetCounter}`}
            levelConfig={levelConfig}
            onLevelComplete={handleLevelComplete}
            onConnection={handleConnection}
            onRuneClicked={handleRuneClicked}
            onResetRequest={handleResetRequest}
            resetCounter={resetCounter}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
