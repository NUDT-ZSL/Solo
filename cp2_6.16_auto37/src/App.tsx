import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as dat from 'dat.gui';
import Scene from './components/Scene';
import { BuildingData, SolarResult, SimulationStatus } from './types';
import { generateBuildings, generateDefaultBuildings } from './utils/buildingGenerator';
import { calculateSolarIntensity } from './utils/solarSimulator';

const DEFAULT_PARAMS = {
  density: 60,
  maxHeight: 20,
  greenRate: 20,
  dayOfYear: 172,
  latitude: 35
};

function getDateFromDayOfYear(day: number): string {
  const date = new Date(2024, 0, 1);
  date.setDate(day);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function getSolarStatusLabel(status: SimulationStatus): string {
  switch (status) {
    case 'idle': return '待模拟';
    case 'solar_calculating':
    case 'wind_calculating': return '计算中...';
    case 'solar_done':
    case 'wind_done': return '模拟完成';
    default: return '待模拟';
  }
}

function getStatusClass(status: SimulationStatus): string {
  switch (status) {
    case 'solar_calculating':
    case 'wind_calculating': return 'calculating';
    case 'solar_done':
    case 'wind_done': return 'done';
    default: return 'idle';
  }
}

export default function App() {
  const [buildings, setBuildings] = useState<BuildingData[]>([]);
  const [solarResults, setSolarResults] = useState<SolarResult[][] | undefined>();
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showWind, setShowWind] = useState(false);
  const [simStatus, setSimStatus] = useState<SimulationStatus>('idle');
  const [isMobile, setIsMobile] = useState(false);
  const [params, setParams] = useState(DEFAULT_PARAMS);

  const guiRef = useRef<dat.GUI | null>(null);
  const guiContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const windParticleCount = isMobile ? 200 : 300;

  useEffect(() => {
    setBuildings(generateDefaultBuildings());
  }, []);

  const regenerateBuildings = useCallback(() => {
    setBuildings(generateBuildings(params.density, params.maxHeight, params.greenRate));
    setShowHeatmap(false);
    setShowWind(false);
    setSimStatus('idle');
    setSolarResults(undefined);
  }, [params]);

  const runSolarSimulation = useCallback(() => {
    setSimStatus('solar_calculating');
    setShowHeatmap(false);

    setTimeout(() => {
      const results = calculateSolarIntensity(
        buildings.filter(b => !b.isGreen),
        params.dayOfYear,
        params.latitude
      );
      setSolarResults(results);
      setShowHeatmap(true);
      setSimStatus('solar_done');
    }, 50);
  }, [buildings, params.dayOfYear, params.latitude]);

  const runWindSimulation = useCallback(() => {
    setSimStatus('wind_calculating');

    setTimeout(() => {
      setShowWind(true);
      setSimStatus('wind_done');
    }, 300);
  }, []);

  const resetSimulation = useCallback(() => {
    setParams(DEFAULT_PARAMS);
    setBuildings(generateDefaultBuildings());
    setShowHeatmap(false);
    setShowWind(false);
    setSimStatus('idle');
    setSolarResults(undefined);
  }, []);

  useEffect(() => {
    if (!guiContainerRef.current) return;

    const gui = new dat.GUI({ autoPlace: false, width: 280 });
    guiRef.current = gui;
    guiContainerRef.current.appendChild(gui.domElement);

    const buildingFolder = gui.addFolder('建筑参数');
    buildingFolder.open();

    buildingFolder.add(params, 'density', 0, 100, 1)
      .name('建筑密度 (%)')
      .onChange((val: number) => {
        setParams(p => ({ ...p, density: val }));
      })
      .onFinishChange(() => {
        regenerateBuildings();
      });

    buildingFolder.add(params, 'maxHeight', 5, 30, 1)
      .name('最大高度')
      .onChange((val: number) => {
        setParams(p => ({ ...p, maxHeight: val }));
      })
      .onFinishChange(() => {
        regenerateBuildings();
      });

    buildingFolder.add(params, 'greenRate', 0, 40, 1)
      .name('绿化率 (%)')
      .onChange((val: number) => {
        setParams(p => ({ ...p, greenRate: val }));
      })
      .onFinishChange(() => {
        regenerateBuildings();
      });

    const solarFolder = gui.addFolder('日照参数');
    solarFolder.open();

    solarFolder.add(params, 'dayOfYear', 1, 365, 1)
      .name('日期 (天)')
      .onChange((val: number) => {
        setParams(p => ({ ...p, dayOfYear: val }));
      })
      .onFinishChange(() => {
        if (showHeatmap) {
          runSolarSimulation();
        }
      });

    solarFolder.add(params, 'latitude', 0, 90, 1)
      .name('纬度 (°)')
      .onChange((val: number) => {
        setParams(p => ({ ...p, latitude: val }));
      })
      .onFinishChange(() => {
        if (showHeatmap) {
          runSolarSimulation();
        }
      });

    const simFolder = gui.addFolder('模拟控制');
    simFolder.open();

    simFolder.add({ runSolar: () => runSolarSimulation() }, 'runSolar')
      .name('运行日照模拟');

    simFolder.add({ runWind: () => runWindSimulation() }, 'runWind')
      .name('运行风模拟');

    simFolder.add({ reset: () => resetSimulation() }, 'reset')
      .name('重置');

    return () => {
      gui.destroy();
      guiRef.current = null;
    };
  }, []);

  const buildingCount = buildings.filter(b => !b.isGreen).length;
  const greenCount = buildings.filter(b => b.isGreen).length;

  return (
    <div className="app-container">
      <div ref={guiContainerRef} className="gui-container" />

      <div className="top-right-status">
        <div className={`sim-status-badge ${getStatusClass(simStatus)}`}>
          {(simStatus === 'solar_calculating' || simStatus === 'wind_calculating') && (
            <div className="spinner" />
          )}
          <span>{getSolarStatusLabel(simStatus)}</span>
        </div>
      </div>

      <div className="bottom-left-info">
        <div className="info-row">
          <span className="info-label">日期</span>
          <span className="info-value">{getDateFromDayOfYear(params.dayOfYear)}</span>
        </div>
        <div className="info-row">
          <span className="info-label">纬度</span>
          <span className="info-value">{params.latitude}°</span>
        </div>
      </div>

      <div className="canvas-container">
        <Scene
          buildings={buildings}
          solarResults={solarResults}
          showHeatmap={showHeatmap}
          showWind={showWind}
          dayOfYear={params.dayOfYear}
          latitude={params.latitude}
          isMobile={isMobile}
          windParticleCount={windParticleCount}
        />
      </div>

      <div className="status-bar">
        <div className="status-item">
          <span className="status-label">建筑数量:</span>
          <span className="status-value">{buildingCount}</span>
        </div>
        <div className="status-item">
          <span className="status-label">绿化区域:</span>
          <span className="status-value">{greenCount}</span>
        </div>
        <div className="status-item">
          <span className="status-label">密度:</span>
          <span className="status-value">{params.density}%</span>
        </div>
        <div className="status-item">
          <span className="status-label">最高建筑:</span>
          <span className="status-value">{params.maxHeight} 单位</span>
        </div>
        <div className="status-item">
          <span className="status-label">绿化率:</span>
          <span className="status-value">{params.greenRate}%</span>
        </div>
        {showHeatmap && (
          <div className="status-item">
            <span className="status-label">日照模拟:</span>
            <span className="status-value" style={{ color: '#81c784' }}>已启用</span>
          </div>
        )}
        {showWind && (
          <div className="status-item">
            <span className="status-label">风模拟:</span>
            <span className="status-value" style={{ color: '#64b5f6' }}>已启用</span>
          </div>
        )}
      </div>
    </div>
  );
}
