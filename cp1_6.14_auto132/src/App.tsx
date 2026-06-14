import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TypingArea from './TypingArea';
import WaveVisualizer from './WaveVisualizer';
import type { HistoryRecord, Keystroke, ParagraphData, Stats } from './types';

const PARAGRAPHS: string[] = [
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

const HISTORY_KEY = 'typingwave_history_v1';

function makeRandomParagraph(): ParagraphData {
  let attempts = 0;
  while (attempts < 10) {
    const idx = Math.floor(Math.random() * PARAGRAPHS.length);
    const text = PARAGRAPHS[idx];
    const words = text.split(/\s+/).filter((w) => w.length > 0).length;
    if (words >= 50 && words <= 80) {
      return { id: idx, text, wordCount: words };
    }
    if (words >= 40) {
      return { id: idx, text, wordCount: words };
    }
    attempts++;
  }
  const idx = Math.floor(Math.random() * PARAGRAPHS.length);
  const text = PARAGRAPHS[idx];
  const words = text.split(/\s+/).filter((w) => w.length > 0).length;
  return { id: idx, text, wordCount: words };
}

function loadHistory(): HistoryRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveHistory(records: HistoryRecord[]): void {
  try {
    const trimmed = records.slice(0, 20);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch {
  }
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

function formatTime(ms: number): string {
  const total = Math.max(Math.round(ms / 1000), 0);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function getWpmColor(wpm: number): string {
  if (wpm < 40) return '#ef4444';
  if (wpm <= 60) return '#facc15';
  return '#22c55e';
}

function uuid(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export default function App() {
  const [paragraph, setParagraph] = useState<ParagraphData>(() => makeRandomParagraph());
  const [sessionKey, setSessionKey] = useState(0);
  const [currentStats, setCurrentStats] = useState<Stats>({
    wpm: 0,
    errorRate: 0,
    accuracy: 100,
    elapsedTime: 0,
    correctChars: 0,
    totalChars: 0,
    errors: 0,
    isCompleted: false,
  });
  const [keystrokes, setKeystrokes] = useState<Keystroke[]>([]);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const consecRef = useRef(0);

  const [history, setHistory] = useState<HistoryRecord[]>(() => loadHistory());
  const [showHistory, setShowHistory] = useState(false);

  const [isReplaying, setIsReplaying] = useState(false);
  const [replayKs, setReplayKs] = useState<Keystroke[]>([]);
  const [replayWpm, setReplayWpm] = useState(0);
  const [replayConsec, setReplayConsec] = useState(0);
  const replayTimerRef = useRef<number | null>(null);

  const refreshParagraph = useCallback(() => {
    stopReplay();
    let next = makeRandomParagraph();
    let tries = 0;
    while (next.id === paragraph.id && tries < 5) {
      next = makeRandomParagraph();
      tries++;
    }
    setParagraph(next);
    setKeystrokes([]);
    setConsecutiveErrors(0);
    consecRef.current = 0;
    setCurrentStats({
      wpm: 0,
      errorRate: 0,
      accuracy: 100,
      elapsedTime: 0,
      correctChars: 0,
      totalChars: 0,
      errors: 0,
      isCompleted: false,
    });
    setSessionKey((k) => k + 1);
  }, [paragraph.id]);

  const handleStatsUpdate = useCallback((stats: Stats) => {
    setCurrentStats(stats);
  }, []);

  const handleKeystroke = useCallback((ks: Keystroke) => {
    setKeystrokes((prev) => [...prev, ks]);

    if (ks.isError) {
      consecRef.current += 1;
    } else {
      consecRef.current = 0;
    }
    setConsecutiveErrors(consecRef.current);
  }, []);

  const handleComplete = useCallback(
    (finalStats: Stats, allKs: Keystroke[]) => {
      const record: HistoryRecord = {
        id: uuid(),
        timestamp: Date.now(),
        wpm: finalStats.wpm,
        accuracy: finalStats.accuracy,
        elapsedTime: finalStats.elapsedTime,
        paragraphId: paragraph.id,
        keystrokes: allKs,
      };
      setHistory((prev) => {
        const next = [record, ...prev].slice(0, 20);
        saveHistory(next);
        return next;
      });
    },
    [paragraph.id]
  );

  function stopReplay() {
    if (replayTimerRef.current !== null) {
      window.clearTimeout(replayTimerRef.current);
      replayTimerRef.current = null;
    }
    setIsReplaying(false);
    setReplayKs([]);
    setReplayWpm(0);
    setReplayConsec(0);
  }

  const startReplay = useCallback((record: HistoryRecord) => {
    stopReplay();
    if (!record.keystrokes || record.keystrokes.length < 2) return;

    setShowHistory(false);
    setIsReplaying(true);

    const ks = record.keystrokes;
    const baseTs = ks[0].timestamp;
    let consec = 0;
    let i = 0;
    let correctCount = 0;

    const emitNext = () => {
      if (i >= ks.length) {
        setReplayKs((prev) => prev);
        return;
      }

      const current = ks[i];
      if (current.isError) {
        consec += 1;
      } else {
        consec = 0;
        correctCount += 1;
      }

      setReplayKs(ks.slice(0, i + 1));
      setReplayConsec(consec);

      const elapsed = current.timestamp - baseTs;
      const mins = Math.max(elapsed / 60000, 0.0001);
      const wpm = Math.round(correctCount / 5 / mins);
      setReplayWpm(wpm);

      i++;
      if (i < ks.length) {
        const nextDelay = Math.max(ks[i].timestamp - current.timestamp, 1);
        replayTimerRef.current = window.setTimeout(emitNext, nextDelay);
      }
    };

    replayTimerRef.current = window.setTimeout(emitNext, 10);
  }, []);

  useEffect(() => {
    return () => {
      if (replayTimerRef.current !== null) {
        window.clearTimeout(replayTimerRef.current);
      }
    };
  }, []);

  const recentHistory = useMemo(() => history.slice(0, 10), [history]);

  const displayKeystrokes = isReplaying ? replayKs : keystrokes;
  const displayWpm = isReplaying ? replayWpm : currentStats.wpm;
  const displayConsec = isReplaying ? replayConsec : consecutiveErrors;

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">TypingWave</h1>
        <div className="header-actions">
          <button
            className="btn btn-refresh"
            onClick={refreshParagraph}
            title="刷新段落"
            aria-label="刷新段落"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>新段落</span>
          </button>
          <button
            className="btn btn-icon"
            onClick={() => setShowHistory(true)}
            title="历史记录"
            aria-label="查看历史记录"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 8v4l3 3" />
              <circle cx="12" cy="12" r="10" />
            </svg>
          </button>
          {isReplaying && (
            <button
              className="btn"
              onClick={stopReplay}
              style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
            >
              停止回放
            </button>
          )}
        </div>
      </header>

      <main className="app-layout">
        <TypingArea
          paragraph={paragraph}
          onStatsUpdate={handleStatsUpdate}
          onKeystroke={handleKeystroke}
          onComplete={handleComplete}
          sessionKey={sessionKey}
          key={`typing-${sessionKey}`}
        />
        <WaveVisualizer
          keystrokes={displayKeystrokes}
          currentWpm={displayWpm}
          consecutiveErrors={displayConsec}
          isReplaying={isReplaying}
          sessionKey={sessionKey}
          key={`wave-${sessionKey}${isReplaying ? '-replay' : ''}`}
        />
      </main>

      {showHistory && (
        <div
          className="overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowHistory(false);
            }
          }}
        >
          <div
            className="history-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-title"
          >
            <div className="history-header">
              <h2 className="history-title" id="history-title">
                历史记录
              </h2>
              <button
                className="history-close"
                onClick={() => setShowHistory(false)}
                aria-label="关闭历史记录"
              >
                ×
              </button>
            </div>

            {recentHistory.length === 0 ? (
              <div className="history-empty">
                还没有历史记录，完成一轮打字后将在此显示。
              </div>
            ) : (
              <div className="history-list">
                {recentHistory.map((rec) => (
                  <div
                    key={rec.id}
                    className="history-item"
                    onClick={() => startReplay(rec)}
                    title="点击回放该轮波形"
                  >
                    <div className="history-item-date">{formatDate(rec.timestamp)}</div>
                    <div className="history-item-stats">
                      <div className="history-item-stat">
                        <span className="history-item-stat-label">WPM</span>
                        <span
                          className="history-item-stat-value"
                          style={{ color: getWpmColor(rec.wpm) }}
                        >
                          {rec.wpm}
                        </span>
                      </div>
                      <div className="history-item-stat">
                        <span className="history-item-stat-label">准确率</span>
                        <span
                          className="history-item-stat-value"
                          style={{ color: rec.accuracy >= 95 ? '#22c55e' : rec.accuracy >= 85 ? '#facc15' : '#ef4444' }}
                        >
                          {rec.accuracy}%
                        </span>
                      </div>
                      <div className="history-item-stat">
                        <span className="history-item-stat-label">用时</span>
                        <span className="history-item-stat-value" style={{ color: '#667eea' }}>
                          {formatTime(rec.elapsedTime)}
                        </span>
                      </div>
                    </div>
                    <div className="history-item-replay">回放 ▶</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
