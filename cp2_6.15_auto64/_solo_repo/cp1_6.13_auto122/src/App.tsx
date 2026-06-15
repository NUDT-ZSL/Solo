import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import SceneManager from './components/SceneManager';
import ControlPanel from './components/ControlPanel';
import BuildingInfoModal from './components/BuildingInfoModal';

export interface Building {
  id: string;
  name: string;
  position: { x: number; z: number };
  width: number;
  depth: number;
  height: number;
  color: string;
  createdAt: number;
}

export interface SunReportItem {
  hour: number;
  shadowRatio: number;
}

export interface SunReport {
  summerSolstice: SunReportItem[];
  winterSolstice: SunReportItem[];
}

interface SceneContextType {
  buildings: Building[];
  addBuilding: (building: Building) => void;
  updateBuilding: (id: string, updates: Partial<Building>) => void;
  removeBuilding: (id: string) => void;
  clearBuildings: () => void;
  selectedBuildingId: string | null;
  setSelectedBuildingId: (id: string | null) => void;
  sunAltitude: number;
  setSunAltitude: (deg: number) => void;
  sunAzimuth: number;
  setSunAzimuth: (deg: number) => void;
  currentDateTime: Date;
  setCurrentDateTime: (date: Date) => void;
  isAddingMode: boolean;
  setIsAddingMode: (mode: boolean) => void;
  modalBuildingId: string | null;
  setModalBuildingId: (id: string | null) => void;
  isCutawayView: boolean;
  setIsCutawayView: (v: boolean) => void;
  cutawayBuildingId: string | null;
  setCutawayBuildingId: (id: string | null) => void;
  calculateShadowRatio: (buildingId: string, alt?: number, azi?: number) => number;
  generateSunReport: (buildingId: string) => SunReport;
  saveLayout: (name: string) => Promise<void>;
  loadLayout: (id: string) => Promise<void>;
  listLayouts: () => Promise<Array<{ _id: string; name: string; buildingCount: number }>>;
}

const SceneContext = createContext<SceneContextType | null>(null);

export const useScene = () => {
  const ctx = useContext(SceneContext);
  if (!ctx) throw new Error('useScene must be used within SceneProvider');
  return ctx;
};

const MAX_BUILDINGS = 50;

