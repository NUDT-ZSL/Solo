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

type ButtonId = 'start' | 'reset' | 'snapshot';

interface Ripple {
  id: number;
  x: number;
  y: number;
  buttonId: ButtonId;
}

const App: React.FC = () => {
  const [selectedLanguages, setSelectedLanguages] = useState<LanguageName[]>(['JavaScript', 'Python', 'C++', 'Go']);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<AlgorithmName>('bubbleSort');
  const [tracks, setTracks] = useState<RaceTrackData[]>([]);
  const [results, setResults] = useState<AlgorithmResult[]>([]);
  const [isRacing, setIsRacing] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[][]>([]);
  const [isResetting, setIsResetting] = useState(false);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const mainRef = useRef<HTMLDivElement>(null);
  const rippleIdRef = useRef(0);
  const animFrameRef = useRef<number>(0);

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

  const addRipple = (e: React.MouseEvent<HTMLButtonElement>, buttonId: ButtonId) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = rippleIdRef.current++;
    setRipples((prev) => [...prev, { id, x, y, buttonId }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);
  };

  const renderRipples = (buttonId: ButtonId) => {
    return ripples
      .filter((r) => r.buttonId === buttonId)
      .map((ripple) => (
        <span
          key={ripple.id}
          style={{
            position: 'absolute',
            left: ripple.x,
            top: ripple.y,
            width: 0,
            height: 0,
            borderRadius: '50%',
            background: buttonId === 'start' ? 'rgba(255,255,255,0.5)' : 'rgba(69, 162, 158, 0.4)',
            transform: 'translate(-50%, -50%)',
            animation: 'ripple-anim 0.6s ease-out forwards',
            pointerEvents: 'none',
          }}
        />
      ));
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
    let lastSetStateTime = 0;

    const animateProgress = () => {
      const now = performance.now();
      const elapsed = now - startTime;
      const globalProgress = Math.min(elapsed / animDuration, 1);
      const easedProgress = 1 - Math.pow(1 - globalProgress, 3);

      if (now - lastSetStateTime > 50) {
        setTracks((prev) =>
          prev.map((track) => ({
            ...track,
            progress: track.status === 'completed' ? track.progress : easedProgress * 100,
          }))
        );
        lastSetStateTime = now;
      }

      if (globalProgress < 1) {
        animFrameRef.current = requestAnimationFrame(animateProgress);
      }
    };

    animFrameRef.current = requestAnimationFrame(animateProgress);

    const settledResults = await Promise.all(resultPromises);
    cancelAnimationFrame(animFrameRef.current);

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
    cancelAnimationFrame(animFrameRef.current);
    setTimeout(() => {
      setTracks([]);
      setResults([]);
      setIsResetting(false);
    }, 500);
  }, []);

  const captureSnapshot = useCallback(() => {
    const canvas = document.createElement('canvas');
    const width = 900;
    const height = 700;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0B0C10');
    gradient.addColorStop(1, '#1A1A2E');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#66FCF1';
    ctx.font = 'bold 28px "Segoe UI", "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ 算法赛跑 - 性能快照', width / 2, 45);

    ctx.fillStyle = '#45A29E';
    ctx.font = '14px "Segoe UI", sans-serif';
    ctx.fillText(`算法: ${ALGORITHM_LABELS[selectedAlgorithm]} | ${new Date().toLocaleString()}`, width / 2, 72);

    const sorted = [...results].sort((a, b) => a.timeMs - b.timeMs);
    const fastest = sorted[0]?.timeMs || 1;

    ctx.strokeStyle = '#2A2A4A';
    ctx.lineWidth = 1;
    ctx.strokeRect(30, 95, width - 60, 280);
    ctx.fillStyle = 'rgba(26, 26, 46, 0.5)';
    ctx.fillRect(30, 95, width - 60, 280);

    ctx.fillStyle = '#45A29E';
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🏁 赛道进度', 45, 120);

    const barMaxWidth = width - 260;
    const barStartX = 160;
    const trackHeight = 45;

    sorted.forEach((result, i) => {
      const y = 145 + i * (trackHeight + 10);
      const barWidth = (result.timeMs / Math.max(...sorted.map((r) => r.timeMs))) * barMaxWidth;

      ctx.fillStyle = LANGUAGE_COLORS[result.language];
      ctx.font = 'bold 14px "Segoe UI", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(result.language, barStartX - 10, y + 22);

      ctx.fillStyle = '#1A1A2E';
      ctx.strokeStyle = '#2A2A4A';
      ctx.lineWidth = 1;
      ctx.beginPath();
      (ctx as any).roundRect(barStartX, y, barMaxWidth, trackHeight, 4);
      ctx.fill();
      ctx.stroke();

      const barGradient = ctx.createLinearGradient(barStartX, 0, barStartX + barWidth, 0);
      barGradient.addColorStop(0, '#1A1A40');
      barGradient.addColorStop(1, '#00FF88');
      ctx.fillStyle = barGradient;
      ctx.beginPath();
      (ctx as any).roundRect(barStartX, y, barWidth, trackHeight, 4);
      ctx.fill();

      ctx.fillStyle = '#00FF88';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${result.timeMs.toFixed(2)}ms`, barStartX + barWidth + 12, y + 22);

      if (i === 0) {
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 12px "Segoe UI", sans-serif';
        ctx.fillText('🏆 最快', barStartX + barWidth + 85, y + 22);
      }
    });

    ctx.strokeStyle = '#2A2A4A';
    ctx.lineWidth = 1;
    ctx.strokeRect(30, 395, (width - 70) / 2, 260);
    ctx.fillStyle = 'rgba(26, 26, 46, 0.5)';
    ctx.fillRect(30, 395, (width - 70) / 2, 260);

    ctx.fillStyle = '#45A29E';
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('📊 排名表', 45, 420);

    const tableStartY = 440;
    const rowHeight = 40;

    ctx.fillStyle = '#45A29E';
    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    ctx.fillText('#', 50, tableStartY);
    ctx.fillText('语言', 90, tableStartY);
    ctx.textAlign = 'right';
    ctx.fillText('耗时', (width - 70) / 2 + 10, tableStartY);
    ctx.fillText('差距', (width - 70) / 2 + 120, tableStartY);

    ctx.strokeStyle = '#2A2A4A';
    ctx.beginPath();
    ctx.moveTo(45, tableStartY + 8);
    ctx.lineTo((width - 70) / 2 + 130, tableStartY + 8);
    ctx.stroke();

    sorted.forEach((result, i) => {
      const y = tableStartY + 25 + i * rowHeight;
      const diffPercent = i === 0 ? 0 : ((result.timeMs - fastest) / fastest) * 100;

      if (i < 3) {
        ctx.fillStyle = RANK_COLORS[i];
        ctx.beginPath();
        ctx.arc(55, y - 6, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0B0C10';
        ctx.font = 'bold 12px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${i + 1}`, 55, y - 2);
      } else {
        ctx.fillStyle = '#66FCF1';
        ctx.font = 'bold 12px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${i + 1}`, 55, y - 2);
      }

      ctx.fillStyle = LANGUAGE_COLORS[result.language];
      ctx.font = 'bold 13px "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(result.language, 90, y);

      ctx.fillStyle = '#66FCF1';
      ctx.font = '12px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${result.timeMs.toFixed(2)}ms`, (width - 70) / 2 + 10, y);

      ctx.fillStyle = i === 0 ? '#00FF88' : '#FF6B6B';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(i === 0 ? '最快' : `+${diffPercent.toFixed(1)}%`, (width - 70) / 2 + 120, y);
    });

    const chartX = (width - 70) / 2 + 50;
    ctx.strokeStyle = '#2A2A4A';
    ctx.lineWidth = 1;
    ctx.strokeRect(chartX, 395, (width - 70) / 2, 260);
    ctx.fillStyle = 'rgba(26, 26, 46, 0.5)';
    ctx.fillRect(chartX, 395, (width - 70) / 2, 260);

    ctx.fillStyle = '#45A29E';
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('📈 历史趋势', chartX + 15, 420);

    if (history.length > 0) {
      const chartW = (width - 70) / 2 - 40;
      const chartH = 180;
      const chartLeft = chartX + 20;
      const chartTop = 440;

      const allTimes = history.flatMap((entry) => entry.map((e) => e.timeMs));
      const maxTime = Math.max(...allTimes) * 1.1;

      ctx.strokeStyle = '#1A1A2E';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = chartTop + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(chartLeft, y);
        ctx.lineTo(chartLeft + chartW, y);
        ctx.stroke();
      }

      selectedLanguages.forEach((lang) => {
        const color = LANGUAGE_COLORS[lang];
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();

        let started = false;
        history.forEach((entry, runIndex) => {
          const point = entry.find((e) => e.language === lang);
          if (!point) return;
          const x = chartLeft + (chartW / Math.max(history.length - 1, 1)) * runIndex;
          const y = chartTop + chartH - (point.timeMs / maxTime) * chartH;
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
        ctx.setLineDash([]);
      });

      const legendX = chartX + 30;
      const legendY = 640;
      selectedLanguages.forEach((lang, i) => {
        ctx.fillStyle = LANGUAGE_COLORS[lang];
        ctx.beginPath();
        ctx.arc(legendX + i * 100, legendY, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = LANGUAGE_COLORS[lang];
        ctx.font = '11px "Segoe UI", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(lang, legendX + i * 100 + 10, legendY + 4);
      });
    }

    ctx.fillStyle = '#2A2A4A';
    ctx.font = '11px "Segoe UI", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Generated by 算法赛跑 | algorithm-race', width / 2, height - 15);

    const dataUrl = canvas.toDataURL('image/png');
    setSnapshotUrl(dataUrl);
  }, [results, selectedAlgorithm, history, selectedLanguages]);

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
              addRipple(e, 'start');
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
            {renderRipples('start')}
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
            addRipple(e, 'reset');
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
          {renderRipples('reset')}
          🔄 重置赛道
        </button>
        <button
          onClick={(e) => {
            addRipple(e, 'snapshot');
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
          {renderRipples('snapshot')}
          📸 分享快照
        </button>
      </section>

      {snapshotUrl && (
        <div
          onClick={() => setSnapshotUrl(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
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
              maxWidth: '92vw',
              maxHeight: '92vh',
              overflow: 'auto',
              boxShadow: '0 0 40px rgba(102, 252, 241, 0.2)',
            }}
          >
            <h3 style={{ color: '#66FCF1', marginBottom: 12, fontSize: 14, letterSpacing: 1 }}>
              📸 快照已生成 · 右键保存图片即可分享
            </h3>
            <img
              src={snapshotUrl}
              alt="算法赛跑快照"
              style={{ maxWidth: '100%', borderRadius: 8, display: 'block' }}
            />
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button
                onClick={() => setSnapshotUrl(null)}
                style={{
                  padding: '8px 24px',
                  border: '1px solid #45A29E',
                  borderRadius: 6,
                  background: 'transparent',
                  color: '#66FCF1',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(69, 162, 158, 0.1)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
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
            opacity: 0.6;
          }
          100% {
            width: 300px;
            height: 300px;
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
