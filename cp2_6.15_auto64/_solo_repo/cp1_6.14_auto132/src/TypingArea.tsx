import { useEffect, useRef, useState, useCallback } from 'react';
import type { Keystroke, Stats, WpmSnapshot, ParagraphData } from './types';

interface TypingAreaProps {
  paragraph: ParagraphData;
  onStatsUpdate: (stats: Stats) => void;
  onKeystroke: (keystroke: Keystroke) => void;
  onComplete: (finalStats: Stats, keystrokes: Keystroke[]) => void;
  sessionKey: number;
}

const PARAGRAPH_POOL: string[] = [
  "The quick brown fox jumps over the lazy dog near the riverbank while the sun sets behind the distant mountains painting the sky in vibrant shades of orange and pink",
  "Programming is the art of telling another human what one wants the computer to do through carefully crafted instructions that balance efficiency with clarity and maintainability",
  "Success is not final and failure is not fatal it is the courage to continue that counts when facing the inevitable challenges that life throws our way each and every day",
  "The best way to predict the future is to invent it by taking bold risks embracing change and never losing sight of the dreams that drive us forward relentlessly",
  "In the middle of difficulty lies opportunity waiting for those brave enough to seek it out and transform obstacles into stepping stones toward greater achievements",
  "Life is what happens when you are busy making other plans so remember to cherish every moment and appreciate the small joys that make each day truly special",
  "The only way to do great work is to love what you do and if you have not found it yet keep looking because the journey itself teaches us valuable lessons",
  "Technology is best when it brings people together breaking down barriers of distance and culture to create meaningful connections across the entire global community",
  "Knowledge speaks but wisdom listens carefully observing absorbing and reflecting before responding with thoughtful insight that elevates the conversation to new heights",
  "The greatest glory in living lies not in never falling but in rising every time we fall learning from our mistakes and growing stronger with each challenge overcome",
  "Creativity is intelligence having fun as our minds explore endless possibilities turning abstract ideas into tangible innovations that shape the world around us daily",
  "Be yourself everyone else is already taken because authenticity is the foundation of true happiness and genuine human connection in this ever changing modern world",
  "The purpose of our lives is to be happy by cultivating gratitude nurturing relationships and finding meaning in both the ordinary moments and extraordinary adventures",
  "Time is the most valuable thing a person can spend so invest it wisely in experiences that enrich your soul and create memories that last a lifetime forever",
  "Quality is not an act it is a habit cultivated through consistent effort attention to detail and an unwavering commitment to excellence in everything we pursue"
];

const SMOOTH_WINDOW_MS = 5000;

