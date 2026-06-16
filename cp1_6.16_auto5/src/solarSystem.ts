export interface PlanetInfo {
  name: string;
  orbitalPeriod: number;
  rotationPeriod: number;
  distanceFromSun: number;
  temperatureRange: string;
  satelliteCount: number;
}

export interface PlanetState {
  id: string;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  color: string;
}

export interface PlanetData {
  id: string;
  name: string;
  color: string;
  orbitalRadius: number;
  orbitalSpeed: number;
  rotationSpeed: number;
  size: number;
  orbitalPeriod: number;
  rotationPeriod: number;
  distanceFromSun: number;
  temperatureRange: string;
  satelliteCount: number;
  hasRing?: boolean;
}

const PLANET_DATA: PlanetData[] = [
  {
    id: 'mercury',
    name: '水星',
    color: '#B0B0B0',
    orbitalRadius: 15,
    orbitalSpeed: 4.15,
    rotationSpeed: 0.03,
    size: 0.4,
    orbitalPeriod: 88,
    rotationPeriod: 1407.6,
    distanceFromSun: 57.9,
    temperatureRange: '-173 ~ 427',
    satelliteCount: 0
  },
  {
    id: 'venus',
    name: '金星',
    color: '#E8D5B7',
    orbitalRadius: 22,
    orbitalSpeed: 1.62,
    rotationSpeed: 0.005,
    size: 0.95,
    orbitalPeriod: 225,
    rotationPeriod: 5832.5,
    distanceFromSun: 108.2,
    temperatureRange: '462 ~ 462',
    satelliteCount: 0
  },
  {
    id: 'earth',
    name: '地球',
    color: '#4A90D9',
    orbitalRadius: 30,
    orbitalSpeed: 1.0,
    rotationSpeed: 0.1,
    size: 1.0,
    orbitalPeriod: 365,
    rotationPeriod: 24.0,
    distanceFromSun: 149.6,
    temperatureRange: '-89 ~ 57',
    satelliteCount: 1
  },
  {
    id: 'mars',
    name: '火星',
    color: '#D2691E',
    orbitalRadius: 39,
    orbitalSpeed: 0.53,
    rotationSpeed: 0.097,
    size: 0.53,
    orbitalPeriod: 687,
    rotationPeriod: 24.6,
    distanceFromSun: 227.9,
    temperatureRange: '-87 ~ -5',
    satelliteCount: 2
  },
  {
    id: 'jupiter',
    name: '木星',
    color: '#DAA520',
    orbitalRadius: 55,
    orbitalSpeed: 0.084,
    rotationSpeed: 0.226,
    size: 2.5,
    orbitalPeriod: 4333,
    rotationPeriod: 9.9,
    distanceFromSun: 778.5,
    temperatureRange: '-108 ~ -108',
    satelliteCount: 95
  },
  {
    id: 'saturn',
    name: '土星',
    color: '#F4A460',
    orbitalRadius: 72,
    orbitalSpeed: 0.034,
    rotationSpeed: 0.204,
    size: 2.1,
    orbitalPeriod: 10759,
    rotationPeriod: 10.7,
    distanceFromSun: 1434.0,
    temperatureRange: '-139 ~ -139',
    satelliteCount: 146,
    hasRing: true
  }
];

export class Planet {
  private data: PlanetData;
  private angle: number = 0;
  private rotationAngle: number = 0;

  constructor(data: PlanetData) {
    this.data = data;
    this.angle = Math.random() * Math.PI * 2;
  }

  updatePosition(_time: number, speedMultiplier: number): void {
    this.angle += this.data.orbitalSpeed * speedMultiplier * 0.001;
    this.rotationAngle += this.data.rotationSpeed * speedMultiplier * 0.1;
  }

  getState(): PlanetState {
    return {
      id: this.data.id,
      x: Math.cos(this.angle) * this.data.orbitalRadius,
      y: 0,
      z: Math.sin(this.angle) * this.data.orbitalRadius,
      rotationY: this.rotationAngle,
      color: this.data.color
    };
  }

  getInfo(): PlanetInfo {
    return {
      name: this.data.name,
      orbitalPeriod: this.data.orbitalPeriod,
      rotationPeriod: this.data.rotationPeriod,
      distanceFromSun: this.data.distanceFromSun,
      temperatureRange: this.data.temperatureRange,
      satelliteCount: this.data.satelliteCount
    };
  }

  getData(): PlanetData {
    return this.data;
  }

  getCurrentPosition(): { x: number; y: number; z: number } {
    return {
      x: Math.cos(this.angle) * this.data.orbitalRadius,
      y: 0,
      z: Math.sin(this.angle) * this.data.orbitalRadius
    };
  }
}

export class SolarSystem {
  private planets: Planet[] = [];
  private trajectoryHistory: Map<string, { x: number; z: number; time: number }[]> = new Map();
  private trackedPlanetId: string | null = null;
  private currentTime: number = 0;
  private speedMultiplier: number = 1;

  constructor() {
    this.planets = PLANET_DATA.map(data => new Planet(data));
  }

  update(time: number): void {
    this.currentTime = time;
    const delta = this.speedMultiplier;
    this.planets.forEach(planet => {
      planet.updatePosition(time, delta);
    });

    if (this.trackedPlanetId) {
      const trackedPlanet = this.planets.find(p => p.getData().id === this.trackedPlanetId);
      if (trackedPlanet) {
        const pos = trackedPlanet.getCurrentPosition();
        const history = this.trajectoryHistory.get(this.trackedPlanetId) || [];
        history.push({ x: pos.x, z: pos.z, time: this.currentTime });
        const maxHistory = 900;
        if (history.length > maxHistory) {
          history.shift();
        }
        this.trajectoryHistory.set(this.trackedPlanetId, history);
      }
    }
  }

  getPlanetStates(): PlanetState[] {
    return this.planets.map(planet => planet.getState());
  }

  getPlanets(): Planet[] {
    return this.planets;
  }

  getPlanetById(id: string): Planet | undefined {
    return this.planets.find(p => p.getData().id === id);
  }

  setSpeedMultiplier(speed: number): void {
    this.speedMultiplier = speed;
  }

  getSpeedMultiplier(): number {
    return this.speedMultiplier;
  }

  startTracking(planetId: string): void {
    this.trackedPlanetId = planetId;
    this.trajectoryHistory.set(planetId, []);
  }

  stopTracking(): void {
    this.trackedPlanetId = null;
  }

  clearTrajectory(): void {
    if (this.trackedPlanetId) {
      this.trajectoryHistory.set(this.trackedPlanetId, []);
    }
  }

  getTrajectory(planetId: string): { x: number; z: number; time: number }[] {
    return this.trajectoryHistory.get(planetId) || [];
  }

  getTrackedPlanetId(): string | null {
    return this.trackedPlanetId;
  }

  getSimulatedDate(startDate: Date = new Date()): Date {
    const simulatedMs = this.currentTime * this.speedMultiplier * 60000;
    return new Date(startDate.getTime() + simulatedMs);
  }
}

export { PLANET_DATA };
