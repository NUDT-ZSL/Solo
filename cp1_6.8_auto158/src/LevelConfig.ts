import type { LevelConfig, FragmentDef, Vec2 } from './types';

function tri(cx: number, cy: number, size: number, angleOffset: number): Vec2[] {
  const verts: Vec2[] = [];
  for (let i = 0; i < 3; i++) {
    const a = angleOffset + (i * Math.PI * 2) / 3;
    verts.push({ x: cx + Math.cos(a) * size, y: cy + Math.sin(a) * size });
  }
  return verts;
}

function quad(cx: number, cy: number, w: number, h: number, rot: number): Vec2[] {
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const hw = w / 2;
  const hh = h / 2;
  const corners = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ];
  return corners.map((c) => ({
    x: cx + c.x * cos - c.y * sin,
    y: cy + c.x * sin + c.y * cos,
  }));
}

function rightTri(cx: number, cy: number, size: number, rot: number): Vec2[] {
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const pts = [
    { x: -size / 2, y: -size / 2 },
    { x: size / 2, y: -size / 2 },
    { x: -size / 2, y: size / 2 },
  ];
  return pts.map((p) => ({
    x: cx + p.x * cos - p.y * sin,
    y: cy + p.x * sin + p.y * cos,
  }));
}

function trap(cx: number, cy: number, topW: number, botW: number, h: number, rot: number): Vec2[] {
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const hh = h / 2;
  const pts = [
    { x: -topW / 2, y: -hh },
    { x: topW / 2, y: -hh },
    { x: botW / 2, y: hh },
    { x: -botW / 2, y: hh },
  ];
  return pts.map((p) => ({
    x: cx + p.x * cos - p.y * sin,
    y: cy + p.x * sin + p.y * cos,
  }));
}

function starPoint(cx: number, cy: number, outerR: number, innerR: number, index: number, total: number): Vec2 {
  const angle = (index * Math.PI * 2) / total - Math.PI / 2;
  const r = index % 2 === 0 ? outerR : innerR;
  return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
}

function starTri(cx: number, cy: number, outerR: number, innerR: number, tipIndex: number): Vec2[] {
  const totalPoints = 10;
  const tipAngle = (tipIndex * Math.PI * 2) / totalPoints - Math.PI / 2;
  const tip = { x: cx + Math.cos(tipAngle) * outerR, y: cy + Math.sin(tipAngle) * outerR };
  const nextInner = starPoint(cx, cy, outerR, innerR, tipIndex + 1, totalPoints);
  const prevInner = starPoint(cx, cy, outerR, innerR, tipIndex - 1, totalPoints);
  return [tip, nextInner, prevInner];
}

function starInnerQuad(cx: number, cy: number, innerR: number, tipIndex: number): Vec2[] {
  const totalPoints = 10;
  const p1 = starPoint(cx, cy, 0, innerR, tipIndex, totalPoints);
  const p2 = starPoint(cx, cy, 0, innerR, tipIndex + 1, totalPoints);
  const p3 = starPoint(cx, cy, 0, innerR, tipIndex + 2, totalPoints);
  return [p1, p2, p3];
}

const colors = {
  cyan: { fill: 'rgba(0,255,209,0.25)', glow: '#00FFD1' },
  magenta: { fill: 'rgba(255,0,170,0.25)', glow: '#FF00AA' },
  gold: { fill: 'rgba(255,215,0,0.25)', glow: '#FFD700' },
  cyanM: { fill: 'rgba(0,255,209,0.35)', glow: '#00FFD1' },
  magentaM: { fill: 'rgba(255,0,170,0.35)', glow: '#FF00AA' },
  goldM: { fill: 'rgba(255,215,0,0.35)', glow: '#FFD700' },
};

