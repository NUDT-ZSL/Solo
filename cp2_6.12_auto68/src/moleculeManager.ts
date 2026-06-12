export interface AtomData {
  element: string;
  x: number;
  y: number;
  z: number;
}

export interface BondData {
  from: number;
  to: number;
  order?: number;
}

export interface MoleculeData {
  id: string;
  name: string;
  formula: string;
  atoms: AtomData[];
  bonds: BondData[];
}

export interface ReactionData {
  id: string;
  name: string;
  equation: string;
  reactants: { moleculeId: string; count: number; offset: { x: number; y: number; z: number } }[];
  products: { moleculeId: string; count: number; offset: { x: number; y: number; z: number } }[];
  durations: {
    glow: number;
    break: number;
    drift: number;
    combine: number;
  };
}

const molecules: MoleculeData[] = [
  {
    id: 'h2o',
    name: '水',
    formula: 'H₂O',
    atoms: [
      { element: 'O', x: 0, y: 0, z: 0 },
      { element: 'H', x: 0.76, y: 0.59, z: 0 },
      { element: 'H', x: -0.76, y: 0.59, z: 0 }
    ],
    bonds: [
      { from: 0, to: 1, order: 1 },
      { from: 0, to: 2, order: 1 }
    ]
  },
  {
    id: 'co2',
    name: '二氧化碳',
    formula: 'CO₂',
    atoms: [
      { element: 'C', x: 0, y: 0, z: 0 },
      { element: 'O', x: 1.16, y: 0, z: 0 },
      { element: 'O', x: -1.16, y: 0, z: 0 }
    ],
    bonds: [
      { from: 0, to: 1, order: 2 },
      { from: 0, to: 2, order: 2 }
    ]
  },
  {
    id: 'h2',
    name: '氢气',
    formula: 'H₂',
    atoms: [
      { element: 'H', x: -0.37, y: 0, z: 0 },
      { element: 'H', x: 0.37, y: 0, z: 0 }
    ],
    bonds: [
      { from: 0, to: 1, order: 1 }
    ]
  },
  {
    id: 'o2',
    name: '氧气',
    formula: 'O₂',
    atoms: [
      { element: 'O', x: -0.6, y: 0, z: 0 },
      { element: 'O', x: 0.6, y: 0, z: 0 }
    ],
    bonds: [
      { from: 0, to: 1, order: 2 }
    ]
  },
  {
    id: 'n2',
    name: '氮气',
    formula: 'N₂',
    atoms: [
      { element: 'N', x: -0.55, y: 0, z: 0 },
      { element: 'N', x: 0.55, y: 0, z: 0 }
    ],
    bonds: [
      { from: 0, to: 1, order: 3 }
    ]
  },
  {
    id: 'nh3',
    name: '氨',
    formula: 'NH₃',
    atoms: [
      { element: 'N', x: 0, y: 0, z: 0.3 },
      { element: 'H', x: 0.94, y: 0, z: -0.1 },
      { element: 'H', x: -0.47, y: 0.81, z: -0.1 },
      { element: 'H', x: -0.47, y: -0.81, z: -0.1 }
    ],
    bonds: [
      { from: 0, to: 1, order: 1 },
      { from: 0, to: 2, order: 1 },
      { from: 0, to: 3, order: 1 }
    ]
  },
  {
    id: 'ch4',
    name: '甲烷',
    formula: 'CH₄',
    atoms: [
      { element: 'C', x: 0, y: 0, z: 0 },
      { element: 'H', x: 0.63, y: 0.63, z: 0.63 },
      { element: 'H', x: -0.63, y: -0.63, z: 0.63 },
      { element: 'H', x: 0.63, y: -0.63, z: -0.63 },
      { element: 'H', x: -0.63, y: 0.63, z: -0.63 }
    ],
    bonds: [
      { from: 0, to: 1, order: 1 },
      { from: 0, to: 2, order: 1 },
      { from: 0, to: 3, order: 1 },
      { from: 0, to: 4, order: 1 }
    ]
  },
  {
    id: 'c6h6',
    name: '苯',
    formula: 'C₆H₆',
    atoms: [
      { element: 'C', x: 1.39, y: 0, z: 0 },
      { element: 'C', x: 0.695, y: 1.204, z: 0 },
      { element: 'C', x: -0.695, y: 1.204, z: 0 },
      { element: 'C', x: -1.39, y: 0, z: 0 },
      { element: 'C', x: -0.695, y: -1.204, z: 0 },
      { element: 'C', x: 0.695, y: -1.204, z: 0 },
      { element: 'H', x: 2.47, y: 0, z: 0 },
      { element: 'H', x: 1.235, y: 2.139, z: 0 },
      { element: 'H', x: -1.235, y: 2.139, z: 0 },
      { element: 'H', x: -2.47, y: 0, z: 0 },
      { element: 'H', x: -1.235, y: -2.139, z: 0 },
      { element: 'H', x: 1.235, y: -2.139, z: 0 }
    ],
    bonds: [
      { from: 0, to: 1, order: 2 },
      { from: 1, to: 2, order: 1 },
      { from: 2, to: 3, order: 2 },
      { from: 3, to: 4, order: 1 },
      { from: 4, to: 5, order: 2 },
      { from: 5, to: 0, order: 1 },
      { from: 0, to: 6, order: 1 },
      { from: 1, to: 7, order: 1 },
      { from: 2, to: 8, order: 1 },
      { from: 3, to: 9, order: 1 },
      { from: 4, to: 10, order: 1 },
      { from: 5, to: 11, order: 1 }
    ]
  },
  {
    id: 'hcl',
    name: '氯化氢',
    formula: 'HCl',
    atoms: [
      { element: 'H', x: -0.64, y: 0, z: 0 },
      { element: 'Cl', x: 0.64, y: 0, z: 0 }
    ],
    bonds: [
      { from: 0, to: 1, order: 1 }
    ]
  },
  {
    id: 'nacl',
    name: '氯化钠',
    formula: 'NaCl',
    atoms: [
      { element: 'Na', x: -1.16, y: 0, z: 0 },
      { element: 'Cl', x: 1.16, y: 0, z: 0 }
    ],
    bonds: [
      { from: 0, to: 1, order: 1 }
    ]
  }
];

