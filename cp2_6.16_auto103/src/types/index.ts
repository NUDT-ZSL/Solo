export type Band = 'visible' | 'infrared' | 'ultraviolet' | 'xray';

export interface StarBrightness {
  visible: number;
  infrared: number;
  ultraviolet: number;
  xray: number;
}

export interface StarData {
  id: string;
  name: string;
  ra: number;
  dec: number;
  brightness: StarBrightness;
  distance: number;
}

export interface HistoryRecord {
  id: string;
  ra: number;
  dec: number;
  mixRatio: Record<Band, number>;
  timestamp: number;
}
