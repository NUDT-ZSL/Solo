export type Direction = 'north' | 'south' | 'east' | 'west';
export type LightColor = 'red' | 'yellow' | 'green';
export type TrafficMode = 'fixed' | 'actuated' | 'adaptive';

export interface Vehicle {
  id: string;
  position: [number, number, number];
  direction: Direction;
  speed: number;
  color: string;
  isWaiting: boolean;
  waitStartTime: number;
  lane: number;
  hasPassedIntersection: boolean;
  lastMoveTime: number;
}

export interface TrafficLight {
  northSouth: LightColor;
  eastWest: LightColor;
  prevNorthSouth: LightColor;
  prevEastWest: LightColor;
  remainingTime: number;
  currentPhase: 'nsGreen' | 'nsYellow' | 'ewGreen' | 'ewYellow';
  transitionProgress: number;
  colorTransitionProgress: number;
}

export interface Statistics {
  totalVehicles: number;
  averageWaitTime: number;
  maxQueueLength: number;
  throughput: number;
  passedVehicles: number;
  totalWaitTime: number;
}

export interface Queues {
  north: number;
  south: number;
  east: number;
  west: number;
}

const VEHICLE_COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7'];
const BASE_SPEED = 0.3;
const INTERSECTION_SPEED = 0.15;
const VEHICLE_LENGTH = 2;
const VEHICLE_GAP = 0.5;
const LANE_WIDTH = 1.2;
const ROAD_WIDTH = LANE_WIDTH * 8;
const INTERSECTION_HALF_SIZE = 2.4;
const SPAWN_DISTANCE = 25;

