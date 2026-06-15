import * as THREE from 'three';
import { Atom } from './atom';

export interface BondData {
  atom1: number;
  atom2: number;
}

export class Bond {
  public atom1: Atom;
  public atom2: Atom;
  public mesh: THREE.Mesh;
  private elementColorMode: boolean = true;

  constructor(atom1: Atom, atom2: Atom) {
    this.atom1 = atom1;
    this.atom2 = atom2;
    this.mesh = this.createBondMesh();
    this.updatePosition();
  }

  private createBondMesh(): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(0.15, 0.15, 1, 8);
    const color = this.getBondColor();
    const material = new THREE.MeshPhongMaterial({
      color: color,
      transparent: true,
      opacity: 0.85,
      shininess: 50
    });
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }

  private getBondColor(): number {
    if (this.elementColorMode) {
      const c1 = new THREE.Color(this.atom1.getElementColor());
      const c2 = new THREE.Color(this.atom2.getElementColor());
      const avg = c1.clone().lerp(c2, 0.5);
      return avg.getHex();
    }
    return 0xffffff;
  }

  public updatePosition(): void {
    const pos1 = this.atom1.lod.position;
    const pos2 = this.atom2.lod.position;

    const mid = pos1.clone().add(pos2).multiplyScalar(0.5);
    this.mesh.position.copy(mid);

    const direction = pos2.clone().sub(pos1);
    const length = direction.length();
    this.mesh.scale.set(1, length, 1);

    direction.normalize();
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    this.mesh.quaternion.copy(quaternion);
  }

  public setColorMode(byElement: boolean): void {
    this.elementColorMode = byElement;
    const material = this.mesh.material as THREE.MeshPhongMaterial;
    material.color.setHex(this.getBondColor());
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    if (Array.isArray(this.mesh.material)) {
      this.mesh.material.forEach((m) => m.dispose());
    } else {
      this.mesh.material.dispose();
    }
  }
}
