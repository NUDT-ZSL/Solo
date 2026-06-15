import React, { useEffect, useState } from 'react';
import { Poem } from '../data/poems';
import styles from './ResultPanel.module.css';

interface ResultPanelProps {
  poem: Poem;
  timeElapsed: number;
  accuracy: number;
  onReplay: () => void;
  onNext: () => void;
}

const formatTime = (ms: number): string => {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return min > 0 ? `${min}分${sec}秒` : `${sec}秒`;
};

const ResultPanel: React.FC<ResultPanelProps> = ({ poem, timeElapsed, accuracy, onReplay, onNext }) => {
  const [visible, setVisible] = useState(false);
  const [linesVisible, setLinesVisible] = useState(0);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timers: ReturnType<typeof setTimeout>[] = [];
    poem.lines.forEach((_, i) => {
      timers.push(setTimeout(() => setLinesVisible(i + 1), 300 + i * 200));
    });
    return () => timers.forEach(clearTimeout);
  }, [poem.lines]);

  return (
    <div className={`${styles.overlay} ${visible ? styles.overlayVisible : ''}`}>
      <div className={`${styles.panel} ${visible ? styles.panelVisible : ''}`}>
        <div className={styles.header}>
          <h2 className={styles.title}>{poem.title}</h2>
          <p className={styles.author}>
            〔{poem.dynasty}〕{poem.author}
          </p>
        </div>

        <div className={styles.poemBody}>
          {poem.lines.map((line, i) => (
            <p
              key={i}
              className={`${styles.line} ${i < linesVisible ? styles.lineVisible : ''}`}
              style={{ transitionDelay: `${i * 0.15}s` }}
            >
              {line}
            </p>
          ))}
        </div>

        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>用时</span>
            <span className={styles.statValue}>{formatTime(timeElapsed)}</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <span className={styles.statLabel}>准确率</span>
            <span className={styles.statValue}>{Math.round(accuracy * 100)}%</span>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.btnReplay} onClick={onReplay}>
            再来一局
          </button>
          <button className={styles.btnNext} onClick={onNext}>
            换首诗词
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultPanel;
