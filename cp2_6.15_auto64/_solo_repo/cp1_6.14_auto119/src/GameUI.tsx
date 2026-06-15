import { useEffect, useState } from 'react';
import { EventBus } from './EventBus';
import styles from './GameUI.module.css';

interface GameUIProps {
  eventBus: EventBus;
  onStart: () => void;
  onRestart: () => void;
  onExit: () => void;
  gamePhase: 'start' | 'playing' | 'end';
}

export function GameUI({ eventBus, onStart, onRestart, onExit, gamePhase }: GameUIProps) {
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [finalTime, setFinalTime] = useState(0);

  useEffect(() => {
    const unsubScore = eventBus.on('scoreUpdate', (data) => {
      setScore(data.score);
    });

    const unsubTime = eventBus.on('timeUpdate', (data) => {
      setTime(data.time);
    });

    const unsubEnd = eventBus.on('gameEnd', (data) => {
      setFinalScore(data.score);
      setFinalTime(data.time);
    });

    return () => {
      unsubScore();
      unsubTime();
      unsubEnd();
    };
  }, [eventBus]);

  return (
    <>
      {gamePhase === 'start' && (
        <div className={styles['start-screen']}>
          <h1 className={styles['game-title']}>节奏跳跃闯关</h1>
          <button className={`${styles.btn} ${styles['btn-primary']}`} onClick={onStart}>
            开始游戏
          </button>
        </div>
      )}

      {gamePhase === 'playing' && (
        <div className={styles.hud}>
          <div className={styles.score}>得分: {score}</div>
          <div className={styles.time}>时间: {time}s</div>
        </div>
      )}

      {gamePhase === 'end' && (
        <div className={styles['end-screen']}>
          <div className={styles['final-score']}>{finalScore}</div>
          <div className={styles['final-time']}>游戏时长: {finalTime} 秒</div>
          <div className={styles['btn-group']}>
            <button className={`${styles.btn} ${styles['btn-primary']}`} onClick={onRestart}>
              再玩一次
            </button>
            <button className={`${styles.btn} ${styles['btn-secondary']}`} onClick={onExit}>
              退出游戏
            </button>
          </div>
        </div>
      )}
    </>
  );
}