export default function TypingArea({
  paragraph,
  onStatsUpdate,
  onKeystroke,
  onComplete,
  sessionKey,
}: TypingAreaProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [errorFlags, setErrorFlags] = useState<boolean[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [nowTime, setNowTime] = useState<number>(0);
  const [wpmSnapshots, setWpmSnapshots] = useState<WpmSnapshot[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  const keystrokesRef = useRef<Keystroke[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastConsecutiveErrorsRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const text = paragraph.text;
  const totalLength = text.length;

  useEffect(() => {
    setCurrentIndex(0);
    setInputHistory([]);
    setErrorFlags([]);
    setStartTime(null);
    setNowTime(0);
    setWpmSnapshots([]);
    setIsCompleted(false);
    keystrokesRef.current = [];
    lastConsecutiveErrorsRef.current = 0;

    const focusTimer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    return () => {
      clearTimeout(focusTimer);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [sessionKey, paragraph.id]);

  useEffect(() => {
    if (startTime === null || isCompleted) return;

    let running = true;
    const tick = () => {
      if (!running) return;
      setNowTime(performance.now());
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      running = false;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [startTime, isCompleted]);

  const calculateStats = useCallback(
    (
      idx: number,
      errors: boolean[],
      keystrokes: Keystroke[],
      elapsed: number,
      completed: boolean
    ): Stats => {
      let correctCount = 0;
      let errorCount = 0;
      for (let i = 0; i < idx; i++) {
        if (errors[i]) errorCount++;
        else correctCount++;
      }

      const totalTyped = idx;
      const effectiveChars = correctCount;
      const minutes = Math.max(elapsed / 60000, 0.0001);

      let rawWpm = (effectiveChars / 5) / minutes;

      if (keystrokes.length >= 2) {
        const cutoff = performance.now() - SMOOTH_WINDOW_MS;
        const recent = keystrokes.filter((k) => k.timestamp >= cutoff && !k.isError);
        if (recent.length >= 2) {
          const windowStart = recent[0].timestamp;
          const windowElapsed = performance.now() - windowStart;
          const windowMinutes = Math.max(windowElapsed / 60000, 0.0001);
          const windowWpm = (recent.length / 5) / windowMinutes;
          const alpha = 0.6;
          rawWpm = alpha * windowWpm + (1 - alpha) * rawWpm;
        }
      }

      const wpm = Math.round(rawWpm);
      const errorRate = totalTyped > 0 ? (errorCount / totalTyped) * 100 : 0;
      const accuracy = totalTyped > 0 ? (correctCount / totalTyped) * 100 : 100;

      return {
        wpm,
        errorRate: Math.round(errorRate * 10) / 10,
        accuracy: Math.round(accuracy * 10) / 10,
        elapsedTime: elapsed,
        correctChars: correctCount,
        totalChars: totalTyped,
        errors: errorCount,
        isCompleted: completed,
      };
    },
    []
  );

  useEffect(() => {
    if (startTime === null) {
      onStatsUpdate({
        wpm: 0,
        errorRate: 0,
        accuracy: 100,
        elapsedTime: 0,
        correctChars: 0,
        totalChars: 0,
        errors: 0,
        isCompleted: false,
      });
      return;
    }

    const elapsed = nowTime - startTime;
    const stats = calculateStats(
      currentIndex,
      errorFlags,
      keystrokesRef.current,
      elapsed,
      isCompleted
    );

    if (!isCompleted && elapsed > 0) {
      setWpmSnapshots((prev) => {
        const last = prev[prev.length - 1];
        if (!last || elapsed - last.time >= 300) {
          const next = [...prev, { time: elapsed, wpm: stats.wpm }];
          return next.slice(-40);
        }
        return prev;
      });
    }

    onStatsUpdate(stats);
  }, [currentIndex, errorFlags, nowTime, startTime, isCompleted, calculateStats, onStatsUpdate]);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (isCompleted) return;

      if (e.key === 'Backspace') {
        e.preventDefault();
        if (currentIndex > 0) {
          const newIndex = currentIndex - 1;
          setCurrentIndex(newIndex);
          setInputHistory((prev) => prev.slice(0, newIndex));
          setErrorFlags((prev) => prev.slice(0, newIndex));
          if (lastConsecutiveErrorsRef.current > 0) {
            lastConsecutiveErrorsRef.current = Math.max(0, lastConsecutiveErrorsRef.current - 1);
          }
        }
        return;
      }

      if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      e.preventDefault();

      const now = performance.now();

      if (startTime === null) {
        setStartTime(now);
        setNowTime(now);
      }

      const expectedChar = text[currentIndex];
      const typedChar = e.key;
      const isError = typedChar !== expectedChar;

      const ks: Keystroke = {
        timestamp: startTime === null ? now : now,
        char: typedChar,
        isError,
        index: currentIndex,
      };
      keystrokesRef.current.push(ks);
      onKeystroke(ks);

      if (isError) {
        lastConsecutiveErrorsRef.current += 1;
      } else {
        lastConsecutiveErrorsRef.current = 0;
      }

      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setInputHistory((prev) => [...prev, typedChar]);
      setErrorFlags((prev) => [...prev, isError]);

      if (newIndex >= totalLength) {
        const finalElapsed = now - (startTime ?? now);
        const finalErrors = [...errorFlags, isError];
        setIsCompleted(true);

        const finalStats = calculateStats(
          newIndex,
          finalErrors,
          keystrokesRef.current,
          finalElapsed,
          true
        );

        setTimeout(() => {
          onComplete(finalStats, keystrokesRef.current);
        }, 50);
      }
    },
    [
      currentIndex,
      errorFlags,
      isCompleted,
      onComplete,
      onKeystroke,
      startTime,
      text,
      totalLength,
      calculateStats,
    ]
  );

  const progress = totalLength > 0 ? Math.round((currentIndex / totalLength) * 100) : 0;

  const renderParagraph = () => {
    const chars: JSX.Element[] = [];
    for (let i = 0; i < totalLength; i++) {
      const ch = text[i];
      let cls = 'char';

      if (i < currentIndex) {
        cls += errorFlags[i] ? ' char-error' : ' char-correct';
      } else if (i === currentIndex) {
        cls += ' char-current';
      } else if (i === currentIndex + 1) {
        cls += ' char-pending';
      } else {
        cls += ' char-upcoming';
      }

      chars.push(
        <span key={i} className={cls}>
          {ch === ' ' ? '\u00A0' : ch}
        </span>
      );
    }
    return chars;
  };

  const miniChartWidth = 300;
  const miniChartHeight = 60;
  const renderMiniChart = () => {
    if (wpmSnapshots.length < 2) return null;

    const maxWpm = Math.max(...wpmSnapshots.map((s) => s.wpm), 60);
    const points = wpmSnapshots.map((s, i) => {
      const x = (i / (wpmSnapshots.length - 1)) * miniChartWidth;
      const y = miniChartHeight - (s.wpm / maxWpm) * (miniChartHeight - 10) - 5;
      return { x, y, wpm: s.wpm };
    });

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const areaD = `${pathD} L${miniChartWidth} ${miniChartHeight} L0 ${miniChartHeight} Z`;

    return (
      <svg
        className="speed-chart"
        viewBox={`0 0 ${miniChartWidth} ${miniChartHeight}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="speedLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#667eea" />
            <stop offset="100%" stopColor="#764ba2" />
          </linearGradient>
          <linearGradient id="speedAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#667eea" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#667eea" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} className="speed-chart-area" />
        <path d={pathD} stroke="url(#speedLineGradient)" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  const elapsedSec = startTime ? Math.max((nowTime - startTime) / 1000, 0) : 0;
  const minutes = Math.floor(elapsedSec / 60);
  const seconds = Math.floor(elapsedSec % 60);

  return (
    <div className="panel typing-area-panel" onClick={focusInput}>
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">WPM</div>
          <div className={`stat-value ${startTime ? '' : ''}`}>
            {startTime ? (
              <span>
                {(() => {
                  const s = calculateStats(
                    currentIndex,
                    errorFlags,
                    keystrokesRef.current,
                    nowTime - (startTime ?? 0),
                    isCompleted
                  );
                  return s.wpm;
                })()}
              </span>
            ) : (
              '0'
            )}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">准确率</div>
          <div className="stat-value">
            {startTime
              ? (() => {
                  let c = 0;
                  let e = 0;
                  for (let i = 0; i < currentIndex; i++) errorFlags[i] ? e++ : c++;
                  return currentIndex > 0 ? Math.round((c / currentIndex) * 1000) / 10 : 100;
                })()
              : 100}
            %
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">错误率</div>
          <div className="stat-value">
            {startTime
              ? (() => {
                  let c = 0;
                  let e = 0;
                  for (let i = 0; i < currentIndex; i++) errorFlags[i] ? e++ : c++;
                  return currentIndex > 0 ? Math.round((e / currentIndex) * 1000) / 10 : 0;
                })()
              : 0}
            %
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">用时</div>
          <div className="stat-value">
            {minutes}:{String(seconds).padStart(2, '0')}
          </div>
        </div>
      </div>

      <div className="typing-area">
        <div className="paragraph-display">{renderParagraph()}</div>
        <input
          ref={inputRef}
          type="text"
          className="hidden-input"
          onKeyDown={handleKeyDown}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          value=""
          onChange={() => {}}
        />
      </div>

      {wpmSnapshots.length >= 2 && (
        <div style={{ marginTop: '4px', marginBottom: '12px' }}>
          <div className="stat-label" style={{ marginBottom: '4px' }}>
            实时速度波动
          </div>
          {renderMiniChart()}
        </div>
      )}

      <div className="typing-footer">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="progress-text">
          {currentIndex} / {totalLength} ({progress}%)
        </div>
      </div>

      {!startTime && (
        <div className="instructions">
          <strong>提示：</strong> 点击上方区域开始打字。计时将从你按下第一个键开始，
          遇到错误时可以按 <strong>Backspace</strong> 删除重试。
        </div>
      )}

      {isCompleted && (
        <div className="completed-banner">
          <h3>🎉 本轮完成！</h3>
          <div className="completed-stats">
            <div className="completed-stat">
              <span className="completed-stat-label">最终 WPM</span>
              <span className="completed-stat-value" style={{ color: '#22c55e' }}>
                {
                  calculateStats(
                    totalLength,
                    errorFlags,
                    keystrokesRef.current,
                    (startTime ? nowTime - startTime : 0),
                    true
                  ).wpm
                }
              </span>
            </div>
            <div className="completed-stat">
              <span className="completed-stat-label">准确率</span>
              <span className="completed-stat-value" style={{ color: '#667eea' }}>
                {
                  (() => {
                    let c = 0;
                    for (let i = 0; i < totalLength; i++) if (!errorFlags[i]) c++;
                    return Math.round((c / totalLength) * 1000) / 10;
                  })()
                }
                %
              </span>
            </div>
            <div className="completed-stat">
              <span className="completed-stat-label">总用时</span>
              <span className="completed-stat-value" style={{ color: '#764ba2' }}>
                {minutes}:{String(seconds).padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>
      )}

      {typeof PARAGRAPH_POOL === 'undefined' ? null : null}
    </div>
  );
}
