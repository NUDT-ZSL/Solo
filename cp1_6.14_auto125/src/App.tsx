import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { EmotionData, Emotions } from './types';
import { Simulator, averageEmotions } from './utils/Simulator';
import EmotionTimeline, { type TimelinePoint } from './components/EmotionTimeline';
import LiveMeter from './components/LiveMeter';
import HeatmapGrid, { type HeatmapCellData } from './components/HeatmapGrid';

const USER_IDS = Object.freeze(
  Array.from({ length: 16 }, (_, i) => `A${String(i + 1).padStart(2, '0')}`)
);
const WINDOW_MINUTES = 30;
const BATCHES_PER_MINUTE = 30;

export default function App() {
  const [history, setHistory] = useState<EmotionData[][]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [sliderMinute, setSliderMinute] = useState(-1);
  const [viewMinute, setViewMinute] = useState(0);
  const renderTimesRef = useRef<number[]>([]);
  const simulatorRef = useRef<Simulator | null>(null);
  const latestBatchRef = useRef<EmotionData[]>([]);

  useEffect(() => {
    const sim = new Simulator();
    simulatorRef.current = sim;

    const initialHistory = sim.generateInitialHistory(5);
    setHistory(initialHistory);

    sim.start((batch) => {
      latestBatchRef.current = batch;
    });

    const dataTimer = window.setInterval(() => {
      if (!isPaused) {
        const t0 = performance.now();
        setHistory(prev => {
          const next = [...prev, latestBatchRef.current];
          const maxBatches = WINDOW_MINUTES * BATCHES_PER_MINUTE;
          if (next.length > maxBatches) {
            return next.slice(next.length - maxBatches);
          }
          return next;
        });
        const t1 = performance.now();
        renderTimesRef.current.push(t1 - t0);
        if (renderTimesRef.current.length > 10) {
          renderTimesRef.current.shift();
        }
      }
    }, 2000);

    return () => {
      sim.stop();
      clearInterval(dataTimer);
    };
  }, []);

  useEffect(() => {
    if (!isPaused) {
      setSliderMinute(-1);
    }
  }, [isPaused]);

  const maxMinute = useMemo(() => {
    if (history.length === 0) return 0;
    return Math.floor(history.length / BATCHES_PER_MINUTE);
  }, [history.length]);

  const currentViewMinute = useMemo(() => {
    if (isPaused && sliderMinute >= 0) return sliderMinute;
    return maxMinute;
  }, [isPaused, sliderMinute, maxMinute]);

  useEffect(() => {
    if (!isPaused || sliderMinute < 0) {
      setViewMinute(currentViewMinute);
    }
  }, [currentViewMinute, isPaused, sliderMinute]);

  const timelineData = useMemo<TimelinePoint[]>(() => {
    const result: TimelinePoint[] = [];
    const totalBatches = history.length;
    if (totalBatches === 0) return result;

    for (let m = 0; m <= maxMinute; m++) {
      const startIdx = m * BATCHES_PER_MINUTE;
      const endIdx = Math.min(startIdx + BATCHES_PER_MINUTE, totalBatches);
      const batchSlice = history.slice(startIdx, endIdx);
      const allData = batchSlice.flat();
      if (allData.length === 0) continue;

      const avg = averageEmotions(allData);
      result.push({
        minute: m,
        joy: Number(avg.joy.toFixed(3)),
        fear: Number(avg.fear.toFixed(3)),
        anger: Number(avg.anger.toFixed(3)),
        surprise: Number(avg.surprise.toFixed(3))
      });
    }
    return result;
  }, [history, maxMinute]);

  const timelineWindowData = useMemo(() => {
    const startMinute = Math.max(0, viewMinute - WINDOW_MINUTES);
    return timelineData.filter(d => d.minute >= startMinute && d.minute <= viewMinute);
  }, [timelineData, viewMinute]);

  const currentAverageEmotions = useMemo<Emotions>(() => {
    const startIdx = currentViewMinute * BATCHES_PER_MINUTE;
    const endIdx = Math.min(startIdx + BATCHES_PER_MINUTE, history.length);
    if (startIdx >= history.length) {
      return { joy: 0, fear: 0, anger: 0, surprise: 0 };
    }
    const viewData = history.slice(startIdx, endIdx).flat();
    return averageEmotions(viewData);
  }, [history, currentViewMinute]);

  const heatmapData = useMemo<HeatmapCellData[]>(() => {
    const windowStart = Math.max(0, viewMinute - WINDOW_MINUTES + 1);
    const startBatch = windowStart * BATCHES_PER_MINUTE;
    const endBatch = (viewMinute + 1) * BATCHES_PER_MINUTE;
    const batchSlice = history.slice(startBatch, endBatch);

    if (batchSlice.length === 0) return [];

    const minuteDataMap = new Map<number, Map<string, Emotions>>();

    batchSlice.forEach((batch, batchIdx) => {
      const minute = windowStart + Math.floor(batchIdx / BATCHES_PER_MINUTE);
      if (!minuteDataMap.has(minute)) {
        minuteDataMap.set(minute, new Map());
      }
      const userMap = minuteDataMap.get(minute)!;
      for (const entry of batch) {
        userMap.set(entry.userId, entry.emotions);
      }
    });

    let minVal = Infinity;
    let maxVal = -Infinity;
    const rawCells: { minute: number; userId: string; maxIntensity: number; emotions: Emotions }[] = [];

    for (let m = windowStart; m <= viewMinute; m++) {
      const userMap = minuteDataMap.get(m);
      if (!userMap) continue;
      for (const userId of USER_IDS) {
        const emotions = userMap.get(userId);
        if (!emotions) continue;
        const maxIntensity = Math.max(
          emotions.joy,
          emotions.fear,
          emotions.anger,
          emotions.surprise
        );
        rawCells.push({ minute: m, userId, maxIntensity, emotions });
        if (maxIntensity < minVal) minVal = maxIntensity;
        if (maxIntensity > maxVal) maxVal = maxIntensity;
      }
    }

    const range = maxVal - minVal;
    const result: HeatmapCellData[] = rawCells.map(cell => {
      const normalized = range > 0.001
        ? (cell.maxIntensity - minVal) / range
        : 0.5;
      return {
        minute: cell.minute,
        userId: cell.userId,
        normalizedIntensity: normalized,
        emotions: cell.emotions
      };
    });

    return result;
  }, [history, viewMinute]);

  const heatmapStartMinute = useMemo(
    () => Math.max(0, viewMinute - WINDOW_MINUTES + 1),
    [viewMinute]
  );

  const heatmapMinuteCount = useMemo(
    () => Math.min(WINDOW_MINUTES, viewMinute + 1 - heatmapStartMinute),
    [viewMinute, heatmapStartMinute]
  );

  const handleTogglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setSliderMinute(val);
    setViewMinute(val);
  }, []);

  const avgRenderTime = useMemo(() => {
    const times = renderTimesRef.current;
    if (times.length === 0) return 0;
    return times.reduce((a, b) => a + b, 0) / times.length;
  }, [history.length]);

  const sliderValue = isPaused && sliderMinute >= 0 ? sliderMinute : maxMinute;
  const displayMinute = isPaused && sliderMinute >= 0 ? sliderMinute : maxMinute;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="toolbar">
        <div className="toolbar-left">
          <span className="toolbar-title">MoodBoard</span>
          {avgRenderTime > 0 && (
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              avg render: {avgRenderTime.toFixed(1)}ms
            </span>
          )}
        </div>
        <div className="toolbar-right">
          <div className="slider-container">
            <span className="slider-label">回溯</span>
            <input
              type="range"
              className="slider-track"
              min={0}
              max={Math.max(maxMinute, 1)}
              step={1}
              value={sliderValue}
              onChange={handleSliderChange}
              disabled={!isPaused}
              style={{ opacity: isPaused ? 1 : 0.4 }}
            />
            <span className="slider-label">第{displayMinute}分钟</span>
          </div>
          <span className="toolbar-time">
            {isPaused ? '已暂停 · ' : '会议进行中 · '}
            第{maxMinute}分钟
          </span>
          <button
            className={`btn-pause ${isPaused ? 'btn-pause--paused' : ''}`}
            onClick={handleTogglePause}
            title={isPaused ? '恢复' : '暂停'}
          >
            <span className="btn-icon">{isPaused ? '▶' : '⏸'}</span>
            <span>{isPaused ? '恢复' : '暂停'}</span>
          </button>
        </div>
      </div>

      <div className="main-content">
        <div className="column column-left">
          <EmotionTimeline
            timelineData={timelineWindowData}
            windowStart={Math.max(0, viewMinute - WINDOW_MINUTES)}
            windowEnd={viewMinute}
          />
        </div>
        <div className="column column-center">
          <LiveMeter averageEmotions={currentAverageEmotions} />
        </div>
        <div className="column column-right">
          <HeatmapGrid
            heatmapData={heatmapData}
            userIds={USER_IDS}
            totalMinutes={heatmapMinuteCount}
            startMinute={heatmapStartMinute}
          />
        </div>
      </div>
    </div>
  );
}
