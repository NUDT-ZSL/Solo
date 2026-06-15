export interface AtomData {
  name: string;
  fullName: string;
  position: [number, number, number];
  radius: number;
  color: string;
}

export interface BondData {
  from: number;
  to: number;
}

export interface MoleculeData {
  id: string;
  name: string;
  formula: string;
  atoms: AtomData[];
  bonds: BondData[];
}

export const molecules: Record<string, MoleculeData> = {
  h2o: {
    id: 'h2o',
    name: '水分子',
    formula: 'H₂O',
    atoms: [
      {
        name: 'O',
        fullName: '氧原子',
        position: [0, 0, 0],
        radius: 0.40,
        color: '#ff0d0d'
      },
      {
        name: 'H',
        fullName: '氢原子',
        position: [0.958, 0, 0],
        radius: 0.32,
        color: '#ffffff'
      },
      {
        name: 'H',
        fullName: '氢原子',
        position: [-0.239, 0.928, 0],
        radius: 0.32,
        color: '#ffffff'
      }
    ],
    bonds: [
      { from: 0, to: 1 },
      { from: 0, to: 2 }
    ]
  },
  co2: {
    id: 'co2',
    name: '二氧化碳',
    formula: 'CO₂',
    atoms: [
      {
        name: 'C',
        fullName: '碳原子',
        position: [0, 0, 0],
        radius: 0.45,
        color: '#909090'
      },
      {
        name: 'O',
        fullName: '氧原子',
        position: [1.16, 0, 0],
        radius: 0.40,
        color: '#ff0d0d'
      },
      {
        name: 'O',
        fullName: '氧原子',
        position: [-1.16, 0, 0],
        radius: 0.40,
        color: '#ff0d0d'
      }
    ],
    bonds: [
      { from: 0, to: 1 },
      { from: 0, to: 2 }
    ]
  },
  ch4: {
    id: 'ch4',
    name: '甲烷',
    formula: 'CH₄',
    atoms: [
      {
        name: 'C',
        fullName: '碳原子',
        position: [0, 0, 0],
        radius: 0.45,
        color: '#909090'
      },
      {
        name: 'H',
        fullName: '氢原子',
        position: [0.629, 0.629, 0.629],
        radius: 0.32,
        color: '#ffffff'
      },
      {
        name: 'H',
        fullName: '氢原子',
        position: [-0.629, -0.629, 0.629],
        radius: 0.32,
        color: '#ffffff'
      },
      {
        name: 'H',
        fullName: '氢原子',
        position: [-0.629, 0.629, -0.629],
        radius: 0.32,
        color: '#ffffff'
      },
      {
        name: 'H',
        fullName: '氢原子',
        position: [0.629, -0.629, -0.629],
        radius: 0.32,
        color: '#ffffff'
      }
    ],
    bonds: [
      { from: 0, to: 1 },
      { from: 0, to: 2 },
      { from: 0, to: 3 },
      { from: 0, to: 4 }
    ]
  }
};

export const moleculeList = Object.values(molecules);
