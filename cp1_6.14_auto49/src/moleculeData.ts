import * as THREE from 'three';

export type AtomSymbol = 'C' | 'O' | 'N' | 'H';
export type BondType = 'single' | 'double';
export type NoteTag = 'Citrus' | 'Floral' | 'Woody' | 'Fruity' | 'Spicy' | 'Herbal' | 'Musk' | 'Marine';

export interface AtomData {
  symbol: AtomSymbol;
  position: THREE.Vector3;
  radius: number;
  color: string;
}

export interface BondData {
  atomIndex1: number;
  atomIndex2: number;
  type: BondType;
}

export interface MoleculeData {
  name: string;
  atoms: AtomData[];
  bonds: BondData[];
  noteTag: NoteTag;
  volatility: number;
  molecularWeight: number;
}

const CPK_COLORS: Record<AtomSymbol, string> = {
  C: '#909090',
  O: '#ff0d0d',
  N: '#3050f8',
  H: '#ffffff',
};

const ATOM_RADII: Record<AtomSymbol, number> = {
  C: 0.77,
  O: 0.73,
  N: 0.75,
  H: 0.37,
};

const ATOMIC_WEIGHTS: Record<AtomSymbol, number> = {
  C: 12.011,
  O: 15.999,
  N: 14.007,
  H: 1.008,
};

const BOND_LEN_CC_SINGLE = 1.54;
const BOND_LEN_CC_DOUBLE = 1.34;
const BOND_LEN_CC_AROMATIC = 1.39;
const BOND_LEN_C_H = 1.09;
const BOND_LEN_C_O_SINGLE = 1.43;
const BOND_LEN_C_O_DOUBLE = 1.20;

function atom(symbol: AtomSymbol, pos: THREE.Vector3): AtomData {
  return {
    symbol,
    position: pos,
    radius: ATOM_RADII[symbol],
    color: CPK_COLORS[symbol],
  };
}

function bond(i1: number, i2: number, type: BondType = 'single'): BondData {
  return { atomIndex1: i1, atomIndex2: i2, type };
}

function makeMolecule(
  name: string,
  noteTag: NoteTag,
  volatility: number,
  atoms: AtomData[],
  bonds: BondData[]
): MoleculeData {
  const molecularWeight = atoms.reduce((sum, a) => sum + ATOMIC_WEIGHTS[a.symbol], 0);
  return { name, atoms, bonds, noteTag, volatility, molecularWeight };
}

interface Ring3DBuilder {
  atoms: AtomData[];
  bonds: BondData[];
  baseIndex: number;
}

function buildBenzeneRing(center: THREE.Vector3, normal: THREE.Vector3, radius: number = BOND_LEN_CC_AROMATIC): Ring3DBuilder {
  const atoms: AtomData[] = [];
  const bonds: BondData[] = [];

  const n = normal.clone().normalize();
  const up = Math.abs(n.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const u = new THREE.Vector3().crossVectors(n, up).normalize();
  const v = new THREE.Vector3().crossVectors(n, u).normalize();

  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const x = center.x + radius * (u.x * Math.cos(angle) + v.x * Math.sin(angle));
    const y = center.y + radius * (u.y * Math.cos(angle) + v.y * Math.sin(angle));
    const z = center.z + radius * (u.z * Math.cos(angle) + v.z * Math.sin(angle));
    atoms.push(atom('C', new THREE.Vector3(x, y, z)));
  }

  for (let i = 0; i < 6; i++) {
    const next = (i + 1) % 6;
    bonds.push(bond(i, next, i % 2 === 0 ? 'double' : 'single'));
  }

  return { atoms, bonds, baseIndex: 0 };
}

