import { create } from 'zustand';
import type { PlantNode, Stage, PlantStats, EnvironmentParams, FallingParticle, CutEffect } from './types';

interface PlantState {
  environment: EnvironmentParams;
  prevEnvironment: EnvironmentParams;
  
  isPlanted: boolean;
  plantTime: number;
  currentStage: Stage;
  stageProgress: number;
  growthSpeedMultiplier: number;
  
  isWilting: boolean;
  wiltingProgress: number;
  
  plantNodes: Record<string, PlantNode>;
  rootNodeId: string | null;
  
  stats: PlantStats;
  
  showStageLabel: boolean;
  stageLabelText: string;
  stageLabelOpacity: number;
  
  isTrimming: boolean;
  isDragging: boolean;
  
  particles: FallingParticle[];
  cutEffects: CutEffect[];
  
  showSoil: boolean;
  soilProgress: number;
  
  cotyledonProgress: number;
  showCotyledon: boolean;
  
  lastStatChange: Record<keyof PlantStats, number>;
  
  setEnvironment: (key: keyof EnvironmentParams, value: number) => void;
  plantSeed: () => void;
  reset: () => void;
  addNode: (node: PlantNode) => void;
  updateNode: (id: string, updates: Partial<PlantNode>) => void;
  removeNode: (id: string) => void;
  cutNode: (nodeId: string, cutPosition: [number, number, number]) => void;
  addParticle: (particle: FallingParticle) => void;
  updateParticles: (updater: (particles: FallingParticle[]) => FallingParticle[]) => void;
  addCutEffect: (effect: CutEffect) => void;
  updateCutEffects: (updater: (effects: CutEffect[]) => CutEffect[]) => void;
  setCurrentStage: (stage: Stage) => void;
  setStageProgress: (progress: number) => void;
  setGrowthSpeedMultiplier: (multiplier: number) => void;
  setWilting: (isWilting: boolean) => void;
  setWiltingProgress: (progress: number) => void;
  setStats: (stats: Partial<PlantStats>) => void;
  showStageLabelWithText: (text: string) => void;
  hideStageLabel: () => void;
  setTrimming: (trimming: boolean) => void;
  setDragging: (dragging: boolean) => void;
  setSoilProgress: (progress: number) => void;
  setShowSoil: (show: boolean) => void;
  setCotyledonProgress: (progress: number) => void;
  setShowCotyledon: (show: boolean) => void;
  setPlantTime: (time: number) => void;
  markStatChange: (key: keyof PlantStats) => void;
}

const initialStats: PlantStats = {
  height: 0,
  leafCount: 0,
  budCount: 0,
  fruitCount: 0
};

const initialEnvironment: EnvironmentParams = {
  light: 50,
  water: 50,
  temperature: 25
};

