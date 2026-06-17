import { MoleculePair, Atom, Bond, ElementType, AMINO_ACIDS } from '../types';

function generateSpherePoint(radius: number, index: number, total: number): { x: number; y: number; z: number } {
  const phi = Math.acos(-1 + (2 * index) / total);
  const theta = Math.sqrt(total * Math.PI) * phi;
  return {
    x: radius * Math.cos(theta) * Math.sin(phi),
    y: radius * Math.sin(theta) * Math.sin(phi),
    z: radius * Math.cos(phi)
  };
}

function generateProteinAtoms(count: number, centerX: number, centerY: number, centerZ: number): Atom[] {
  const atoms: Atom[] = [];
  const elements: ElementType[] = ['C', 'C', 'C', 'O', 'N', 'C', 'C', 'S', 'C', 'C'];
  
  for (let i = 0; i < count; i++) {
    const layer = Math.floor(i / 500);
    const localIndex = i % 500;
    const radius = 3 + layer * 1.5;
    const pos = generateSpherePoint(radius, localIndex, 500);
    
    const residueIndex = Math.floor(i / 15) % AMINO_ACIDS.length;
    const residueNumber = Math.floor(i / 15) + 1;
    
    atoms.push({
      id: i,
      element: elements[i % elements.length],
      x: centerX + pos.x + (Math.random() - 0.5) * 0.5,
      y: centerY + pos.y + (Math.random() - 0.5) * 0.5,
      z: centerZ + pos.z + (Math.random() - 0.5) * 0.5,
      residue: AMINO_ACIDS[residueIndex],
      residueNumber,
      chain: 'A'
    });
  }
  
  return atoms;
}

function generateBonds(atoms: Atom[], maxDistance: number = 1.6): Bond[] {
  const bonds: Bond[] = [];
  
  for (let i = 0; i < atoms.length; i++) {
    const atom1 = atoms[i];
    const searchLimit = Math.min(i + 10, atoms.length);
    
    for (let j = i + 1; j < searchLimit; j++) {
      const atom2 = atoms[j];
      const dx = atom1.x - atom2.x;
      const dy = atom1.y - atom2.y;
      const dz = atom1.z - atom2.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      
      if (distSq < maxDistance * maxDistance) {
        bonds.push({
          atom1: atom1.id,
          atom2: atom2.id,
          order: Math.random() > 0.7 ? 2 : 1
        });
      }
    }
  }
  
  return bonds;
}

function generateSpikeProtein(): { atoms: Atom[]; bonds: Bond[] } {
  const atomCount = 5000;
  const atoms = generateProteinAtoms(atomCount, 0, 0, 0);
  const bonds = generateBonds(atoms, 1.6);
  return { atoms, bonds };
}

function generateHemoglobin(): { atoms: Atom[]; bonds: Bond[] } {
  const atomCount = 4800;
  const atoms = generateProteinAtoms(atomCount, 0, 0, 0);
  
  const hemePositions = [
    { x: -4, y: -4, z: 0 },
    { x: 4, y: -4, z: 0 },
    { x: -4, y: 4, z: 0 },
    { x: 4, y: 4, z: 0 }
  ];
  
  let baseId = atoms.length;
  hemePositions.forEach(pos => {
    for (let i = 0; i < 25; i++) {
      const angle = (i / 25) * Math.PI * 2;
      const r = 1.5 + (i % 3) * 0.3;
      atoms.push({
        id: baseId++,
        element: i % 5 === 0 ? 'Fe' : i % 3 === 0 ? 'N' : 'C',
        x: pos.x + Math.cos(angle) * r,
        y: pos.y + Math.sin(angle) * r,
        z: pos.z + (Math.random() - 0.5) * 0.3,
        residue: 'HEM',
        residueNumber: 1000 + Math.floor(baseId / 25)
      });
    }
  });
  
  const bonds = generateBonds(atoms, 1.6);
  return { atoms, bonds };
}

