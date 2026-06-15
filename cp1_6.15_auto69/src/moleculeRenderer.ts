import * as THREE from 'three';
import { MoleculeData, Atom, Bond, elementColors, elementSizes } from './moleculeData';

interface AtomMeshMap {
  [id: string]: {
    sphere: THREE.Mesh;
    glow: THREE.Mesh;
    atom: Atom;
  };
}

interface BondMeshMap {
  [id: string]: {
    cylinder: THREE.Mesh;
    bond: Bond;
    originalColor: THREE.Color;
  };
}

export class MoleculeRenderer {
  private group: THREE.Group;
  private atomMap: AtomMeshMap = {};
  private bondMap: BondMeshMap = {};
  private highlightedAtomId: string | null = null;
  private highlightedBondId: string | null = null;
  private glowAnimationId: number = 0;
  private isGlowing: boolean = false;
  private glowBaseScale: number = 1.3;

  constructor() {
    this.group = new THREE.Group();
  }

  public buildMolecule(moleculeData: MoleculeData): THREE.Group {
    this.clear();

    for (const atom of moleculeData.atoms) {
      this.createAtom(atom);
    }

    for (const bond of moleculeData.bonds) {
      this.createBond(bond, moleculeData.atoms);
    }

    return this.group;
  }

  private createAtom(atom: Atom): void {
    const color = new THREE.Color(elementColors[atom.element]);
    const size = elementSizes[atom.element];

    const geometry = new THREE.SphereGeometry(size, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.3,
      metalness: 0.2
    });

    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(atom.x, atom.y, atom.z);
    sphere.userData = { type: 'atom', id: atom.id, atom };
    this.group.add(sphere);

    const glowGeometry = new THREE.SphereGeometry(size * this.glowBaseScale, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0,
      side: THREE.BackSide
    });

    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.copy(sphere.position);
    glow.visible = false;
    this.group.add(glow);

    this.atomMap[atom.id] = { sphere, glow, atom };
  }

  private createBond(bond: Bond, atoms: Atom[]): void {
    const atom1 = atoms.find(a => a.id === bond.atom1);
    const atom2 = atoms.find(a => a.id === bond.atom2);

    if (!atom1 || !atom2) return;

    const start = new THREE.Vector3(atom1.x, atom1.y, atom1.z);
    const end = new THREE.Vector3(atom2.x, atom2.y, atom2.z);
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();

    const bondRadius = 0.08;
    const geometry = new THREE.CylinderGeometry(bondRadius, bondRadius, length, 16);
    geometry.translate(0, length / 2, 0);
    geometry.rotateX(Math.PI / 2);

    const material = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.5,
      metalness: 0.3,
      transparent: true,
      opacity: 0.9
    });

    const cylinder = new THREE.Mesh(geometry, material);
    cylinder.position.copy(start);
    cylinder.lookAt(end);
    cylinder.userData = { type: 'bond', id: bond.id, bond };
    this.group.add(cylinder);

    this.bondMap[bond.id] = {
      cylinder,
      bond,
      originalColor: new THREE.Color(0x888888)
    };
  }

  public highlightAtom(atomId: string | null): void {
    if (this.highlightedAtomId && this.highlightedAtomId !== atomId) {
      const prevAtom = this.atomMap[this.highlightedAtomId];
      if (prevAtom) {
        prevAtom.glow.visible = false;
        (prevAtom.glow.material as THREE.MeshBasicMaterial).opacity = 0;
      }
    }

    this.highlightedAtomId = atomId;

    if (atomId && this.atomMap[atomId]) {
      const atomData = this.atomMap[atomId];
      atomData.glow.visible = true;
      this.startGlowAnimation();
    } else {
      this.stopGlowAnimation();
    }

    if (this.highlightedBondId) {
      this.unhighlightBond();
    }
  }

  public highlightBond(bondId: string | null): void {
    if (this.highlightedBondId && this.highlightedBondId !== bondId) {
      const prevBond = this.bondMap[this.highlightedBondId];
      if (prevBond) {
        (prevBond.cylinder.material as THREE.MeshStandardMaterial).color.copy(prevBond.originalColor);
      }
    }

    this.highlightedBondId = bondId;

    if (bondId && this.bondMap[bondId]) {
      const bondData = this.bondMap[bondId];
      (bondData.cylinder.material as THREE.MeshStandardMaterial).color.setHex(0xffff00);
    }

    if (this.highlightedAtomId) {
      this.highlightAtom(null);
    }
  }

  private unhighlightBond(): void {
    if (this.highlightedBondId && this.bondMap[this.highlightedBondId]) {
      const bondData = this.bondMap[this.highlightedBondId];
      (bondData.cylinder.material as THREE.MeshStandardMaterial).color.copy(bondData.originalColor);
    }
    this.highlightedBondId = null;
  }

  private startGlowAnimation(): void {
    if (this.isGlowing) return;
    this.isGlowing = true;

    const pulseDuration = 300;
    let lastTime = performance.now();
    let direction = 1;
    let progress = 0;

    const animate = () => {
      if (!this.isGlowing) return;

      const now = performance.now();
      const delta = now - lastTime;
      lastTime = now;

      progress += (delta / pulseDuration) * direction;

      if (progress >= 1) {
        progress = 1;
        direction = -1;
      } else if (progress <= 0) {
        progress = 0;
        direction = 1;
      }

      const opacity = 0.2 + progress * 0.4;
      const scale = this.glowBaseScale + progress * 0.2;

      if (this.highlightedAtomId && this.atomMap[this.highlightedAtomId]) {
        const glow = this.atomMap[this.highlightedAtomId].glow;
        (glow.material as THREE.MeshBasicMaterial).opacity = opacity;
        glow.scale.setScalar(scale / this.glowBaseScale);
      }

      this.glowAnimationId = requestAnimationFrame(animate);
    };

    animate();
  }

  private stopGlowAnimation(): void {
    this.isGlowing = false;
    if (this.glowAnimationId) {
      cancelAnimationFrame(this.glowAnimationId);
      this.glowAnimationId = 0;
    }
  }

  public getAtomById(id: string): Atom | undefined {
    return this.atomMap[id]?.atom;
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public clear(): void {
    this.stopGlowAnimation();
    this.highlightedAtomId = null;
    this.highlightedBondId = null;

    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }

    this.atomMap = {};
    this.bondMap = {};
  }

  public dispose(): void {
    this.clear();
  }
}
