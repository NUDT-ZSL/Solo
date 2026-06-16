import { create } from 'zustand';
import {
  Vehicle,
  TrafficLight,
  Statistics,
  TrafficMode,
  Direction,
  Queues,
  createVehicle,
  updateVehiclePosition,
  isOutOfBounds,
  updateTrafficLightFixed,
  updateTrafficLightActuated,
  updateTrafficLightAdaptive,
  createInitialTrafficLight,
  createInitialStatistics,
  updateStatistics,
  getQueues
} from '../utils/trafficLogic';

interface TrafficState {
  mode: TrafficMode;
  vehicles: Vehicle[];
  trafficLight: TrafficLight;
  statistics: Statistics;
  isRunning: boolean;
  startTime: number;
  lastUpdateTime: number;
  spawnTimers: Record<Direction, number>;
  greenStartTime: number;
  vehiclesStarted: Set<string>;
  actuatedExtended: boolean;
  sceneOpacity: number;
  isTransitioning: boolean;
  
  setMode: (mode: TrafficMode) => void;
  startSimulation: () => void;
  stopSimulation: () => void;
  update: (deltaTime: number) => void;
}

const MAX_VEHICLES = 200;
const SPAWN_INTERVAL_MIN = 0.5;
const SPAWN_INTERVAL_MAX = 2;

const getRandomSpawnInterval = (): number => {
  return SPAWN_INTERVAL_MIN + Math.random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN);
};

const directions: Direction[] = ['north', 'south', 'east', 'west'];

export const useTrafficStore = create<TrafficState>((set, get) => ({
  mode: 'fixed',
  vehicles: [],
  trafficLight: createInitialTrafficLight(),
  statistics: createInitialStatistics(),
  isRunning: false,
  startTime: 0,
  lastUpdateTime: 0,
  spawnTimers: { north: 1, south: 1.5, east: 0.8, west: 1.2 },
  greenStartTime: Date.now(),
  vehiclesStarted: new Set<string>(),
  actuatedExtended: false,
  sceneOpacity: 1,
  isTransitioning: false,

  setMode: (mode: TrafficMode) => {
    const { isTransitioning } = get();
    if (isTransitioning) return;

    set({ isTransitioning: true, sceneOpacity: 0.5 });

    setTimeout(() => {
      set({
        mode,
        trafficLight: createInitialTrafficLight(),
        vehicles: [],
        statistics: createInitialStatistics(),
        startTime: Date.now(),
        lastUpdateTime: Date.now(),
        spawnTimers: { north: 1, south: 1.5, east: 0.8, west: 1.2 },
        greenStartTime: Date.now(),
        vehiclesStarted: new Set<string>(),
        actuatedExtended: false,
        sceneOpacity: 1,
        isTransitioning: false
      });
    }, 500);
  },

  startSimulation: () => {
    set({
      isRunning: true,
      startTime: Date.now(),
      lastUpdateTime: Date.now()
    });
  },

  stopSimulation: () => {
    set({ isRunning: false });
  },

  update: (deltaTime: number) => {
    const state = get();
    if (!state.isRunning || state.isTransitioning) return;

    const now = Date.now();
    const elapsedTime = (now - state.startTime) / 1000;

    let { vehicles, trafficLight, statistics, spawnTimers, greenStartTime, vehiclesStarted, actuatedExtended } = state;
    let newVehicles = [...vehicles];
    let newlyPassed = 0;

    for (const dir of directions) {
      spawnTimers[dir] -= deltaTime;
      if (spawnTimers[dir] <= 0 && newVehicles.length < MAX_VEHICLES) {
        const lane = Math.floor(Math.random() * 2) + 1;
        newVehicles.push(createVehicle(dir, lane));
        spawnTimers[dir] = getRandomSpawnInterval();
      }
    }

    const queues = getQueues(newVehicles);

    const prevPhase = trafficLight.currentPhase;
    switch (state.mode) {
      case 'fixed':
        trafficLight = updateTrafficLightFixed(trafficLight, deltaTime);
        break;
      case 'actuated': {
        const result = updateTrafficLightActuated(trafficLight, queues, deltaTime, actuatedExtended);
        trafficLight = result.light;
        actuatedExtended = result.extended;
        break;
      }
      case 'adaptive':
        trafficLight = updateTrafficLightAdaptive(trafficLight, queues, deltaTime);
        break;
    }

    if (trafficLight.currentPhase !== prevPhase && 
        (trafficLight.currentPhase === 'nsGreen' || trafficLight.currentPhase === 'ewGreen')) {
      greenStartTime = now;
      vehiclesStarted = new Set<string>();
    }

    const updatedVehicles: Vehicle[] = [];
    for (const vehicle of newVehicles) {
      if (isOutOfBounds(vehicle)) {
        newlyPassed++;
        continue;
      }

      const updated = updateVehiclePosition(
        vehicle,
        newVehicles,
        trafficLight,
        now,
        greenStartTime,
        vehiclesStarted
      );
      updatedVehicles.push(updated);
    }

    if (updatedVehicles.length > MAX_VEHICLES) {
      updatedVehicles.sort((a, b) => {
        const distA = Math.sqrt(a.position[0] ** 2 + a.position[2] ** 2);
        const distB = Math.sqrt(b.position[0] ** 2 + b.position[2] ** 2);
        return distA - distB;
      });
      while (updatedVehicles.length > MAX_VEHICLES) {
        updatedVehicles.pop();
      }
    }

    const newQueues = getQueues(updatedVehicles);
    statistics = updateStatistics(statistics, updatedVehicles, newlyPassed, elapsedTime, newQueues);

    set({
      vehicles: updatedVehicles,
      trafficLight,
      statistics,
      spawnTimers: { ...spawnTimers },
      lastUpdateTime: now,
      greenStartTime,
      vehiclesStarted,
      actuatedExtended
    });
  }
}));