function generateInhibitorLigand(): { atoms: Atom[]; bonds: Bond[] } {
  const atoms: Atom[] = [];
  let id = 0;
  
  const coreAtoms = [
    { element: 'C' as ElementType, x: 0, y: 0, z: 0 },
    { element: 'C', x: 1.5, y: 0, z: 0 },
    { element: 'C', x: 2.25, y: 1.3, z: 0 },
    { element: 'C', x: 1.5, y: 2.6, z: 0 },
    { element: 'C', x: 0, y: 2.6, z: 0 },
    { element: 'C', x: -0.75, y: 1.3, z: 0 },
    { element: 'N', x: -1.5, y: 0, z: 0 },
    { element: 'C', x: -2.5, y: 0.5, z: 0 },
    { element: 'O', x: -3.5, y: 0, z: 0 },
    { element: 'N', x: -2.5, y: 1.5, z: 0 },
    { element: 'C', x: 3.5, y: 1.3, z: 0 },
    { element: 'O', x: 4.2, y: 0.5, z: 0 },
    { element: 'O', x: 3.8, y: 2.3, z: 0 },
    { element: 'C', x: 0, y: 4, z: 0 },
    { element: 'S', x: 0, y: 5.2, z: 0 },
    { element: 'C', x: -1.2, y: 5.8, z: 0 },
    { element: 'C', x: 1.2, y: 5.8, z: 0 },
    { element: 'H', x: -0.75, y: -0.9, z: 0 },
    { element: 'H', x: 2.1, y: -0.8, z: 0 },
    { element: 'H', x: 3.8, y: 3.0, z: 0 },
    { element: 'H', x: -1.0, y: 6.8, z: 0 },
    { element: 'H', x: 1.0, y: 6.8, z: 0 },
    { element: 'H', x: -3.2, y: -0.3, z: 0.5 },
    { element: 'H', x: -1.5, y: 2.3, z: 0 },
    { element: 'O', x: 0, y: -1.2, z: 0 },
    { element: 'P', x: 0.8, y: -2.2, z: 0 },
    { element: 'O', x: 1.6, y: -2.8, z: 0.5 },
    { element: 'O', x: 0.0, y: -3.0, z: -0.3 },
    { element: 'O', x: 1.2, y: -1.5, z: 0.8 },
    { element: 'C', x: -0.8, y: -2.5, z: -0.8 },
    { element: 'H', x: -1.5, y: -2.0, z: -1.4 },
    { element: 'H', x: -0.3, y: -3.2, z: -1.4 },
    { element: 'H', x: -1.3, y: -3.1, z: -0.1 },
    { element: 'C', x: 2.5, y: -0.5, z: 1.0 },
    { element: 'H', x: 3.0, y: -1.3, z: 1.5 },
    { element: 'H', x: 2.0, y: -0.1, z: 1.8 },
    { element: 'H', x: 3.3, y: 0.2, z: 0.8 },
    { element: 'N', x: -0.5, y: 1.3, z: 1.2 },
    { element: 'H', x: 0.2, y: 1.8, z: 1.6 },
    { element: 'H', x: -1.0, y: 2.0, z: 1.5 },
    { element: 'C', x: -0.8, y: -0.5, z: -1.0 },
    { element: 'H', x: -1.3, y: -1.3, z: -1.4 },
    { element: 'H', x: -0.3, y: -0.1, z: -1.8 },
    { element: 'H', x: -1.5, y: 0.2, z: -0.8 },
    { element: 'S', x: 2.5, y: 3.5, z: 0 },
    { element: 'C', x: 3.8, y: 3.0, z: 0.5 },
    { element: 'H', x: 4.5, y: 3.5, z: 1.0 },
    { element: 'H', x: 3.5, y: 2.3, z: 1.2 },
    { element: 'H', x: 4.2, y: 2.5, z: -0.3 }
  ];
  
  coreAtoms.forEach((a, i) => {
    atoms.push({
      id: id++,
      element: a.element as ElementType,
      x: a.x,
      y: a.y,
      z: a.z,
      residue: 'LIG',
      residueNumber: 1
    });
  });
  
  const bonds: Bond[] = [
    { atom1: 0, atom2: 1, order: 1 },
    { atom1: 1, atom2: 2, order: 2 },
    { atom1: 2, atom2: 3, order: 1 },
    { atom1: 3, atom2: 4, order: 2 },
    { atom1: 4, atom2: 5, order: 1 },
    { atom1: 5, atom2: 0, order: 2 },
    { atom1: 0, atom2: 6, order: 1 },
    { atom1: 6, atom2: 7, order: 1 },
    { atom1: 7, atom2: 8, order: 2 },
    { atom1: 7, atom2: 9, order: 1 },
    { atom1: 2, atom2: 10, order: 1 },
    { atom1: 10, atom2: 11, order: 2 },
    { atom1: 10, atom2: 12, order: 1 },
    { atom1: 3, atom2: 13, order: 1 },
    { atom1: 13, atom2: 14, order: 1 },
    { atom1: 14, atom2: 15, order: 1 },
    { atom1: 14, atom2: 16, order: 1 },
    { atom1: 0, atom2: 17, order: 1 },
    { atom1: 1, atom2: 18, order: 1 },
    { atom1: 12, atom2: 19, order: 1 },
    { atom1: 15, atom2: 20, order: 1 },
    { atom1: 16, atom2: 21, order: 1 },
    { atom1: 9, atom2: 23, order: 1 },
    { atom1: 0, atom2: 24, order: 2 },
    { atom1: 24, atom2: 25, order: 1 },
    { atom1: 25, atom2: 26, order: 2 },
    { atom1: 25, atom2: 27, order: 1 },
    { atom1: 25, atom2: 28, order: 1 },
    { atom1: 25, atom2: 29, order: 1 },
    { atom1: 29, atom2: 30, order: 1 },
    { atom1: 29, atom2: 31, order: 1 },
    { atom1: 29, atom2: 32, order: 1 },
    { atom1: 1, atom2: 33, order: 1 },
    { atom1: 33, atom2: 34, order: 1 },
    { atom1: 33, atom2: 35, order: 1 },
    { atom1: 33, atom2: 36, order: 1 },
    { atom1: 5, atom2: 37, order: 1 },
    { atom1: 37, atom2: 38, order: 1 },
    { atom1: 37, atom2: 39, order: 1 },
    { atom1: 0, atom2: 40, order: 1 },
    { atom1: 40, atom2: 41, order: 1 },
    { atom1: 40, atom2: 42, order: 1 },
    { atom1: 40, atom2: 43, order: 1 },
    { atom1: 3, atom2: 44, order: 1 },
    { atom1: 44, atom2: 45, order: 1 },
    { atom1: 45, atom2: 46, order: 1 },
    { atom1: 45, atom2: 47, order: 1 },
    { atom1: 45, atom2: 48, order: 1 }
  ];
  
  return { atoms, bonds };
}

