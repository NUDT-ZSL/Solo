import React, { useState, useCallback, useRef } from 'react';
import RaceTrack, { type RaceTrackData } from './RaceTrack';
import HistoryChart, { type HistoryEntry } from './HistoryChart';
import {
  executeAlgorithm,
  ALGORITHM_LABELS,
  LANGUAGE_COLORS,
  ALL_LANGUAGES,
  ALL_ALGORITHMS,
  type AlgorithmName,
  type LanguageName,
  type AlgorithmResult,
} from '../utils/algorithmRunner';

const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32', 'transparent'];

const App: React.FC = () => {
  const [selectedLanguages, setSelectedLanguages] = useState<LanguageName[]>(['JavaScript', 'Python', 'C++', 'Go']);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<AlgorithmName>('bubbleSort');
  const [tracks, setTracks] = useState<RaceTrackData[]>([]);
  const [results, setResults] = useState<AlgorithmResult[]>([]);
  const [isRacing, setIsRacing] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[][]>([]);
  const [isResetting, setIsResetting] = useState(false);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const mainRef = useRef<HTMLDivElement>(null);
  const rippleIdRef = useRef(0);

  const toggleLanguage = (lang: LanguageName) => {
    setSelectedLanguages((prev) => {
      if (prev.includes(lang)) {
        if (prev.length <= 2) return prev;
        return prev.filter((l) => l !== lang);
      }
      if (prev.length >= 4) return prev;
      return [...prev, lang];
    });
  };

  const addRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = rippleIdRef.current++;
    setRipples((prev) => [...prev, { id, x, y }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);
  };

  const startRace = useCallback(async () => {
    if (isRacing || selectedLanguages.length < 2) return;
    setIsRacing(true);
    setResults([]);

    const initialTracks: RaceTrackData[] = selectedLanguages.map((lang) => ({
      language: lang,
      timeMs: 0,
      status: 'running',
      progress: 0,
    }));
    setTracks(initialTracks);

    const resultPromises = selectedLanguages.map((lang) => executeAlgorithm(lang, selectedAlgorithm));

    const animDuration = 2000 + Math.random() * 1000;
    const startTime = performance.now();

    const animateProgress = () => {
      const elapsed = performance.now() - startTime;
      const globalProgress = Math.min(elapsed / animDuration, 1);
      const easedProgress = 1 - Math.pow(1 - globalProgress, 3);

      setTracks((prev) =>
        prev.map((track) => ({
          ...track,
          progress: track.status === 'completed' ? 100 : easedProgress * 100,
        }))
      );

      if (globalProgress < 1) {
        requestAnimationFrame(animateProgress);
      }
    };

    requestAnimationFrame(animateProgress);

    const settledResults = await Promise.all(resultPromises);

    const maxTime = Math.max(...settledResults.map((r) => r.timeMs));

    settledResults.forEach((result, index) => {
      setTimeout(() => {
        setTracks((prev) =>
          prev.map((track) =>
            track.language === result.language
              ? {
                  ...track,
                  timeMs: result.timeMs,
                  status: 'completed',
                  progress: (result.timeMs / maxTime) * 100,
                }
              : track
          )
        );
      }, 100 * index);
    });

    setTimeout(() => {
      setResults(settledResults);
      setHistory((prev) => {
        const newEntry = settledResults.map((r) => ({ language: r.language, timeMs: r.timeMs }));
        const updated = [...prev, newEntry];
        return updated.slice(-5);
      });
      setIsRacing(false);
    }, 300 + settledResults.length * 100);
  }, [isRacing, selectedLanguages, selectedAlgorithm]);

  const resetRace = useCallback(() => {
    setIsResetting(true);
    setTimeout(() => {
      setTracks([]);
      setResults([]);
      setIsResetting(false);
    }, 500);
  }, []);

  const captureSnapshot = useCallback(() => {
    const mainEl = mainRef.current;
    if (!mainEl) return;

    const canvas = document.createElement('canvas');
    const width = mainEl.offsetWidth;
    const height = mainEl.offsetHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#0B0C10';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#66FCF1';
    ctx.font = 'bold 20px "Segoe UI", "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ 算法赛跑 - 性能快照', width / 2, 30);

    ctx.fillStyle = '#45A29E';
    ctx.font = '13px "Segoe UI", sans-serif';
    ctx.fillText(`算法: ${ALGORITHM_LABELS[selectedAlgorithm]}`, width / 2, 52);

    const sorted = [...results].sort((a, b) => a.timeMs - b.timeMs);
    const fastest = sorted[0]?.timeMs || 1;
    const barMaxWidth = width - 300;
    const barStartX = 130;

    sorted.forEach((result, i) => {
      const y = 80 + i * 50;
      ctx.fillStyle = LANGUAGE_COLORS[result.language];
      ctx.font = 'bold 14px "Segoe UI", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(result.language, barStartX - 10, y + 15);

      const barWidth = (result.timeMs / fastest) * barMaxWidth * 0.8;
      const gradient = ctx.createLinearGradient(barStartX, 0, barStartX + barWidth, 0);
      gradient.addColorStop(0, '#1A1A40');
      gradient.addColorStop(1, '#00FF88');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(barStartX, y, barWidth, 30, 4);
      ctx.fill();

      ctx.fillStyle = '#66FCF1';
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${result.timeMs.toFixed(2)}ms`, barStartX + barWidth + 10, y + 18);
    });

    const dataUrl = canvas.toDataURL('image/png');
    setSnapshotUrl(dataUrl);
  }, [results, selectedAlgorithm]);

  const maxTime = results.length > 0 ? Math.max(...results.map((r) => r.timeMs)) : 0;
  const sortedResults = [...results].sort((a, b) => a.timeMs - b.timeMs);
  const fastestTime = sortedResults[0]?.timeMs || 0;

  return (
    <div
      ref={mainRef}
      style={{
        minHeight: '100vh',
        background: '#0B0C10',
        color: '#66FCF1',
        padding: '0 24px 24px',
        minWidth: 1024,
        opacity: isResetting ? 0 : 1,
        transition: 'opacity 0.5s ease',
      }}
    >
      <header
        style={{
          textAlign: 'center',
          padding: '24px 0 12px',
        }}
      >
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 700,
            letterSpacing: 4,
            background: 'linear-gradient(90deg, #66FCF1, #45A29E)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
          }}
        >
          ⚡ 算法赛跑
        </h1>
        <p style={{ color: '#45A29E', fontSize: '0.85rem', marginTop: 4 }}>
          代码性能可视化对比 · 让时间复杂度直观可见
        </p>
      </header>

      <section
        style={{
          background: 'rgba(26, 26, 46, 0.6)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(69, 162, 158, 0.2)',
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 12, color: '#45A29E', fontWeight: 600, letterSpacing: 1 }}>
            选择语言（2-4种）
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {ALL_LANGUAGES.map((lang) => {
              const isSelected = selectedLanguages.includes(lang);
              return (
                <button
                  key={lang}
                  onClick={() => toggleLanguage(lang)}
                  disabled={isRacing}
                  style={{
                    padding: '6px 14px',
                    border: `1px solid ${isSelected ? LANGUAGE_COLORS[lang] : '#2A2A4A'}`,
                    borderRadius: 6,
                    background: isSelected ? `${LANGUAGE_COLORS[lang]}22` : 'transparent',
                    color: isSelected ? LANGUAGE_COLORS[lang] : '#45A29E',
                    cursor: isRacing ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    transition: 'all 0.2s',
                    opacity: isRacing ? 0.5 : 1,
                  }}
                >
                  {lang}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 12, color: '#45A29E', fontWeight: 600, letterSpacing: 1 }}>
            算法场景
          </label>
          <select
            value={selectedAlgorithm}
            onChange={(e) => setSelectedAlgorithm(e.target.value as AlgorithmName)}
            disabled={isRacing}
            style={{
              padding: '6px 14px',
              border: '1px solid #2A2A4A',
              borderRadius: 6,
              background: '#1A1A2E',
              color: '#66FCF1',
              fontSize: 13,
              cursor: isRacing ? 'not-allowed' : 'pointer',
              outline: 'none',
            }}
          >
            {ALL_ALGORITHMS.map((alg) => (
              <option key={alg} value={alg}>
                {ALGORITHM_LABELS[alg]}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10, marginLeft: 'auto', alignItems: 'flex-end' }}>
          <button
            onClick={(e) => {
              addRipple(e);
              startRace();
            }}
            disabled={isRacing || selectedLanguages.length < 2}
            style={{
              position: 'relative',
              overflow: 'hidden',
              padding: '10px 28px',
              border: 'none',
              borderRadius: 8,
              background: isRacing ? '#2A2A4A' : 'linear-gradient(135deg, #66FCF1, #45A29E)',
              color: isRacing ? '#45A29E' : '#0B0C10',
              fontSize: 14,
              fontWeight: 700,
              cursor: isRacing ? 'not-allowed' : 'pointer',
              transition: 'transform 0.2s ease, background 0.3s',
              transform: 'scale(1)',
              letterSpacing: 1,
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            {ripples.map((ripple) => (
              <span
                key={ripple.id}
                style={{
                  position: 'absolute',
                  left: ripple.x,
                  top: ripple.y,
                  width: 0,
                  height: 0,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.4)',
                  transform: 'translate(-50%, -50%)',
                  animation: 'ripple-anim 0.6s ease-out forwards',
                }}
              />
            ))}
            {isRacing ? '赛跑中...' : '开始赛跑'}
          </button>
        </div>
      </section>

      <section
        style={{
          display: 'flex',
          gap: 20,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            flex: 1,
            background: 'rgba(26, 26, 46, 0.4)',
            border: '1px solid rgba(69, 162, 158, 0.15)',
            borderRadius: 12,
            padding: 20,
            minWidth: 0,
          }}
        >
          <h2
            style={{
              fontSize: 14,
              color: '#45A29E',
              marginBottom: 16,
              fontWeight: 600,
              letterSpacing: 1,
            }}
          >
            🏁 赛道
          </h2>
          {tracks.length > 0 ? (
            <RaceTrack tracks={tracks} maxTime={maxTime} />
          ) : (
            <div
              style={{
                height: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2A2A4A',
                fontSize: 14,
              }}
            >
              选择语言和算法，点击「开始赛跑」
            </div>
          )}
        </div>

        {results.length > 0 && (
          <div
            style={{
              width: 280,
              flexShrink: 0,
              background: 'rgba(26, 26, 46, 0.4)',
              border: '1px solid rgba(69, 162, 158, 0.15)',
              borderRadius: 12,
              padding: 20,
            }}
          >
            <h2
              style={{
                fontSize: 14,
                color: '#45A29E',
                marginBottom: 16,
                fontWeight: 600,
                letterSpacing: 1,
              }}
            >
              📊 排名
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '4px 8px',
                      fontSize: 11,
                      color: '#45A29E',
                      borderBottom: '1px solid #2A2A4A',
                    }}
                  >
                    #
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '4px 8px',
                      fontSize: 11,
                      color: '#45A29E',
                      borderBottom: '1px solid #2A2A4A',
                    }}
                  >
                    语言
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '4px 8px',
                      fontSize: 11,
                      color: '#45A29E',
                      borderBottom: '1px solid #2A2A4A',
                    }}
                  >
                    耗时
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '4px 8px',
                      fontSize: 11,
                      color: '#45A29E',
                      borderBottom: '1px solid #2A2A4A',
                    }}
                  >
                    差距
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.map((result, index) => {
                  const diffPercent =
                    index === 0
                      ? 0
                      : ((result.timeMs - fastestTime) / fastestTime) * 100;
                  const rankBg = RANK_COLORS[index] || 'transparent';
                  return (
                    <tr key={result.language}>
                      <td
                        style={{
                          padding: '8px',
                          fontSize: 13,
                          borderBottom: '1px solid #1A1A2E',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: rankBg,
                            color: index < 3 ? '#0B0C10' : '#66FCF1',
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {index + 1}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '8px',
                          fontSize: 13,
                          color: LANGUAGE_COLORS[result.language],
                          fontWeight: 600,
                          borderBottom: '1px solid #1A1A2E',
                        }}
                      >
                        {result.language}
                      </td>
                      <td
                        style={{
                          padding: '8px',
                          fontSize: 13,
                          textAlign: 'right',
                          fontFamily: 'monospace',
                          color: '#66FCF1',
                          borderBottom: '1px solid #1A1A2E',
                        }}
                      >
                        {result.timeMs.toFixed(2)}ms
                      </td>
                      <td
                        style={{
                          padding: '8px',
                          fontSize: 13,
                          textAlign: 'right',
                          fontFamily: 'monospace',
                          color: index === 0 ? '#00FF88' : '#FF6B6B',
                          borderBottom: '1px solid #1A1A2E',
                        }}
                      >
                        {index === 0 ? '最快' : `+${diffPercent.toFixed(1)}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section
        style={{
          background: 'rgba(26, 26, 46, 0.4)',
          border: '1px solid rgba(69, 162, 158, 0.15)',
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <h2
          style={{
            fontSize: 14,
            color: '#45A29E',
            marginBottom: 16,
            fontWeight: 600,
            letterSpacing: 1,
          }}
        >
          📈 历史趋势（最近5次）
        </h2>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <HistoryChart history={history} languages={selectedLanguages} />
        </div>
      </section>

      <section
        style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          paddingBottom: 24,
        }}
      >
        <button
          onClick={(e) => {
            addRipple(e);
            resetRace();
          }}
          disabled={isRacing}
          style={{
            position: 'relative',
            overflow: 'hidden',
            padding: '10px 24px',
            border: '1px solid #2A2A4A',
            borderRadius: 8,
            background: 'transparent',
            color: '#45A29E',
            fontSize: 13,
            fontWeight: 600,
            cursor: isRacing ? 'not-allowed' : 'pointer',
            transition: 'border-color 0.2s, transform 0.2s',
            letterSpacing: 1,
          }}
          onMouseDown={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          }}
        >
          {ripples.map((ripple) => (
            <span
              key={ripple.id}
              style={{
                position: 'absolute',
                left: ripple.x,
                top: ripple.y,
                width: 0,
                height: 0,
                borderRadius: '50%',
                background: 'rgba(69, 162, 158, 0.3)',
                transform: 'translate(-50%, -50%)',
                animation: 'ripple-anim 0.6s ease-out forwards',
              }}
            />
          ))}
          🔄 重置赛道
        </button>
        <button
          onClick={(e) => {
            addRipple(e);
            captureSnapshot();
          }}
          disabled={results.length === 0}
          style={{
            position: 'relative',
            overflow: 'hidden',
            padding: '10px 24px',
            border: '1px solid #2A2A4A',
            borderRadius: 8,
            background: 'transparent',
            color: '#45A29E',
            fontSize: 13,
            fontWeight: 600,
            cursor: results.length === 0 ? 'not-allowed' : 'pointer',
            transition: 'border-color 0.2s, transform 0.2s',
            letterSpacing: 1,
            opacity: results.length === 0 ? 0.5 : 1,
          }}
          onMouseDown={(e) => {
            if (results.length > 0)
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          }}
        >
          {ripples.map((ripple) => (
            <span
              key={ripple.id}
              style={{
                position: 'absolute',
                left: ripple.x,
                top: ripple.y,
                width: 0,
                height: 0,
                borderRadius: '50%',
                background: 'rgba(69, 162, 158, 0.3)',
                transform: 'translate(-50%, -50%)',
                animation: 'ripple-anim 0.6s ease-out forwards',
              }}
            />
          ))}
          📸 分享快照
        </button>
      </section>

      {snapshotUrl && (
        <div
          onClick={() => setSnapshotUrl(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            cursor: 'pointer',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0B0C10',
              border: '1px solid #45A29E',
              borderRadius: 12,
              padding: 20,
              maxWidth: '90vw',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
          >
            <h3 style={{ color: '#66FCF1', marginBottom: 12, fontSize: 14 }}>
              右键保存图片即可分享
            </h3>
            <img
              src={snapshotUrl}
              alt="算法赛跑快照"
              style={{ maxWidth: '100%', borderRadius: 8 }}
            />
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button
                onClick={() => setSnapshotUrl(null)}
                style={{
                  padding: '8px 20px',
                  border: '1px solid #45A29E',
                  borderRadius: 6,
                  background: 'transparent',
                  color: '#66FCF1',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes ripple-anim {
          0% {
            width: 0;
            height: 0;
            opacity: 0.5;
          }
          100% {
            width: 200px;
            height: 200px;
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
