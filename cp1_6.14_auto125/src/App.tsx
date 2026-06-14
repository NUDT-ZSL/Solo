import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { EmotionData, Emotions } from './types';
import { Simulator, averageEmotions } from './utils/Simulator';
import EmotionTimeline, { type TimelinePoint } from './components/EmotionTimeline';
import LiveMeter from './components/LiveMeter';
import HeatmapGrid, { type HeatmapCellData } from './components/HeatmapGrid';

const USER_IDS = Array.from({ length: 16 }, (_, i) => `A${String(i + 1).padStart(2, '0')}`);
const WINDOW_MINUTES = 30;

export default function App() {
  const [history, setHistory] = useState<EmotionData[][]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [sliderMinute, setSliderMinute] = useState(-1);
  const [viewMinute, setViewMinute] = useState(0);
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
        setHistory(prev => {
          const next = [...prev, latestBatchRef.current];
          if (next.length > WINDOW_MINUTES * 30) {
            return next.slice(next.length - WINDOW_MINUTES * 30);
          }
          return next;
        });
      }
    }, 2000);

    return () => {
      sim.stop();
      clearInterval(dataTimer);
    };
  }, []);

  useEffect(() => {
    if (isPaused) return;
    setSliderMinute(-1);
  }, [isPaused]);

  const maxMinute = useMemo(() => {
    if (history.length === 0) return 0;
    return Math.floor(history.length / 30);
  }, [history]);

  const currentViewMinute = useMemo(() => {
    if (isPaused && sliderMinute >= 0) return sliderMinute;
    return maxMinute;
  }, [isPaused, sliderMinute, maxMinute]);

  useEffect(() => {
    setViewMinute(currentViewMinute);
  }, [currentViewMinute]);

  const timelineData = useMemo<TimelinePoint[]>(() => {
    const result: TimelinePoint[] = [];
    const batchCount = history.length;

    for (let i = 0; i < batchCount; i += 30) {
      const minute = Math.floor(i / 30);
      const batchSlice = history.slice(i, Math.min(i + 30, batchCount));
      const allData = batchSlice.flat();
      if (allData.length === 0) continue;

      const avg = averageEmotions(allData);
      result.push({
        minute,
        joy: Number(avg.joy.toFixed(3)),
        fear: Number(avg.fear.toFixed(3)),
        anger: Number(avg.anger.toFixed(3)),
        surprise: Number(avg.surprise.toFixed(3))
      });
    }
    return result;
  }, [history]);

  const currentAverageEmotions = useMemo<Emotions>(() => {
    const viewBatchStart = currentViewMinute * 30;
    const viewBatchEnd = Math.min(viewBatchStart + 30, history.length);
    const viewData = history.slice(viewBatchStart, viewBatchEnd).flat();
    return averageEmotions(viewData);
  }, [history, currentViewMinute]);

  const heatmapData = useMemo<HeatmapCellData[]>(() => {
    const startBatch = Math.max(0, currentViewMinute - WINDOW_MINUTES + 1) * 30;
    const endBatch = (currentViewMinute + 1) * 30;
    const batchSlice = history.slice(startBatch, endBatch);

    const minuteDataMap = new Map<number, Map<string, Emotions>>();

    batchSlice.forEach((batch, batchIdx) => {
      const minute = Math.floor((startBatch + batchIdx) / 30);
      if (!minuteDataMap.has(minute)) {
        minuteDataMap.set(minute, new Map());
      }
      const userMap = minuteDataMap.get(minute)!;
      for (const entry of batch) {
        userMap.set(entry.userId, entry.emotions);
      }
    });

    const result: HeatmapCellData[] = [];
    const windowStart = Math.max(0, currentViewMinute - WINDOW_MINUTES + 1);
    let globalMin = Infinity;
    let globalMax = -Infinity;

    const rawCells: { minute: number; userId: string; maxIntensity: number; emotions: Emotions }[] = [];

    for (let m = windowStart; m <= currentViewMinute; m++) {
      const userMap = minuteDataMap.get(m);
      for (const userId of USER_IDS) {
        const emotions = userMap?.get(userId);
        if (emotions) {
          const maxIntensity = Math.max(emotions.joy, emotions.fear, emotions.anger, emotions.surprise);
          rawCells.push({ minute: m, userId, maxIntensity, emotions });
          if (maxIntensity < globalMin) globalMin = maxIntensity;
          if (maxIntensity > globalMax) globalMax = maxIntensity;
        }
      }
    }

    const range = globalMax - globalMin;
    for (const cell of rawCells) {
      const normalized = range > 0.001
        ? (cell.maxIntensity - globalMin) / range
        : (cell.maxIntensity + 1) / 2;
      result.push({
        minute: cell.minute,
        userId: cell.userId,
        normalizedIntensity: normalized,
        emotions: cell.emotions
      });
    }

    return result;
  }, [history, currentViewMinute]);

  const handleTogglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setSliderMinute(val);
  }, []);

  const handleSliderRelease = useCallback(() => {
    if (sliderMinute >= 0) {
      setViewMinute(sliderMinute);
    }
  }, [sliderMinute]);

  const sliderMax = maxMinute;
  const sliderValue = isPaused && sliderMinute >= 0 ? sliderMinute : maxMinute;
  const displayMinute = isPaused && sliderMinute >= 0 ? sliderMinute : maxMinute;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="toolbar">
        <div className="toolbar-left">
          <span className="toolbar-title">MoodBoard</span>
        </div>
        <div className="toolbar-right">
          <div className="slider-container">
            <span className="slider-label">回溯</span>
            <input
              type="range"
              className="slider-track"
              min={0}
              max={sliderMax}
              step={1}
              value={sliderValue}
              onChange={handleSliderChange}
              onMouseUp={handleSliderRelease}
              onTouchEnd={handleSliderRelease}
              disabled={!isPaused}
              style={{ opacity: isPaused ? 1 : 0.4 }}
            />
            <span className="slider-label">第{displayMinute}分钟</span>
          </div>
          <span className="toolbar-time">会议进行中 · 第{maxMinute}分钟</span>
          <button className="btn-pause" onClick={handleTogglePause}>
            {isPaused ? '▶' : '⏸'}
          </button>
        </div>
      </div>

      <div className="main-content">
        <div className="column column-left">
          <EmotionTimeline
            timelineData={timelineData}
            currentMinute={viewMinute}
          />
        </div>
        <div className="column column-center">
          <LiveMeter averageEmotions={currentAverageEmotions} />
        </div>
        <div className="column column-right">
          <HeatmapGrid
            heatmapData={heatmapData}
            userIds={USER_IDS}
            totalMinutes={Math.min(WINDOW_MINUTES, viewMinute + 1)}
            startMinute={Math.max(0, viewMinute - WINDOW_MINUTES + 1)}
          />
        </div>
      </div>
    </div>
  );
}