function generateOxygenLigand(): { atoms: Atom[]; bonds: Bond[] } {
  const atoms: Atom[] = [];
  let id = 0;
  
  const coreAtoms = [
    { element: 'O' as ElementType, x: 0, y: 0, z: 0 },
    { element: 'O', x: 1.21, y: 0, z: 0 },
    { element: 'Fe', x: -1.5, y: 0, z: 0 },
    { element: 'N', x: -2.8, y: 0.8, z: 0 },
    { element: 'N', x: -2.8, y: -0.8, z: 0 },
    { element: 'C', x: -4.0, y: 0.4, z: 0 },
    { element: 'C', x: -4.0, y: -0.4, z: 0 },
    { element: 'C', x: -5.2, y: 0, z: 0 },
    { element: 'O', x: -6.0, y: 0.8, z: 0 },
    { element: 'O', x: -6.0, y: -0.8, z: 0 },
    { element: 'H', x: 1.8, y: 0.5, z: 0 },
    { element: 'H', x: 1.8, y: -0.5, z: 0 },
    { element: 'H', x: -0.6, y: 1.0, z: 0 },
    { element: 'H', x: -0.6, y: -1.0, z: 0 },
    { element: 'H', x: -3.8, y: 1.4, z: 0 },
    { element: 'H', x: -3.8, y: -1.4, z: 0 },
    { element: 'C', x: -2.8, y: 0, z: 1.2 },
    { element: 'H', x: -2.8, y: 0.8, z: 1.8 },
    { element: 'H', x: -2.8, y: -0.8, z: 1.8 },
    { element: 'H', x: -3.5, y: 0, z: 1.5 },
    { element: 'C', x: -1.5, y: 1.5, z: 0 },
    { element: 'H', x: -0.8, y: 2.0, z: 0.5 },
    { element: 'H', x: -1.5, y: 1.5, z: -1.0 },
    { element: 'H', x: -2.2, y: 2.2, z: 0.3 },
    { element: 'C', x: -1.5, y: -1.5, z: 0 },
    { element: 'H', x: -0.8, y: -2.0, z: -0.5 },
    { element: 'H', x: -1.5, y: -1.5, z: 1.0 },
    { element: 'H', x: -2.2, y: -2.2, z: -0.3 },
    { element: 'O', x: 0, y: 0, z: 1.0 },
    { element: 'H', x: 0.5, y: 0, z: 1.5 },
    { element: 'H', x: -0.5, y: 0.5, z: 1.5 }
  ];
  
  coreAtoms.forEach((a, i) => {
    atoms.push({
      id: id++,
      element: a.element as ElementType,
      x: a.x,
      y: a.y,
      z: a.z,
      residue: 'OXY',
      residueNumber: 1
    });
  });
  
  const bonds: Bond[] = [
    { atom1: 0, atom2: 1, order: 2 },
    { atom1: 0, atom2: 2, order: 1 },
    { atom1: 2, atom2: 3, order: 1 },
    { atom1: 2, atom2: 4, order: 1 },
    { atom1: 3, atom2: 5, order: 1 },
    { atom1: 4, atom2: 6, order: 1 },
    { atom1: 5, atom2: 7, order: 1 },
    { atom1: 6, atom2: 7, order: 1 },
    { atom1: 7, atom2: 8, order: 2 },
    { atom1: 7, atom2: 9, order: 1 },
    { atom1: 1, atom2: 10, order: 1 },
    { atom1: 1, atom2: 11, order: 1 },
    { atom1: 0, atom2: 12, order: 1 },
    { atom1: 0, atom2: 13, order: 1 },
    { atom1: 3, atom2: 14, order: 1 },
    { atom1: 4, atom2: 15, order: 1 },
    { atom1: 2, atom2: 16, order: 1 },
    { atom1: 16, atom2: 17, order: 1 },
    { atom1: 16, atom2: 18, order: 1 },
    { atom1: 16, atom2: 19, order: 1 },
    { atom1: 2, atom2: 20, order: 1 },
    { atom1: 20, atom2: 21, order: 1 },
    { atom1: 20, atom2: 22, order: 1 },
    { atom1: 20, atom2: 23, order: 1 },
    { atom1: 2, atom2: 24, order: 1 },
    { atom1: 24, atom2: 25, order: 1 },
    { atom1: 24, atom2: 26, order: 1 },
    { atom1: 24, atom2: 27, order: 1 },
    { atom1: 0, atom2: 28, order: 1 },
    { atom1: 28, atom2: 29, order: 1 },
    { atom1: 28, atom2: 30, order: 1 }
  ];
  
  return { atoms, bonds };
}

