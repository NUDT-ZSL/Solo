import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import Scene3D from './components/Scene3D';
import ControlPanel from './components/ControlPanel';
import SunlightChart from './components/SunlightChart';
import { fetchBuildings, saveSession, BuildingParams } from './utils/api';
import { calculateFacadeSunHours, getSolarPosition } from './utils/solarCalculator';

export interface BuildingData extends BuildingParams {
  number: number;
}

const App: React.FC = () => {
  const [buildings, setBuildings] = useState<BuildingData[]>([]);
  const [month, setMonth] = useState(6);
  const [day, setDay] = useState(21);
  const [hour, setHour] = useState(10);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [facadeSunHours, setFacadeSunHours] = useState<{
    north: number; south: number; east: number; west: number;
  } | null>(null);
  const [showSunReport, setShowSunReport] = useState(false);

  useEffect(() => {
    fetchBuildings().then((data) => {
      const enriched = data.map((b, i) => ({ ...b, number: i + 1 }));
      setBuildings(enriched);
    }).catch(() => {
      const fallback = generateFallbackBuildings();
      setBuildings(fallback);
    });
  }, []);

  const generateFallbackBuildings = (): BuildingData[] => {
    const positions = [
      { x: -6, z: -4 }, { x: -2, z: -6 }, { x: 2, z: -3 }, { x: 6, z: -5 },
      { x: -8, z: 0 }, { x: -4, z: 2 }, { x: 0, z: 0 }, { x: 4, z: 1 },
      { x: 8, z: -1 }, { x: -5, z: 5 }, { x: -1, z: 4 }, { x: 3, z: 6 },
      { x: 7, z: 4 },
    ];
    return positions.map((p, i) => {
      const h = Math.floor(Math.random() * 10) + 3;
      const t = (h - 3) / 9;
      const r = Math.round(0xf9 + (0x3b - 0xf9) * t);
      const g = Math.round(0x73 + (0x82 - 0x73) * t);
      const b = Math.round(0x16 + (0xf6 - 0x16) * t);
      return {
        id: `b${i + 1}`,
        x: p.x, z: p.z, height: h, width: 3, depth: 3,
        color: `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`,
        number: i + 1,
      };
    });
  };

  useEffect(() => {
    if (!selectedBuildingId) {
      setFacadeSunHours(null);
      return;
    }
    const building = buildings.find(b => b.id === selectedBuildingId);
    if (!building) return;

    const buildingInputs = buildings.map(b => ({
      x: b.x, z: b.z, height: b.height, width: b.width, depth: b.depth,
    }));

    const north = calculateFacadeSunHours('north', { x: building.x, z: building.z }, building.height, buildingInputs, month, day);
    const south = calculateFacadeSunHours('south', { x: building.x, z: building.z }, building.height, buildingInputs, month, day);
    const east = calculateFacadeSunHours('east', { x: building.x, z: building.z }, building.height, buildingInputs, month, day);
    const west = calculateFacadeSunHours('west', { x: building.x, z: building.z }, building.height, buildingInputs, month, day);

    setFacadeSunHours({ north, south, east, west });
  }, [selectedBuildingId, month, day, buildings]);

  const handleBuildingSelect = useCallback((id: string | null) => {
    setSelectedBuildingId(id);
    if (id) {
      saveSession({ buildingId: id, month, day, hour }).catch(() => {});
    }
  }, [month, day, hour]);

  const handleBuildingSelectFromPanel = useCallback((id: string) => {
    setSelectedBuildingId(id);
    saveSession({ buildingId: id, month, day, hour }).catch(() => {});
  }, [month, day, hour]);

  const selectedBuilding = useMemo(() =>
    buildings.find(b => b.id === selectedBuildingId) || null
  , [buildings, selectedBuildingId]);

  const solarPosition = useMemo(() =>
    getSolarPosition(month, day, hour)
  , [month, day, hour]);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0f172a', position: 'relative', overflow: 'hidden' }}>
      <div style={{ width: '100%', height: '90vh', position: 'relative' }}>
        <Canvas
          shadows
          camera={{ position: [25, 20, 25], fov: 50, near: 0.1, far: 200 }}
          gl={{ antialias: true, alpha: false }}
          onCreated={({ gl }) => {
            gl.toneMapping = 2;
            gl.toneMappingExposure = 1.0;
          }}
        >
          <Scene3D
            buildings={buildings}
            selectedBuildingId={selectedBuildingId}
            onSelectBuilding={handleBuildingSelect}
            solarPosition={solarPosition}
            month={month}
            day={day}
            showSunReport={showSunReport}
          />
        </Canvas>
      </div>

      <ControlPanel
        month={month}
        day={day}
        hour={hour}
        buildings={buildings}
        selectedBuildingId={selectedBuildingId}
        onMonthChange={setMonth}
        onDayChange={setDay}
        onHourChange={setHour}
        onBuildingSelect={handleBuildingSelectFromPanel}
        onSunReport={() => setShowSunReport(!showSunReport)}
        showSunReport={showSunReport}
      />

      {facadeSunHours && selectedBuilding && (
        <SunlightChart
          sunHours={facadeSunHours}
          buildingNumber={selectedBuilding.number}
          buildingHeight={selectedBuilding.height}
        />
      )}
    </div>
  );
};

export default App;
