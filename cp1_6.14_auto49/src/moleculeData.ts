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

function atom(symbol: AtomSymbol, x: number, y: number, z: number): AtomData {
  return {
    symbol,
    position: new THREE.Vector3(x, y, z),
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

function hexRingAtoms(cx: number, cy: number, cz: number, r: number, aromatic: boolean = false): AtomData[] {
  const atoms: AtomData[] = [];
  for (let i = 0; i < 6; i++) {
    const ang = (Math.PI / 3) * i;
    const x = cx + r * Math.cos(ang);
    const y = cy + r * Math.sin(ang);
    atoms.push(atom(aromatic ? 'C' : 'C', x, y, cz));
  }
  return atoms;
}

export function generateMolecules(): MoleculeData[] {
  return [

    makeMolecule('Limonene', 'Citrus', 0.88, [
      atom('C', 0, 0, 0), atom('C', 1.5, 0.2, 0), atom('C', 2.8, -0.6, 0.3),
      atom('C', 4.1, 0.0, 0), atom('C', 3.9, 1.4, 0.2), atom('C', 2.6, 1.9, -0.2),
      atom('C', 1.3, 1.2, -0.5), atom('C', 0.0, 1.8, 0.2), atom('H', -1.2, -0.3, 0.3),
      atom('H', 5.2, -0.6, 0.2), atom('H', -1.0, 1.4, 0.6), atom('H', 0.0, 2.8, -0.1),
    ], [
      bond(0, 1, 'double'), bond(1, 2), bond(2, 3), bond(3, 4), bond(4, 5),
      bond(5, 6), bond(6, 0), bond(6, 7), bond(0, 8), bond(3, 9), bond(7, 10), bond(7, 11),
    ]),

    makeMolecule('Citral', 'Citrus', 0.92, [
      atom('C', 0, 0, 0), atom('C', 1.3, 0.5, 0.1), atom('C', 2.5, -0.1, 0.3),
      atom('C', 3.8, 0.4, 0.0), atom('C', 5.0, -0.2, 0.2), atom('C', 6.2, 0.3, 0.0),
      atom('C', 7.4, -0.3, 0.2), atom('O', 7.3, -1.6, 0.4), atom('H', -1.0, 0.4, 0.3),
      atom('H', 1.2, 1.5, -0.1), atom('H', 2.4, -1.1, 0.5), atom('H', 6.3, 1.3, -0.2),
    ], [
      bond(0, 1, 'double'), bond(1, 2), bond(2, 3, 'double'), bond(3, 4),
      bond(4, 5, 'double'), bond(5, 6), bond(6, 7, 'double'), bond(0, 8),
      bond(1, 9), bond(2, 10), bond(5, 11),
    ]),

    makeMolecule('Linalyl-Acetate', 'Citrus', 0.80, [
      atom('C', 0, 0, 0), atom('C', 1.3, 0.4, 0), atom('C', 2.5, -0.3, 0.3),
      atom('C', 3.7, 0.2, 0), atom('O', 4.8, -0.4, 0.3), atom('C', 5.9, 0.1, 0.0),
      atom('O', 7.0, -0.5, 0.2), atom('C', 2.4, -1.7, 0), atom('C', 1.2, -2.2, 0.3),
      atom('H', -1.0, 0.5, 0.2), atom('H', 3.6, -2.0, 0.3), atom('H', 5.9, 1.1, -0.2),
    ], [
      bond(0, 1, 'double'), bond(1, 2), bond(2, 3), bond(3, 4), bond(4, 5),
      bond(5, 6, 'double'), bond(2, 7), bond(7, 8), bond(0, 9), bond(7, 10), bond(5, 11),
    ]),

    makeMolecule('Bergapten', 'Citrus', 0.55, [
      atom('C', 0, 0, 0), atom('C', 1.3, 0.5, 0), atom('C', 2.6, 0.0, 0.3),
      atom('O', 3.5, 0.8, 0.0), atom('C', 3.8, 2.1, 0.2), atom('C', 2.7, 2.9, -0.1),
      atom('C', 1.4, 2.5, 0.1), atom('C', 1.2, 1.1, -0.2), atom('O', 0.3, 2.8, 0.4),
      atom('C', 4.3, -0.9, 0.2), atom('O', 5.5, -0.6, 0.0), atom('H', -0.9, -0.4, 0.3),
      atom('H', 4.7, 2.4, 0.4),
    ], [
      bond(0, 1), bond(1, 2), bond(2, 3), bond(3, 4), bond(4, 5),
      bond(5, 6), bond(6, 7), bond(7, 1), bond(6, 8), bond(2, 9),
      bond(9, 10, 'double'), bond(0, 11), bond(4, 12),
    ]),

    makeMolecule('Linalool', 'Floral', 0.72, [
      atom('C', 0, 0, 0), atom('C', 1.2, 0.5, 0.2), atom('C', 2.5, -0.2, 0),
      atom('C', 3.7, 0.4, 0.2), atom('O', 4.8, -0.4, 0.4), atom('C', 2.4, -1.6, 0.1),
      atom('C', 1.2, -2.1, 0.3), atom('C', 2.8, 1.8, 0), atom('C', 1.5, 2.3, 0.2),
      atom('H', -1.0, 0.6, 0.3), atom('H', 3.5, -1.9, 0.3), atom('H', 0.4, 1.9, 0.4),
    ], [
      bond(0, 1), bond(1, 2, 'double'), bond(2, 3), bond(3, 4), bond(2, 5),
      bond(5, 6), bond(3, 7), bond(7, 8), bond(0, 9), bond(5, 10), bond(8, 11),
    ]),

    makeMolecule('Geraniol', 'Floral', 0.78, [
      atom('C', 0, 0, 0), atom('C', 1.3, 0.5, 0.1), atom('C', 2.5, -0.2, 0.3),
      atom('C', 3.7, 0.4, 0.0), atom('C', 4.9, -0.3, 0.2), atom('C', 6.1, 0.3, 0.0),
      atom('O', 7.2, -0.4, 0.2), atom('C', 1.3, 1.9, 0.3), atom('C', 4.9, -1.7, 0.3),
      atom('H', -1.0, 0.5, 0.3), atom('H', 7.1, -1.3, -0.1), atom('H', 0.3, 2.3, 0.5),
    ], [
      bond(0, 1), bond(1, 2, 'double'), bond(2, 3), bond(3, 4, 'double'),
      bond(4, 5), bond(5, 6), bond(1, 7), bond(4, 8), bond(0, 9), bond(6, 10), bond(7, 11),
    ]),

    makeMolecule('Jasmone', 'Floral', 0.62, [
      atom('C', 0, 0, 0), atom('C', 1.5, 0.3, 0.1), atom('C', 2.6, -0.6, 0.4),
      atom('C', 2.3, -2.0, 0.2), atom('C', 0.9, -2.4, 0.0), atom('C', -0.3, -1.5, 0.3),
      atom('O', 2.9, -3.2, 0.3), atom('C', 3.9, 0.1, 0.2), atom('C', 5.1, -0.6, 0.4),
      atom('C', 6.3, 0.0, 0.2), atom('C', 7.4, -0.8, 0.0), atom('H', -1.2, -1.8, 0.5),
    ], [
      bond(0, 1), bond(1, 2), bond(2, 3), bond(3, 4), bond(4, 5), bond(5, 0),
      bond(3, 6, 'double'), bond(2, 7), bond(7, 8, 'double'), bond(8, 9), bond(9, 10), bond(5, 11),
    ]),

    makeMolecule('Neroli', 'Floral', 0.70, [
      atom('C', 0, 0, 0), atom('C', 1.2, 0.5, 0.1), atom('C', 2.4, -0.2, 0.3),
      atom('C', 3.6, 0.4, 0.0), atom('C', 4.8, -0.3, 0.2), atom('C', 6.0, 0.3, 0.0),
      atom('O', 7.1, -0.4, 0.2), atom('C', 0.0, -1.4, 0.2), atom('H', -1.0, 0.5, 0.3),
      atom('H', 7.0, -1.3, -0.1), atom('H', 2.3, -1.2, 0.5), atom('H', 0.0, -2.3, 0.0),
    ], [
      bond(0, 1), bond(1, 2, 'double'), bond(2, 3), bond(3, 4), bond(4, 5, 'double'),
      bond(5, 6), bond(0, 7), bond(0, 8), bond(6, 9), bond(2, 10), bond(7, 11),
    ]),

    makeMolecule('Cedrol', 'Woody', 0.18, [
      atom('C', 0, 0, 0), atom('C', 1.3, 0.5, 0.2), atom('C', 2.4, -0.3, 0.4),
      atom('C', 3.5, 0.3, 0.1), atom('C', 3.2, 1.7, 0.3), atom('C', 1.9, 2.1, -0.1),
      atom('C', 0.8, 1.3, 0.3), atom('C', -0.4, 1.8, -0.1), atom('O', -1.4, 1.0, 0.4),
      atom('C', -0.3, -1.0, 0.4), atom('C', 2.5, 2.9, -0.3), atom('C', 4.6, 2.2, 0.5),
      atom('H', 4.4, -0.2, 0.2), atom('H', -1.2, -0.8, 0.7),
    ], [
      bond(0, 1), bond(1, 2), bond(2, 3), bond(3, 4), bond(4, 5),
      bond(5, 6), bond(6, 0), bond(6, 7), bond(7, 8), bond(0, 9),
      bond(5, 10), bond(4, 11), bond(3, 12), bond(9, 13),
    ]),

    makeMolecule('Sandalol', 'Woody', 0.15, [
      atom('C', 0, 0, 0), atom('C', 1.2, 0.6, 0.1), atom('C', 2.4, 0.0, 0.3),
      atom('C', 3.5, 0.6, 0.0), atom('C', 4.6, -0.1, 0.2), atom('O', 5.6, 0.4, -0.1),
      atom('C', 3.3, 1.9, 0.3), atom('C', 2.1, 2.4, -0.1), atom('C', 0.9, 1.9, 0.3),
      atom('C', -0.3, 1.2, 0.5), atom('C', 4.4, -1.4, 0.3), atom('C', 5.5, -2.1, 0.1),
      atom('H', -0.8, -0.6, 0.4), atom('H', 6.5, 0.1, 0.1),
    ], [
      bond(0, 1), bond(1, 2), bond(2, 3), bond(3, 4), bond(4, 5),
      bond(3, 6), bond(6, 7), bond(7, 8), bond(8, 9), bond(9, 0),
      bond(4, 10), bond(10, 11), bond(0, 12), bond(5, 13),
    ]),

    makeMolecule('Patchoulol', 'Woody', 0.12, [
      atom('C', 0, 0, 0), atom('C', 1.0, 0.8, 0.3), atom('C', 2.3, 0.4, 0.1),
      atom('C', 3.4, 1.1, 0.4), atom('C', 4.4, 0.3, 0.2), atom('O', 4.2, -1.0, 0.4),
      atom('C', 5.5, 1.0, 0.0), atom('C', 3.4, 2.4, 0.2), atom('C', 2.2, 2.9, -0.1),
      atom('C', 1.0, 2.2, 0.4), atom('C', -0.3, 2.8, 0.1), atom('C', -0.4, -0.7, 0.5),
      atom('C', 2.3, -0.4, -1.0), atom('H', -1.2, 0.7, 0.5),
    ], [
      bond(0, 1), bond(1, 2), bond(2, 3), bond(3, 4), bond(4, 5),
      bond(4, 6), bond(3, 7), bond(7, 8), bond(8, 9), bond(9, 10),
      bond(9, 1), bond(0, 11), bond(2, 12), bond(0, 13),
    ]),

    makeMolecule('Guaiacol', 'Woody', 0.45, [
      atom('C', 0, 0, 0), atom('C', 1.2, 0.6, 0), atom('C', 2.4, 0.0, 0.3),
      atom('C', 2.4, -1.3, 0.4), atom('C', 1.2, -1.9, 0.1), atom('C', 0.0, -1.3, -0.2),
      atom('O', -1.1, -1.8, 0.3), atom('C', -2.2, -1.0, 0.0), atom('O', 0.0, 1.3, 0.2),
      atom('C', 1.1, 2.0, 0.0), atom('H', 3.4, -1.8, 0.6), atom('H', -3.1, -1.6, 0.3),
    ], [
      bond(0, 1, 'double'), bond(1, 2), bond(2, 3, 'double'), bond(3, 4),
      bond(4, 5, 'double'), bond(5, 0), bond(5, 6), bond(6, 7), bond(0, 8), bond(8, 9),
      bond(3, 10), bond(7, 11),
    ]),

    makeMolecule('Vanillin', 'Spicy', 0.42, [
      atom('C', 0, 0, 0), atom('C', 1.3, 0.6, 0), atom('C', 2.5, 0.0, 0.3),
      atom('C', 2.5, -1.4, 0.4), atom('C', 1.3, -2.0, 0.1), atom('C', 0.1, -1.4, -0.2),
      atom('O', -1.0, -1.9, 0.3), atom('C', -2.2, -1.1, 0.0), atom('C', 3.7, -1.9, 0.2),
      atom('O', 3.7, -3.2, 0.4), atom('O', 3.6, 0.7, 0.0), atom('H', -3.1, -1.7, 0.3),
      atom('H', 1.3, -3.0, 0.3),
    ], [
      bond(0, 1, 'double'), bond(1, 2), bond(2, 3), bond(3, 4, 'double'),
      bond(4, 5), bond(5, 0), bond(5, 6), bond(6, 7), bond(3, 8),
      bond(8, 9, 'double'), bond(2, 10), bond(7, 11), bond(4, 12),
    ]),

    makeMolecule('Eugenol', 'Spicy', 0.52, [
      atom('C', 0, 0, 0), atom('C', 1.2, 0.6, 0), atom('C', 2.4, 0.0, 0.3),
      atom('C', 2.4, -1.3, 0.4), atom('C', 1.2, -1.9, 0.1), atom('C', 0.0, -1.3, -0.2),
      atom('O', -1.1, -1.8, 0.3), atom('C', 3.6, -2.0, 0.0), atom('O', 4.6, -1.3, 0.3),
      atom('C', 3.7, -3.2, 0.2), atom('C', 3.6, 0.7, 0.1), atom('C', 4.7, 1.4, -0.2),
      atom('H', 5.6, 0.9, 0.1), atom('H', 2.3, -4.0, 0.0),
    ], [
      bond(0, 1, 'double'), bond(1, 2), bond(2, 3, 'double'), bond(3, 4),
      bond(4, 5, 'double'), bond(5, 0), bond(5, 6), bond(3, 7),
      bond(7, 8), bond(7, 9), bond(2, 10), bond(10, 11, 'double'),
      bond(11, 12), bond(9, 13),
    ]),

    makeMolecule('Cinnamaldehyde', 'Spicy', 0.60, [
      atom('C', 0, 0, 0), atom('C', 1.2, 0.6, 0.1), atom('C', 2.4, 0.0, 0.3),
      atom('C', 2.4, -1.3, 0.4), atom('C', 1.2, -1.9, 0.1), atom('C', 0.0, -1.3, -0.2),
      atom('C', -1.2, -2.0, 0.2), atom('C', -2.3, -1.3, -0.1), atom('C', -3.5, -2.0, 0.1),
      atom('O', -3.5, -3.3, -0.1), atom('H', 3.4, 0.4, 0.5), atom('H', 3.4, -1.8, 0.6),
    ], [
      bond(0, 1, 'double'), bond(1, 2), bond(2, 3, 'double'), bond(3, 4),
      bond(4, 5, 'double'), bond(5, 0), bond(5, 6), bond(6, 7, 'double'),
      bond(7, 8), bond(8, 9, 'double'), bond(2, 10), bond(3, 11),
    ]),

    makeMolecule('Coumarin', 'Herbal', 0.48, [
      atom('C', 0, 0, 0), atom('C', 1.2, 0.5, 0), atom('C', 2.4, 0.0, 0.3),
      atom('C', 2.4, -1.3, 0.4), atom('C', 1.2, -1.9, 0.1), atom('C', 0.0, -1.3, -0.2),
      atom('O', -1.1, -1.8, 0.3), atom('O', 3.4, -2.0, 0.2), atom('C', 3.5, -3.2, 0.4),
      atom('H', -0.9, 1.0, 0.3), atom('H', 3.4, 0.5, 0.1),
    ], [
      bond(0, 1, 'double'), bond(1, 2), bond(2, 3, 'double'), bond(3, 4),
      bond(4, 5, 'double'), bond(5, 0), bond(5, 6), bond(3, 7), bond(7, 8, 'double'),
      bond(0, 9), bond(2, 10),
    ]),

    makeMolecule('Thymol', 'Herbal', 0.50, [
      atom('C', 0, 0, 0), atom('C', 1.2, 0.6, 0), atom('C', 2.4, 0.0, 0.3),
      atom('C', 2.4, -1.3, 0.4), atom('C', 1.2, -1.9, 0.1), atom('C', 0.0, -1.3, -0.2),
      atom('O', -1.0, -1.9, 0.3), atom('C', -0.9, 1.1, 0.2), atom('C', 3.6, 0.7, 0.1),
      atom('C', 4.7, 0.0, 0.3), atom('C', 5.8, 0.7, 0.1), atom('H', 3.5, -2.7, 0.2),
      atom('H', -1.8, 0.6, 0.4),
    ], [
      bond(0, 1, 'double'), bond(1, 2), bond(2, 3, 'double'), bond(3, 4),
      bond(4, 5, 'double'), bond(5, 0), bond(5, 6), bond(0, 7), bond(2, 8),
      bond(8, 9), bond(9, 10), bond(3, 11), bond(7, 12),
    ]),

    makeMolecule('Iso-E-Super', 'Woody', 0.32, [
      atom('C', 0, 0, 0), atom('C', 1.2, 0.6, 0.2), atom('C', 2.4, 0.1, 0.0),
      atom('C', 3.5, 0.7, 0.3), atom('C', 4.6, -0.1, 0.1), atom('O', 4.4, -1.3, 0.3),
      atom('C', 5.6, 0.5, -0.1), atom('C', 3.6, 2.0, 0.1), atom('C', 2.4, 2.5, 0.3),
      atom('C', 1.2, 2.0, -0.1), atom('C', 0.1, 2.6, 0.2), atom('C', -0.9, -0.6, 0.4),
      atom('H', -1.1, 0.7, 0.4), atom('H', 6.6, 0.0, 0.1),
    ], [
      bond(0, 1), bond(1, 2), bond(2, 3), bond(3, 4, 'double'), bond(4, 5),
      bond(4, 6), bond(3, 7), bond(7, 8), bond(8, 9), bond(9, 10), bond(9, 1),
      bond(0, 11), bond(0, 12), bond(6, 13),
    ]),

    makeMolecule('Galaxolide', 'Musk', 0.22, [
      atom('C', 0, 0, 0), atom('C', 1.1, 0.6, 0.2), atom('C', 2.3, 0.1, 0.0),
      atom('O', 2.4, -1.2, 0.3), atom('C', 3.4, 0.8, 0.2), atom('C', 4.5, 0.1, 0.0),
      atom('C', 5.6, 0.8, 0.2), atom('C', 3.3, 2.1, 0.3), atom('C', 2.1, 2.6, 0.1),
      atom('C', 0.9, 2.0, -0.1), atom('C', -0.2, -1.3, 0.2), atom('H', 6.5, 0.3, 0.4),
      atom('H', -0.8, 0.7, 0.4),
    ], [
      bond(0, 1), bond(1, 2), bond(2, 3), bond(2, 4), bond(4, 5, 'double'),
      bond(5, 6), bond(4, 7), bond(7, 8), bond(8, 9), bond(9, 1), bond(0, 10),
      bond(6, 11), bond(0, 12),
    ]),

    makeMolecule('Ambroxan', 'Marine', 0.28, [
      atom('C', 0, 0, 0), atom('C', 1.2, 0.6, 0.2), atom('C', 2.4, 0.1, 0.0),
      atom('C', 3.5, 0.7, 0.3), atom('C', 4.5, -0.1, 0.1), atom('O', 4.3, -1.3, 0.3),
      atom('C', 3.3, -1.7, 0.1), atom('C', 2.1, -1.2, 0.3), atom('C', 1.0, -1.8, 0.1),
      atom('C', -0.2, -1.0, 0.3), atom('C', -1.0, 0.6, 0.1), atom('C', 5.6, 0.5, -0.1),
      atom('H', -1.2, -1.7, 0.5),
    ], [
      bond(0, 1), bond(1, 2), bond(2, 3), bond(3, 4), bond(4, 5),
      bond(5, 6), bond(6, 7), bond(7, 8), bond(8, 9), bond(9, 0),
      bond(0, 10), bond(4, 11), bond(9, 12),
    ]),
  ];
}
