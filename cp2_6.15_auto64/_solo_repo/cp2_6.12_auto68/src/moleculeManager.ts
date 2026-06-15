import moleculesJson from './data/molecules.json';
import reactionsJson from './data/reactions.json';

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

const molecules: MoleculeData[] = moleculesJson as MoleculeData[];
const reactions: ReactionData[] = reactionsJson as ReactionData[];

const ATOMIC_WEIGHTS: Record<string, number> = {
  H: 1.008, C: 12.011, N: 14.007, O: 15.999,
  F: 18.998, Cl: 35.45, Br: 79.904, I: 126.904,
  S: 32.06, P: 30.974, B: 10.81, Li: 6.94,
  Na: 22.99, K: 39.098, Ca: 40.078, Fe: 55.845,
  Cu: 63.546, Zn: 65.38
};

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
    return sum + (ATOMIC_WEIGHTS[atom.element] || 0);
  }, 0);
}

export function addMolecule(molecule: MoleculeData): void {
  if (!molecules.find(m => m.id === molecule.id)) {
    molecules.push(molecule);
  }
}

export function addReaction(reaction: ReactionData): void {
  if (!reactions.find(r => r.id === reaction.id)) {
    reactions.push(reaction);
  }
}

export async function loadMoleculesFromUrl(url: string): Promise<MoleculeData[]> {
  const response = await fetch(url);
  const data = await response.json();
  data.forEach((mol: MoleculeData) => addMolecule(mol));
  return data;
}

export async function loadReactionsFromUrl(url: string): Promise<ReactionData[]> {
  const response = await fetch(url);
  const data = await response.json();
  data.forEach((rxn: ReactionData) => addReaction(rxn));
  return data;
}
