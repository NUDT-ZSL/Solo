import type { LevelData } from '../types';

export const LEVELS: LevelData[] = [
  {
    id: 1,
    name: '初识光线',
    emitter: {
      x: 80,
      y: 360,
      angle: 0,
      color: 'yellow',
    },
    receiver: {
      x: 1200,
      y: 360,
      radius: 30,
    },
    mirrors: [
      { x: 400, y: 360, angle: -45, movable: true, width: 80, height: 12 },
      { x: 400, y: 150, angle: 45, movable: true, width: 80, height: 12 },
    ],
    prisms: [],
    sensors: [],
    gates: [],
  },
  {
    id: 2,
    name: '色散之门',
    emitter: {
      x: 80,
      y: 500,
      angle: -20,
      color: 'yellow',
    },
    receiver: {
      x: 1200,
      y: 200,
      radius: 30,
    },
    mirrors: [
      { x: 600, y: 200, angle: 45, movable: true, width: 80, height: 12 },
      { x: 900, y: 200, angle: -45, movable: true, width: 80, height: 12 },
    ],
    prisms: [
      { x: 300, y: 350, angle: 0, movable: true, size: 50 },
    ],
    sensors: [
      { x: 1000, y: 400, color: 'blue', radius: 20, gateId: 'gate1' },
    ],
    gates: [
      { id: 'gate1', x: 1100, y: 150, width: 20, height: 100, direction: 'left' },
    ],
  },
  {
    id: 3,
    name: '双光齐鸣',
    emitter: {
      x: 80,
      y: 360,
      angle: 0,
      color: 'yellow',
    },
    receiver: {
      x: 1200,
      y: 360,
      radius: 30,
    },
    mirrors: [
      { x: 350, y: 360, angle: -45, movable: true, width: 80, height: 12 },
      { x: 350, y: 150, angle: 45, movable: true, width: 80, height: 12 },
      { x: 700, y: 550, angle: 45, movable: true, width: 80, height: 12 },
    ],
    prisms: [
      { x: 500, y: 150, angle: 0, movable: true, size: 45 },
    ],
    sensors: [
      { x: 700, y: 150, color: 'red', radius: 20, gateId: 'gateA' },
      { x: 900, y: 450, color: 'green', radius: 20, gateId: 'gateB' },
    ],
    gates: [
      { id: 'gateA', x: 850, y: 300, width: 20, height: 120, direction: 'up' },
      { id: 'gateB', x: 1000, y: 330, width: 20, height: 100, direction: 'down' },
    ],
  },
  {
    id: 4,
    name: '移动迷阵',
    emitter: {
      x: 80,
      y: 200,
      angle: 0,
      color: 'yellow',
    },
    receiver: {
      x: 1200,
      y: 550,
      radius: 30,
    },
    mirrors: [
      { x: 250, y: 200, angle: -45, movable: true, width: 70, height: 12 },
      { x: 900, y: 550, angle: 45, movable: true, width: 70, height: 12 },
    ],
    prisms: [],
    sensors: [
      { x: 600, y: 100, color: 'yellow', radius: 20, gateId: 'gate1' },
    ],
    gates: [
      { id: 'gate1', x: 1000, y: 450, width: 20, height: 200, direction: 'right' },
    ],
    movingPlatforms: [
      {
        x: 500,
        y: 400,
        angle: 45,
        type: 'mirror',
        path: [
          { x: 400, y: 400 },
          { x: 700, y: 400 },
        ],
        speed: 80,
      },
    ],
  },
  {
    id: 5,
    name: '光影终章',
    emitter: {
      x: 80,
      y: 360,
      angle: 0,
      color: 'yellow',
    },
    receiver: {
      x: 1200,
      y: 360,
      radius: 35,
    },
    mirrors: [
      { x: 250, y: 360, angle: -45, movable: true, width: 70, height: 12 },
      { x: 250, y: 150, angle: 45, movable: true, width: 70, height: 12 },
      { x: 1000, y: 550, angle: -45, movable: true, width: 70, height: 12 },
    ],
    prisms: [
      { x: 500, y: 150, angle: 0, movable: true, size: 45 },
      { x: 800, y: 400, angle: 180, movable: true, size: 45 },
    ],
    sensors: [
      { x: 650, y: 250, color: 'red', radius: 20, gateId: 'gate1' },
      { x: 700, y: 150, color: 'blue', radius: 20, gateId: 'gate2' },
      { x: 950, y: 300, color: 'green', radius: 20, gateId: 'gate3' },
    ],
    gates: [
      { id: 'gate1', x: 550, y: 450, width: 20, height: 150, direction: 'left' },
      { id: 'gate2', x: 850, y: 250, width: 20, height: 150, direction: 'up' },
      { id: 'gate3', x: 1050, y: 310, width: 20, height: 120, direction: 'down' },
    ],
  },
];
