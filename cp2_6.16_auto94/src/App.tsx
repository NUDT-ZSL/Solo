import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { ElevationPoint, PaceEntry, SimulationState, RaceResult } from './types';
import { validateTimeFormat, parseTimeInput } from './utils/format';
import {
  calculatePacePlan,
  validateElevationData,
  generateElevationData
} from './utils/paceCalculator';
import PaceTable from './components/PaceTable';
import PaceChart from './components/PaceChart';
import SimulationBar from './components/SimulationBar';
import ResultModal from './components/ResultModal';

const MARATHON_DISTANCE = 42.2;
const SIMULATION_RATE = 1;

const App: React.FC = () => {
  const [raceDate, setRaceDate] = useState<string>('');
  const [targetTimeInput, setTargetTimeInput] = useState<string>('3:30');
  const [targetTimeError, setTargetTimeError] = useState<string>('');
  const [elevationData, setElevationData] = useState<ElevationPoint[]>(generateElevationData());
  const [fileName, setFileName] = useState<string>('默认赛道.json');
  const [elevationError, setElevationError] = useState<string>('');
  const [paceData, setPaceData] = useState<PaceEntry[]>([]);
  const [isGenerated, setIsGenerated] = useState(false);

  const [simulation, setSimulation] = useState<SimulationState>({
    isRunning: false,
    currentKm: 0,
    currentPace: 0,
    cumulativeTime: 0,
    isCompleted: false
  });

  const [raceResult, setRaceResult] = useState<RaceResult | null>(null);

  const simulationFrameRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const currentKmIndexRef = useRef<number>(0);
  const kmProgressRef = useRef<number>(0);

  const targetTimeSeconds = useMemo(() => {
    return parseTimeInput(targetTimeInput);
  }, [targetTimeInput]);

  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRaceDate(e.target.value);
  }, []);

  const handleTimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTargetTimeInput(value);

    if (!validateTimeFormat(value)) {
      setTargetTimeError('请输入正确的格式（小时:分钟，例如 3:30）');
    } else {
      const parsed = parseTimeInput(value);
      if (parsed === null || parsed < 9000 || parsed > 36000) {
        setTargetTimeError('完赛时间应在2.5小时到10小时之间');
      } else {
        setTargetTimeError('');
      }
    }
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setElevationError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);
        const validated = validateElevationData(data);

        if (validated === null) {
          setElevationError('JSON格式不正确，请确保包含 distance 和 elevation 字段的数组');
          return;
        }

        setElevationData(validated);
        setIsGenerated(false);
        setPaceData([]);
      } catch {
        setElevationError('文件解析失败，请确保是有效的JSON文件');
      }
    };
    reader.onerror = () => {
      setElevationError('文件读取失败');
    };
    reader.readAsText(file);
  }, []);

  const generatePlan = useCallback(() => {
    if (targetTimeError || targetTimeSeconds === null) {
      return;
    }

    const plan = calculatePacePlan(targetTimeSeconds, elevationData);
    setPaceData(plan);
    setIsGenerated(true);
    setSimulation({
      isRunning: false,
      currentKm: 0,
      currentPace: plan[0]?.actualPace || 0,
      cumulativeTime: 0,
      isCompleted: false
    });
    currentKmIndexRef.current = 0;
    kmProgressRef.current = 0;
  }, [targetTimeError, targetTimeSeconds, elevationData]);

  const handlePaceChange = useCallback((km: number, newPace: number) => {
    setPaceData(prev => {
      const newData = [...prev];
      const index = newData.findIndex(p => p.km === km);
      if (index === -1) return prev;

      const oldPace = newData[index].actualPace;
      const paceDiff = newPace - oldPace;

      newData[index] = {
        ...newData[index],
        actualPace: newPace
      };

      for (let i = index; i < newData.length; i++) {
        if (i === index) {
          newData[i].cumulativeTime = Math.round((newData[i].cumulativeTime + paceDiff) * 10) / 10;
        } else {
          const prevCumulative = newData[i - 1].cumulativeTime;
          const isLast = i === newData.length - 1;
          const distance = isLast ? 0.2 : 1;
          newData[i].cumulativeTime = Math.round((prevCumulative + newData[i].actualPace * distance) * 10) / 10;
        }
      }

      return newData;
    });
  }, []);

  const updateSimulation = useCallback((timestamp: number) => {
    if (lastUpdateRef.current === 0) {
      lastUpdateRef.current = timestamp;
    }

    const deltaTime = (timestamp - lastUpdateRef.current) / 1000;
    lastUpdateRef.current = timestamp;

    setSimulation(prev => {
      if (!prev.isRunning || prev.isCompleted) return prev;

      let currentIndex = currentKmIndexRef.current;
      let kmProgress = kmProgressRef.current + deltaTime * SIMULATION_RATE;

      while (kmProgress >= 1 && currentIndex < paceData.length - 1) {
        currentIndex++;
        kmProgress -= 1;
      }

      if (currentIndex >= paceData.length - 1) {
        const lastEntry = paceData[paceData.length - 1];
        const finalTime = lastEntry.cumulativeTime;

        const result: RaceResult = {
          targetTime: targetTimeSeconds || 0,
          actualTime: finalTime,
          difference: finalTime - (targetTimeSeconds || 0),
          paceList: paceData
        };

        setRaceResult(result);

        return {
          ...prev,
          currentKm: MARATHON_DISTANCE,
          currentPace: lastEntry.actualPace,
          cumulativeTime: finalTime,
          isRunning: false,
          isCompleted: true
        };
      }

      currentKmIndexRef.current = currentIndex;
      kmProgressRef.current = kmProgress;

      const currentEntry = paceData[currentIndex];
      const nextEntry = paceData[currentIndex + 1];
      const currentKm = currentEntry.km + kmProgress;

      const prevCumulative = currentIndex > 0 ? paceData[currentIndex - 1].cumulativeTime : 0;
      const currentKmTime = currentEntry.actualPace * kmProgress;
      const cumulativeTime = prevCumulative + currentKmTime;

      const isLastSegment = currentIndex === paceData.length - 2;
      const nextKmDistance = isLastSegment ? 0.2 : 1;
      const interpolatedPace =
        currentEntry.actualPace +
        (kmProgress / nextKmDistance) * (nextEntry.actualPace - currentEntry.actualPace);

      return {
        ...prev,
        currentKm: Math.min(currentKm, MARATHON_DISTANCE),
        currentPace: interpolatedPace,
        cumulativeTime
      };
    });

    simulationFrameRef.current = requestAnimationFrame(updateSimulation);
  }, [paceData, targetTimeSeconds]);

  const startSimulation = useCallback(() => {
    if (paceData.length === 0) return;

    setSimulation(prev => ({
      ...prev,
      isRunning: true
    }));
    lastUpdateRef.current = 0;
    simulationFrameRef.current = requestAnimationFrame(updateSimulation);
  }, [paceData.length, updateSimulation]);

  const pauseSimulation = useCallback(() => {
    setSimulation(prev => ({
      ...prev,
      isRunning: false
    }));
    if (simulationFrameRef.current !== null) {
      cancelAnimationFrame(simulationFrameRef.current);
      simulationFrameRef.current = null;
    }
  }, []);

  const resetSimulation = useCallback(() => {
    pauseSimulation();
    setSimulation({
      isRunning: false,
      currentKm: 0,
      currentPace: paceData[0]?.actualPace || 0,
      cumulativeTime: 0,
      isCompleted: false
    });
    currentKmIndexRef.current = 0;
    kmProgressRef.current = 0;
    setRaceResult(null);
  }, [pauseSimulation, paceData]);

  const closeModal = useCallback(() => {
    setRaceResult(null);
  }, []);

  useEffect(() => {
    return () => {
      if (simulationFrameRef.current !== null) {
        cancelAnimationFrame(simulationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isGenerated && paceData.length === 0) {
      generatePlan();
    }
  }, [isGenerated, paceData.length, generatePlan]);

  const canGenerate = !targetTimeError && targetTimeSeconds !== null && elevationData.length >= 2;
  const isSimulating = simulation.isRunning || simulation.currentKm > 0;

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">🏃 马拉松配速策略助手</h1>
        <p className="app-subtitle">
          科学分配体力，避免后程崩溃，助你创造PB
        </p>
      </header>

      <div className="input-section">
        <div className="input-group">
          <label className="input-label">比赛日期</label>
          <input
            type="date"
            className="input-field"
            value={raceDate}
            onChange={handleDateChange}
            disabled={isSimulating}
          />
        </div>

        <div className="input-group">
          <label className="input-label">目标完赛时间</label>
          <input
            type="text"
            className={`input-field ${targetTimeError ? 'error' : ''}`}
            value={targetTimeInput}
            onChange={handleTimeChange}
            placeholder="例如: 3:30"
            disabled={isSimulating}
          />
          {targetTimeError && <span className="input-error">{targetTimeError}</span>}
        </div>

        <div className="input-group">
          <label className="input-label">赛道海拔图</label>
          <div className="file-input-wrapper">
            <input
              type="file"
              accept=".json"
              className="file-input"
              onChange={handleFileUpload}
              disabled={isSimulating}
            />
            <label className="file-label">
              📁 {fileName}
            </label>
          </div>
          {elevationError && <span className="input-error">{elevationError}</span>}
        </div>

        <button
          className="button"
          onClick={generatePlan}
          disabled={!canGenerate || isSimulating}
        >
          生成配速方案
        </button>
      </div>

      {isGenerated && paceData.length > 0 && (
        <>
          <div className="content-layout">
            <div style={{ flex: 1 }}>
              <PaceChart
                paceData={paceData}
                currentKm={simulation.currentKm}
                onPaceChange={handlePaceChange}
                disabled={isSimulating}
              />
            </div>
            <div style={{ flex: 1 }}>
              <PaceTable
                paceData={paceData}
                onPaceChange={handlePaceChange}
                disabled={isSimulating}
              />
            </div>
          </div>

          <SimulationBar
            simulation={simulation}
            targetTime={targetTimeSeconds || 0}
            onStart={startSimulation}
            onPause={pauseSimulation}
            onReset={resetSimulation}
            disabled={!isGenerated || simulation.isCompleted}
          />
        </>
      )}

      <ResultModal result={raceResult} onClose={closeModal} />
    </div>
  );
};

export default App;
