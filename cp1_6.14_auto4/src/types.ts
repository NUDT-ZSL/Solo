export interface Viewport {
  name: string;
  width: number;
  height: number;
  icon: 'smartphone' | 'tablet' | 'laptop' | 'monitor';
}

export interface CaptureFrame {
  timestamp: number;
  screenshots: Record<string, string>;
}

export interface DiffRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  diffPercentage: number;
  domPath: string;
}

export interface DiffResult {
  diffImage?: string;
  regions: DiffRegion[];
  totalDiffPixels: number;
  regionCount: number;
  maxRegionArea: number;
}

export const VIEWPORTS: Viewport[] = [
  { name: 'Mobile', width: 375, height: 667, icon: 'smartphone' },
  { name: 'Tablet', width: 768, height: 1024, icon: 'tablet' },
  { name: 'Laptop', width: 1280, height: 800, icon: 'laptop' },
  { name: 'Desktop', width: 1920, height: 1080, icon: 'monitor' },
];
