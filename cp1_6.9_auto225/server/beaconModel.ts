import { v4 as uuidv4 } from 'uuid';

export type Visibility = 'public' | 'friends' | 'private';

export interface Beacon {
  id: string;
  x: number;
  y: number;
  text: string;
  visibility: Visibility;
  visits: number;
  createdAt: number;
  initialHue: number;
}

interface BeaconStore {
  beacons: Map<string, Beacon>;
}

const store: BeaconStore = {
  beacons: new Map()
};

const warmHues = [0, 15, 30, 45, 60, 15, 345, 330, 315, 300];

export function getAllBeacons(): Beacon[] {
  return Array.from(store.beacons.values());
}

export function getBeaconById(id: string): Beacon | undefined {
  return store.beacons.get(id);
}

export function createBeacon(data: {
  x: number;
  y: number;
  text: string;
  visibility: Visibility;
}): Beacon | { error: string } {
  const { x, y, text, visibility } = data;

  if (typeof x !== 'number' || x < 0 || x > 400) {
    return { error: 'Invalid x coordinate' };
  }
  if (typeof y !== 'number' || y < 0 || y > 400) {
    return { error: 'Invalid y coordinate' };
  }
  if (typeof text !== 'string' || text.length === 0 || text.length > 200) {
    return { error: 'Text must be between 1 and 200 characters' };
  }
  if (!['public', 'friends', 'private'].includes(visibility)) {
    return { error: 'Invalid visibility' };
  }

  const id = uuidv4();
  const beacon: Beacon = {
    id,
    x,
    y,
    text,
    visibility,
    visits: 0,
    createdAt: Date.now(),
    initialHue: warmHues[Math.floor(Math.random() * warmHues.length)]
  };

  store.beacons.set(id, beacon);
  return beacon;
}

export function recordVisit(id: string): Beacon | { error: string } {
  const beacon = store.beacons.get(id);
  if (!beacon) {
    return { error: 'Beacon not found' };
  }
  beacon.visits += 1;
  store.beacons.set(id, beacon);
  return beacon;
}