const reactions: ReactionData[] = [
  {
    id: 'water-electrolysis',
    name: '水的电解',
    equation: '2H₂O → 2H₂ + O₂',
    reactants: [
      { moleculeId: 'h2o', count: 2, offset: { x: -2, y: 0.5, z: 0 } },
      { moleculeId: 'h2o', count: 0, offset: { x: 2, y: -0.5, z: 0 } }
    ],
    products: [
      { moleculeId: 'h2', count: 2, offset: { x: -3, y: 1, z: 1 } },
      { moleculeId: 'h2', count: 0, offset: { x: -3, y: -1, z: -1 } },
      { moleculeId: 'o2', count: 0, offset: { x: 3, y: 0, z: 0 } }
    ],
    durations: {
      glow: 1000,
      break: 500,
      drift: 800,
      combine: 600
    }
  },
  {
    id: 'methane-combustion',
    name: '甲烷燃烧',
    equation: 'CH₄ + 2O₂ → CO₂ + 2H₂O',
    reactants: [
      { moleculeId: 'ch4', count: 1, offset: { x: -2, y: 0, z: 0 } },
      { moleculeId: 'o2', count: 0, offset: { x: 2, y: 1.5, z: 0 } },
      { moleculeId: 'o2', count: 0, offset: { x: 2, y: -1.5, z: 0 } }
    ],
    products: [
      { moleculeId: 'co2', count: 0, offset: { x: 0, y: 1.5, z: 0 } },
      { moleculeId: 'h2o', count: 0, offset: { x: -2, y: -1, z: 1 } },
      { moleculeId: 'h2o', count: 0, offset: { x: 2, y: -1, z: -1 } }
    ],
    durations: {
      glow: 1000,
      break: 500,
      drift: 800,
      combine: 600
    }
  },
  {
    id: 'ammonia-synthesis',
    name: '合成氨',
    equation: 'N₂ + 3H₂ → 2NH₃',
    reactants: [
      { moleculeId: 'n2', count: 1, offset: { x: -2.5, y: 0, z: 0 } },
      { moleculeId: 'h2', count: 0, offset: { x: 2, y: 1.5, z: 0 } },
      { moleculeId: 'h2', count: 0, offset: { x: 2, y: 0, z: 1.5 } },
      { moleculeId: 'h2', count: 0, offset: { x: 2, y: -1.5, z: -1 } }
    ],
    products: [
      { moleculeId: 'nh3', count: 0, offset: { x: -1.5, y: 1, z: 0 } },
      { moleculeId: 'nh3', count: 0, offset: { x: 1.5, y: -1, z: 0 } }
    ],
    durations: {
      glow: 1000,
      break: 500,
      drift: 800,
      combine: 600
    }
  }
];

export function getMoleculeById(id: string): MoleculeData | undefined {
  return molecules.find(m => m.id === id);
}

export function getAllMolecules(): MoleculeData[] {
  return [...molecules];
}

export function getReactionById(id: string): ReactionData | undefined {
  return reactions.find(r => r.id === id);
}

export function getAllReactions(): ReactionData[] {
  return [...reactions];
}

export function calculateMolecularWeight(molecule: MoleculeData): number {
  return molecule.atoms.reduce((sum, atom) => {
    const weights: Record<string, number> = {
      H: 1.008, C: 12.011, N: 14.007, O: 15.999,
      F: 18.998, Cl: 35.45, Br: 79.904, I: 126.904,
      S: 32.06, P: 30.974, B: 10.81, Li: 6.94,
      Na: 22.99, K: 39.098, Ca: 40.078, Fe: 55.845,
      Cu: 63.546, Zn: 65.38
    };
    return sum + (weights[atom.element] || 0);
  }, 0);
}
