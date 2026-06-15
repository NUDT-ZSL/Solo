export interface AtomData {
  id: string;
  element: string;
  x: number;
  y: number;
  z: number;
}

export interface BondData {
  atom1: string;
  atom2: string;
  order: number;
}

export interface MoleculeData {
  id: string;
  name: string;
  formula: string;
  atoms: AtomData[];
  bonds: BondData[];
}

export const ELEMENT_COLORS: Record<string, string> = {
  H: '#ffffff',
  C: '#333333',
  N: '#3050f8',
  O: '#ff0000',
  F: '#90e050',
  Cl: '#1ff01f',
  Br: '#a62929',
  I: '#940094',
  S: '#ffff30',
  P: '#ff8000',
};

export const ELEMENT_RADII: Record<string, number> = {
  H: 0.3,
  C: 0.5,
  N: 0.5,
  O: 0.6,
  F: 0.5,
  Cl: 0.6,
  Br: 0.7,
  I: 0.8,
  S: 0.7,
  P: 0.6,
};

export const ELEMENT_ATOMIC_NUMBERS: Record<string, number> = {
  H: 1,
  C: 6,
  N: 7,
  O: 8,
  F: 9,
  P: 15,
  S: 16,
  Cl: 17,
  Br: 35,
  I: 53,
};

const waterMolecule: MoleculeData = {
  id: 'water',
  name: '水',
  formula: 'H₂O',
  atoms: [
    { id: 'O1', element: 'O', x: 0, y: 0, z: 0 },
    { id: 'H1', element: 'H', x: 0.76, y: 0.59, z: 0 },
    { id: 'H2', element: 'H', x: -0.76, y: 0.59, z: 0 },
  ],
  bonds: [
    { atom1: 'O1', atom2: 'H1', order: 1 },
    { atom1: 'O1', atom2: 'H2', order: 1 },
  ],
};

const methaneMolecule: MoleculeData = {
  id: 'methane',
  name: '甲烷',
  formula: 'CH₄',
  atoms: [
    { id: 'C1', element: 'C', x: 0, y: 0, z: 0 },
    { id: 'H1', element: 'H', x: 0.63, y: 0.63, z: 0.63 },
    { id: 'H2', element: 'H', x: -0.63, y: -0.63, z: 0.63 },
    { id: 'H3', element: 'H', x: -0.63, y: 0.63, z: -0.63 },
    { id: 'H4', element: 'H', x: 0.63, y: -0.63, z: -0.63 },
  ],
  bonds: [
    { atom1: 'C1', atom2: 'H1', order: 1 },
    { atom1: 'C1', atom2: 'H2', order: 1 },
    { atom1: 'C1', atom2: 'H3', order: 1 },
    { atom1: 'C1', atom2: 'H4', order: 1 },
  ],
};

const caffeineMolecule: MoleculeData = {
  id: 'caffeine',
  name: '咖啡因',
  formula: 'C₈H₁₀N₄O₂',
  atoms: [
    { id: 'C1', element: 'C', x: 0.000, y: 0.000, z: 0.000 },
    { id: 'N1', element: 'N', x: 1.450, y: 0.000, z: 0.000 },
    { id: 'C2', element: 'C', x: 2.180, y: 1.200, z: 0.000 },
    { id: 'N2', element: 'N', x: 1.450, y: 2.400, z: 0.000 },
    { id: 'C3', element: 'C', x: 0.000, y: 2.400, z: 0.000 },
    { id: 'C4', element: 'C', x: -0.730, y: 1.200, z: 0.000 },
    { id: 'N3', element: 'N', x: 0.720, y: -1.200, z: 0.000 },
    { id: 'C5', element: 'C', x: 0.000, y: -2.400, z: 0.000 },
    { id: 'N4', element: 'N', x: -1.450, y: -2.400, z: 0.000 },
    { id: 'C6', element: 'C', x: -2.180, y: -1.200, z: 0.000 },
    { id: 'O1', element: 'O', x: -3.500, y: -1.200, z: 0.000 },
    { id: 'O2', element: 'O', x: 2.180, y: -1.200, z: 0.000 },
    { id: 'C7', element: 'C', x: 3.680, y: 1.200, z: 0.000 },
    { id: 'C8', element: 'C', x: -0.730, y: 3.800, z: 0.000 },
    { id: 'H1', element: 'H', x: 0.720, y: -3.300, z: 0.000 },
    { id: 'H2', element: 'H', x: -0.730, y: -3.300, z: 0.000 },
    { id: 'H3', element: 'H', x: 1.950, y: -3.300, z: 0.000 },
    { id: 'H4', element: 'H', x: -1.450, y: 4.200, z: 0.000 },
    { id: 'H5', element: 'H', x: 0.000, y: 4.200, z: 0.000 },
    { id: 'H6', element: 'H', x: -0.730, y: 3.800, z: 1.000 },
    { id: 'H7', element: 'H', x: 4.000, y: 0.200, z: 0.000 },
    { id: 'H8', element: 'H', x: 4.000, y: 2.000, z: 0.600 },
    { id: 'H9', element: 'H', x: 4.000, y: 2.000, z: -0.600 },
    { id: 'H10', element: 'H', x: 2.900, y: -1.800, z: 0.000 },
  ],
  bonds: [
    { atom1: 'C1', atom2: 'N1', order: 1 },
    { atom1: 'C1', atom2: 'C4', order: 1 },
    { atom1: 'C1', atom2: 'N3', order: 1 },
    { atom1: 'N1', atom2: 'C2', order: 1 },
    { atom1: 'C2', atom2: 'N2', order: 2 },
    { atom1: 'N2', atom2: 'C3', order: 1 },
    { atom1: 'C3', atom2: 'C4', order: 2 },
    { atom1: 'C4', atom2: 'N3', order: 1 },
    { atom1: 'N3', atom2: 'C5', order: 1 },
    { atom1: 'C5', atom2: 'N4', order: 1 },
    { atom1: 'N4', atom2: 'C6', order: 1 },
    { atom1: 'C6', atom2: 'C4', order: 1 },
    { atom1: 'C6', atom2: 'O1', order: 2 },
    { atom1: 'N1', atom2: 'O2', order: 1 },
    { atom1: 'C2', atom2: 'C7', order: 1 },
    { atom1: 'C3', atom2: 'C8', order: 1 },
    { atom1: 'C5', atom2: 'H1', order: 1 },
    { atom1: 'C5', atom2: 'H2', order: 1 },
    { atom1: 'N4', atom2: 'H3', order: 1 },
    { atom1: 'C8', atom2: 'H4', order: 1 },
    { atom1: 'C8', atom2: 'H5', order: 1 },
    { atom1: 'C8', atom2: 'H6', order: 1 },
    { atom1: 'C7', atom2: 'H7', order: 1 },
    { atom1: 'C7', atom2: 'H8', order: 1 },
    { atom1: 'C7', atom2: 'H9', order: 1 },
    { atom1: 'O2', atom2: 'H10', order: 1 },
  ],
};