function addHydrogenToRing(ring: Ring3DBuilder, normal: THREE.Vector3): void {
  const h = normal.clone().normalize();
  for (let i = 0; i < 6; i++) {
    const cPos = ring.atoms[i].position;
    const toCenter = new THREE.Vector3().subVectors(cPos, new THREE.Vector3(0, 0, 0)).normalize();
    const hPos = cPos.clone().add(toCenter.multiplyScalar(BOND_LEN_C_H * 0.8));
    const hAtom = atom('H', hPos);
    ring.atoms.push(hAtom);
    ring.bonds.push(bond(i, ring.atoms.length - 1, 'single'));
  }
}

function v3(x: number, y: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(x, y, z);
}

export function generateMolecules(): MoleculeData[] {
  const molecules: MoleculeData[] = [];

  // === CITRUS (4) ===
  {
    const c = [
      v3(-3.1, 0, 0),
      v3(-1.5, 0.5, 0),
      v3(0, 0, 0),
      v3(1.5, 0.5, 0),
      v3(3.0, 0, 0),
      v3(1.5, -1.0, 0),
      v3(0, -1.5, 0),
      v3(-1.5, -1.0, 0),
      v3(-1.5, 1.8, 0),
      v3(3.0, -1.5, 0),
      v3(4.3, 0.5, 0),
    ];
    const atoms: AtomData[] = c.map(p => atom('C', p));
    atoms.push(atom('H', v3(-3.5, -0.8, 0)));
    atoms.push(atom('H', v3(-3.5, 0.8, 0)));
    atoms.push(atom('H', v3(-1.5, 2.5, 0.5)));
    atoms.push(atom('H', v3(3.0, -2.0, -0.5)));
    atoms.push(atom('H', v3(4.3, 1.2, 0.5)));
    atoms.push(atom('H', v3(4.3, 0.0, -0.7)));

    const bonds: BondData[] = [
      bond(0, 1), bond(1, 2), bond(2, 3), bond(3, 4, 'double'),
      bond(3, 5), bond(5, 6), bond(6, 7), bond(7, 2),
      bond(1, 8), bond(5, 9), bond(4, 10),
      bond(0, 11), bond(0, 12), bond(8, 13), bond(9, 14),
      bond(10, 15), bond(10, 16),
    ];
    molecules.push(makeMolecule('Limonene', 'Citrus', 0.88, atoms, bonds));
  }

  {
    const c = [
      v3(-6.0, 0, 0),
      v3(-4.5, 0.3, 0),
      v3(-3.0, -0.3, 0),
      v3(-1.5, 0.2, 0),
      v3(0, -0.4, 0),
      v3(1.5, 0.1, 0),
      v3(3.0, -0.5, 0),
      v3(4.5, 0.0, 0),
      v3(6.0, -0.6, 0),
      v3(7.5, 0.0, 0),
      v3(8.5, -0.5, 0),
    ];
    const atoms: AtomData[] = c.map(p => atom('C', p));
    atoms.push(atom('O', v3(9.0, 0.5, 0)));
    atoms.push(atom('H', v3(-6.0, -1.0, 0)));
    atoms.push(atom('H', v3(-4.5, 1.2, 0)));
    atoms.push(atom('H', v3(-3.0, -1.2, 0)));
    atoms.push(atom('H', v3(4.5, 0.9, 0)));
    atoms.push(atom('H', v3(6.0, -1.4, 0)));
    atoms.push(atom('H', v3(7.5, 0.9, 0.5)));

    const bonds: BondData[] = [
      bond(0, 1, 'double'), bond(1, 2), bond(2, 3, 'double'), bond(3, 4),
      bond(4, 5, 'double'), bond(5, 6), bond(6, 7, 'double'), bond(7, 8),
      bond(8, 9, 'double'), bond(9, 10), bond(9, 11, 'double'),
      bond(0, 12), bond(1, 13), bond(2, 14), bond(6, 15), bond(7, 16), bond(8, 17),
    ];
    molecules.push(makeMolecule('Citral', 'Citrus', 0.92, atoms, bonds));
  }

  {
    const c = [
      v3(-4.0, 0, 0),
      v3(-2.5, 0.4, 0),
      v3(-1.0, -0.2, 0),
      v3(0.5, 0.3, 0),
      v3(2.0, -0.3, 0),
      v3(3.5, 0.2, 0),
      v3(5.0, -0.4, 0),
      v3(6.5, 0.1, 0),
    ];
    const atoms: AtomData[] = c.map(p => atom('C', p));
    atoms.push(atom('O', v3(1.7, -1.5, 0)));
    atoms.push(atom('O', v3(7.5, -0.5, 0)));
    atoms.push(atom('C', v3(-2.5, -1.3, 0)));
    atoms.push(atom('C', v3(-3.5, -2.0, 0)));
    atoms.push(atom('H', v3(-4.5, 0.8, 0)));
    atoms.push(atom('H', v3(6.5, 1.0, 0)));
    atoms.push(atom('H', v3(-3.0, -2.6, 0.5)));

    const bonds: BondData[] = [
      bond(0, 1), bond(1, 2, 'double'), bond(2, 3), bond(3, 4, 'double'),
      bond(4, 5), bond(5, 6), bond(6, 7, 'double'), bond(7, 9),
      bond(4, 8), bond(2, 10), bond(10, 11),
      bond(0, 12), bond(7, 13), bond(11, 14),
    ];
    molecules.push(makeMolecule('Linalyl-Acetate', 'Citrus', 0.80, atoms, bonds));
  }

  {
    const ring = buildBenzeneRing(v3(0, 0, 0), v3(0, 0, 1));
    const atoms = ring.atoms;
    const bonds = ring.bonds;

    atoms.push(atom('C', v3(2.0, 0, 0)));
    bonds.push(bond(0, atoms.length - 1, 'single'));

    atoms.push(atom('O', v3(3.5, 0.5, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'double'));

    atoms.push(atom('O', v3(-2.0, -1.5, 0)));
    bonds.push(bond(4, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(-3.5, -1.0, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('H', v3(-3.8, -0.2, 0.5)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    molecules.push(makeMolecule('Bergapten', 'Citrus', 0.55, atoms, bonds));
  }

  // === FLORAL (4) ===
  {
    const c = [
      v3(-5, 0, 0),
      v3(-3.5, 0.5, 0),
      v3(-2, 0, 0),
      v3(-0.5, 0.5, 0),
      v3(1, 0, 0),
      v3(2.5, 0.5, 0),
      v3(4, 0, 0),
      v3(5.5, 0.5, 0),
      v3(6.5, 0, 0.5),
    ];
    const atoms: AtomData[] = c.map(p => atom('C', p));
    atoms.push(atom('O', v3(6.0, -1.0, 0)));
    atoms.push(atom('C', v3(-2, -1.5, 0)));
    atoms.push(atom('C', v3(-3.5, -2.0, 0)));
    atoms.push(atom('H', v3(-5.5, -0.8, 0)));
    atoms.push(atom('H', v3(5.0, -1.8, 0)));
    atoms.push(atom('H', v3(-3.5, -2.8, 0.5)));

    const bonds: BondData[] = [
      bond(0, 1, 'double'), bond(1, 2), bond(2, 3, 'double'), bond(3, 4),
      bond(4, 5, 'double'), bond(5, 6), bond(6, 7, 'double'), bond(7, 8),
      bond(6, 9), bond(2, 10), bond(10, 11),
      bond(0, 12), bond(9, 13), bond(11, 14),
    ];
    molecules.push(makeMolecule('Linalool', 'Floral', 0.72, atoms, bonds));
  }

  {
    const c = [
      v3(-5, 0, 0), v3(-3.5, 0.5, 0), v3(-2, 0, 0),
      v3(-0.5, 0.5, 0), v3(1, 0, 0), v3(2.5, 0.5, 0),
      v3(4, 0, 0), v3(5.5, 0.5, 0), v3(7, 0, 0),
    ];
    const atoms: AtomData[] = c.map(p => atom('C', p));
    atoms.push(atom('O', v3(7.5, 1.2, 0)));
    atoms.push(atom('C', v3(-3.5, 1.8, 0)));
    atoms.push(atom('H', v3(-5, -0.8, 0)));
    atoms.push(atom('H', v3(7.5, -0.8, 0)));
    atoms.push(atom('H', v3(-3.5, 2.5, 0.5)));

    const bonds: BondData[] = [
      bond(0, 1), bond(1, 2, 'double'), bond(2, 3), bond(3, 4, 'double'),
      bond(4, 5), bond(5, 6, 'double'), bond(6, 7), bond(7, 8),
      bond(8, 9, 'double'), bond(1, 10),
      bond(0, 11), bond(8, 12), bond(10, 13),
    ];
    molecules.push(makeMolecule('Geraniol', 'Floral', 0.78, atoms, bonds));
  }

  {
    const ring = buildBenzeneRing(v3(0, 0, 0), v3(0, 0, 1), 1.5);
    const atoms = ring.atoms;
    const bonds = ring.bonds;

    atoms.push(atom('O', v3(-2.5, 0, 0)));
    bonds.push(bond(3, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(-4.0, 0, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(2.5, 0.5, 0)));
    bonds.push(bond(0, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(4.0, -0.2, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'double'));

    atoms.push(atom('C', v3(5.5, 0.5, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    molecules.push(makeMolecule('Jasmone', 'Floral', 0.62, atoms, bonds));
  }

  {
    const c = [
      v3(-4, 0, 0), v3(-2.5, 0.5, 0), v3(-1, 0, 0),
      v3(0.5, 0.5, 0), v3(2, 0, 0), v3(3.5, 0.5, 0),
      v3(5, 0, 0),
    ];
    const atoms: AtomData[] = c.map(p => atom('C', p));
    atoms.push(atom('O', v3(6.5, 0.5, 0)));
    atoms.push(atom('C', v3(-4, 1.5, 0)));
    atoms.push(atom('C', v3(-4, -1.5, 0)));
    atoms.push(atom('H', v3(5.5, -0.8, 0)));
    atoms.push(atom('H', v3(-4, 2.2, 0.5)));
    atoms.push(atom('H', v3(-4, -2.2, 0.5)));

    const bonds: BondData[] = [
      bond(0, 1, 'double'), bond(1, 2), bond(2, 3, 'double'), bond(3, 4),
      bond(4, 5, 'double'), bond(5, 6),
      bond(0, 8), bond(0, 9), bond(6, 7, 'double'),
      bond(6, 10), bond(8, 11), bond(9, 12),
    ];
    molecules.push(makeMolecule('Neroli', 'Floral', 0.70, atoms, bonds));
  }

  // === WOODY (5) ===
  {
    const ring = buildBenzeneRing(v3(0, 0, 0), v3(0, 0, 1));
    const atoms = ring.atoms;
    const bonds = ring.bonds;

    atoms.push(atom('C', v3(2.5, -1.5, 0)));
    bonds.push(bond(1, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(4.0, -2.0, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(5.5, -1.2, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(6.5, -2.5, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(5.0, -3.5, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(3.5, -3.0, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('O', v3(8.0, -2.0, 0)));
    bonds.push(bond(8, atoms.length - 1, 'single'));

    atoms.push(atom('H', v3(-2.0, -1.5, 0.5)));
    bonds.push(bond(4, atoms.length - 1, 'single'));

    molecules.push(makeMolecule('Cedrol', 'Woody', 0.18, atoms, bonds));
  }

  {
    const ring = buildBenzeneRing(v3(0, 0, 0), v3(0, 0, 1));
    const atoms = ring.atoms;
    const bonds = ring.bonds;

    atoms.push(atom('C', v3(2.5, 0.5, 0)));
    bonds.push(bond(0, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(4.0, -0.2, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(5.5, 0.5, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(6.5, -0.8, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(5.5, -2.0, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(4.0, -1.5, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(-2.5, 1.0, 0)));
    bonds.push(bond(2, atoms.length - 1, 'single'));

    atoms.push(atom('O', v3(-3.8, 0.3, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    molecules.push(makeMolecule('Sandalol', 'Woody', 0.15, atoms, bonds));
  }

  {
    const ring1 = buildBenzeneRing(v3(0, 0, 0), v3(0, 0, 1));
    const atoms = ring1.atoms;
    const bonds = ring1.bonds;

    atoms.push(atom('C', v3(2.5, 0, 0)));
    bonds.push(bond(0, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(3.5, 1.2, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(5.0, 1.0, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(5.5, -0.5, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(4.5, -1.5, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(3.0, -1.2, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('O', v3(6.8, -0.8, 0)));
    bonds.push(bond(9, atoms.length - 1, 'single'));

    molecules.push(makeMolecule('Patchoulol', 'Woody', 0.12, atoms, bonds));
  }

  {
    const ring = buildBenzeneRing(v3(0, 0, 0), v3(0, 0, 1));
    const atoms = ring.atoms;
    const bonds = ring.bonds;

    atoms.push(atom('O', v3(-2.5, 0, 0)));
    bonds.push(bond(3, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(-4.0, 0.5, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('O', v3(0, -2.5, 0)));
    bonds.push(bond(4, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(0.5, -4.0, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('H', v3(2.0, -2.0, 0.5)));
    bonds.push(bond(1, atoms.length - 1, 'single'));

    molecules.push(makeMolecule('Guaiacol', 'Woody', 0.45, atoms, bonds));
  }

  {
    const ring = buildBenzeneRing(v3(0, 0, 0), v3(0, 0, 1));
    const atoms = ring.atoms;
    const bonds = ring.bonds;

    atoms.push(atom('C', v3(2.5, 0.8, 0)));
    bonds.push(bond(0, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(4.0, 0.0, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'double'));

    atoms.push(atom('C', v3(5.5, 0.8, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(6.5, -0.5, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('O', v3(7.5, 0.2, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'double'));

    atoms.push(atom('C', v3(-2.0, -1.5, 0)));
    bonds.push(bond(4, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(-3.5, -1.0, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    molecules.push(makeMolecule('Iso-E-Super', 'Woody', 0.32, atoms, bonds));
  }

  // === SPICY (3) ===
  {
    const ring = buildBenzeneRing(v3(0, 0, 0), v3(0, 0, 1));
    const atoms = ring.atoms;
    const bonds = ring.bonds;

    atoms.push(atom('O', v3(-2.5, 0, 0)));
    bonds.push(bond(3, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(-4.0, 0.5, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('O', v3(0, 2.5, 0)));
    bonds.push(bond(2, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(0.5, 4.0, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('O', v3(2.5, -2.0, 0)));
    bonds.push(bond(1, atoms.length - 1, 'double'));

    atoms.push(atom('C', v3(4.0, -2.5, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('H', v3(-4.0, 1.5, 0.5)));
    bonds.push(bond(7, atoms.length - 1, 'single'));

    molecules.push(makeMolecule('Vanillin', 'Spicy', 0.42, atoms, bonds));
  }

  {
    const ring = buildBenzeneRing(v3(0, 0, 0), v3(0, 0, 1));
    const atoms = ring.atoms;
    const bonds = ring.bonds;

    atoms.push(atom('O', v3(-2.5, 0, 0)));
    bonds.push(bond(3, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(-4.0, 0.5, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(2.5, -1.0, 0)));
    bonds.push(bond(1, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(4.0, -0.3, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'double'));

    atoms.push(atom('C', v3(5.5, -1.0, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('O', v3(2.5, 1.5, 0)));
    bonds.push(bond(2, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(4.0, 2.2, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    molecules.push(makeMolecule('Eugenol', 'Spicy', 0.52, atoms, bonds));
  }

  {
    const ring = buildBenzeneRing(v3(0, 0, 0), v3(0, 0, 1));
    const atoms = ring.atoms;
    const bonds = ring.bonds;

    atoms.push(atom('C', v3(2.5, 0.5, 0)));
    bonds.push(bond(0, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(4.0, -0.2, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'double'));

    atoms.push(atom('C', v3(5.5, 0.5, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(7.0, -0.2, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'double'));

    atoms.push(atom('O', v3(8.0, 0.8, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'double'));

    atoms.push(atom('H', v3(-2.0, -1.8, 0.5)));
    bonds.push(bond(4, atoms.length - 1, 'single'));

    molecules.push(makeMolecule('Cinnamaldehyde', 'Spicy', 0.60, atoms, bonds));
  }

  // === HERBAL (2) ===
  {
    const ring = buildBenzeneRing(v3(0, 0, 0), v3(0, 0, 1));
    const atoms = ring.atoms;
    const bonds = ring.bonds;

    atoms.push(atom('O', v3(2.5, 1.5, 0)));
    bonds.push(bond(2, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(4.0, 0.8, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'double'));

    atoms.push(atom('O', v3(2.5, -1.8, 0)));
    bonds.push(bond(1, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(4.0, -2.5, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(-2.5, 0.8, 0)));
    bonds.push(bond(2, atoms.length - 1, 'single'));

    atoms.push(atom('H', v3(-4.0, 0.3, 0.5)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    molecules.push(makeMolecule('Coumarin', 'Herbal', 0.48, atoms, bonds));
  }

  {
    const ring = buildBenzeneRing(v3(0, 0, 0), v3(0, 0, 1));
    const atoms = ring.atoms;
    const bonds = ring.bonds;

    atoms.push(atom('O', v3(-2.5, 0, 0)));
    bonds.push(bond(3, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(-4.0, 0.5, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(-1.5, 2.2, 0)));
    bonds.push(bond(2, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(2.5, 1.2, 0)));
    bonds.push(bond(0, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(4.0, 0.5, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(5.5, 1.2, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('H', v3(-4.0, 1.2, 0.5)));
    bonds.push(bond(7, atoms.length - 1, 'single'));

    molecules.push(makeMolecule('Thymol', 'Herbal', 0.50, atoms, bonds));
  }

  // === MUSK (1) ===
  {
    const ring = buildBenzeneRing(v3(0, 0, 0), v3(0, 0, 1));
    const atoms = ring.atoms;
    const bonds = ring.bonds;

    atoms.push(atom('O', v3(0, 2.5, 0)));
    bonds.push(bond(2, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(-1.0, 4.0, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(1.0, 4.5, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(-1.5, -2.2, 0)));
    bonds.push(bond(4, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(-3.0, -1.8, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(-4.5, -2.5, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    molecules.push(makeMolecule('Galaxolide', 'Musk', 0.22, atoms, bonds));
  }

  // === MARINE (1) ===
  {
    const ring = buildBenzeneRing(v3(0, 0, 0), v3(0, 0, 1));
    const atoms = ring.atoms;
    const bonds = ring.bonds;

    atoms.push(atom('C', v3(2.5, 0.5, 0)));
    bonds.push(bond(0, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(4.0, -0.2, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(5.5, 0.5, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('O', v3(6.5, -0.8, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(5.5, -2.0, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(4.0, -1.5, 0)));
    bonds.push(bond(atoms.length - 2, atoms.length - 1, 'single'));

    atoms.push(atom('C', v3(-2.5, 1.0, 0)));
    bonds.push(bond(2, atoms.length - 1, 'single'));

    molecules.push(makeMolecule('Ambroxan', 'Marine', 0.28, atoms, bonds));
  }

  return molecules;
}
