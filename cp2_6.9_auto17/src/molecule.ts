import * as THREE from 'three';

export type ElementType = 'C' | 'H' | 'N' | 'O';

export interface ElementProperties {
  color: number;
  radius: number;
  name: string;
}

export const ELEMENT_PROPERTIES: Record<ElementType, ElementProperties> = {
  C: { color: 0x909090, radius: 0.4, name: '碳' },
  H: { color: 0xffffff, radius: 0.25, name: '氢' },
  N: { color: 0x3050f8, radius: 0.35, name: '氮' },
  O: { color: 0xff0d0d, radius: 0.32, name: '氧' }
};

export class Atom {
  id: string;
  element: ElementType;
  position: THREE.Vector3;
  radius: number;
  color: number;

  constructor(element: ElementType, position: THREE.Vector3, id?: string) {
    this.id = id || Atom.generateId();
    this.element = element;
    this.position = position.clone();
    const props = ELEMENT_PROPERTIES[element];
    this.radius = props.radius;
    this.color = props.color;
  }

  private static idCounter = 0;
  private static generateId(): string {
    return `atom_${Date.now()}_${Atom.idCounter++}`;
  }

  clone(): Atom {
    return new Atom(this.element, this.position.clone(), this.id);
  }
}

export type BondType = 'single' | 'double' | 'triple';

export class Bond {
  id: string;
  atom1Id: string;
  atom2Id: string;
  type: BondType;

  constructor(atom1Id: string, atom2Id: string, type: BondType = 'single', id?: string) {
    this.id = id || Bond.generateId();
    this.atom1Id = atom1Id;
    this.atom2Id = atom2Id;
    this.type = type;
  }

  private static idCounter = 0;
  private static generateId(): string {
    return `bond_${Date.now()}_${Bond.idCounter++}`;
  }

  involvesAtom(atomId: string): boolean {
    return this.atom1Id === atomId || this.atom2Id === atomId;
  }

  getOtherAtomId(atomId: string): string {
    return this.atom1Id === atomId ? this.atom2Id : this.atom1Id;
  }
}

export interface MoleculeJSON {
  atoms: Array<{
    id?: string;
    element: ElementType;
    position: { x: number; y: number; z: number };
  }>;
  bonds: Array<{
    id?: string;
    atom1Id: string;
    atom2Id: string;
    type?: BondType;
  }>;
}

export class Molecule {
  private atoms: Map<string, Atom> = new Map();
  private bonds: Map<string, Bond> = new Map();
  private history: Array<Array<{ atomId: string; oldPosition: THREE.Vector3; newPosition: THREE.Vector3 }>> = [];
  private pendingMove: Map<string, THREE.Vector3> = new Map();

  constructor() {}

  loadFromJSON(data: MoleculeJSON): void {
    this.atoms.clear();
    this.bonds.clear();
    this.history.length = 0;

    for (const atomData of data.atoms) {
      const atom = new Atom(
        atomData.element,
        new THREE.Vector3(atomData.position.x, atomData.position.y, atomData.position.z),
        atomData.id
      );
      this.atoms.set(atom.id, atom);
    }

    for (const bondData of data.bonds) {
      const bond = new Bond(bondData.atom1Id, bondData.atom2Id, bondData.type || 'single', bondData.id);
      this.bonds.set(bond.id, bond);
    }
  }

  toJSON(): MoleculeJSON {
    return {
      atoms: Array.from(this.atoms.values()).map(a => ({
        id: a.id,
        element: a.element,
        position: { x: a.position.x, y: a.position.y, z: a.position.z }
      })),
      bonds: Array.from(this.bonds.values()).map(b => ({
        id: b.id,
        atom1Id: b.atom1Id,
        atom2Id: b.atom2Id,
        type: b.type
      }))
    };
  }

  getAtoms(): Atom[] {
    return Array.from(this.atoms.values());
  }

  getBonds(): Bond[] {
    return Array.from(this.bonds.values());
  }

  getAtom(id: string): Atom | undefined {
    return this.atoms.get(id);
  }

  getBond(id: string): Bond | undefined {
    return this.bonds.get(id);
  }

  addAtom(element: ElementType, position: THREE.Vector3): Atom {
    const atom = new Atom(element, position);
    this.atoms.set(atom.id, atom);
    return atom;
  }

  removeAtom(id: string): boolean {
    if (!this.atoms.has(id)) return false;
    const bondsToRemove = this.getBondsForAtom(id);
    for (const bond of bondsToRemove) {
      this.bonds.delete(bond.id);
    }
    this.atoms.delete(id);
    return true;
  }

  addBond(atom1Id: string, atom2Id: string, type: BondType = 'single'): Bond | null {
    if (!this.atoms.has(atom1Id) || !this.atoms.has(atom2Id)) return null;
    for (const bond of this.bonds.values()) {
      if (
        (bond.atom1Id === atom1Id && bond.atom2Id === atom2Id) ||
        (bond.atom1Id === atom2Id && bond.atom2Id === atom1Id)
      ) {
        return bond;
      }
    }
    const bond = new Bond(atom1Id, atom2Id, type);
    this.bonds.set(bond.id, bond);
    return bond;
  }

  getBondsForAtom(atomId: string): Bond[] {
    const result: Bond[] = [];
    for (const bond of this.bonds.values()) {
      if (bond.involvesAtom(atomId)) {
        result.push(bond);
      }
    }
    return result;
  }

  getBondCountForAtom(atomId: string): number {
    return this.getBondsForAtom(atomId).length;
  }

  beginAtomMove(atomId: string): void {
    const atom = this.atoms.get(atomId);
    if (atom) {
      this.pendingMove.set(atomId, atom.position.clone());
    }
  }

