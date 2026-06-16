import React, { useState, useEffect, useRef, useCallback } from 'react';
import Scene from './components/Scene';
import ControlPanel from './components/ControlPanel';
import {
  generateOrbitPoints,
  getPositionAtTime,
  getPeriodYears,
  interpolateHistorical,
  OrbitParams,
  OrbitPoint,
} from './lib/cometEngine';

export interface CometData {
  id: string;
  name: string;
  semiMajorAxis: number;
  eccentricity: number;
  inclination: number;
  perihelionEpoch: number;
  perihelionLongitude: number;
  color: string;
  isCustom?: boolean;
}

export interface SceneParams {
  cometId: string;
  orbitPoints: OrbitPoint[];
  position: { x: number; y: number; z: number };
  distanceToSun: number;
  speed: number;
  isPlaying: boolean;
  historicalTrajectories: { year: number; points: OrbitPoint[]; opacity: number }[];
  cometColor: string;
}

const App: React.FC = () => {
  const [comets, setComets] = useState<CometData[]>([]);
  const [selectedCometId, setSelectedCometId] = useState<string>('');
  const [speed, setSpeed] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [simulationTime, setSimulationTime] = useState<Date>(new Date());
  const [currentPosState, setCurrentPosState] = useState<{ x: number; y: number; z: number; distanceToSun: number }>({
    x: 0,
    y: 0,
    z: 0,
    distanceToSun: 0
  });
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const currentProgressRef = useRef<number>(0);

  useEffect(() => {
    fetch('/api/comets')
      .then((res) => res.json())
      .then((data: CometData[]) => {
        setComets(data);
        if (data.length > 0) {
          setSelectedCometId(data[0].id);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch comets:', err);
        const defaultComets: CometData[] = [
          {
            id: 'halley',
            name: '哈雷彗星',
            semiMajorAxis: 17.83,
            eccentricity: 0.967,
            inclination: 162.3,
            perihelionEpoch: 2061.0,
            perihelionLongitude: 111.33,
            color: '#85C1E9'
          }
        ];
        setComets(defaultComets);
        setSelectedCometId(defaultComets[0].id);
      });
  }, []);

  const selectedComet = comets.find((c) => c.id === selectedCometId);

  const orbitParams: OrbitParams = selectedComet
    ? {
        semiMajorAxis: selectedComet.semiMajorAxis,
        eccentricity: selectedComet.eccentricity,
        inclination: selectedComet.inclination,
        perihelionLongitude: selectedComet.perihelionLongitude,
        perihelionEpoch: selectedComet.perihelionEpoch
      }
    : {
        semiMajorAxis: 17.83,
        eccentricity: 0.967,
        inclination: 162.3,
        perihelionLongitude: 111.33,
        perihelionEpoch: 2061.0
      };

  const orbitPoints = generateOrbitPoints(orbitParams, 360);
  const periodYears = selectedComet ? getPeriodYears(selectedComet.semiMajorAxis) : 76;

  const historicalTrajectories = selectedYears.map((year, index) => {
    const baseEpoch = selectedComet?.perihelionEpoch || 2061;
    const points = interpolateHistorical(orbitPoints, year, baseEpoch);
    const opacity = 0.3 + index * 0.1;
    return { year, points, opacity };
  });

  useEffect(() => {
    const animate = (time: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = time;
      }

      const deltaTime = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (isPlaying) {
        const speedFactor = speed * 0.05;
        currentProgressRef.current = (currentProgressRef.current + deltaTime * speedFactor) % 1;

        const pos = getPositionAtTime(orbitPoints, currentProgressRef.current);
        setCurrentPosState({
          x: pos.position.x,
          y: pos.position.y,
          z: pos.position.z,
          distanceToSun: pos.position.distanceToSun
        });

        const baseYear = selectedComet?.perihelionEpoch || 2025;
        const currentYear = baseYear + currentProgressRef.current * periodYears;
        const year = Math.floor(currentYear);
        const dayOfYear = (currentYear - year) * 365;
        const date = new Date(year, 0);
        date.setDate(date.getDate() + dayOfYear);
        setSimulationTime(date);
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, speed, selectedComet, periodYears]);

  const handleCometSelect = useCallback((cometId: string) => {
    setSelectedCometId(cometId);
    currentProgressRef.current = 0;
  }, []);

  const handleSpeedChange = useCallback((newSpeed: number) => {
    setSpeed(newSpeed);
  }, []);

  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleYearToggle = useCallback((year: number) => {
    setSelectedYears((prev) => {
      if (prev.includes(year)) {
        return prev.filter((y) => y !== year);
      } else if (prev.length < 5) {
        return [...prev, year].sort();
      }
      return prev;
    });
  }, []);

  const handleAddComet = useCallback(async (cometData: Omit<CometData, 'id' | 'perihelionEpoch' | 'color' | 'isCustom'>) => {
    try {
      const response = await fetch('/api/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cometData)
      });

      if (response.ok) {
        const newComet = await response.json();
        setComets((prev) => [...prev, newComet]);
        setSelectedCometId(newComet.id);
        return true;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || '添加失败');
      }
    } catch (err) {
      console.error('Failed to add comet:', err);
      const fallbackComet: CometData = {
        id: `custom-${Date.now()}`,
        ...cometData,
        perihelionEpoch: 2025,
        color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
        isCustom: true
      };
      setComets((prev) => [...prev, fallbackComet]);
      setSelectedCometId(fallbackComet.id);
      return true;
    }
  }, []);

  const sceneParams: SceneParams = {
    cometId: selectedCometId,
    orbitPoints,
    position: { x: currentPosState.x, y: currentPosState.y, z: currentPosState.z },
    distanceToSun: currentPosState.distanceToSun,
    speed,
    isPlaying,
    historicalTrajectories,
    cometColor: selectedComet?.color || '#B0B0B0'
  };

  return (
    <div className="app-container">
      <div className="scene-container">
        <Scene params={sceneParams} />
      </div>
      <div className="control-panel-container">
        <ControlPanel
          comets={comets}
          selectedCometId={selectedCometId}
          speed={speed}
          isPlaying={isPlaying}
          selectedYears={selectedYears}
          simulationTime={simulationTime}
          cometName={selectedComet?.name || ''}
          onCometSelect={handleCometSelect}
          onSpeedChange={handleSpeedChange}
          onPlayPause={handlePlayPause}
          onYearToggle={handleYearToggle}
          onAddComet={handleAddComet}
        />
      </div>
    </div>
  );
};

export default App;