export const usePlantStore = create<PlantState>((set, get) => ({
  environment: initialEnvironment,
  prevEnvironment: initialEnvironment,
  
  isPlanted: false,
  plantTime: 0,
  currentStage: 0,
  stageProgress: 0,
  growthSpeedMultiplier: 1,
  
  isWilting: false,
  wiltingProgress: 0,
  
  plantNodes: {},
  rootNodeId: null,
  
  stats: initialStats,
  
  showStageLabel: false,
  stageLabelText: '',
  stageLabelOpacity: 0,
  
  isTrimming: false,
  isDragging: false,
  
  particles: [],
  cutEffects: [],
  
  showSoil: false,
  soilProgress: 0,
  
  cotyledonProgress: 0,
  showCotyledon: false,
  
  lastStatChange: { height: 0, leafCount: 0, budCount: 0, fruitCount: 0 },
  
  setEnvironment: (key, value) => set(state => ({
    prevEnvironment: { ...state.environment },
    environment: { ...state.environment, [key]: value }
  })),
  
  plantSeed: () => set({
    isPlanted: true,
    plantTime: performance.now(),
    currentStage: 0,
    stageProgress: 0,
    showSoil: true,
    soilProgress: 0,
    isWilting: false,
    wiltingProgress: 0,
    plantNodes: {},
    rootNodeId: null,
    particles: [],
    cutEffects: [],
    stats: initialStats,
    lastStatChange: { height: 0, leafCount: 0, budCount: 0, fruitCount: 0 }
  }),
  
  reset: () => set({
    environment: initialEnvironment,
    prevEnvironment: initialEnvironment,
    isPlanted: false,
    plantTime: 0,
    currentStage: 0,
    stageProgress: 0,
    growthSpeedMultiplier: 1,
    isWilting: false,
    wiltingProgress: 0,
    plantNodes: {},
    rootNodeId: null,
    stats: initialStats,
    showStageLabel: false,
    stageLabelText: '',
    stageLabelOpacity: 0,
    isTrimming: false,
    isDragging: false,
    particles: [],
    cutEffects: [],
    showSoil: false,
    soilProgress: 0,
    cotyledonProgress: 0,
    showCotyledon: false,
    lastStatChange: { height: 0, leafCount: 0, budCount: 0, fruitCount: 0 }
  }),
  
  addNode: (node) => set(state => ({
    plantNodes: { ...state.plantNodes, [node.id]: node },
    ...(node.parentId === null && !state.rootNodeId ? { rootNodeId: node.id } : {})
  })),
  
  updateNode: (id, updates) => set(state => ({
    plantNodes: {
      ...state.plantNodes,
      [id]: { ...state.plantNodes[id], ...updates }
    }
  })),
  
  removeNode: (id) => set(state => {
    const newNodes = { ...state.plantNodes };
    delete newNodes[id];
    return { plantNodes: newNodes };
  }),
  
  cutNode: (nodeId, cutPosition) => {
    const state = get();
    const node = state.plantNodes[nodeId];
    if (!node) return;
    
    const cutRatio = Math.max(0.1, Math.min(0.9, cutPosition[1] / Math.max(0.01, node.length)));
    
    set(state => ({
      plantNodes: {
        ...state.plantNodes,
        [nodeId]: {
          ...state.plantNodes[nodeId],
          length: state.plantNodes[nodeId].length * cutRatio,
          isCut: true,
          cutAt: performance.now()
        }
      }
    }));
  },
  
  addParticle: (particle) => set(state => ({
    particles: [...state.particles.slice(-180), particle]
  })),
  
  updateParticles: (updater) => set(state => ({
    particles: updater(state.particles)
  })),
  
  addCutEffect: (effect) => set(state => ({
    cutEffects: [...state.cutEffects, effect]
  })),
  
  updateCutEffects: (updater) => set(state => ({
    cutEffects: updater(state.cutEffects)
  })),
  
  setCurrentStage: (stage) => set({ currentStage: stage }),
  setStageProgress: (progress) => set({ stageProgress: progress }),
  setGrowthSpeedMultiplier: (multiplier) => set({ growthSpeedMultiplier: multiplier }),
  setWilting: (isWilting) => set({ isWilting }),
  setWiltingProgress: (progress) => set({ wiltingProgress: progress }),
  setStats: (stats) => set(state => ({ stats: { ...state.stats, ...stats } })),
  
  showStageLabelWithText: (text) => set({
    showStageLabel: true,
    stageLabelText: text,
    stageLabelOpacity: 1
  }),
  
  hideStageLabel: () => set({
    showStageLabel: false,
    stageLabelOpacity: 0
  }),
  
  setTrimming: (trimming) => set({ isTrimming: trimming }),
  setDragging: (dragging) => set({ isDragging: dragging }),
  setSoilProgress: (progress) => set({ soilProgress: progress }),
  setShowSoil: (show) => set({ showSoil: show }),
  setCotyledonProgress: (progress) => set({ cotyledonProgress: progress }),
  setShowCotyledon: (show) => set({ showCotyledon: show }),
  setPlantTime: (time) => set({ plantTime: time }),
  
  markStatChange: (key) => set(state => ({
    lastStatChange: { ...state.lastStatChange, [key]: performance.now() }
  }))
}));
