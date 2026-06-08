export interface StarOrbitPoint {
  x: number;
  y: number;
}

export interface PlanetData {
  x: number;
  y: number;
  radius: number;
  color: number;
  gravityRadius: number;
  rotationSpeed: number;
}

export interface PortalData {
  x: number;
  y: number;
  radius: number;
}

export interface LevelData {
  level: number;
  maxSteps: number;
  starOrbits: StarOrbitPoint[][];
  planets: PlanetData[];
  portals: PortalData[];
  launchPoint: { x: number; y: number };
}

export const LEVELS: LevelData[] = [
  {
    level: 1,
    maxSteps: 5,
    starOrbits: [
      [
        { x: 100, y: 300 }, { x: 200, y: 180 }, { x: 400, y: 150 },
        { x: 600, y: 200 }, { x: 700, y: 320 }, { x: 650, y: 450 },
        { x: 450, y: 480 }, { x: 250, y: 460 }, { x: 100, y: 300 },
      ],
      [
        { x: 350, y: 100 }, { x: 500, y: 120 }, { x: 550, y: 250 },
        { x: 480, y: 350 }, { x: 320, y: 330 }, { x: 300, y: 200 },
        { x: 350, y: 100 },
      ],
    ],
    planets: [
      { x: 400, y: 300, radius: 32, color: 0x4488ff, gravityRadius: 120, rotationSpeed: 0.02 },
      { x: 600, y: 350, radius: 24, color: 0xff6644, gravityRadius: 90, rotationSpeed: -0.03 },
    ],
    portals: [
      { x: 700, y: 150, radius: 28 },
    ],
    launchPoint: { x: 80, y: 400 },
  },
  {
    level: 2,
    maxSteps: 4,
    starOrbits: [
      [
        { x: 50, y: 250 }, { x: 150, y: 100 }, { x: 350, y: 80 },
        { x: 550, y: 130 }, { x: 700, y: 250 }, { x: 680, y: 420 },
        { x: 500, y: 500 }, { x: 300, y: 480 }, { x: 120, y: 400 },
        { x: 50, y: 250 },
      ],
      [
        { x: 200, y: 200 }, { x: 300, y: 160 }, { x: 400, y: 200 },
        { x: 420, y: 320 }, { x: 340, y: 380 }, { x: 220, y: 340 },
        { x: 200, y: 200 },
      ],
      [
        { x: 500, y: 180 }, { x: 580, y: 220 }, { x: 590, y: 320 },
        { x: 530, y: 370 }, { x: 460, y: 320 }, { x: 470, y: 230 },
        { x: 500, y: 180 },
      ],
    ],
    planets: [
      { x: 320, y: 280, radius: 36, color: 0x66ccff, gravityRadius: 130, rotationSpeed: 0.015 },
      { x: 540, y: 300, radius: 28, color: 0xffaa33, gravityRadius: 100, rotationSpeed: -0.025 },
      { x: 200, y: 400, radius: 22, color: 0xcc44ff, gravityRadius: 80, rotationSpeed: 0.03 },
    ],
    portals: [
      { x: 720, y: 200, radius: 26 },
      { x: 650, y: 450, radius: 26 },
    ],
    launchPoint: { x: 80, y: 450 },
  },
  {
    level: 3,
    maxSteps: 3,
    starOrbits: [
      [
        { x: 60, y: 300 }, { x: 180, y: 120 }, { x: 380, y: 60 },
        { x: 580, y: 100 }, { x: 720, y: 230 }, { x: 730, y: 400 },
        { x: 620, y: 510 }, { x: 400, y: 530 }, { x: 200, y: 490 },
        { x: 80, y: 380 }, { x: 60, y: 300 },
      ],
      [
        { x: 250, y: 220 }, { x: 340, y: 180 }, { x: 420, y: 230 },
        { x: 430, y: 340 }, { x: 360, y: 400 }, { x: 260, y: 360 },
        { x: 250, y: 220 },
      ],
    ],
    planets: [
      { x: 350, y: 300, radius: 40, color: 0x44ddaa, gravityRadius: 150, rotationSpeed: 0.01 },
      { x: 550, y: 200, radius: 30, color: 0xff5577, gravityRadius: 110, rotationSpeed: -0.02 },
      { x: 250, y: 450, radius: 26, color: 0xffcc22, gravityRadius: 95, rotationSpeed: 0.025 },
      { x: 600, y: 400, radius: 20, color: 0x8855ff, gravityRadius: 75, rotationSpeed: -0.035 },
    ],
    portals: [
      { x: 720, y: 160, radius: 30 },
    ],
    launchPoint: { x: 80, y: 500 },
  },
];