  updateAtomPosition(atomId: string, position: THREE.Vector3): void {
    const atom = this.atoms.get(atomId);
    if (atom) {
      atom.position.copy(position);
    }
  }

  endAtomMove(atomId: string): void {
    const atom = this.atoms.get(atomId);
    const oldPos = this.pendingMove.get(atomId);
    if (atom && oldPos && !oldPos.equals(atom.position)) {
      this.history.push([
        {
          atomId,
          oldPosition: oldPos.clone(),
          newPosition: atom.position.clone()
        }
      ]);
    }
    this.pendingMove.delete(atomId);
  }

  cancelAtomMove(atomId: string): void {
    const atom = this.atoms.get(atomId);
    const oldPos = this.pendingMove.get(atomId);
    if (atom && oldPos) {
      atom.position.copy(oldPos);
    }
    this.pendingMove.delete(atomId);
  }

  canUndo(): boolean {
    return this.history.length > 0;
  }

  undo(): boolean {
    const lastMove = this.history.pop();
    if (!lastMove) return false;
    for (const move of lastMove) {
      const atom = this.atoms.get(move.atomId);
      if (atom) {
        atom.position.copy(move.oldPosition);
      }
    }
    return true;
  }

  getCenter(): THREE.Vector3 {
    if (this.atoms.size === 0) return new THREE.Vector3(0, 0, 0);
    const center = new THREE.Vector3();
    for (const atom of this.atoms.values()) {
      center.add(atom.position);
    }
    center.divideScalar(this.atoms.size);
    return center;
  }
}

export const CAFFEINE_DATA: MoleculeJSON = {
  atoms: [
    { id: 'a1', element: 'N', position: { x: 0.0, y: 1.5, z: 0.0 } },
    { id: 'a2', element: 'C', position: { x: 1.2, y: 1.0, z: 0.0 } },
    { id: 'a3', element: 'N', position: { x: 2.0, y: 0.0, z: 0.0 } },
    { id: 'a4', element: 'C', position: { x: 1.2, y: -1.0, z: 0.0 } },
    { id: 'a5', element: 'C', position: { x: 0.0, y: -1.5, z: 0.0 } },
    { id: 'a6', element: 'C', position: { x: -1.2, y: -1.0, z: 0.0 } },
    { id: 'a7', element: 'N', position: { x: -2.0, y: 0.0, z: 0.0 } },
    { id: 'a8', element: 'C', position: { x: -1.2, y: 1.0, z: 0.0 } },
    { id: 'a9', element: 'O', position: { x: 1.5, y: -2.0, z: 0.0 } },
    { id: 'a10', element: 'O', position: { x: -1.5, y: -2.0, z: 0.0 } },
    { id: 'a11', element: 'C', position: { x: -2.5, y: 1.2, z: 0.0 } },
    { id: 'a12', element: 'C', position: { x: 0.0, y: 2.8, z: 0.0 } },
    { id: 'a13', element: 'C', position: { x: 2.5, y: -0.5, z: 0.0 } },
    { id: 'a14', element: 'H', position: { x: -2.5, y: 2.3, z: 0.0 } },
    { id: 'a15', element: 'H', position: { x: -3.2, y: 0.8, z: 0.5 } },
    { id: 'a16', element: 'H', position: { x: -3.2, y: 0.8, z: -0.5 } },
    { id: 'a17', element: 'H', position: { x: 0.0, y: 3.2, z: 0.5 } },
    { id: 'a18', element: 'H', position: { x: 0.0, y: 3.2, z: -0.5 } },
    { id: 'a19', element: 'H', position: { x: -0.5, y: 3.2, z: 0.0 } },
    { id: 'a20', element: 'H', position: { x: 2.5, y: -1.6, z: 0.0 } },
    { id: 'a21', element: 'H', position: { x: 3.2, y: -0.1, z: 0.5 } },
    { id: 'a22', element: 'H', position: { x: 3.2, y: -0.1, z: -0.5 } }
  ],
  bonds: [
    { atom1Id: 'a1', atom2Id: 'a2', type: 'single' },
    { atom1Id: 'a2', atom2Id: 'a3', type: 'single' },
    { atom1Id: 'a3', atom2Id: 'a4', type: 'single' },
    { atom1Id: 'a4', atom2Id: 'a5', type: 'double' },
    { atom1Id: 'a5', atom2Id: 'a6', type: 'single' },
    { atom1Id: 'a6', atom2Id: 'a7', type: 'single' },
    { atom1Id: 'a7', atom2Id: 'a8', type: 'double' },
    { atom1Id: 'a8', atom2Id: 'a1', type: 'single' },
    { atom1Id: 'a1', atom2Id: 'a12', type: 'single' },
    { atom1Id: 'a4', atom2Id: 'a9', type: 'double' },
    { atom1Id: 'a6', atom2Id: 'a10', type: 'double' },
    { atom1Id: 'a8', atom2Id: 'a11', type: 'single' },
    { atom1Id: 'a3', atom2Id: 'a13', type: 'single' },
    { atom1Id: 'a11', atom2Id: 'a14', type: 'single' },
    { atom1Id: 'a11', atom2Id: 'a15', type: 'single' },
    { atom1Id: 'a11', atom2Id: 'a16', type: 'single' },
    { atom1Id: 'a12', atom2Id: 'a17', type: 'single' },
    { atom1Id: 'a12', atom2Id: 'a18', type: 'single' },
    { atom1Id: 'a12', atom2Id: 'a19', type: 'single' },
    { atom1Id: 'a13', atom2Id: 'a20', type: 'single' },
    { atom1Id: 'a13', atom2Id: 'a21', type: 'single' },
    { atom1Id: 'a13', atom2Id: 'a22', type: 'single' }
  ]
};
