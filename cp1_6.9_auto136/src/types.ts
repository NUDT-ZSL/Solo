export type ComponentType = 'battery' | 'resistor' | 'led' | 'switch' | 'wire';

export type LedColor = 'red' | 'green' | 'blue' | 'yellow';

export interface Point {
  x: number;
  y: number;
}

export interface Component {
  id: string;
  type: ComponentType;
  position: Point;
  params: Record<string, any>;
  pinPositions: Point[];
}

export interface Connection {
  id: string;
  fromId: string;
  fromPinIndex: number;
  toId: string;
  toPinIndex: number;
}

export enum CircuitState {
  Closed = 'closed',
  Open = 'open',
}

export interface SimParams {
  voltage: number;
  current: number;
  power: number;
  status: CircuitState;
}

export interface CircuitSnapshot {
  id: string;
  name: string;
  timestamp: number;
  components: Component[];
  connections: Connection[];
}

export interface AppState {
  components: Component[];
  connections: Connection[];
  simParams: SimParams;
  snapshots: CircuitSnapshot[];
}

export type Action =
  | { type: 'ADD_COMPONENT'; payload: Component }
  | { type: 'REMOVE_COMPONENT'; payload: string }
  | { type: 'UPDATE_COMPONENT_PARAM'; payload: { id: string; params: Record<string, any> } }
  | { type: 'ADD_CONNECTION'; payload: Connection }
  | { type: 'REMOVE_CONNECTION'; payload: string }
  | { type: 'UPDATE_SIM_PARAMS'; payload: SimParams }
  | { type: 'SAVE_SNAPSHOT'; payload: { name: string } }
  | { type: 'LOAD_SNAPSHOT'; payload: string }
  | { type: 'DELETE_SNAPSHOT'; payload: string }
  | { type: 'HYDRATE_SNAPSHOTS'; payload: CircuitSnapshot[] };

export const GRID_SIZE = 35;
export const GRID_COLS = 15;
export const GRID_ROWS = 10;

export const LED_THRESHOLDS: Record<LedColor, number> = {
  red: 10,
  green: 15,
  blue: 12,
  yellow: 8,
};

export const LED_COLORS: Record<LedColor, string> = {
  red: '#FF3B3B',
  green: '#3BFF6E',
  blue: '#3B82FF',
  yellow: '#FFD93B',
};

export const BATTERY_COLORS: Record<number, string> = {
  1.5: '#FFF3B0',
  3: '#FFD966',
  4.5: '#FFB84D',
  6: '#FF9933',
  9: '#FF6B1A',
};

export const RESISTOR_VALUES = [100, 220, 330, 470, 1000, 10000];
export const BATTERY_VOLTAGES = [1.5, 3, 4.5, 6, 9];
