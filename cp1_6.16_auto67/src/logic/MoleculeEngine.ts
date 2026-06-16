export interface Atom {
  id: number;
  element: string;
  x: number;
  y: number;
  z: number;
  radius: number;
}

export interface Bond {
  atom1: number;
  atom2: number;
}

export interface MoleculeData {
  name: string;
  atoms: Atom[];
  bonds: Bond[];
  dihedralAtoms: number[];
  initialDihedral: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface DisplacementLine {
  atomId: number;
  start: Vector3;
  end: Vector3;
}

function sub(v1: Vector3, v2: Vector3): Vector3 {
  return { x: v1.x - v2.x, y: v1.y - v2.y, z: v1.z - v2.z };
}

function add(v1: Vector3, v2: Vector3): Vector3 {
  return { x: v1.x + v2.x, y: v1.y + v2.y, z: v1.z + v2.z };
}

function scale(v: Vector3, s: number): Vector3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function dot(v1: Vector3, v2: Vector3): number {
  return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
}

function cross(v1: Vector3, v2: Vector3): Vector3 {
  return {
    x: v1.y * v2.z - v1.z * v2.y,
    y: v1.z * v2.x - v1.x * v2.z,
    z: v1.x * v2.y - v1.y * v2.x,
  };
}

function length(v: Vector3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function normalize(v: Vector3): Vector3 {
  const len = length(v);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return scale(v, 1 / len);
}

function quaternionFromAxisAngle(axis: Vector3, angle: number): { x: number; y: number; z: number; w: number } {
  const halfAngle = angle / 2;
  const sinHalf = Math.sin(halfAngle);
  const cosHalf = Math.cos(halfAngle);
  const axisNorm = normalize(axis);
  return {
    x: axisNorm.x * sinHalf,
    y: axisNorm.y * sinHalf,
    z: axisNorm.z * sinHalf,
    w: cosHalf,
  };
}

function rotateVectorByQuaternion(v: Vector3, q: { x: number; y: number; z: number; w: number }): Vector3 {
  const qv = { x: q.x, y: q.y, z: q.z };
  const t = scale(cross(qv, v), 2);
  return add(add(v, scale(t, q.w)), cross(qv, t));
}

export function getAtomById(atoms: Atom[], id: number): Atom | undefined {
  return atoms.find((a) => a.id === id);
}

export function getAtomPosition(atom: Atom): Vector3 {
  return { x: atom.x, y: atom.y, z: atom.z };
}

export function computeDihedralAngle(atoms: Atom[], dihedralAtomIds: number[]): number {
  if (dihedralAtomIds.length !== 4) return 0;

  const a1 = getAtomById(atoms, dihedralAtomIds[0]);
  const a2 = getAtomById(atoms, dihedralAtomIds[1]);
  const a3 = getAtomById(atoms, dihedralAtomIds[2]);
  const a4 = getAtomById(atoms, dihedralAtomIds[3]);

  if (!a1 || !a2 || !a3 || !a4) return 0;

  const p1 = getAtomPosition(a1);
  const p2 = getAtomPosition(a2);
  const p3 = getAtomPosition(a3);
  const p4 = getAtomPosition(a4);

  const b1 = sub(p2, p1);
  const b2 = sub(p3, p2);
  const b3 = sub(p4, p3);

  const n1 = normalize(cross(b1, b2));
  const n2 = normalize(cross(b2, b3));

  const m1 = cross(n1, normalize(b2));

  const x = dot(n1, n2);
  const y = dot(m1, n2);

  return (Math.atan2(y, x) * 180) / Math.PI;
}

export function rotateDihedral(
  atoms: Atom[],
  dihedralAtomIds: number[],
  targetAngle: number
): Atom[] {
  if (dihedralAtomIds.length !== 4) return atoms.map((a) => ({ ...a }));

  const a1 = getAtomById(atoms, dihedralAtomIds[0]);
  const a2 = getAtomById(atoms, dihedralAtomIds[1]);
  const a3 = getAtomById(atoms, dihedralAtomIds[2]);
  const a4 = getAtomById(atoms, dihedralAtomIds[3]);

  if (!a1 || !a2 || !a3 || !a4) return atoms.map((a) => ({ ...a }));

  const currentAngle = computeDihedralAngle(atoms, dihedralAtomIds);
  const angleDiff = ((targetAngle - currentAngle) * Math.PI) / 180;

  const pivotStart = getAtomPosition(a2);
  const pivotEnd = getAtomPosition(a3);
  const axis = normalize(sub(pivotEnd, pivotStart));

  const quat = quaternionFromAxisAngle(axis, angleDiff);

  const rotatingAtomIds = new Set<number>();
  const visited = new Set<number>();
  const queue: number[] = [dihedralAtomIds[2]];
  visited.add(dihedralAtomIds[1]);
  visited.add(dihedralAtomIds[2]);

  const bondMap = new Map<number, number[]>();
  for (const atom of atoms) {
    bondMap.set(atom.id, []);
  }
  const bonds: Bond[] = [];
  for (let i = 0; i < atoms.length; i++) {
    for (let j = i + 1; j < atoms.length; j++) {
      const dist = length(sub(getAtomPosition(atoms[i]), getAtomPosition(atoms[j])));
      const sumRadius = atoms[i].radius + atoms[j].radius;
      if (dist < sumRadius * 1.3 && dist > 0.1) {
        bonds.push({ atom1: atoms[i].id, atom2: atoms[j].id });
        bondMap.get(atoms[i].id)?.push(atoms[j].id);
        bondMap.get(atoms[j].id)?.push(atoms[i].id);
      }
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current !== dihedralAtomIds[2]) {
      rotatingAtomIds.add(current);
    }
    const neighbors = bondMap.get(current) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  rotatingAtomIds.add(dihedralAtomIds[3]);

  const newAtoms = atoms.map((atom) => {
    if (rotatingAtomIds.has(atom.id)) {
      const pos = getAtomPosition(atom);
      const relativePos = sub(pos, pivotStart);
      const rotatedPos = rotateVectorByQuaternion(relativePos, quat);
      const newPos = add(rotatedPos, pivotStart);
      return { ...atom, x: newPos.x, y: newPos.y, z: newPos.z };
    }
    return { ...atom };
  });

  return newAtoms;
}

const ELEMENT_SIGMA: Record<string, number> = {
  H: 0.25,
  C: 0.35,
  N: 0.32,
  O: 0.30,
};

const ELEMENT_EPSILON: Record<string, number> = {
  H: 0.04,
  C: 0.12,
  N: 0.10,
  O: 0.08,
};

function getLJParams(element1: string, element2: string): { sigma: number; epsilon: number } {
  const s1 = ELEMENT_SIGMA[element1] || 0.3;
  const s2 = ELEMENT_SIGMA[element2] || 0.3;
  const e1 = ELEMENT_EPSILON[element1] || 0.1;
  const e2 = ELEMENT_EPSILON[element2] || 0.1;
  return {
    sigma: (s1 + s2) / 2,
    epsilon: Math.sqrt(e1 * e2),
  };
}

function lennardJonesPotential(distance: number, sigma: number, epsilon: number): number {
  if (distance === 0) return 1000;
  const r6 = Math.pow(sigma / distance, 6);
  const r12 = r6 * r6;
  return 4 * epsilon * (r12 - r6);
}

export function computeConformationEnergy(atoms: Atom[]): number {
  let totalEnergy = 0;

  for (let i = 0; i < atoms.length; i++) {
    for (let j = i + 1; j < atoms.length; j++) {
      const atom1 = atoms[i];
      const atom2 = atoms[j];

      const dist = length(sub(getAtomPosition(atom1), getAtomPosition(atom2)));
      const { sigma, epsilon } = getLJParams(atom1.element, atom2.element);

      totalEnergy += lennardJonesPotential(dist, sigma, epsilon);
    }
  }

  return totalEnergy * 50;
}

export function generateDisplacementLines(
  atoms1: Atom[],
  atoms2: Atom[]
): DisplacementLine[] {
  const lines: DisplacementLine[] = [];

  for (const atom1 of atoms1) {
    const atom2 = getAtomById(atoms2, atom1.id);
    if (atom2) {
      lines.push({
        atomId: atom1.id,
        start: { x: atom1.x, y: atom1.y, z: atom1.z },
        end: { x: atom2.x, y: atom2.y, z: atom2.z },
      });
    }
  }

  return lines;
}

export function parseMoleculeData(jsonData: any): MoleculeData {
  return {
    name: jsonData.name || 'Unknown',
    atoms: jsonData.atoms || [],
    bonds: jsonData.bonds || [],
    dihedralAtoms: jsonData.dihedralAtoms || [],
    initialDihedral: jsonData.initialDihedral || 0,
  };
}

export function getElementColor(element: string): string {
  const colors: Record<string, string> = {
    C: '#808080',
    H: '#FFFFFF',
    O: '#FF0000',
    N: '#0000FF',
    S: '#FFFF00',
    P: '#FFA500',
    Cl: '#00FF00',
    F: '#00FFFF',
    Br: '#8B0000',
    I: '#4B0082',
  };
  return colors[element] || '#808080';
}
