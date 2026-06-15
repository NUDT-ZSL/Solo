import * as THREE from 'three';

export type BrickType =
  | 'brick_2x4'
  | 'brick_2x2'
  | 'plate_1x2'
  | 'round_1x1'
  | 'slope'
  | 'arch'
  | 'baseplate'
  | 'corner';

export interface BrickTemplate {
  type: BrickType;
  name: string;
  width: number;
  depth: number;
  height: number;
}

export interface BrickData {
  id: string;
  type: BrickType;
  color: string;
  position: { x: number; y: number; z: number };
  rotation: number;
  width: number;
  depth: number;
  height: number;
  isStable: boolean;
}

export interface BrickMeshObject {
  mesh: THREE.Group;
  data: BrickData;
}

export const BRICK_COLORS: { name: string; hex: string }[] = [
  { name: '红', hex: '#E53935' },
  { name: '蓝', hex: '#1E88E5' },
  { name: '绿', hex: '#43A047' },
  { name: '黄', hex: '#FDD835' },
  { name: '白', hex: '#FAFAFA' },
  { name: '灰', hex: '#757575' },
];

export const BRICK_TEMPLATES: BrickTemplate[] = [
  { type: 'brick_2x4', name: '2×4 标准砖', width: 2, depth: 4, height: 1 },
  { type: 'brick_2x2', name: '2×2 标准砖', width: 2, depth: 2, height: 1 },
  { type: 'plate_1x2', name: '1×2 薄板', width: 1, depth: 2, height: 0.33 },
  { type: 'round_1x1', name: '1×1 圆形砖', width: 1, depth: 1, height: 1 },
  { type: 'slope', name: '斜面砖', width: 2, depth: 2, height: 1 },
  { type: 'arch', name: '拱形砖', width: 2, depth: 4, height: 1 },
  { type: 'baseplate', name: '8×8 底板', width: 8, depth: 8, height: 0.33 },
  { type: 'corner', name: 'L形转角砖', width: 2, depth: 2, height: 1 },
];

const STUD_RADIUS = 0.22;
const STUD_HEIGHT = 0.15;
const UNIT = 0.8;

let brickIdCounter = 0;

function generateBrickId(): string {
  brickIdCounter += 1;
  return `brick_${Date.now()}_${brickIdCounter}`;
}

function createStud(x: number, z: number, yOffset: number, colorHex: string): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, 16);
  const material = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.55,
    metalness: 0.05,
  });
  const stud = new THREE.Mesh(geometry, material);
  stud.position.set(x * UNIT, yOffset, z * UNIT);
  return stud;
}

function createBoxBody(width: number, depth: number, height: number, colorHex: string): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(width * UNIT, height * UNIT, depth * UNIT);
  const material = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.6,
    metalness: 0.05,
  });
  return new THREE.Mesh(geometry, material);
}

function addStudsToGroup(group: THREE.Group, width: number, depth: number, yOffset: number, colorHex: string): void {
  for (let x = 0; x < width; x++) {
    for (let z = 0; z < depth; z++) {
      const studX = (x - (width - 1) / 2);
      const studZ = (z - (depth - 1) / 2);
      group.add(createStud(studX, studZ, yOffset, colorHex));
    }
  }
}

function createBrick2x4(colorHex: string): THREE.Group {
  const group = new THREE.Group();
  const body = createBoxBody(2, 4, 1, colorHex);
  body.position.y = UNIT * 0.5;
  group.add(body);
  addStudsToGroup(group, 2, 4, UNIT + STUD_HEIGHT / 2, colorHex);
  return group;
}

function createBrick2x2(colorHex: string): THREE.Group {
  const group = new THREE.Group();
  const body = createBoxBody(2, 2, 1, colorHex);
  body.position.y = UNIT * 0.5;
  group.add(body);
  addStudsToGroup(group, 2, 2, UNIT + STUD_HEIGHT / 2, colorHex);
  return group;
}

function createPlate1x2(colorHex: string): THREE.Group {
  const group = new THREE.Group();
  const body = createBoxBody(1, 2, 0.33, colorHex);
  body.position.y = UNIT * 0.33 * 0.5;
  group.add(body);
  addStudsToGroup(group, 1, 2, UNIT * 0.33 + STUD_HEIGHT / 2, colorHex);
  return group;
}

