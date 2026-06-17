import type { PresetScheme, Pipeline, Point3D } from './types';

let idSeed = 0;
const pid = () => `preset_${++idSeed}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

const createStraightPipeline = (
  type: Pipeline['type'],
  startX: number,
  startZ: number,
  endX: number,
  endZ: number,
  depth: number
): Pipeline => {
  const start: Point3D = { x: startX, y: depth, z: startZ };
  const end: Point3D = { x: endX, y: depth, z: endZ };
  return {
    id: pid(),
    type,
    segments: [{ id: pid(), start, end }],
    nodes: [start, end],
    depth,
    visible: true,
    createdAt: 0,
  };
};

const createLPipeline = (
  type: Pipeline['type'],
  p1: Point3D,
  p2: Point3D,
  p3: Point3D,
  depth: number
): Pipeline => {
  const nodes = [
    { ...p1, y: depth },
    { ...p2, y: depth },
    { ...p3, y: depth },
  ];
  return {
    id: pid(),
    type,
    segments: [
      { id: pid(), start: nodes[0], end: nodes[1] },
      { id: pid(), start: nodes[1], end: nodes[2] },
    ],
    nodes,
    depth,
    visible: true,
    createdAt: 0,
  };
};

const schemeA: PresetScheme = {
  id: 'A',
  name: '方案A：紧凑布局',
  description: '5根管线间距紧密，包含多处碰撞',
  pipelines: [
    createStraightPipeline('water', -9, -3, 9, -3, -1.0),
    createStraightPipeline('drainage', -9, -2.6, 9, -2.6, -1.5),
    createStraightPipeline('gas', -9, -2.2, 9, -2.2, -0.8),
    createStraightPipeline('power', -9, -1.8, 9, -1.8, -0.5),
    createStraightPipeline('communication', -9, -1.4, 9, -1.4, -0.3),
  ],
};

const schemeB: PresetScheme = {
  id: 'B',
  name: '方案B：疏散布局',
  description: '管线间距宽松，无碰撞风险',
  pipelines: [
    createStraightPipeline('water', -9, -6, 9, -6, -1.0),
    createStraightPipeline('drainage', -9, -3, 9, -3, -1.5),
    createStraightPipeline('gas', -9, 0, 9, 0, -0.8),
    createStraightPipeline('power', -9, 3, 9, 3, -0.5),
    createStraightPipeline('communication', -9, 6, 9, 6, -0.3),
  ],
};

const schemeC: PresetScheme = {
  id: 'C',
  name: '方案C：混合布局',
  description: '部分区域密集，存在交叉碰撞',
  pipelines: [
    createStraightPipeline('water', -9, -5, 9, -5, -1.0),
    createStraightPipeline('drainage', -9, 5, 9, 5, -1.5),
    createLPipeline(
      'gas',
      { x: -8, y: 0, z: -6 },
      { x: 0, y: 0, z: -6 },
      { x: 0, y: 0, z: 6 },
      -0.8
    ),
    createLPipeline(
      'power',
      { x: -6, y: 0, z: -4 },
      { x: -6, y: 0, z: 4 },
      { x: 8, y: 0, z: 4 },
      -0.5
    ),
    createStraightPipeline('communication', -8, -2, 8, 2, -0.3),
  ],
};

export const PRESET_SCHEMES: Record<'A' | 'B' | 'C', PresetScheme> = {
  A: schemeA,
  B: schemeB,
  C: schemeC,
};