const App: React.FC = () => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [sunAltitude, setSunAltitude] = useState<number>(45);
  const [sunAzimuth, setSunAzimuth] = useState<number>(180);
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());
  const [isAddingMode, setIsAddingMode] = useState<boolean>(false);
  const [modalBuildingId, setModalBuildingId] = useState<string | null>(null);
  const [isCutawayView, setIsCutawayView] = useState<boolean>(false);
  const [cutawayBuildingId, setCutawayBuildingId] = useState<string | null>(null);
  const buildingCounter = useRef<number>(1);

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCutawayView) {
          setIsCutawayView(false);
          setCutawayBuildingId(null);
        } else if (modalBuildingId) {
          setModalBuildingId(null);
        } else if (selectedBuildingId) {
          setSelectedBuildingId(null);
        } else if (isAddingMode) {
          setIsAddingMode(false);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isCutawayView, modalBuildingId, selectedBuildingId, isAddingMode]);

  const addBuilding = useCallback((building: Building) => {
    setBuildings(prev => {
      if (prev.length >= MAX_BUILDINGS) return prev;
      return [...prev, building];
    });
    buildingCounter.current += 1;
  }, []);

  const updateBuilding = useCallback((id: string, updates: Partial<Building>) => {
    setBuildings(prev => prev.map(b => (b.id === id ? { ...b, ...updates } : b)));
  }, []);

  const removeBuilding = useCallback((id: string) => {
    setBuildings(prev => prev.filter(b => b.id !== id));
    if (selectedBuildingId === id) setSelectedBuildingId(null);
  }, [selectedBuildingId]);

  const clearBuildings = useCallback(() => {
    setBuildings([]);
    setSelectedBuildingId(null);
  }, []);

  const snapToGrid = (v: number, grid: number = 2) => Math.round(v / grid) * grid;

  const calculateShadowRatio = useCallback(
    (buildingId: string, alt: number = sunAltitude, azi: number = sunAzimuth): number => {
      const building = buildings.find(b => b.id === buildingId);
      if (!building) return 0;
      const altRad = (alt * Math.PI) / 180;
      const aziRad = (azi * Math.PI) / 180;
      if (altRad <= 0) return 1;
      const shadowLen = building.height / Math.tan(altRad);
      const dx = -shadowLen * Math.sin(aziRad);
      const dz = -shadowLen * Math.cos(aziRad);
      const footprint = building.width * building.depth;
      const shadowArea = footprint + Math.abs(dx) * building.depth + Math.abs(dz) * building.width;
      const totalArea = 40 * 40;
      return Math.min(1, shadowArea / totalArea * 4);
    },
    [buildings, sunAltitude, sunAzimuth]
  );

  const generateSunReport = useCallback(
    (buildingId: string): SunReport => {
      const building = buildings.find(b => b.id === buildingId);
      if (!building) return { summerSolstice: [], winterSolstice: [] };

      const calcDayReport = (lat: number, declination: number): SunReportItem[] => {
        const items: SunReportItem[] = [];
        for (let hour = 8; hour <= 18; hour++) {
          const solarTime = hour - 12;
          const hourAngle = (solarTime * 15 * Math.PI) / 180;
          const latRad = (lat * Math.PI) / 180;
          const declRad = (declination * Math.PI) / 180;
          const sinAlt = Math.sin(latRad) * Math.sin(declRad) + Math.cos(latRad) * Math.cos(declRad) * Math.cos(hourAngle);
          const altitude = Math.max(0, (Math.asin(sinAlt) * 180) / Math.PI);
          const cosAz = (Math.sin(declRad) - Math.sin(latRad) * sinAlt) / (Math.cos(latRad) * Math.cos(Math.asin(Math.max(0, sinAlt))));
          let azimuth = (Math.acos(Math.max(-1, Math.min(1, cosAz || 0))) * 180) / Math.PI;
          if (solarTime > 0) azimuth = 360 - azimuth;
          items.push({ hour, shadowRatio: calculateShadowRatioInternal(building, altitude, azimuth) });
        }
        return items;
      };

      const lat = 39.9;
      return {
        summerSolstice: calcDayReport(lat, 23.44),
        winterSolstice: calcDayReport(lat, -23.44),
      };
    },
    [buildings]
  );

  const saveLayout = useCallback(
    async (name: string) => {
      try {
        const res = await fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            buildings,
            sunAltitude,
            sunAzimuth,
            createdAt: new Date().toISOString(),
          }),
        });
        if (!res.ok) throw new Error('Save failed');
      } catch (e) {
        console.error('Save error:', e);
        throw e;
      }
    },
    [buildings, sunAltitude, sunAzimuth]
  );

  const loadLayout = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/load?id=${encodeURIComponent(id)}`);
      const json = await res.json();
      if (json.success && json.data && json.data.length > 0) {
        const layout = json.data[0];
        setBuildings(layout.buildings || []);
        setSunAltitude(layout.sunAltitude ?? 45);
        setSunAzimuth(layout.sunAzimuth ?? 180);
        setSelectedBuildingId(null);
      }
    } catch (e) {
      console.error('Load error:', e);
      throw e;
    }
  }, []);

  const listLayouts = useCallback(async () => {
    try {
      const res = await fetch('/api/layouts');
      const json = await res.json();
      return json.success ? json.data : [];
    } catch (e) {
      console.error('List error:', e);
      return [];
    }
  }, []);

  const contextValue: SceneContextType = {
    buildings,
    addBuilding,
    updateBuilding,
    removeBuilding,
    clearBuildings,
    selectedBuildingId,
    setSelectedBuildingId,
    sunAltitude,
    setSunAltitude,
    sunAzimuth,
    setSunAzimuth,
    currentDateTime,
    setCurrentDateTime,
    isAddingMode,
    setIsAddingMode,
    modalBuildingId,
    setModalBuildingId,
    isCutawayView,
    setIsCutawayView,
    cutawayBuildingId,
    setCutawayBuildingId,
    calculateShadowRatio,
    generateSunReport,
    saveLayout,
    loadLayout,
    listLayouts,
  };

  const selectedBuilding = buildings.find(b => b.id === selectedBuildingId) || null;
  const modalBuilding = buildings.find(b => b.id === modalBuildingId) || null;

  return (
    <SceneContext.Provider value={contextValue}>
      <div style={{ width: '100%', height: '100%', position: 'relative', background: '#0f172a' }}>
        <SceneManager />
        <ControlPanel selectedBuilding={selectedBuilding} />
        {modalBuilding && <BuildingInfoModal building={modalBuilding} />}
      </div>
    </SceneContext.Provider>
  );
};

function calculateShadowRatioInternal(building: Building, altitude: number, azimuth: number): number {
  const altRad = (altitude * Math.PI) / 180;
  if (altRad <= 0.01) return 1;
  const aziRad = (azimuth * Math.PI) / 180;
  const shadowLen = building.height / Math.tan(altRad);
  const dx = Math.abs(-shadowLen * Math.sin(aziRad));
  const dz = Math.abs(-shadowLen * Math.cos(aziRad));
  const footprint = building.width * building.depth;
  const extArea = dx * building.depth + dz * building.width + dx * dz;
  const shadowArea = footprint + extArea;
  const plotArea = 40 * 40;
  return Math.min(1, shadowArea / plotArea * 2.5);
}

export default App;