function createRound1x1(colorHex: string): THREE.Group {
  const group = new THREE.Group();
  const geometry = new THREE.CylinderGeometry(UNIT * 0.48, UNIT * 0.48, UNIT, 20);
  const material = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.6,
    metalness: 0.05,
  });
  const body = new THREE.Mesh(geometry, material);
  body.position.y = UNIT * 0.5;
  group.add(body);
  const stud = new THREE.CylinderGeometry(STUD_RADIUS * UNIT, STUD_RADIUS * UNIT, STUD_HEIGHT * UNIT, 16);
  const studMesh = new THREE.Mesh(stud, material.clone());
  studMesh.position.y = UNIT + (STUD_HEIGHT * UNIT) / 2;
  group.add(studMesh);
  return group;
}

function createSlope(colorHex: string): THREE.Group {
  const group = new THREE.Group();
  const shape = new THREE.Shape();
  const hw = UNIT;
  const hd = UNIT;
  const h = UNIT;
  shape.moveTo(-hw, 0);
  shape.lineTo(hw, 0);
  shape.lineTo(hw, h);
  shape.lineTo(-hw, 0);
  const extrudeSettings = { depth: 2 * hd, bevelEnabled: false };
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.translate(0, 0, -hd);
  const material = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.6,
    metalness: 0.05,
  });
  const body = new THREE.Mesh(geometry, material);
  group.add(body);
  const baseBody = createBoxBody(2, 2, 0.4, colorHex);
  baseBody.position.y = UNIT * 0.2;
  group.add(baseBody);
  return group;
}

function createArch(colorHex: string): THREE.Group {
  const group = new THREE.Group();
  const top = createBoxBody(2, 4, 0.5, colorHex);
  top.position.y = UNIT * 0.75;
  group.add(top);
  const leftLeg = createBoxBody(2, 0.6, 0.5, colorHex);
  leftLeg.position.set(0, UNIT * 0.25, -UNIT * 1.7);
  group.add(leftLeg);
  const rightLeg = createBoxBody(2, 0.6, 0.5, colorHex);
  rightLeg.position.set(0, UNIT * 0.25, UNIT * 1.7);
  group.add(rightLeg);
  addStudsToGroup(group, 2, 4, UNIT + STUD_HEIGHT / 2, colorHex);
  return group;
}

function createBaseplate(colorHex: string): THREE.Group {
  const group = new THREE.Group();
  const body = createBoxBody(8, 8, 0.33, colorHex);
  body.position.y = UNIT * 0.33 * 0.5;
  group.add(body);
  addStudsToGroup(group, 8, 8, UNIT * 0.33 + STUD_HEIGHT / 2, colorHex);
  return group;
}

function createCorner(colorHex: string): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.6,
    metalness: 0.05,
  });
  const part1 = createBoxBody(2, 1, 1, colorHex);
  part1.position.set(0, UNIT * 0.5, -UNIT * 0.5);
  group.add(part1);
  const part2 = createBoxBody(1, 2, 1, colorHex);
  part2.position.set(-UNIT * 0.5, UNIT * 0.5, UNIT * 0.5);
  group.add(part2);
  addStudsToGroup(group, 2, 1, UNIT + STUD_HEIGHT / 2, colorHex);
  for (let z = 0; z < 2; z++) {
    const studX = -0.5;
    const studZ = (z - 0.5);
    const studY = UNIT + STUD_HEIGHT / 2;
    const stud = new THREE.CylinderGeometry(STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, 16);
    const studMesh = new THREE.Mesh(stud, material.clone());
    studMesh.position.set(studX * UNIT, studY, studZ * UNIT);
    group.add(studMesh);
  }
  return group;
}

function getBrickBuilder(type: BrickType): (color: string) => THREE.Group {
  switch (type) {
    case 'brick_2x4': return createBrick2x4;
    case 'brick_2x2': return createBrick2x2;
    case 'plate_1x2': return createPlate1x2;
    case 'round_1x1': return createRound1x1;
    case 'slope': return createSlope;
    case 'arch': return createArch;
    case 'baseplate': return createBaseplate;
    case 'corner': return createCorner;
  }
}