function generatePerfMolecule(): MoleculeData {
  const atoms: AtomData[] = [];
  const bonds: BondData[] = [];
  const ringCount = 4;
  const atomsPerRing = 6;
  let atomIndex = 0;

  for (let ring = 0; ring < ringCount; ring++) {
    const ringZ = ring * 1.5;
    const radius = ring % 2 === 0 ? 1.2 : 1.5;

    for (let i = 0; i < atomsPerRing; i++) {
      const angle = (i / atomsPerRing) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const element = i % 3 === 0 ? 'N' : i % 5 === 0 ? 'O' : 'C';
      atoms.push({
        id: `A${atomIndex}`,
        element,
        x,
        y,
        z: ringZ,
      });
      atomIndex++;
    }
  }

  for (let ring = 0; ring < ringCount; ring++) {
    const ringStart = ring * atomsPerRing;
    for (let i = 0; i < atomsPerRing; i++) {
      const next = (i + 1) % atomsPerRing;
      bonds.push({
        atom1: `A${ringStart + i}`,
        atom2: `A${ringStart + next}`,
        order: i % 2 === 0 ? 2 : 1,
      });
    }
  }

  for (let ring = 0; ring < ringCount - 1; ring++) {
    const ringStart = ring * atomsPerRing;
    const nextRingStart = (ring + 1) * atomsPerRing;
    for (let i = 0; i < atomsPerRing; i++) {
      bonds.push({
        atom1: `A${ringStart + i}`,
        atom2: `A${nextRingStart + i}`,
        order: 1,
      });
    }
  }

  let hydrogenIndex = atomIndex;
  const carbonAtoms = atoms.filter(a => a.element === 'C' || a.element === 'N');
  const hydrogensToAdd = Math.min(30, carbonAtoms.length * 2);

  for (let i = 0; i < hydrogensToAdd; i++) {
    const baseAtom = carbonAtoms[i % carbonAtoms.length];
    const angle = (i / hydrogensToAdd) * Math.PI * 2;
    const hx = baseAtom.x + Math.cos(angle) * 0.8;
    const hy = baseAtom.y + Math.sin(angle) * 0.8;
    const hz = baseAtom.z + (i % 3 - 1) * 0.5;
    atoms.push({
      id: `H${hydrogenIndex}`,
      element: 'H',
      x: hx,
      y: hy,
      z: hz,
    });
    bonds.push({
      atom1: baseAtom.id,
      atom2: `H${hydrogenIndex}`,
      order: 1,
    });
    hydrogenIndex++;
  }

  return {
    id: 'perf-test',
    name: '性能测试分子',
    formula: `C${atoms.filter(a => a.element === 'C').length}H${atoms.filter(a => a.element === 'H').length}N${atoms.filter(a => a.element === 'N').length}O${atoms.filter(a => a.element === 'O').length}`,
    atoms,
    bonds,
  };
}

export const MOLECULE_LIBRARY: MoleculeData[] = [
  waterMolecule,
  methaneMolecule,
  caffeineMolecule,
  generatePerfMolecule(),
];

export function getMoleculeById(id: string): MoleculeData | undefined {
  return MOLECULE_LIBRARY.find(m => m.id === id);
}

export function loadMolecule(id: string): Promise<MoleculeData> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const mol = getMoleculeById(id);
      if (mol) {
        resolve(mol);
      } else {
        reject(new Error(`Molecule not found: ${id}`));
      }
    }, 50);
  });
}
