export type AtomType = 'C' | 'H' | 'O' | 'N';

export interface Atom {
  id: number;
  element: AtomType;
  position: [number, number, number];
}

export interface Bond {
  id: number;
  atom1Id: number;
  atom2Id: number;
  order: number;
  broken: boolean;
}

export interface MoleculeData {
  name: string;
  formula: string;
  atoms: Atom[];
  bonds: Bond[];
}

export const CPK_COLORS: Record<AtomType, number> = {
  C: 0x909090,
  H: 0xffffff,
  O: 0xff0d0d,
  N: 0x3050f8,
};

export const CPK_CSS: Record<AtomType, string> = {
  C: '#909090',
  H: '#FFFFFF',
  O: '#FF0D0D',
  N: '#3050F8',
};

export const ATOM_RADIUS: Record<AtomType, number> = {
  C: 0.3,
  H: 0.2,
  O: 0.3,
  N: 0.3,
};

let nextAtomId = 0;
let nextBondId = 0;

function atom(el: AtomType, x: number, y: number, z: number): Atom {
  return { id: nextAtomId++, element: el, position: [x, y, z] };
}

function bond(a1: number, a2: number, order: number = 1): Bond {
  return { id: nextBondId++, atom1Id: a1, atom2Id: a2, order, broken: false };
}

function createCaffeine(): MoleculeData {
  nextAtomId = 0;
  nextBondId = 0;

  const s = 1.5;
  const N1 = atom('N', 0, s, 0);
  const C2 = atom('C', s * 0.866, s * 0.5, 0);
  const N3 = atom('N', s * 0.866, -s * 0.5, 0);
  const C4 = atom('C', 0, -s, 0);
  const C5 = atom('C', -s * 0.866, -s * 0.5, 0);
  const C6 = atom('C', -s * 0.866, s * 0.5, 0);

  const O2 = atom('O', s * 1.73, s, 0);
  const O6 = atom('O', -s * 1.73, s, 0);

  const N7 = atom('N', -s * 1.6, -s * 1.6, 0);
  const C8 = atom('C', -s * 0.7, -s * 2.5, 0);
  const N9 = atom('N', s * 0.3, -s * 1.8, 0);
  const H8 = atom('H', -s * 0.9, -s * 3.5, 0);

  const C10 = atom('C', s * 0.0, s * 2.0, 0.3);
  const H10a = atom('H', -s * 0.5, s * 2.5, 0.8);
  const H10b = atom('H', s * 0.5, s * 2.5, 0.8);
  const H10c = atom('H', 0, s * 2.5, -0.3);

  const C11 = atom('C', s * 1.73, -s * 1.0, 0.3);
  const H11a = atom('H', s * 2.3, -s * 1.5, 0.8);
  const H11b = atom('H', s * 2.3, -s * 0.5, 0.8);
  const H11c = atom('H', s * 2.3, -s * 1.0, -0.3);

  const C12 = atom('C', -s * 2.6, -s * 1.3, 0.3);
  const H12a = atom('H', -s * 3.0, -s * 0.5, 0.8);
  const H12b = atom('H', -s * 3.0, -s * 1.3, -0.3);
  const H12c = atom('H', -s * 3.0, -s * 2.0, 0.8);

  const atoms = [N1, C2, N3, C4, C5, C6, O2, O6, N7, C8, N9, H8, C10, H10a, H10b, H10c, C11, H11a, H11b, H11c, C12, H12a, H12b, H12c];

  const bonds = [
    bond(N1.id, C2.id),
    bond(C2.id, N3.id),
    bond(N3.id, C4.id),
    bond(C4.id, C5.id),
    bond(C5.id, C6.id),
    bond(C6.id, N1.id),
    bond(C2.id, O2.id, 2),
    bond(C6.id, O6.id, 2),
    bond(C5.id, N7.id),
    bond(N7.id, C8.id),
    bond(C8.id, N9.id),
    bond(N9.id, C4.id),
    bond(C8.id, H8.id),
    bond(N1.id, C10.id),
    bond(C10.id, H10a.id),
    bond(C10.id, H10b.id),
    bond(C10.id, H10c.id),
    bond(N3.id, C11.id),
    bond(C11.id, H11a.id),
    bond(C11.id, H11b.id),
    bond(C11.id, H11c.id),
    bond(N7.id, C12.id),
    bond(C12.id, H12a.id),
    bond(C12.id, H12b.id),
    bond(C12.id, H12c.id),
  ];

  return { name: '咖啡因', formula: 'C₈H₁₀N₄O₂', atoms, bonds };
}