export function getTemplate(type: BrickType): BrickTemplate | undefined {
  return BRICK_TEMPLATES.find(t => t.type === type);
}

export function createBrick(
  type: BrickType,
  colorHex: string,
  position: { x: number; y: number; z: number },
  rotation: number = 0
): BrickMeshObject {
  const template = getTemplate(type);
  if (!template) {
    throw new Error(`Unknown brick type: ${type}`);
  }
  const builder = getBrickBuilder(type);
  const mesh = builder(colorHex);
  const data: BrickData = {
    id: generateBrickId(),
    type,
    color: colorHex,
    position: { ...position },
    rotation,
    width: template.width,
    depth: template.depth,
    height: template.height,
    isStable: true,
  };
  mesh.position.set(position.x * UNIT, position.y * UNIT, position.z * UNIT);
  mesh.rotation.y = THREE.MathUtils.degToRad(rotation);
  mesh.userData.brickId = data.id;
  return { mesh, data };
}

export function updateBrickMeshPosition(brickObj: BrickMeshObject): void {
  const { mesh, data } = brickObj;
  mesh.position.set(data.position.x * UNIT, data.position.y * UNIT, data.position.z * UNIT);
  mesh.rotation.y = THREE.MathUtils.degToRad(data.rotation);
}

export function getBrickPreviewSVG(type: BrickType, colorHex: string): string {
  const template = getTemplate(type);
  if (!template) return '';
  const w = 140;
  const h = 72;
  const cx = w / 2;
  const cy = h / 2 + 4;
  const size = Math.min(template.width, template.depth);
  const scale = Math.min(20 / size, 18);
  const w3d = template.width * scale;
  const d3d = template.depth * scale * 0.6;
  const h3d = template.height * scale * 0.8;
  const darker = shadeColor(colorHex, -20);
  const lighter = shadeColor(colorHex, 15);
  let svg = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`;
  const bx = cx - w3d / 2;
  const by = cy - d3d / 2;
  svg += `<polygon points="${bx},${by - h3d} ${bx + w3d},${by - h3d} ${bx + w3d + d3d * 0.5},${by - h3d + d3d * 0.5} ${bx + d3d * 0.5},${by - h3d + d3d * 0.5}" fill="${lighter}" stroke="${darker}" stroke-width="0.5"/>`;
  svg += `<polygon points="${bx},${by - h3d} ${bx},${by} ${bx + d3d * 0.5},${by + d3d * 0.5} ${bx + d3d * 0.5},${by - h3d + d3d * 0.5}" fill="${darker}" stroke="${darker}" stroke-width="0.5"/>`;
  svg += `<polygon points="${bx},${by} ${bx + w3d},${by} ${bx + w3d},${by - h3d} ${bx},${by - h3d}" fill="${colorHex}" stroke="${darker}" stroke-width="0.5"/>`;
  svg += `<polygon points="${bx + w3d},${by} ${bx + w3d + d3d * 0.5},${by + d3d * 0.5} ${bx + w3d + d3d * 0.5},${by - h3d + d3d * 0.5} ${bx + w3d},${by - h3d}" fill="${shadeColor(colorHex, -10)}" stroke="${darker}" stroke-width="0.5"/>`;
  if (template.height >= 0.8) {
    for (let xi = 0; xi < template.width; xi++) {
      for (let zi = 0; zi < template.depth; zi++) {
        const sx = bx + (xi + 0.5) * (w3d / template.width);
        const sy = by - h3d + (zi + 0.5) * (d3d * 0.5 / template.depth) - h3d * 0.05;
        const r = Math.min(3, w3d / template.width / 2.5);
        svg += `<ellipse cx="${sx}" cy="${sy}" rx="${r}" ry="${r * 0.6}" fill="${lighter}" stroke="${darker}" stroke-width="0.3"/>`;
      }
    }
  }
  svg += '</svg>';
  return svg;
}

function shadeColor(color: string, percent: number): string {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const adj = (c: number) => {
    const res = c + (c * percent) / 100;
    return Math.max(0, Math.min(255, Math.round(res)));
  };
  const toHex = (c: number) => c.toString(16).padStart(2, '0');
  return `#${toHex(adj(r))}${toHex(adj(g))}${toHex(adj(b))}`;
}

export const UNIT_SIZE = UNIT;
