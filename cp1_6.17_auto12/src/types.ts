export interface Good {
  id: string;
  name: string;
  emoji: string;
  weight: number;
  basePrice: number;
  sellPrice: number;
}

export interface Port {
  id: string;
  name: string;
  x: number;
  y: number;
  goods: Good[];
  isExplored: boolean;
  prosperity: 1 | 2 | 3 | 4 | 5;
}

export interface Ship {
  hullLevel: number;
  cannonLevel: number;
  maxCapacity: number;
  durability: number;
  maxDurability: number;
}

export interface CargoItem {
  good: Good;
  quantity: number;
}

export interface VoyageEvent {
  type: 'pirate' | 'storm';
  progress: number;
  resolved: boolean;
  result?: 'victory' | 'defeat' | 'flee_success' | 'flee_fail';
  piratePower?: number;
}

export interface VoyageState {
  fromPort: Port;
  toPort: Port;
  cargo: CargoItem[];
  progress: number;
  events: VoyageEvent[];
  status: 'idle' | 'sailing' | 'encounter' | 'storm' | 'completed';
  currentEvent?: VoyageEvent;
  bonusGold?: number;
}

export interface TradeRecord {
  id: string;
  timestamp: number;
  fromPort: string;
  toPort: string;
  profit: number;
  events: string[];
}

export interface GameState {
  ship: Ship;
  gold: number;
  currentPort: Port | null;
  selectedPort: Port | null;
  destinationPort: Port | null;
  voyage: VoyageState | null;
  tradeRecords: TradeRecord[];
  ports: Port[];
  cargo: CargoItem[];
  stormMessage: string | null;
}

export interface SettlementResult {
  profit: number;
  bonusGold: number;
  cargoLost: number;
  durabilityLost: number;
  events: string[];
}

export interface PortTradeHistory {
  id: string;
  goodName: string;
  goodEmoji: string;
  profit: number;
  timestamp: number;
  otherPort: string;
}