const spikeProtein = generateSpikeProtein();
const inhibitorLigand = generateInhibitorLigand();
const hemoglobin = generateHemoglobin();
const oxygenLigand = generateOxygenLigand();

export const MOLECULE_PAIRS: MoleculePair[] = [
  {
    id: 'spike-inhibitor',
    name: '新冠刺突蛋白 - 抑制剂',
    receptor: {
      name: '新冠病毒刺突蛋白 (SARS-CoV-2 Spike)',
      type: 'receptor',
      atoms: spikeProtein.atoms,
      bonds: spikeProtein.bonds,
      activeSite: {
        center: { x: 0, y: 0, z: 0 },
        radius: 2.5,
        keyResidues: ['TYR41', 'PHE92', 'ASN93', 'GLY143', 'SER144', 'ASN145']
      },
      initialPosition: { x: 0, y: 0, z: 0 }
    },
    ligand: {
      name: '小分子抑制剂',
      type: 'ligand',
      atoms: inhibitorLigand.atoms,
      bonds: inhibitorLigand.bonds,
      initialPosition: { x: 8, y: 2, z: 0 }
    }
  },
  {
    id: 'hemoglobin-oxygen',
    name: '血红蛋白 - 氧气',
    receptor: {
      name: '人血红蛋白 (Hemoglobin)',
      type: 'receptor',
      atoms: hemoglobin.atoms,
      bonds: hemoglobin.bonds,
      activeSite: {
        center: { x: 4, y: 4, z: 0 },
        radius: 2.5,
        keyResidues: ['HIS87', 'HIS92', 'VAL62', 'PHE46', 'LEU29']
      },
      initialPosition: { x: 0, y: 0, z: 0 }
    },
    ligand: {
      name: '氧气分子复合物',
      type: 'ligand',
      atoms: oxygenLigand.atoms,
      bonds: oxygenLigand.bonds,
      initialPosition: { x: 8, y: 6, z: 0 }
    }
  }
];

export function calculateMolecularWeight(atoms: { element: string }[]): number {
  const weights: Record<string, number> = {
    C: 12.01, O: 16.00, N: 14.01, S: 32.07, H: 1.008, P: 30.97, Fe: 55.85
  };
  return atoms.reduce((sum, atom) => sum + (weights[atom.element] || 0), 0);
}