function makeLevel1(): LevelConfig {
  const s = 60;
  const gap = 4;
  const cx = 0;
  const cy = 0;
  const half = s + gap / 2;
  const fragments: FragmentDef[] = [
    {
      id: 0,
      vertices: rightTri(-half / 2, -half / 2, s, 0),
      color: colors.cyan.fill,
      glowColor: colors.cyan.glow,
      targetPosition: { x: -half / 2, y: -half / 2 },
      targetRotation: 0,
      gravity: false,
      magnetic: 'none',
      magneticRange: 0,
    },
    {
      id: 1,
      vertices: rightTri(half / 2, -half / 2, s, Math.PI / 2),
      color: colors.cyan.fill,
      glowColor: colors.cyan.glow,
      targetPosition: { x: half / 2, y: -half / 2 },
      targetRotation: 0,
      gravity: false,
      magnetic: 'none',
      magneticRange: 0,
    },
    {
      id: 2,
      vertices: rightTri(half / 2, half / 2, s, Math.PI),
      color: colors.cyan.fill,
      glowColor: colors.cyan.glow,
      targetPosition: { x: half / 2, y: half / 2 },
      targetRotation: 0,
      gravity: false,
      magnetic: 'none',
      magneticRange: 0,
    },
    {
      id: 3,
      vertices: rightTri(-half / 2, half / 2, s, -Math.PI / 2),
      color: colors.cyan.fill,
      glowColor: colors.cyan.glow,
      targetPosition: { x: -half / 2, y: half / 2 },
      targetRotation: 0,
      gravity: false,
      magnetic: 'none',
      magneticRange: 0,
    },
  ];
  return { id: 1, name: '方块觉醒', gridSpacing: 40, fragments };
}

function makeLevel2(): LevelConfig {
  const s = 50;
  const h = s * Math.sqrt(3) / 2;
  const fragments: FragmentDef[] = [];
  const positions: Vec2[] = [
    { x: 0, y: -2 * h / 3 },
    { x: -s / 2, y: -2 * h / 3 + h },
    { x: s / 2, y: -2 * h / 3 + h },
    { x: 0, y: -2 * h / 3 + 2 * h },
    { x: -s, y: -2 * h / 3 + h },
    { x: s, y: -2 * h / 3 + h },
  ];
  const rots = [0, Math.PI / 3, -Math.PI / 3, Math.PI, 2 * Math.PI / 3, -2 * Math.PI / 3];
  const clrs = [colors.magenta.fill, colors.magentaM.fill, colors.magenta.fill, colors.magentaM.fill, colors.magenta.fill, colors.magentaM.fill];
  const glows = [colors.magenta.glow, colors.magenta.glow, colors.magenta.glow, colors.magenta.glow, colors.magenta.glow, colors.magenta.glow];
  for (let i = 0; i < 6; i++) {
    fragments.push({
      id: i,
      vertices: rightTri(positions[i].x, positions[i].y, s * 0.8, rots[i]),
      color: clrs[i],
      glowColor: glows[i],
      targetPosition: { ...positions[i] },
      targetRotation: 0,
      gravity: i < 2,
      magnetic: 'none',
      magneticRange: 0,
    });
  }
  return { id: 2, name: '三角裂隙', gridSpacing: 35, fragments };
}

function makeLevel3(): LevelConfig {
  const r = 70;
  const innerR = r * 0.5;
  const fragments: FragmentDef[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI * 2) / 6;
    const midAngle = angle + Math.PI / 6;
    const mx = Math.cos(midAngle) * (r + innerR) / 2;
    const my = Math.sin(midAngle) * (r + innerR) / 2;
    fragments.push({
      id: i,
      vertices: quad(mx, my, r * 0.6, r * 0.35, angle + Math.PI / 6),
      color: i % 2 === 0 ? colors.gold.fill : colors.goldM.fill,
      glowColor: colors.gold.glow,
      targetPosition: { x: mx, y: my },
      targetRotation: 0,
      gravity: false,
      magnetic: i < 3 ? 'attract' : 'none',
      magneticRange: 100,
    });
  }
  fragments.push({
    id: 6,
    vertices: quad(0, 0, innerR * 1.2, innerR * 1.2, Math.PI / 4),
    color: colors.goldM.fill,
    glowColor: colors.gold.glow,
    targetPosition: { x: 0, y: 0 },
    targetRotation: 0,
    gravity: false,
    magnetic: 'attract',
    magneticRange: 80,
  });
  fragments.push({
    id: 7,
    vertices: quad(0, 0, innerR * 0.8, innerR * 0.8, 0),
    color: colors.gold.fill,
    glowColor: colors.gold.glow,
    targetPosition: { x: 0, y: 0 },
    targetRotation: 0,
    gravity: false,
    magnetic: 'none',
    magneticRange: 0,
  });
  return { id: 3, name: '六边回响', gridSpacing: 40, fragments };
}