export const generateVehicleId = (): string => {
  return `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const getRandomColor = (): string => {
  return VEHICLE_COLORS[Math.floor(Math.random() * VEHICLE_COLORS.length)];
};

export const getSpawnPosition = (direction: Direction, lane: number): [number, number, number] => {
  const laneOffset = (lane - 1.5) * LANE_WIDTH;
  
  switch (direction) {
    case 'north':
      return [laneOffset, 0.3, -SPAWN_DISTANCE];
    case 'south':
      return [-laneOffset, 0.3, SPAWN_DISTANCE];
    case 'east':
      return [-SPAWN_DISTANCE, 0.3, -laneOffset];
    case 'west':
      return [SPAWN_DISTANCE, 0.3, laneOffset];
  }
};

export const createVehicle = (direction: Direction, lane: number): Vehicle => {
  return {
    id: generateVehicleId(),
    position: getSpawnPosition(direction, lane),
    direction,
    speed: BASE_SPEED,
    color: getRandomColor(),
    isWaiting: false,
    waitStartTime: 0,
    lane,
    hasPassedIntersection: false,
    lastMoveTime: 0
  };
};

export const isInIntersection = (position: [number, number, number], direction: Direction): boolean => {
  const [x, , z] = position;
  return Math.abs(x) < INTERSECTION_HALF_SIZE && Math.abs(z) < INTERSECTION_HALF_SIZE;
};

export const isApproachingIntersection = (vehicle: Vehicle): boolean => {
  const [x, , z] = vehicle.position;
  const stopDistance = 4;
  
  switch (vehicle.direction) {
    case 'north':
      return z > -INTERSECTION_HALF_SIZE - stopDistance && z < -INTERSECTION_HALF_SIZE;
    case 'south':
      return z < INTERSECTION_HALF_SIZE + stopDistance && z > INTERSECTION_HALF_SIZE;
    case 'east':
      return x > -INTERSECTION_HALF_SIZE - stopDistance && x < -INTERSECTION_HALF_SIZE;
    case 'west':
      return x < INTERSECTION_HALF_SIZE + stopDistance && x > INTERSECTION_HALF_SIZE;
  }
};

export const shouldStop = (vehicle: Vehicle, trafficLight: TrafficLight): boolean => {
  if (isInIntersection(vehicle.position, vehicle.direction)) {
    return false;
  }
  
  const nsDirections: Direction[] = ['north', 'south'];
  const ewDirections: Direction[] = ['east', 'west'];
  
  const isNS = nsDirections.includes(vehicle.direction);
  const light = isNS ? trafficLight.northSouth : trafficLight.eastWest;
  
  return light === 'red' || (light === 'yellow' && !isApproachingIntersection(vehicle));
};

export const getDistanceToNextVehicle = (vehicle: Vehicle, allVehicles: Vehicle[]): number => {
  const sameDirectionVehicles = allVehicles.filter(
    v => v.direction === vehicle.direction && v.lane === vehicle.lane && v.id !== vehicle.id
  );
  
  let minDistance = Infinity;
  const [x1, , z1] = vehicle.position;
  
  for (const other of sameDirectionVehicles) {
    const [x2, , z2] = other.position;
    
    let distance: number;
    switch (vehicle.direction) {
      case 'north':
        distance = z2 - z1;
        break;
      case 'south':
        distance = z1 - z2;
        break;
      case 'east':
        distance = x2 - x1;
        break;
      case 'west':
        distance = x1 - x2;
        break;
    }
    
    if (distance > 0 && distance < minDistance) {
      minDistance = distance;
    }
  }
  
  return minDistance;
};

export const getQueues = (vehicles: Vehicle[]): Queues => {
  const queues: Queues = { north: 0, south: 0, east: 0, west: 0 };
  
  for (const v of vehicles) {
    if (v.isWaiting) {
      queues[v.direction]++;
    }
  }
  
  return queues;
};

export const getQueuePosition = (vehicle: Vehicle, allVehicles: Vehicle[]): number => {
  const sameDirectionLane = allVehicles.filter(
    v => v.direction === vehicle.direction && v.lane === vehicle.lane && v.isWaiting
  );

  const getStopLineDistance = (v: Vehicle): number => {
    const [x, , z] = v.position;
    switch (v.direction) {
      case 'north':
        return -INTERSECTION_HALF_SIZE - z;
      case 'south':
        return z - INTERSECTION_HALF_SIZE;
      case 'east':
        return -INTERSECTION_HALF_SIZE - x;
      case 'west':
        return x - INTERSECTION_HALF_SIZE;
    }
  };

  sameDirectionLane.sort((a, b) => getStopLineDistance(a) - getStopLineDistance(b));
  const index = sameDirectionLane.findIndex(v => v.id === vehicle.id);
  return index >= 0 ? index : 0;
};

export const getDistanceFromIntersection = (vehicle: Vehicle): number => {
  const [x, , z] = vehicle.position;
  switch (vehicle.direction) {
    case 'north':
      return Math.abs(-INTERSECTION_HALF_SIZE - z);
    case 'south':
      return Math.abs(z - INTERSECTION_HALF_SIZE);
    case 'east':
      return Math.abs(-INTERSECTION_HALF_SIZE - x);
    case 'west':
      return Math.abs(x - INTERSECTION_HALF_SIZE);
  }
};

export const getStopLineDistance = (vehicle: Vehicle): number => {
  const [x, , z] = vehicle.position;
  switch (vehicle.direction) {
    case 'north':
      return -INTERSECTION_HALF_SIZE - z;
    case 'south':
      return z - INTERSECTION_HALF_SIZE;
    case 'east':
      return -INTERSECTION_HALF_SIZE - x;
    case 'west':
      return x - INTERSECTION_HALF_SIZE;
  }
};

export const isInIntersectionArea = (vehicle: Vehicle): boolean => {
  const [x, , z] = vehicle.position;
  const laneOffset = (vehicle.lane - 1.5) * LANE_WIDTH;
  const buffer = 12;
  
  switch (vehicle.direction) {
    case 'north':
    case 'south': {
      const perpDist = Math.abs(x - laneOffset);
      const parallelDist = Math.abs(z);
      return perpDist < ROAD_WIDTH / 2 + 2 && parallelDist < INTERSECTION_HALF_SIZE + buffer;
    }
    case 'east':
    case 'west': {
      const perpDist = Math.abs(z - laneOffset);
      const parallelDist = Math.abs(x);
      return perpDist < ROAD_WIDTH / 2 + 2 && parallelDist < INTERSECTION_HALF_SIZE + buffer;
    }
  }
};

export const updateVehiclePosition = (
  vehicle: Vehicle,
  allVehicles: Vehicle[],
  trafficLight: TrafficLight,
  currentTime: number,
  greenStartTime: number,
  vehiclesStarted: Set<string>
): Vehicle => {
  const updated = { ...vehicle };
  
  if (shouldStop(vehicle, trafficLight)) {
    const distanceToNext = getDistanceToNextVehicle(vehicle, allVehicles);
    const stopDistance = VEHICLE_LENGTH + VEHICLE_GAP;
    
    if (distanceToNext <= stopDistance || isApproachingIntersection(vehicle)) {
      if (!updated.isWaiting) {
        updated.isWaiting = true;
        updated.waitStartTime = currentTime;
      }
      updated.speed = 0;
      return updated;
    }
  }
  
  if (updated.isWaiting) {
    const nsDirections: Direction[] = ['north', 'south'];
    const isNS = nsDirections.includes(vehicle.direction);
    const light = isNS ? trafficLight.northSouth : trafficLight.eastWest;
    
    if (light === 'green') {
      const queuePosition = getQueuePosition(vehicle, allVehicles);
      const elapsedSinceGreen = currentTime - greenStartTime;
      const startDelay = queuePosition * 300;
      
      if (elapsedSinceGreen >= startDelay || vehiclesStarted.has(vehicle.id)) {
        const distanceToNext = getDistanceToNextVehicle(vehicle, allVehicles);
        const safeDistance = VEHICLE_LENGTH + VEHICLE_GAP;
        
        if (distanceToNext >= safeDistance || distanceToNext === Infinity) {
          updated.isWaiting = false;
          vehiclesStarted.add(vehicle.id);
          updated.waitStartTime = 0;
        } else {
          updated.speed = 0;
          return updated;
        }
      } else {
        updated.speed = 0;
        return updated;
      }
    } else {
      updated.speed = 0;
      return updated;
    }
  }
  
  const distanceToNext = getDistanceToNextVehicle(vehicle, allVehicles);
  const safeDistance = VEHICLE_LENGTH + VEHICLE_GAP;
  
  if (distanceToNext < safeDistance) {
    updated.speed = 0;
    if (!updated.isWaiting) {
      updated.isWaiting = true;
      updated.waitStartTime = currentTime;
    }
    return updated;
  }
  
  updated.isWaiting = false;
  updated.waitStartTime = 0;
  
  const inIntersection = isInIntersection(vehicle.position, vehicle.direction);
  updated.speed = inIntersection ? INTERSECTION_SPEED : BASE_SPEED;
  
  const [x, y, z] = updated.position;
  switch (vehicle.direction) {
    case 'north':
      updated.position = [x, y, z + updated.speed];
      if (z < -INTERSECTION_HALF_SIZE && updated.position[2] >= -INTERSECTION_HALF_SIZE) {
        updated.hasPassedIntersection = true;
      }
      break;
    case 'south':
      updated.position = [x, y, z - updated.speed];
      if (z > INTERSECTION_HALF_SIZE && updated.position[2] <= INTERSECTION_HALF_SIZE) {
        updated.hasPassedIntersection = true;
      }
      break;
    case 'east':
      updated.position = [x + updated.speed, y, z];
      if (x < -INTERSECTION_HALF_SIZE && updated.position[0] >= -INTERSECTION_HALF_SIZE) {
        updated.hasPassedIntersection = true;
      }
      break;
    case 'west':
      updated.position = [x - updated.speed, y, z];
      if (x > INTERSECTION_HALF_SIZE && updated.position[0] <= INTERSECTION_HALF_SIZE) {
        updated.hasPassedIntersection = true;
      }
      break;
  }
  
  return updated;
};

export const isOutOfBounds = (vehicle: Vehicle): boolean => {
  const [x, , z] = vehicle.position;
  const bound = SPAWN_DISTANCE + 10;
  return Math.abs(x) > bound || Math.abs(z) > bound;
};

export const updateTrafficLightFixed = (
  trafficLight: TrafficLight,
  deltaTime: number
): TrafficLight => {
  const updated = { ...trafficLight };
  updated.remainingTime -= deltaTime;
  
  const phaseDurations = {
    nsGreen: 30,
    nsYellow: 3,
    ewGreen: 30,
    ewYellow: 3
  };
  
  if (updated.remainingTime <= 0) {
    const phases: Array<'nsGreen' | 'nsYellow' | 'ewGreen' | 'ewYellow'> = 
      ['nsGreen', 'nsYellow', 'ewGreen', 'ewYellow'];
    const currentIndex = phases.indexOf(updated.currentPhase);
    const nextPhase = phases[(currentIndex + 1) % 4];
    
    updated.prevNorthSouth = updated.northSouth;
    updated.prevEastWest = updated.eastWest;
    updated.colorTransitionProgress = 0;
    updated.currentPhase = nextPhase;
    updated.remainingTime = phaseDurations[nextPhase];
    updated.transitionProgress = 0;
    
    switch (nextPhase) {
      case 'nsGreen':
        updated.northSouth = 'green';
        updated.eastWest = 'red';
        break;
      case 'nsYellow':
        updated.northSouth = 'yellow';
        updated.eastWest = 'red';
        break;
      case 'ewGreen':
        updated.northSouth = 'red';
        updated.eastWest = 'green';
        break;
      case 'ewYellow':
        updated.northSouth = 'red';
        updated.eastWest = 'yellow';
        break;
    }
  } else {
    updated.transitionProgress = Math.min(1, updated.transitionProgress + deltaTime / 0.2);
    updated.colorTransitionProgress = Math.min(1, updated.colorTransitionProgress + deltaTime / 0.2);
  }
  
  return updated;
};

export const updateTrafficLightActuated = (
  trafficLight: TrafficLight,
  queues: Queues,
  deltaTime: number,
  extended: boolean
): { light: TrafficLight; extended: boolean } => {
  const updated = { ...trafficLight };
  let newExtended = extended;
  
  if (updated.currentPhase === 'nsGreen' && !extended) {
    const waitingCars = queues.north + queues.south;
    if (waitingCars > 5 && updated.remainingTime < 15) {
      updated.remainingTime += 15;
      newExtended = true;
    }
  }
  
  if (updated.currentPhase === 'ewGreen' && !extended) {
    const waitingCars = queues.east + queues.west;
    if (waitingCars > 5 && updated.remainingTime < 15) {
      updated.remainingTime += 15;
      newExtended = true;
    }
  }
  
  const result = updateTrafficLightFixed(updated, deltaTime);
  if (result.currentPhase !== updated.currentPhase) {
    newExtended = false;
  }
  
  return { light: result, extended: newExtended };
};

export const updateTrafficLightAdaptive = (
  trafficLight: TrafficLight,
  queues: Queues,
  deltaTime: number
): TrafficLight => {
  const updated = { ...trafficLight };
  updated.remainingTime -= deltaTime;
  
  const nsFlow = queues.north + queues.south;
  const ewFlow = queues.east + queues.west;
  const totalFlow = nsFlow + ewFlow;
  
  const minGreen = 15;
  const maxGreen = 45;
  
  let nsGreenTime = 30;
  let ewGreenTime = 30;
  
  if (totalFlow > 0) {
    nsGreenTime = Math.max(minGreen, Math.min(maxGreen, (nsFlow / totalFlow) * 60));
    ewGreenTime = Math.max(minGreen, Math.min(maxGreen, (ewFlow / totalFlow) * 60));
  }
  
  const phaseDurations = {
    nsGreen: nsGreenTime,
    nsYellow: 3,
    ewGreen: ewGreenTime,
    ewYellow: 3
  };
  
  if (updated.remainingTime <= 0) {
    const phases: Array<'nsGreen' | 'nsYellow' | 'ewGreen' | 'ewYellow'> = 
      ['nsGreen', 'nsYellow', 'ewGreen', 'ewYellow'];
    const currentIndex = phases.indexOf(updated.currentPhase);
    const nextPhase = phases[(currentIndex + 1) % 4];
    
    updated.prevNorthSouth = updated.northSouth;
    updated.prevEastWest = updated.eastWest;
    updated.colorTransitionProgress = 0;
    updated.currentPhase = nextPhase;
    updated.remainingTime = phaseDurations[nextPhase];
    updated.transitionProgress = 0;
    
    switch (nextPhase) {
      case 'nsGreen':
        updated.northSouth = 'green';
        updated.eastWest = 'red';
        break;
      case 'nsYellow':
        updated.northSouth = 'yellow';
        updated.eastWest = 'red';
        break;
      case 'ewGreen':
        updated.northSouth = 'red';
        updated.eastWest = 'green';
        break;
      case 'ewYellow':
        updated.northSouth = 'red';
        updated.eastWest = 'yellow';
        break;
    }
  } else {
    updated.transitionProgress = Math.min(1, updated.transitionProgress + deltaTime / 0.2);
    updated.colorTransitionProgress = Math.min(1, updated.colorTransitionProgress + deltaTime / 0.2);
  }
  
  return updated;
};

export const createInitialTrafficLight = (): TrafficLight => {
  return {
    northSouth: 'green',
    eastWest: 'red',
    prevNorthSouth: 'green',
    prevEastWest: 'red',
    remainingTime: 30,
    currentPhase: 'nsGreen',
    transitionProgress: 1,
    colorTransitionProgress: 1
  };
};

export const createInitialStatistics = (): Statistics => {
  return {
    totalVehicles: 0,
    averageWaitTime: 0,
    maxQueueLength: 0,
    throughput: 0,
    passedVehicles: 0,
    totalWaitTime: 0
  };
};

export const updateStatistics = (
  stats: Statistics,
  vehicles: Vehicle[],
  newlyPassed: number,
  elapsedTime: number,
  queues: Queues
): Statistics => {
  const updated = { ...stats };
  
  updated.totalVehicles = vehicles.length;
  updated.passedVehicles += newlyPassed;
  
  let currentWaitTime = 0;
  let waitingCount = 0;
  const now = Date.now();
  
  for (const v of vehicles) {
    if (v.isWaiting && v.waitStartTime > 0) {
      currentWaitTime += (now - v.waitStartTime) / 1000;
      waitingCount++;
    }
  }
  
  if (waitingCount > 0) {
    updated.totalWaitTime += currentWaitTime / 60;
    updated.averageWaitTime = updated.totalWaitTime / Math.max(1, updated.passedVehicles + waitingCount);
  }
  
  const maxQueue = Math.max(queues.north, queues.south, queues.east, queues.west);
  updated.maxQueueLength = Math.max(updated.maxQueueLength, maxQueue * (VEHICLE_LENGTH + VEHICLE_GAP));
  
  if (elapsedTime > 0) {
    updated.throughput = (updated.passedVehicles / elapsedTime) * 60;
  }
  
  return updated;
};
