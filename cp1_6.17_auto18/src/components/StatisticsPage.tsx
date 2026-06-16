import React, { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { TrainingSession, MuscleGroup } from '../types';
import {
  getWeeklyFrequencyConfig,
  getMuscleGroupVolumeConfig,
  getMaxWeightProgressConfig,
} from '../lib/chart/chartHelper';
import { exerciseLibrary } from '../data/exercises';

function formatDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}-${day}`;
}

function getDateString(dateStr: string): string {
  const date = new Date(dateStr);
  return formatDate(date);
}

function getWeeklyFrequencyData(sessions: TrainingSession[]): { date: string; count: number }[] {
  const today = new Date();
  const data: { date: string; count: number }[] = [];

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateLabel = formatDate(date);
    const dateKey = date.toDateString();

    const count = sessions.filter((s) => {
      const sessionDate = new Date(s.completedAt);
      return sessionDate.toDateString() === dateKey;
    }).length;

    data.push({ date: dateLabel, count });
  }

  return data;
}

function getMuscleGroupVolumeData(sessions: TrainingSession[]): { muscle: string; volume: number }[] {
  const volumeMap = new Map<MuscleGroup, number>();

  const exerciseMuscleMap = new Map<string, MuscleGroup>();
  exerciseLibrary.forEach((ex) => {
    exerciseMuscleMap.set(ex.id, ex.targetMuscle);
  });

  sessions.forEach((session) => {
    session.records.forEach((record) => {
      const muscle = exerciseMuscleMap.get(record.exerciseId);
      if (muscle) {
        const setVolume = record.weight * record.reps;
        volumeMap.set(muscle, (volumeMap.get(muscle) || 0) + setVolume);
      }
    });
  });

  const result: { muscle: string; volume: number }[] = [];
  volumeMap.forEach((volume, muscle) => {
    result.push({ muscle, volume: Math.round(volume) });
  });

  return result.sort((a, b) => b.volume - a.volume);
}

function getMaxWeightProgressData(
  sessions: TrainingSession[],
): { data: { date: string; maxWeight: number }[]; exerciseName: string } {
  const exerciseFrequency = new Map<string, number>();
  const exerciseNameMap = new Map<string, string>();

  exerciseLibrary.forEach((ex) => {
    exerciseNameMap.set(ex.id, ex.name);
  });

  sessions.forEach((session) => {
    session.records.forEach((record) => {
      exerciseFrequency.set(
        record.exerciseId,
        (exerciseFrequency.get(record.exerciseId) || 0) + 1,
      );
    });
  });

  let mostTrainedId = '';
  let maxCount = 0;
  exerciseFrequency.forEach((count, id) => {
    if (count > maxCount) {
      maxCount = count;
      mostTrainedId = id;
    }
  });

  if (!mostTrainedId) {
    return { data: [], exerciseName: '' };
  }

  const dailyMaxWeight = new Map<string, number>();

  sessions.forEach((session) => {
    const date = getDateString(session.completedAt);
    session.records.forEach((record) => {
      if (record.exerciseId === mostTrainedId) {
        const currentMax = dailyMaxWeight.get(date) || 0;
        if (record.weight > currentMax) {
          dailyMaxWeight.set(date, record.weight);
        }
      }
    });
  });

  const data = Array.from(dailyMaxWeight.entries())
    .sort((a, b) => {
      const dateA = new Date(a[0].split('-').reverse().join('-'));
      const dateB = new Date(b[0].split('-').reverse().join('-'));
      return dateA.getTime() - dateB.getTime();
    })
    .map(([date, maxWeight]) => ({ date, maxWeight }));

  const exerciseName = exerciseNameMap.get(mostTrainedId) || mostTrainedId;

  return { data, exerciseName };
}

export default function StatisticsPage() {
  const [history, setHistory] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const weeklyChartRef = useRef<HTMLDivElement>(null);
  const muscleChartRef = useRef<HTMLDivElement>(null);
  const progressChartRef = useRef<HTMLDivElement>(null);

  const weeklyChartInstance = useRef<echarts.ECharts | null>(null);
  const muscleChartInstance = useRef<echarts.ECharts | null>(null);
  const progressChartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/history?days=30');
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to fetch history');
        }
        const data = await res.json();
        setHistory(data);
      } catch (err: any) {
        setError(err.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  useEffect(() => {
    if (loading || error || history.length === 0) return;

    if (weeklyChartRef.current && !weeklyChartInstance.current) {
      weeklyChartInstance.current = echarts.init(weeklyChartRef.current);
    }
    if (muscleChartRef.current && !muscleChartInstance.current) {
      muscleChartInstance.current = echarts.init(muscleChartRef.current);
    }
    if (progressChartRef.current && !progressChartInstance.current) {
      progressChartInstance.current = echarts.init(progressChartRef.current);
    }

    const weeklyData = getWeeklyFrequencyData(history);
    if (weeklyChartInstance.current) {
      weeklyChartInstance.current.setOption(getWeeklyFrequencyConfig(weeklyData));
    }

    const muscleData = getMuscleGroupVolumeData(history);
    if (muscleChartInstance.current) {
      muscleChartInstance.current.setOption(getMuscleGroupVolumeConfig(muscleData));
    }

    const progressData = getMaxWeightProgressData(history);
    if (progressChartInstance.current) {
      progressChartInstance.current.setOption(
        getMaxWeightProgressConfig(progressData.data, progressData.exerciseName),
      );
    }

    const handleResize = () => {
      weeklyChartInstance.current?.resize();
      muscleChartInstance.current?.resize();
      progressChartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [history, loading, error]);

  useEffect(() => {
    return () => {
      weeklyChartInstance.current?.dispose();
      muscleChartInstance.current?.dispose();
      progressChartInstance.current?.dispose();
      weeklyChartInstance.current = null;
      muscleChartInstance.current = null;
      progressChartInstance.current = null;
    };
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Loading...</div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#E53935' }}>
        {error}
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: 24, color: '#0D1B2A', fontSize: 24 }}>Statistics</h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 20,
        }}
        className="card-grid-2"
      >
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ marginBottom: 12, color: '#333', fontSize: 16 }}>Weekly Training Frequency</h3>
          <div ref={weeklyChartRef} style={{ width: '100%', height: 300 }} />
        </div>

        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ marginBottom: 12, color: '#333', fontSize: 16 }}>Muscle Group Volume</h3>
          <div ref={muscleChartRef} style={{ width: '100%', height: 300 }} />
        </div>

        <div className="card" style={{ padding: 20, gridColumn: '1 / -1' }}>
          <h3 style={{ marginBottom: 12, color: '#333', fontSize: 16 }}>Max Weight Progress</h3>
          <div ref={progressChartRef} style={{ width: '100%', height: 300 }} />
        </div>
      </div>
    </div>
  );
}
