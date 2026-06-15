export interface Atom {
  id: string;
  name: string;
  element: 'C' | 'O' | 'H';
  x: number;
  y: number;
  z: number;
}

export interface Bond {
  id: string;
  atom1: string;
  atom2: string;
  order?: number;
}

export interface MoleculeData {
  name: string;
  displayName: string;
  atoms: Atom[];
  bonds: Bond[];
}

export const elementColors: Record<string, string> = {
  C: '#555555',
  O: '#FF3333',
  H: '#FFFFFF'
};

export const elementSizes: Record<string, number> = {
  C: 0.4,
  O: 0.35,
  H: 0.25
};

const methane: MoleculeData = {
  name: 'methane',
  displayName: '甲烷 (CH₄)',
  atoms: [
    { id: 'C1', name: '碳原子 1', element: 'C', x: 0, y: 0, z: 0 },
    { id: 'H1', name: '氢原子 1', element: 'H', x: 0.629, y: 0.629, z: 0.629 },
    { id: 'H2', name: '氢原子 2', element: 'H', x: -0.629, y: -0.629, z: 0.629 },
    { id: 'H3', name: '氢原子 3', element: 'H', x: -0.629, y: 0.629, z: -0.629 },
    { id: 'H4', name: '氢原子 4', element: 'H', x: 0.629, y: -0.629, z: -0.629 }
  ],
  bonds: [
    { id: 'B1', atom1: 'C1', atom2: 'H1' },
    { id: 'B2', atom1: 'C1', atom2: 'H2' },
    { id: 'B3', atom1: 'C1', atom2: 'H3' },
    { id: 'B4', atom1: 'C1', atom2: 'H4' }
  ]
};

const ethanol: MoleculeData = {
  name: 'ethanol',
  displayName: '乙醇 (C₂H₅OH)',
  atoms: [
    { id: 'C1', name: '碳原子 1', element: 'C', x: -0.75, y: 0, z: 0 },
    { id: 'C2', name: '碳原子 2', element: 'C', x: 0.75, y: 0, z: 0 },
    { id: 'O1', name: '氧原子 1', element: 'O', x: 1.65, y: 0.85, z: 0 },
    { id: 'H1', name: '氢原子 1', element: 'H', x: -1.15, y: 0.55, z: 0.85 },
    { id: 'H2', name: '氢原子 2', element: 'H', x: -1.15, y: -0.95, z: 0.25 },
    { id: 'H3', name: '氢原子 3', element: 'H', x: -1.15, y: 0.4, z: -0.9 },
    { id: 'H4', name: '氢原子 4', element: 'H', x: 0.75, y: -0.6, z: -0.85 },
    { id: 'H5', name: '氢原子 5', element: 'H', x: 0.75, y: 0.9, z: -0.55 },
    { id: 'H6', name: '氢原子 6', element: 'H', x: 2.3, y: 0.55, z: 0 }
  ],
  bonds: [
    { id: 'B1', atom1: 'C1', atom2: 'C2' },
    { id: 'B2', atom1: 'C2', atom2: 'O1' },
    { id: 'B3', atom1: 'C1', atom2: 'H1' },
    { id: 'B4', atom1: 'C1', atom2: 'H2' },
    { id: 'B5', atom1: 'C1', atom2: 'H3' },
    { id: 'B6', atom1: 'C2', atom2: 'H4' },
    { id: 'B7', atom1: 'C2', atom2: 'H5' },
    { id: 'B8', atom1: 'O1', atom2: 'H6' }
  ]
};

const benzene: MoleculeData = {
  name: 'benzene',
  displayName: '苯 (C₆H₆)',
  atoms: [
    { id: 'C1', name: '碳原子 1', element: 'C', x: 1.2, y: 0, z: 0 },
    { id: 'C2', name: '碳原子 2', element: 'C', x: 0.6, y: 1.039, z: 0 },
    { id: 'C3', name: '碳原子 3', element: 'C', x: -0.6, y: 1.039, z: 0 },
    { id: 'C4', name: '碳原子 4', element: 'C', x: -1.2, y: 0, z: 0 },
    { id: 'C5', name: '碳原子 5', element: 'C', x: -0.6, y: -1.039, z: 0 },
    { id: 'C6', name: '碳原子 6', element: 'C', x: 0.6, y: -1.039, z: 0 },
    { id: 'H1', name: '氢原子 1', element: 'H', x: 2.1, y: 0, z: 0 },
    { id: 'H2', name: '氢原子 2', element: 'H', x: 1.05, y: 1.819, z: 0 },
    { id: 'H3', name: '氢原子 3', element: 'H', x: -1.05, y: 1.819, z: 0 },
    { id: 'H4', name: '氢原子 4', element: 'H', x: -2.1, y: 0, z: 0 },
    { id: 'H5', name: '氢原子 5', element: 'H', x: -1.05, y: -1.819, z: 0 },
    { id: 'H6', name: '氢原子 6', element: 'H', x: 1.05, y: -1.819, z: 0 }
  ],
  bonds: [
    { id: 'B1', atom1: 'C1', atom2: 'C2', order: 1 },
    { id: 'B2', atom1: 'C2', atom2: 'C3', order: 2 },
    { id: 'B3', atom1: 'C3', atom2: 'C4', order: 1 },
    { id: 'B4', atom1: 'C4', atom2: 'C5', order: 2 },
    { id: 'B5', atom1: 'C5', atom2: 'C6', order: 1 },
    { id: 'B6', atom1: 'C6', atom2: 'C1', order: 2 },
    { id: 'B7', atom1: 'C1', atom2: 'H1' },
    { id: 'B8', atom1: 'C2', atom2: 'H2' },
    { id: 'B9', atom1: 'C3', atom2: 'H3' },
    { id: 'B10', atom1: 'C4', atom2: 'H4' },
    { id: 'B11', atom1: 'C5', atom2: 'H5' },
    { id: 'B12', atom1: 'C6', atom2: 'H6' }
  ]
};

const molecules: MoleculeData[] = [methane, ethanol, benzene];

export function getMoleculeByName(name: string): MoleculeData | undefined {
  return molecules.find(m => m.name === name);
}

export function getAllMolecules(): MoleculeData[] {
  return molecules;
}

export function getAtomNeighbors(atomId: string, moleculeData: MoleculeData): Atom[] {
  const neighborIds: string[] = [];
  
  for (const bond of moleculeData.bonds) {
    if (bond.atom1 === atomId) {
      neighborIds.push(bond.atom2);
    } else if (bond.atom2 === atomId) {
      neighborIds.push(bond.atom1);
    }
  }
  
  return moleculeData.atoms.filter(atom => neighborIds.includes(atom.id));
}
