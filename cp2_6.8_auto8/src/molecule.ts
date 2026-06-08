import * as THREE from 'three';
import { Atom, AtomData } from './atom';
import { Bond, BondData } from './bond';

export interface MoleculeData {
  atoms: AtomData[];
  bonds: BondData[];
}

export class Molecule {
  public group: THREE.Group;
  public atoms: Atom[] = [];
  public bonds: Bond[] = [];
  private showLabels: boolean = false;

  constructor() {
    this.group = new THREE.Group();
  }

  public static parse(data: MoleculeData): Molecule {
    const molecule = new Molecule();
    const atomMap = new Map<number, Atom>();

    data.atoms.forEach((atomData) => {
      const atom = new Atom(atomData);
      molecule.atoms.push(atom);
      atomMap.set(atomData.id, atom);
      molecule.group.add(atom.lod);
    });

    data.bonds.forEach((bondData) => {
      const a1 = atomMap.get(bondData.atom1);
      const a2 = atomMap.get(bondData.atom2);
      if (a1 && a2) {
        const bond = new Bond(a1, a2);
        molecule.bonds.push(bond);
        molecule.group.add(bond.mesh);
      }
    });

    return molecule;
  }

  public setLabelsVisible(visible: boolean): void {
    this.showLabels = visible;
    this.atoms.forEach((atom) => {
      if (visible && !atom.label) {
        atom.createLabel();
      } else if (!visible && atom.label) {
        atom.removeLabel();
      }
    });
  }

  public getLabelsVisible(): boolean {
    return this.showLabels;
  }

  public setBondColorMode(byElement: boolean): void {
    this.bonds.forEach((bond) => bond.setColorMode(byElement));
  }

  public update(): void {
    this.atoms.forEach((atom) => atom.update());
  }

  public getAtomMeshes(): THREE.Mesh[] {
    return this.atoms.map((a) => a.mesh);
  }

  public resetTransform(): void {
    this.group.rotation.set(0, 0, 0);
    this.group.position.set(0, 0, 0);
    this.group.scale.set(1, 1, 1);
  }

  public dispose(): void {
    this.atoms.forEach((a) => a.dispose());
    this.bonds.forEach((b) => b.dispose());
  }
}

export function generateSampleMolecule(): MoleculeData {
  const atoms: AtomData[] = [];
  const bonds: BondData[] = [];
  let atomId = 1;

  const addAtom = (element: 'C' | 'O' | 'N' | 'H', x: number, y: number, z: number): number => {
    atoms.push({ id: atomId, element, x, y, z });
    return atomId++;
  };

  const addBond = (a1: number, a2: number): void => {
    bonds.push({ atom1: a1, atom2: a2 });
  };

  const addHydrogens = (carbonId: number, cx: number, cy: number, cz: number, count: number): void => {
    const offsets = [
      [0.8, 0.6, 0.6],
      [-0.8, 0.6, -0.6],
      [0.8, -0.6, -0.6],
      [-0.8, -0.6, 0.6]
    ];
    for (let i = 0; i < count; i++) {
      const hid = addAtom('H', cx + offsets[i][0], cy + offsets[i][1], cz + offsets[i][2]);
      addBond(carbonId, hid);
    }
  };

  const benzeneCenters = [
    { x: 0, y: 0, z: 0 },
    { x: 7, y: 0, z: 0 },
    { x: 3.5, y: 6, z: 0 },
    { x: 0, y: 0, z: 7 },
    { x: 7, y: 0, z: 7 },
    { x: 3.5, y: 6, z: 7 }
  ];

  benzeneCenters.forEach((center, ringIdx) => {
    const ringCarbons: number[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const r = 1.4;
      const cx = center.x + Math.cos(angle) * r;
      const cy = center.y + Math.sin(angle) * r;
      const cz = center.z;
      const cid = addAtom('C', cx, cy, cz);
      ringCarbons.push(cid);

      if (i % 2 === 0) {
        addHydrogens(cid, cx, cy, cz, 1);
      }
    }

    for (let i = 0; i < 6; i++) {
      addBond(ringCarbons[i], ringCarbons[(i + 1) % 6]);
    }

    if (ringIdx === 0) {
      const oId = addAtom('O', center.x - 2.5, center.y, center.z);
      addBond(ringCarbons[3], oId);
      const nId = addAtom('N', center.x, center.y + 2.5, center.z);
      addBond(ringCarbons[1], nId);
      const nh1 = addAtom('H', center.x - 0.5, center.y + 3.2, center.z);
      const nh2 = addAtom('H', center.x + 0.5, center.y + 3.2, center.z);
      addBond(nId, nh1);
      addBond(nId, nh2);
    }
    if (ringIdx === 1) {
      const oId = addAtom('O', center.x + 2.5, center.y, center.z);
      addBond(ringCarbons[4], oId);
    }
    if (ringIdx === 2) {
      const nId = addAtom('N', center.x, center.y - 2.5, center.z);
      addBond(ringCarbons[4], nId);
    }
  });

  const connectRings = (idx1: number, idx2: number, pos1: number, pos2: number): void => {
    const ring1 = benzeneCenters[idx1];
    const ring2 = benzeneCenters[idx2];
    const angle1 = (pos1 * Math.PI) / 3;
    const angle2 = (pos2 * Math.PI) / 3;
    const c1 = atoms.filter((a) =>
      a.element === 'C' &&
      Math.abs(a.x - (ring1.x + Math.cos(angle1) * 1.4)) < 0.01 &&
      Math.abs(a.y - (ring1.y + Math.sin(angle1) * 1.4)) < 0.01 &&
      Math.abs(a.z - ring1.z) < 0.01
    )[0];
    const c2 = atoms.filter((a) =>
      a.element === 'C' &&
      Math.abs(a.x - (ring2.x + Math.cos(angle2) * 1.4)) < 0.01 &&
      Math.abs(a.y - (ring2.y + Math.sin(angle2) * 1.4)) < 0.01 &&
      Math.abs(a.z - ring2.z) < 0.01
    )[0];
    if (c1 && c2) {
      const mx = (c1.x + c2.x) / 2;
      const my = (c1.y + c2.y) / 2;
      const mz = (c1.z + c2.z) / 2;
      const link1 = addAtom('C', mx - 0.5, my, mz);
      const link2 = addAtom('C', mx + 0.5, my, mz);
      addBond(c1.id, link1);
      addBond(link1, link2);
      addBond(link2, c2.id);
      addHydrogens(link1, mx - 0.5, my, mz, 2);
      addHydrogens(link2, mx + 0.5, my, mz, 2);
    }
  };

  connectRings(0, 1, 1, 5);
  connectRings(0, 2, 2, 5);
  connectRings(1, 2, 4, 3);
  connectRings(3, 4, 1, 5);
  connectRings(3, 5, 2, 5);
  connectRings(4, 5, 4, 3);
  connectRings(0, 3, 4, 0);
  connectRings(1, 4, 3, 1);
  connectRings(2, 5, 0, 4);

  return { atoms, bonds };
}
