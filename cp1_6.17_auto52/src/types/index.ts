export type ElementType = 'C' | 'O' | 'N' | 'S' | 'H' | 'P' | 'Fe';

export interface Atom {
  id: number;
  element: ElementType;
  x: number;
  y: number;
  z: number;
  residue?: string;
  residueNumber?: number;
  chain?: string;
}

export interface Bond {
  atom1: number;
  atom2: number;
  order: number;
}

export interface ActiveSite {
  center: { x: number; y: number; z: number };
  radius: number;
  keyResidues: string[];
}

export interface MoleculeData {
  name: string;
  type: 'receptor' | 'ligand';
  atoms: Atom[];
  bonds: Bond[];
  activeSite?: ActiveSite;
  initialPosition?: { x: number; y: number; z: number };
}

export interface MoleculePair {
  id: string;
  name: string;
  receptor: MoleculeData;
  ligand: MoleculeData;
}

export interface DockingResult {
  success: boolean;
  bindingEnergy: number;
  keyResidues: string[];
  distance: number;
  timestamp: number;
}

export interface DockingState {
  isDocked: boolean;
  isDocking: boolean;
  distance: number;
  result: DockingResult | null;
}

export interface VibrationState {
  amplitude: number;
  frequency: number;
  enabled: boolean;
  randomOffsets: Float32Array;
  time: number;
}

export interface ElementProperties {
  color: number;
  radius: number;
  mass: number;
  vanDerWaalsRadius: number;
}

export const ELEMENT_PROPERTIES: Record<ElementType, ElementProperties> = {
  C: { color: 0x808080, radius: 0.4, mass: 12.01, vanDerWaalsRadius: 1.7 },
  O: { color: 0xFF0000, radius: 0.35, mass: 16.00, vanDerWaalsRadius: 1.52 },
  N: { color: 0x0000FF, radius: 0.38, mass: 14.01, vanDerWaalsRadius: 1.55 },
  S: { color: 0xFFFF00, radius: 0.45, mass: 32.07, vanDerWaalsRadius: 1.8 },
  H: { color: 0xFFFFFF, radius: 0.25, mass: 1.008, vanDerWaalsRadius: 1.2 },
  P: { color: 0xFF8C00, radius: 0.48, mass: 30.97, vanDerWaalsRadius: 1.8 },
  Fe: { color: 0xCD853F, radius: 0.55, mass: 55.85, vanDerWaalsRadius: 2.0 }
};

export const AMINO_ACIDS = [
  'ALA', 'ARG', 'ASN', 'ASP', 'CYS', 'GLN', 'GLU', 'GLY', 'HIS', 'ILE',
  'LEU', 'LYS', 'MET', 'PHE', 'PRO', 'SER', 'THR', 'TRP', 'TYR', 'VAL'
];
