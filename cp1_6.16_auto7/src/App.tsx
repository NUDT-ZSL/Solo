import React, { useState, useCallback, useRef, useEffect } from 'react';
import MaterialPanel from './components/MaterialPanel';
import Workbench from './components/Workbench';
import PropertyPanel from './components/PropertyPanel';
import Toolbar from './components/Toolbar';
import CardModal from './components/CardModal';
import {
  PotMaterial,
  Plant,
  Decoration,
  BonsaiState,
  cloneState,
  statesEqual
} from './utils/bonSaiLogic';
import {
  createInitialState,
  pushHistory,
  undoHistory,
  redoHistory,
  canUndo,
  canRedo,
  HistoryState
} from './utils/history';

const STORAGE_KEY = 'bonsai-studio-state';

interface DecoRelativePosition {
  id: string;
  type: string;
  name: string;
  color: string;
  width: number;
  height: number;
  pctX: number;
  pctY: number;
}

function saveStateToStorage(state: BonsaiState, containerWidth?: number, containerHeight?: number) {
  try {
    const data: {
      pot: BonsaiState['pot'];
      plant: BonsaiState['plant'];
      decoPositions: DecoRelativePosition[];
    } = {
      pot: state.pot,
      plant: state.plant,
      decoPositions: state.decorations.map(d => {
        const pctX = containerWidth && containerWidth > 0 ? d.x / containerWidth : d.x;
        const pctY = containerHeight && containerHeight > 0 ? d.y / containerHeight : d.y;
        return { id: d.id, type: d.type, name: d.name, color: d.color, width: d.width, height: d.height, pctX, pctY };
      })
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (_e) {
    // ignore storage errors
  }
}

function loadStateFromStorage(containerWidth?: number, containerHeight?: number): BonsaiState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const decorations: Decoration[] = (data.decoPositions || []).map((dp: DecoRelativePosition) => ({
      id: dp.id,
      type: dp.type as 'stone' | 'moss' | 'doll',
      name: dp.name,
      color: dp.color,
      width: dp.width,
      height: dp.height,
      x: containerWidth && containerWidth > 0 ? dp.pctX * containerWidth : dp.pctX,
      y: containerHeight && containerHeight > 0 ? dp.pctY * containerHeight : dp.pctY
    }));
    return {
      pot: data.pot || null,
      plant: data.plant || null,
      decorations
    };
  } catch (_e) {
    return null;
  }
}

const pots: PotMaterial[] = [
  { type: 'ceramic', color: '#D2B48C', colorName: '米白陶', gradientStart: '#F5DEB3', gradientEnd: '#D2B48C', width: 140, height: 120 },
  { type: 'ceramic', color: '#8D6E63', colorName: '深棕陶', gradientStart: '#A1887F', gradientEnd: '#6D4C41', width: 140, height: 120 },
  { type: 'ceramic', color: '#A1887F', colorName: '浅棕陶', gradientStart: '#BCAAA4', gradientEnd: '#8D6E63', width: 140, height: 120 },
  
  { type: 'glass', color: '#80DEEA', colorName: '清透蓝', gradientStart: '#B2EBF2', gradientEnd: '#4DD0E1', width: 140, height: 120 },
  { type: 'glass', color: '#80CBC4', colorName: '薄荷绿', gradientStart: '#B2DFDB', gradientEnd: '#4DB6AC', width: 140, height: 120 },
  { type: 'glass', color: '#CE93D8', colorName: '梦幻紫', gradientStart: '#E1BEE7', gradientEnd: '#BA68C8', width: 140, height: 120 },
  
  { type: 'plastic', color: '#78909C', colorName: '高级灰', gradientStart: '#90A4AE', gradientEnd: '#546E7A', width: 140, height: 120 },
  { type: 'plastic', color: '#FF8A65', colorName: '活力橙', gradientStart: '#FFAB91', gradientEnd: '#FF7043', width: 140, height: 120 },
  { type: 'plastic', color: '#81C784', colorName: '清新绿', gradientStart: '#A5D6A7', gradientEnd: '#66BB6A', width: 140, height: 120 },
];

const plants: Plant[] = [
  { type: 'pothos', name: '绿萝', color: '#7CB342', gradientStart: '#9CCC65', gradientEnd: '#558B2F', height: 150, width: 120 },
  { type: 'succulent', name: '多肉', color: '#7CB342', gradientStart: '#AED581', gradientEnd: '#689F38', height: 100, width: 90 },
  { type: 'cactus', name: '仙人掌', color: '#7CB342', gradientStart: '#9CCC65', gradientEnd: '#558B2F', height: 140, width: 80 },
];

const decorationTemplates: Omit<Decoration, 'id' | 'x' | 'y'>[] = [
  { type: 'stone', name: '小石子', color: '#9E9E9E', width: 40, height: 30 },
  { type: 'moss', name: '苔藓', color: '#558B2F', width: 50, height: 30 },
  { type: 'doll', name: '小玩偶', color: '#EF5350', width: 35, height: 50 },
];

const getInitialState = (): BonsaiState => {
  const saved = loadStateFromStorage();
  if (saved) {
    return saved;
  }
  return {
    pot: null,
    plant: null,
    decorations: []
  };
};

const initialState: BonsaiState = getInitialState();

interface MaterialItem {
  id: string;
  category: 'pot' | 'plant' | 'decoration';
  data: any;
}

