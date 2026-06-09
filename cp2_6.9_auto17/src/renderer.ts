import * as THREE from 'three';
import { Molecule, Atom, Bond, BondType, ELEMENT_PROPERTIES } from './molecule';

interface AtomMesh extends THREE.Mesh {
  userData: {
    atomId: string;
    originalScale: THREE.Vector3;
    isHighlighted: boolean;
  };
}

interface BondMesh extends THREE.Mesh {
  userData: {
    bondId: string;
  };
}

export class MoleculeRenderer {
  private scene: THREE.Scene;
  private molecule: Molecule;
  private atomMeshes: Map<string, AtomMesh> = new Map();
  private bondMeshes: Map<string, BondMesh[]> = new Map();
  private atomMaterialCache: Map<number, THREE.MeshPhysicalMaterial> = new Map();
  private bondMaterial: THREE.MeshPhysicalMaterial;
  private atomGeometry: THREE.SphereGeometry;

  constructor(scene: THREE.Scene, molecule: Molecule) {
    this.scene = scene;
    this.molecule = molecule;
    this.atomGeometry = new THREE.SphereGeometry(1, 48, 48);
    this.bondMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x888888,
      metalness: 0.1,
      roughness: 0.6,
      transparent: true,
      opacity: 0.6,
      clearcoat: 0.3,
      clearcoatRoughness: 0.5
    });
  }

  private getAtomMaterial(color: number): THREE.MeshPhysicalMaterial {
    if (!this.atomMaterialCache.has(color)) {
      const material = new THREE.MeshPhysicalMaterial({
        color: color,
        metalness: 0.2,
        roughness: 0.15,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        reflectivity: 1.0,
        envMapIntensity: 1.5
      });
      this.atomMaterialCache.set(color, material);
    }
    return this.atomMaterialCache.get(color)!;
  }

  render(): void {
    this.clear();
    this.renderAtoms();
    this.renderBonds();
  }

  private clear(): void {
    for (const mesh of this.atomMeshes.values()) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
    for (const meshes of this.bondMeshes.values()) {
      for (const mesh of meshes) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
      }
    }
    this.atomMeshes.clear();
    this.bondMeshes.clear();
  }

  private renderAtoms(): void {
    for (const atom of this.molecule.getAtoms()) {
      this.createAtomMesh(atom);
    }
  }

  private createAtomMesh(atom: Atom): AtomMesh {
    const material = this.getAtomMaterial(atom.color);
    const mesh = new THREE.Mesh(this.atomGeometry, material) as AtomMesh;
    mesh.position.copy(atom.position);
    mesh.scale.setScalar(atom.radius);
    mesh.userData = {
      atomId: atom.id,
      originalScale: new THREE.Vector3(atom.radius, atom.radius, atom.radius),
      isHighlighted: false
    };
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    this.atomMeshes.set(atom.id, mesh);
    return mesh;
  }

  private renderBonds(): void {
    for (const bond of this.molecule.getBonds()) {
      this.createBondMeshes(bond);
    }
  }

  private createBondMeshes(bond: Bond): BondMesh[] {
    const atom1 = this.molecule.getAtom(bond.atom1Id);
    const atom2 = this.molecule.getAtom(bond.atom2Id);
    if (!atom1 || !atom2) return [];

    const meshes: BondMesh[] = [];
    const offset = bond.type === 'double' ? 0.08 : bond.type === 'triple' ? 0.12 : 0;
    const count = bond.type === 'single' ? 1 : bond.type === 'double' ? 2 : 3;

    const direction = new THREE.Vector3().subVectors(atom2.position, atom1.position);
    const length = direction.length();
    direction.normalize();

    const up = Math.abs(direction.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const perp1 = new THREE.Vector3().crossVectors(direction, up).normalize();
    const perp2 = new THREE.Vector3().crossVectors(direction, perp1).normalize();

    for (let i = 0; i < count; i++) {
      const mesh = this.createSingleBondMesh(atom1, atom2, bond.type, length, direction);
      if (count === 2) {
        const offsetVec = perp1.clone().multiplyScalar(i === 0 ? -offset : offset);
        mesh.position.add(offsetVec);
      } else if (count === 3) {
        if (i === 0) {
          const offsetVec = perp1.clone().multiplyScalar(-offset);
          mesh.position.add(offsetVec);
        } else if (i === 2) {
          const offsetVec = perp1.clone().multiplyScalar(offset);
          mesh.position.add(offsetVec);
        }
      }
      mesh.userData = { bondId: bond.id };
      this.scene.add(mesh);
      meshes.push(mesh);
    }

    this.bondMeshes.set(bond.id, meshes);
    return meshes;
  }

  private createSingleBondMesh(
    atom1: Atom,
    atom2: Atom,
    bondType: BondType,
    length: number,
    direction: THREE.Vector3
  ): BondMesh {
    const radius = bondType === 'single' ? 0.06 : bondType === 'double' ? 0.05 : 0.04;
    const geometry = new THREE.CylinderGeometry(radius, radius, length, 16);
    const mesh = new THREE.Mesh(geometry, this.bondMaterial) as BondMesh;

    const midPoint = new THREE.Vector3().addVectors(atom1.position, atom2.position).multiplyScalar(0.5);
    mesh.position.copy(midPoint);

    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
    mesh.quaternion.copy(quaternion);

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  getAtomMesh(atomId: string): AtomMesh | undefined {
    return this.atomMeshes.get(atomId);
  }

  getAtomMeshes(): AtomMesh[] {
    return Array.from(this.atomMeshes.values());
  }

  updateAtomPosition(atomId: string): void {
    const atom = this.molecule.getAtom(atomId);
    const mesh = this.atomMeshes.get(atomId);
    if (atom && mesh) {
      mesh.position.copy(atom.position);
    }
    this.updateBondsForAtom(atomId);
  }

  private updateBondsForAtom(atomId: string): void {
    const bonds = this.molecule.getBondsForAtom(atomId);
    for (const bond of bonds) {
      this.updateBond(bond);
    }
  }

  private updateBond(bond: Bond): void {
    const atom1 = this.molecule.getAtom(bond.atom1Id);
    const atom2 = this.molecule.getAtom(bond.atom2Id);
    const meshes = this.bondMeshes.get(bond.id);
    if (!atom1 || !atom2 || !meshes) return;

    const direction = new THREE.Vector3().subVectors(atom2.position, atom1.position);
    const length = direction.length();
    direction.normalize();

    const up = Math.abs(direction.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const perp1 = new THREE.Vector3().crossVectors(direction, up).normalize();

    const offset = bond.type === 'double' ? 0.08 : bond.type === 'triple' ? 0.12 : 0;
    const count = bond.type === 'single' ? 1 : bond.type === 'double' ? 2 : 3;

    for (let i = 0; i < meshes.length && i < count; i++) {
      const mesh = meshes[i];
      const midPoint = new THREE.Vector3().addVectors(atom1.position, atom2.position).multiplyScalar(0.5);

      if (count === 2) {
        const offsetVec = perp1.clone().multiplyScalar(i === 0 ? -offset : offset);
        midPoint.add(offsetVec);
      } else if (count === 3) {
        if (i === 0) {
          const offsetVec = perp1.clone().multiplyScalar(-offset);
          midPoint.add(offsetVec);
        } else if (i === 2) {
          const offsetVec = perp1.clone().multiplyScalar(offset);
          midPoint.add(offsetVec);
        }
      }

      mesh.position.copy(midPoint);
      const upVec = new THREE.Vector3(0, 1, 0);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(upVec, direction);
      mesh.quaternion.copy(quaternion);

      const scale = mesh.scale.clone();
      scale.y = length;
      mesh.scale.set(scale.x, length > 0 ? length : 0.01, scale.z);
    }
  }

  highlightAtom(atomId: string): void {
    const mesh = this.atomMeshes.get(atomId);
    if (mesh && !mesh.userData.isHighlighted) {
      mesh.userData.isHighlighted = true;
      mesh.scale.copy(mesh.userData.originalScale).multiplyScalar(1.2);
    }
  }

  unhighlightAtom(atomId: string): void {
    const mesh = this.atomMeshes.get(atomId);
    if (mesh && mesh.userData.isHighlighted) {
      mesh.userData.isHighlighted = false;
      mesh.scale.copy(mesh.userData.originalScale);
    }
  }

  addAtom(atom: Atom): void {
    this.createAtomMesh(atom);
  }

  dispose(): void {
    this.clear();
    this.atomGeometry.dispose();
    for (const material of this.atomMaterialCache.values()) {
      material.dispose();
    }
    this.bondMaterial.dispose();
  }
}
