export interface Batch {
  id: string;
  origin: string;
  farm: string;
  process: string;
  altitude: string;
  weight: number;
  purchaseDate: string;
  createdAt: string;
}

export interface RoastCurve {
  id: string;
  batchId: string;
  points: CurvePoint[];
  markers: Markers;
  savedAt: string;
  createdAt: string;
}

export interface CurvePoint {
  time: number;
  temp: number;
}

export interface Markers {
  turningPoint: number;
  firstCrack: number;
  secondCrack: number;
}

export interface TastingRecord {
  id: string;
  roastId: string;
  dryAroma: number;
  wetAroma: number;
  acidity: number;
  body: number;
  aftertaste: number;
  flavorNotes: string;
  createdAt: string;
}

export interface FlavorLabel {
  id: string;
  roastId: string;
  tastingId: string;
  coffeeName: string;
  keywords: string[];
  overallScore: number;
  isCollected: boolean;
  createdAt: string;
}

export interface AppState {
  batches: Batch[];
  selectedBatchId: string | null;
  roasts: RoastCurve[];
  tastings: TastingRecord[];
  labels: FlavorLabel[];
  drawerOpen: boolean;
}

export type AppAction =
  | { type: 'SET_BATCHES'; payload: Batch[] }
  | { type: 'ADD_BATCH'; payload: Batch }
  | { type: 'SELECT_BATCH'; payload: string | null }
  | { type: 'ADD_ROAST'; payload: RoastCurve }
  | { type: 'UPDATE_ROAST'; payload: RoastCurve }
  | { type: 'SET_ROASTS'; payload: RoastCurve[] }
  | { type: 'ADD_TASTING'; payload: TastingRecord }
  | { type: 'SET_TASTINGS'; payload: TastingRecord[] }
  | { type: 'ADD_LABEL'; payload: FlavorLabel }
  | { type: 'SET_LABELS'; payload: FlavorLabel[] }
  | { type: 'TOGGLE_COLLECT'; payload: string }
  | { type: 'SET_DRAWER'; payload: boolean };