function makeLevel4(): LevelConfig {
  const w = 80;
  const h = 120;
  const fragments: FragmentDef[] = [];
  const halfW = w / 2;
  const halfH = h / 2;
  const sliceH = h / 5;
  const clrs = [colors.cyan, colors.magenta, colors.cyan, colors.magenta, colors.cyan];
  for (let i = 0; i < 5; i++) {
    const y = -halfH + sliceH * i + sliceH / 2;
    fragments.push({
      id: i,
      vertices: quad(-halfW / 2, y, halfW, sliceH - 2, 0),
      color: clrs[i].fill,
      glowColor: clrs[i].glow,
      targetPosition: { x: -halfW / 2, y },
      targetRotation: 0,
      gravity: i % 2 === 0,
      magnetic: i === 1 || i === 3 ? 'attract' : 'none',
      magneticRange: 90,
    });
    fragments.push({
      id: i + 5,
      vertices: quad(halfW / 2, y, halfW, sliceH - 2, 0),
      color: clrs[i].fill,
      glowColor: clrs[i].glow,
      targetPosition: { x: halfW / 2, y },
      targetRotation: 0,
      gravity: false,
      magnetic: i === 2 ? 'repel' : 'none',
      magneticRange: 80,
    });
  }
  return { id: 4, name: '菱形陷阱', gridSpacing: 30, fragments };
}

function makeLevel5(): LevelConfig {
  const outerR = 90;
  const innerR = 45;
  const fragments: FragmentDef[] = [];
  for (let i = 0; i < 5; i++) {
    const triVerts = starTri(0, 0, outerR, innerR, i * 2);
    fragments.push({
      id: i,
      vertices: triVerts,
      color: i % 3 === 0 ? colors.cyan.fill : i % 3 === 1 ? colors.magenta.fill : colors.gold.fill,
      glowColor: i % 3 === 0 ? colors.cyan.glow : i % 3 === 1 ? colors.magenta.glow : colors.gold.glow,
      targetPosition: { x: 0, y: 0 },
      targetRotation: 0,
      gravity: i % 2 === 0,
      magnetic: i === 0 || i === 3 ? 'attract' : i === 2 ? 'repel' : 'none',
      magneticRange: 100,
    });
  }
  for (let i = 0; i < 5; i++) {
    const innerVerts = starInnerQuad(0, 0, innerR, i * 2 + 1);
    fragments.push({
      id: i + 5,
      vertices: innerVerts,
      color: (i + 5) % 3 === 0 ? colors.cyanM.fill : (i + 5) % 3 === 1 ? colors.magentaM.fill : colors.goldM.fill,
      glowColor: (i + 5) % 3 === 0 ? colors.cyan.glow : (i + 5) % 3 === 1 ? colors.magenta.glow : colors.gold.glow,
      targetPosition: { x: 0, y: 0 },
      targetRotation: 0,
      gravity: i % 2 === 1,
      magnetic: i === 1 || i === 4 ? 'repel' : 'none',
      magneticRange: 80,
    });
  }
  fragments.push({
    id: 10,
    vertices: quad(0, 0, 20, 20, Math.PI / 4),
    color: colors.goldM.fill,
    glowColor: colors.gold.glow,
    targetPosition: { x: 0, y: 0 },
    targetRotation: 0,
    gravity: true,
    magnetic: 'attract',
    magneticRange: 60,
  });
  fragments.push({
    id: 11,
    vertices: quad(0, 0, 15, 15, 0),
    color: colors.cyanM.fill,
    glowColor: colors.cyan.glow,
    targetPosition: { x: 0, y: 0 },
    targetRotation: 0,
    gravity: false,
    magnetic: 'repel',
    magneticRange: 50,
  });
  return { id: 5, name: '星尘终焉', gridSpacing: 35, fragments };
}

export const LEVELS: LevelConfig[] = [
  makeLevel1(),
  makeLevel2(),
  makeLevel3(),
  makeLevel4(),
  makeLevel5(),
];