const App: React.FC = () => {
  const [history, setHistory] = useState<HistoryState>(() => createInitialState(initialState));
  const [selectedPotId, setSelectedPotId] = useState<string | null>(null);
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [showCard, setShowCard] = useState(false);
  const [undoPulse, setUndoPulse] = useState(false);
  const [redoPulse, setRedoPulse] = useState(false);
  const workbenchRef = useRef<HTMLDivElement>(null);
  const lastStateRef = useRef<BonsaiState>(cloneState(initialState));
  const hasRestoredPositions = useRef(false);

  const currentState = history.present;

  useEffect(() => {
    if (!hasRestoredPositions.current && workbenchRef.current) {
      hasRestoredPositions.current = true;
      const rect = workbenchRef.current.getBoundingClientRect();
      const saved = loadStateFromStorage(rect.width, rect.height);
      if (saved && saved.decorations.length > 0) {
        setHistory(prev => ({
          ...prev,
          present: saved
        }));
        lastStateRef.current = cloneState(saved);
      }
      if (saved) {
        if (saved.pot) setSelectedPotId(`pot-${saved.pot.type}-${saved.pot.color}`);
        if (saved.plant) setSelectedPlantId(`plant-${saved.plant.type}`);
      }
    }
  }, []);

  useEffect(() => {
    const rect = workbenchRef.current?.getBoundingClientRect();
    saveStateToStorage(currentState, rect?.width, rect?.height);
  }, [currentState]);

  const commitStateChange = useCallback((newState: BonsaiState) => {
    if (statesEqual(lastStateRef.current, newState)) {
      return;
    }
    
    setHistory(prev => {
      const updated = pushHistory(prev, newState);
      return updated;
    });
    
    lastStateRef.current = cloneState(newState);
    
    setUndoPulse(true);
    setTimeout(() => setUndoPulse(false), 400);
  }, []);

  const handleStateChange = useCallback((newState: BonsaiState) => {
    setHistory(prev => ({
      ...prev,
      present: newState
    }));
  }, []);

  useEffect(() => {
    const handleMouseUp = () => {
      if (!statesEqual(lastStateRef.current, history.present)) {
        commitStateChange(history.present);
      }
    };
    
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [history.present, commitStateChange]);

  const handleUndo = useCallback(() => {
    setHistory(prev => {
      const result = undoHistory(prev);
      if (result) {
        lastStateRef.current = cloneState(result.present);
        
        setRedoPulse(true);
        setTimeout(() => setRedoPulse(false), 400);
        
        return result;
      }
      return prev;
    });
  }, []);

  const handleRedo = useCallback(() => {
    setHistory(prev => {
      const result = redoHistory(prev);
      if (result) {
        lastStateRef.current = cloneState(result.present);
        
        setUndoPulse(true);
        setTimeout(() => setUndoPulse(false), 400);
        
        return result;
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const handleSelectPot = useCallback((pot: PotMaterial) => {
    const newState = { ...currentState, pot };
    commitStateChange(newState);
    setSelectedPotId(`pot-${pot.type}-${pot.color}`);
  }, [currentState, commitStateChange]);

  const handleSelectPlant = useCallback((plant: Plant) => {
    const newState = { ...currentState, plant };
    commitStateChange(newState);
    setSelectedPlantId(`plant-${plant.type}`);
  }, [currentState, commitStateChange]);

  const handleDragStart = useCallback((_item: MaterialItem, _e: React.DragEvent) => {
  }, []);

  const handleWorkbenchStateChange = useCallback((newState: BonsaiState) => {
    handleStateChange(newState);
    
    if (newState.pot) {
      setSelectedPotId(`pot-${newState.pot.type}-${newState.pot.color}`);
    }
    if (newState.plant) {
      setSelectedPlantId(`plant-${newState.plant.type}`);
    }
  }, [handleStateChange]);

  const handleGenerateCard = useCallback(() => {
    setShowCard(true);
  }, []);

  const handleCloseCard = useCallback(() => {
    setShowCard(false);
  }, []);

  const canUndoVal = canUndo(history);
  const canRedoVal = canRedo(history);

  return (
    <div className="app-container">
      <Toolbar
        canUndo={canUndoVal}
        canRedo={canRedoVal}
        onUndo={handleUndo}
        onRedo={handleRedo}
        undoPulse={undoPulse}
        redoPulse={redoPulse}
      />
      
      <div className="main-content">
        <div className="panel-left">
          <MaterialPanel
            pots={pots}
            plants={plants}
            decorations={decorationTemplates}
            selectedPotId={selectedPotId}
            selectedPlantId={selectedPlantId}
            onSelectPot={handleSelectPot}
            onSelectPlant={handleSelectPlant}
            onDragStart={handleDragStart}
          />
        </div>
        
        <div className="panel-center">
          <Workbench
            state={currentState}
            onStateChange={handleWorkbenchStateChange}
            workbenchRef={workbenchRef}
          />
        </div>
        
        <div className="panel-right">
          <PropertyPanel
            state={currentState}
            onGenerateCard={handleGenerateCard}
          />
        </div>
      </div>
      
      <CardModal
        isOpen={showCard}
        state={currentState}
        onClose={handleCloseCard}
      />

      <style>{`
        .app-container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .main-content {
          flex: 1;
          display: flex;
          overflow: hidden;
        }
        
        .panel-left {
          width: 220px;
          height: 100%;
          flex-shrink: 0;
        }
        
        .panel-center {
          flex: 1;
          height: 100%;
          min-width: 0;
        }
        
        .panel-right {
          width: 280px;
          height: 100%;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
};

export default App;
