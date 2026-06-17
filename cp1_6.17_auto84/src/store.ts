import { create } from 'zustand';
import { DisplayMode } from './MoleculeData';

export interface AtomInfo {
  element: string;
  name: string;
  atomicNumber: number;
  x: number;
  y: number;
  z: number;
}

interface MoleculeStore {
  currentMolecule: string;
  displayMode: DisplayMode;
  selectedAtom: AtomInfo | null;
  hoveredAtom: number | null;
  isLoading: boolean;
  setMolecule: (name: string) => void;
  setDisplayMode: (mode: DisplayMode) => void;
  setSelectedAtom: (info: AtomInfo | null) => void;
  setHoveredAtom: (index: number | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useMoleculeStore = create<MoleculeStore>((set) => ({
  currentMolecule: 'H2O',
  displayMode: 'ballStick',
  selectedAtom: null,
  hoveredAtom: null,
  isLoading: false,
  setMolecule: (name) => set({ currentMolecule: name, selectedAtom: null, isLoading: true }),
  setDisplayMode: (mode) => set({ displayMode: mode }),
  setSelectedAtom: (info) => set({ selectedAtom: info }),
  setHoveredAtom: (index) => set({ hoveredAtom: index }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
