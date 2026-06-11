import React, { useRef, useCallback } from 'react';
import SelectionPanel from './SelectionPanel';
import RaceTrack from './RaceTrack';
import ResultTable from './ResultTable';
import HistoryChart from './HistoryChart';
import ShareModal from './ShareModal';
import { useRaceStore } from '../store/useRaceStore';
import { runAlgorithm } from '../utils/algorithmRunner';
import type { AlgorithmResult, HistoryEntry, RaceItem } from '../types';

function createRipple(event: React.MouseEvent<HTMLButtonElement>) {
  const button = event.currentTarget;
  const circle = document.createElement('span');
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;

  const rect = button.getBoundingClientRect();
  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - rect.left - radius}px`;
  circle.style.top = `${event.clientY - rect.top - radius}px`;
  circle.classList.add('ripple');

  const existing = button.getElementsByClassName('ripple')[0];
  if (existing) existing.remove();

  button.appendChild(circle);
  setTimeout(() => circle.remove(), 600);
}

const App: React.FC = () => {
  const {
    selectedLanguages,
    selectedAlgorithm,
    setRaceItems,
    updateRaceItem,
    setResults,
    addHistoryEntry,
    setIsRacing,
    setIsFadingOut,
    resetRace,
    setShowShareModal,
    setShareImageData,
    results,
    isRacing,
    history
  } = useRaceStore();

  const cancelFnsRef = useRef<Array<() => void>>([]);
  const completedCountRef = useRef(0);
  const raceResultsRef = useRef<Map<string, number>>(new Map());

  const generateSnapshot = useCallback(() => {
    const canvas = document.createElement('canvas');
    const width = 1200;
    const height = 800;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#0B0C10';
    ctx.fillRect(0, 0, width, height);

    const gradient = ctx.createRadialGradient(width / 2, 0, 0, width / 2, 0, width);
    gradient.addColorStop(0, 'rgba(102, 252, 241, 0.06)');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#66FCF1';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(102, 252, 241, 0.4)';
    ctx.shadowBlur = 20;
    ctx.fillText('⚡ 算 法 赛 跑', width / 2, 30);
    ctx.shadowBlur = 0;

    if (results.length > 0) {
      const colors: Record<string, string> = {
        JavaScript: '#F7DF1E',
        Python: '#3776AB',
        'C++': '#00599C',
        Go: '#00ADD8'
      };

      ctx.fillStyle = '#151820';
      roundRect(ctx, 60, 100, width - 120, 320, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(102, 252, 241, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#66FCF1';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('比 赛 结 果', 80, 120);

      const maxElapsed = Math.max(...results.map((r) => r.elapsedMs));
      results.forEach((result, idx) => {
        const y = 170 + idx * 60;
        const color = colors[result.language] || '#66FCF1';

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(90, y + 14, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(result.language, 110, y + 8);

        const barW = (result.elapsedMs / maxElapsed) * (width - 380);
        const barGradient = ctx.createLinearGradient(220, y, 220 + barW, y);
        barGradient.addColorStop(0, '#1A1A40');
        barGradient.addColorStop(1, '#00FF88');
        ctx.fillStyle = barGradient;
        roundRect(ctx, 220, y, barW, 28, 6);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${result.elapsedMs}ms`, width - 140, y + 10);

        ctx.fillStyle = result.gapPercent === 0 ? '#00FF88' : '#FF6B6B';
        ctx.textAlign = 'left';
        ctx.fillText(
          result.gapPercent === 0 ? '最快' : `+${result.gapPercent}%`,
          width - 120,
          y + 10
        );
      });

      ctx.fillStyle = '#151820';
      roundRect(ctx, 60, 450, width - 120, 280, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(102, 252, 241, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#66FCF1';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('排 行 榜', 80, 470);

      const medalColors: Record<number, string> = {
        1: '#FFD700',
        2: '#C0C0C0',
        3: '#CD7F32'
      };

      const sortedResults = [...results].sort((a, b) => a.rank - b.rank);
      sortedResults.forEach((result, idx) => {
        const y = 520 + idx * 45;
        const medalColor = medalColors[result.rank] || 'rgba(255,255,255,0.1)';

        ctx.fillStyle = medalColor;
        ctx.beginPath();
        ctx.arc(100, y + 10, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = result.rank <= 3 ? '#0B0C10' : '#A0AEC0';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(result.rank), 100, y + 6);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '15px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(result.language, 140, y + 7);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 15px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${result.elapsedMs}ms`, width - 100, y + 7);
      });
    } else {
      ctx.fillStyle = '#606B7A';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('暂无比赛数据', width / 2, height / 2);
    }

    if (history.length > 0) {
      ctx.fillStyle = '#606B7A';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`历史记录: ${history.length} 次`, width - 80, height - 40);
    }

    ctx.fillStyle = 'rgba(102, 252, 241, 0.5)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    const now = new Date();
    ctx.fillText(
      `Generated at ${now.toLocaleString()} | Algorithm Race`,
      width / 2,
      height - 20
    );

    return canvas.toDataURL('image/png');
  }, [results, history]);

  const handleStartRace = useCallback(() => {
    if (!selectedAlgorithm || selectedLanguages.length < 2) return;

    cancelFnsRef.current.forEach((fn) => fn());
    cancelFnsRef.current = [];
    completedCountRef.current = 0;
    raceResultsRef.current = new Map();

    const items: RaceItem[] = selectedLanguages.map((lang) => ({
      language: lang,
      progress: 0,
      status: 'running',
      elapsedMs: 0,
      fps: 60
    }));
    setRaceItems(items);
    setResults([]);
    setIsRacing(true);

    selectedLanguages.forEach((lang) => {
      const cancel = runAlgorithm(lang, selectedAlgorithm!, {
        onProgress: (update) => {
          updateRaceItem(lang, {
            progress: update.progress,
            elapsedMs: update.elapsedMs,
            fps: update.fps,
            status: update.finished ? 'finished' : 'running'
          });
        },
        onComplete: (elapsedMs) => {
          raceResultsRef.current.set(lang, elapsedMs);
          updateRaceItem(lang, {
            progress: 100,
            elapsedMs,
            status: 'finished'
          });

          completedCountRef.current++;
          if (completedCountRef.current >= selectedLanguages.length) {
            setIsRacing(false);

            const resultsArr: AlgorithmResult[] = selectedLanguages.map((l) => ({
              language: l,
              elapsedMs: raceResultsRef.current.get(l) || 0,
              rank: 0,
              gapPercent: 0
            }));

            resultsArr.sort((a, b) => a.elapsedMs - b.elapsedMs);
            const fastest = resultsArr[0].elapsedMs;
            resultsArr.forEach((r, i) => {
              r.rank = i + 1;
              r.gapPercent =
                fastest === 0
                  ? 0
                  : Math.round(((r.elapsedMs - fastest) / fastest) * 100);
            });

            setResults(resultsArr);

            const historyEntry: HistoryEntry = {
              id: Date.now().toString(),
              timestamp: Date.now(),
              algorithm: selectedAlgorithm!,
              results: resultsArr.map((r) => ({
                language: r.language,
                elapsedMs: r.elapsedMs
              }))
            };
            addHistoryEntry(historyEntry);
          }
        }
      });
      cancelFnsRef.current.push(cancel);
    });
  }, [selectedLanguages, selectedAlgorithm, setRaceItems, updateRaceItem, setResults, setIsRacing, addHistoryEntry]);

  const handleReset = (e: React.MouseEvent<HTMLButtonElement>) => {
    createRipple(e);
    cancelFnsRef.current.forEach((fn) => fn());
    cancelFnsRef.current = [];
    setIsFadingOut(true);
    setTimeout(() => {
      resetRace();
    }, 500);
  };

  const handleShare = (e: React.MouseEvent<HTMLButtonElement>) => {
    createRipple(e);
    setShowShareModal(true);
    setShareImageData(null);
    setTimeout(() => {
      const dataUrl = generateSnapshot();
      if (dataUrl) setShareImageData(dataUrl);
    }, 100);
  };

  return (
    <div className="app-container">
      <SelectionPanel onStartRace={handleStartRace} />

      <div className="main-content">
        <div className="race-section">
          <RaceTrack />
          <ResultTable />
        </div>

        <HistoryChart />

        <div className="action-bar">
          <button
            className="btn btn-secondary"
            onClick={handleReset}
            disabled={isRacing}
          >
            重 置 赛 道
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleShare}
            disabled={isRacing || results.length === 0}
          >
            分 享 快 照
          </button>
        </div>
      </div>

      <ShareModal />
    </div>
  );
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export default App;
