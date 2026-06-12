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

export const ELEMENT_COLORS: Record<string, number> = {
  H: 0xffffff,
  C: 0x333333,
  N: 0x3050f8,
  O: 0xff0000,
  F: 0x90e050,
  Cl: 0x1ff01f,
  Br: 0xa62929,
  I: 0x940094,
  S: 0xffff30,
  P: 0xff8000,
};

export const ELEMENT_RADII: Record<string, number> = {
  H: 0.3,
  C: 0.5,
  N: 0.48,
  O: 0.6,
  F: 0.42,
  Cl: 0.55,
  Br: 0.6,
  I: 0.65,
  S: 0.55,
  P: 0.58,
};

export const ELEMENT_NUMBERS: Record<string, number> = {
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

function createWater(): MoleculeData {
  return {
    id: 'water',
    name: '水