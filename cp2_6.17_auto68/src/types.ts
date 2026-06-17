export interface PlanetData {
  name: string;
  nameEn: string;
  color: string;
  radius: number;
  orbitRadius: number;
  orbitalPeriod: number;
  diameter: number;
  distanceFromSun: number;
  satelliteCount: number;
  hasRing: boolean;
  ringColor: string | null;
}

export interface DisplayMode {
  orbits: boolean;
  labels: boolean;
  texture: boolean;
}
