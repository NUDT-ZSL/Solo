export interface Artwork {
  id: string;
  name: string;
  author: string;
  type: 'painting' | 'sculpture' | 'photography';
  gradientStart: string;
  gradientEnd: string;
  icon: string;
  width: number;
  height: number;
}

export interface PlacedExhibit {
  exhibitId: string;
  artwork: Artwork;
  wallIndex: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotation: number;
  scale: number;
  borderColor: string;
  description: string;
}

export interface LightingConfig {
  temperature: number;
  ambientIntensity: number;
  backlightAngle: number;
}

export interface Room {
  id: string;
  name: string;
  wallColor: string;
  floorTexture: 'wood' | 'marble' | 'carpet';
  exhibits: PlacedExhibit[];
  lighting: LightingConfig;
}

export interface GalleryConfig {
  id?: string;
  rooms: Room[];
  currentRoomId: string;
  createdAt?: number;
}

export interface LayoutPosition {
  x: number;
  y: number;
  z: number;
}

export interface LightingResult {
  ambientColor: string;
  ambientIntensity: number;
  directionalColor: string;
  directionalIntensity: number;
  directionalPosition: [number, number, number];
  pointLightColor: string;
  pointLightIntensity: number;
}

export interface Waypoint {
  position: [number, number, number];
  targetExhibitId?: string;
}