function createGlucose(): MoleculeData {
  nextAtomId = 0;
  nextBondId = 0;

  const s = 1.5;
  const C1 = atom('C', s * 0.5, s * 1.2, s * 0.3);
  const C2 = atom('C', s * 1.3, s * 0.5, -s * 0.2);
  const C3 = atom('C', s * 1.0, -s * 0.8, s * 0.1);
  const C4 = atom('C', -s * 0.2, -s * 1.0, s * 0.4);
  const C5 = atom('C', -s * 1.0, s * 0.0, s * 0.0);
  const O5 = atom('O', -s * 0.5, s * 1.2, -s * 0.2);

  const O1 = atom('O', s * 0.8, s * 2.4, -s * 0.1);
  const H1 = atom('H', s * 1.5, s * 2.7, -s * 0.4);
  const O2h = atom('O', s * 2.5, s * 0.8, s * 0.1);
  const H2h = atom('H', s * 2.9, s * 1.5, s * 0.3);
  const O3h = atom('O', s * 1.8, -s * 1.5, -s * 0.3);
  const H3h = atom('H', s * 2.5, -s * 1.2, -s * 0.6);
  const O4h = atom('O', -s * 0.6, -s * 2.2, -s * 0.1);
  const H4h = atom('H', -s * 1.3, -s * 2.6, s * 0.2);

  const C6 = atom('C', -s * 2.3, -s * 0.2, s * 0.2);
  const O6h = atom('O', -s * 2.8, -s * 0.8, s * 1.2);
  const H6h = atom('H', -s * 3.6, -s * 0.4, s * 1.3);
  const H6a = atom('H', -s * 2.7, s * 0.7, s * 0.5);
  const H6b = atom('H', -s * 2.5, -s * 0.6, -s * 0.7);

  const H1c = atom('H', -s * 0.1, s * 1.0, s * 1.2);
  const H2c = atom('H', s * 1.2, s * 0.7, -s * 1.2);
  const H3c = atom('H', s * 0.9, -s * 1.0, s * 1.1);
  const H4c = atom('H', -s * 0.3, -s * 0.8, s * 1.4);
  const H5c = atom('H', -s * 1.0, s * 0.2, -s * 1.0);

  const atoms = [C1, C2, C3, C4, C5, O5, O1, H1, O2h, H2h, O3h, H3h, O4h, H4h, C6, O6h, H6h, H6a, H6b, H1c, H2c, H3c, H4c, H5c];

  const bonds = [
    bond(C1.id, C2.id),
    bond(C2.id, C3.id),
    bond(C3.id, C4.id),
    bond(C4.id, C5.id),
    bond(C5.id, O5.id),
    bond(O5.id, C1.id),
    bond(C1.id, O1.id),
    bond(O1.id, H1.id),
    bond(C2.id, O2h.id),
    bond(O2h.id, H2h.id),
    bond(C3.id, O3h.id),
    bond(O3h.id, H3h.id),
    bond(C4.id, O4h.id),
    bond(O4h.id, H4h.id),
    bond(C5.id, C6.id),
    bond(C6.id, O6h.id),
    bond(O6h.id, H6h.id),
    bond(C6.id, H6a.id),
    bond(C6.id, H6b.id),
    bond(C1.id, H1c.id),
    bond(C2.id, H2c.id),
    bond(C3.id, H3c.id),
    bond(C4.id, H4c.id),
    bond(C5.id, H5c.id),
  ];

  return { name: '葡萄糖', formula: 'C₆H₁₂O₆', atoms, bonds };
}

