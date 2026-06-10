export interface Bottle {
  id: string;
  lat: number;
  lng: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  collected: boolean;
  createdAt: number;
  collectedCount: number;
  audioData: string;
  audioDuration: number;
  lastInteractionAt: number;
  trajectory: { x: number; y: number }[];
}

export interface CreateBottleDto {
  lat: number;
  lng: number;
  audioData: string;
  audioDuration: number;
}

export interface Ripple {
  x: number;
  y: number;
  startTime: number;
  bottleId: string;
}