function createAspirin(): MoleculeData {
  nextAtomId = 0;
  nextBondId = 0;

  const s = 1.5;
  const C1 = atom('C', s * 1.3, s * 0.0, 0);
  const C2 = atom('C', s * 0.65, s * 1.13, 0);
  const C3 = atom('C', -s * 0.65, s * 1.13, 0);
  const C4 = atom('C', -s * 1.3, s * 0.0, 0);
  const C5 = atom('C', -s * 0.65, -s * 1.13, 0);
  const C6 = atom('C', s * 0.65, -s * 1.13, 0);

  const H3 = atom('H', -s * 1.15, s * 2.0, 0);
  const H4 = atom('H', -s * 2.3, s * 0.0, 0);
  const H5 = atom('H', -s * 1.15, -s * 2.0, 0);
  const H6 = atom('H', s * 1.15, -s * 2.0, 0);

  const C7 = atom('C', s * 2.7, s * 0.0, 0);
  const O7a = atom('O', s * 3.2, s * 1.1, 0);
  const O7b = atom('O', s * 3.5, -s * 0.9, 0);
  const H7b = atom('H', s * 4.4, -s * 0.7, 0);

  const O8 = atom('O', s * 1.3, s * 2.3, 0);
  const C8 = atom('C', s * 0.7, s * 3.5, 0);
  const C9 = atom('C', s * 1.5, s * 4.7, 0);
  const H9a = atom('H', s * 2.5, s * 4.4, 0.4);
  const H9b = atom('H', s * 1.5, s * 4.7, -s * 1.0);
  const H9c = atom('H', s * 1.0, s * 5.6, s * 0.3);

  const atoms = [C1, C2, C3, C4, C5, C6, H3, H4, H5, H6, C7, O7a, O7b, H7b, O8, C8, C9, H9a, H9b, H9c];

  const bonds = [
    bond(C1.id, C2.id, 2),
    bond(C2.id, C3.id, 1),
    bond(C3.id, C4.id, 2),
    bond(C4.id, C5.id, 1),
    bond(C5.id, C6.id, 2),
    bond(C6.id, C1.id, 1),
    bond(C3.id, H3.id),
    bond(C4.id, H4.id),
    bond(C5.id, H5.id),
    bond(C6.id, H6.id),
    bond(C1.id, C7.id),
    bond(C7.id, O7a.id, 2),
    bond(C7.id, O7b.id),
    bond(O7b.id, H7b.id),
    bond(C2.id, O8.id),
    bond(O8.id, C8.id),
    bond(C8.id, C9.id),
    bond(C8.id, C2.id),
    bond(C9.id, H9a.id),
    bond(C9.id, H9b.id),
    bond(C9.id, H9c.id),
  ];

  return { name: '阿司匹林', formula: 'C₉H₈O₄', atoms, bonds };
}

export function createMolecule(type: string): MoleculeData {
  switch (type) {
    case 'caffeine':
      return createCaffeine();
    case 'glucose':
      return createGlucose();
    case 'aspirin':
      return createAspirin();
    default:
      return createCaffeine();
  }
}

export function countAtoms(mol: MoleculeData): Record<AtomType, number> {
  const counts: Record<AtomType, number> = { C: 0, H: 0, O: 0, N: 0 };
  for (const a of mol.atoms) {
    counts[a.element]++;
  }
  return counts;
}

export function countActiveBonds(mol: MoleculeData): number {
  return mol.bonds.filter(b => !b.broken).length;
}

export const MOLECULE_TYPES = [
  { key: 'caffeine', label: '咖啡因' },
  { key: 'glucose', label: '葡萄糖' },
  { key: 'aspirin', label: '阿司匹林' },
];
