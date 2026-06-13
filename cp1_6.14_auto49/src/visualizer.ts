import * as THREE from 'three';
import type { MoleculeData, AtomData, BondData, AtomSymbol } from './moleculeData';

const CPK_COLORS: Record<AtomSymbol, number> = {
  C: 0x909090,
  O: 0xff0d0d,
  N: 0x3050f8,
  H: 0xffffff,
};

const COMPLEMENT_COLORS: Record<AtomSymbol, number> = {
  C: 0x6f6f6f,
  O: 0x00f2f2,
  N: 0xcfaf07,
  H: 0x000000,
};

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  moleculeIndex: number;
}

interface MoleculeGroup {
  group: THREE.Group;
  atomMeshes: THREE.Mesh[];
  bondMeshes: THREE.Mesh[];
  originalBondColors: number[];
  moleculeData: MoleculeData;
  baseEmissiveIntensity: number;
}

const MAX_PARTICLES = 4000;
const PARTICLE_LIFETIME = 2.0;
const BOND_SINGLE_LENGTH = 2.2;
const BOND_DOUBLE_SPACING = 0.3;

export class MoleculeVisualizer {
  private scene: THREE.Scene;
  private moleculeGroups: MoleculeGroup[] = [];
  private particles: Particle[] = [];
  private particlePool: THREE.Mesh[] = [];
  private selectedIndex: number = -1;
  private volatilityScale: number = 1.0;
  private elapsedTime: number = 0;
  private particleGeometry: THREE.BoxGeometry;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.particleGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.05);
  }

  buildMolecules(molecules: MoleculeData[]): void {
    const shellRadius = 15;
    const count = molecules.length;

    for (let i = 0; i < count; i++) {
      const molData = molecules[i];
      const group = new THREE.Group();

      const phi = Math.acos(1 - 2 * (i + 0.5) / count);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;

      const pos = new THREE.Vector3(
        shellRadius * Math.sin(phi) * Math.cos(theta),
        shellRadius * Math.sin(phi) * Math.sin(theta),
        shellRadius * Math.cos(phi)
      );

      const atomMeshes: THREE.Mesh[] = [];
      for (const at of molData.atoms) {
        const geo = new THREE.SphereGeometry(at.radius, 12, 8);
        const mat = new THREE.MeshStandardMaterial({
          color: CPK_COLORS[at.symbol],
          roughness: 0.3,
          metalness: 0.1,
          emissive: CPK_COLORS[at.symbol],
          emissiveIntensity: 0.15,
          transparent: true,
          opacity: 1.0,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(at.position);
        mesh.userData = { atomSymbol: at.symbol, moleculeIndex: i };
        group.add(mesh);
        atomMeshes.push(mesh);
      }

      const bondMeshes: THREE.Mesh[] = [];
      const originalBondColors: number[] = [];
      for (const bd of molData.bonds) {
        const a1 = molData.atoms[bd.atomIndex1].position;
        const a2 = molData.atoms[bd.atomIndex2].position;

        if (bd.type === 'single') {
          const cyl = this.createBondCylinder(a1, a2, 0xaaaaaa, 0.08);
          group.add(cyl);
          bondMeshes.push(cyl);
          originalBondColors.push(0xaaaaaa);
        } else {
          const dir = new THREE.Vector3().subVectors(a2, a1).normalize();
          const perp = new THREE.Vector3();
          if (Math.abs(dir.y) < 0.99) {
            perp.crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
          } else {
            perp.crossVectors(dir, new THREE.Vector3(1, 0, 0)).normalize();
          }
          const offset = perp.multiplyScalar(BOND_DOUBLE_SPACING / 2);

          const c1 = this.createBondCylinder(
            a1.clone().add(offset), a2.clone().add(offset), 0xaaaaaa, 0.06
          );
          const c2 = this.createBondCylinder(
            a1.clone().sub(offset), a2.clone().sub(offset), 0xaaaaaa, 0.06
          );
          group.add(c1, c2);
          bondMeshes.push(c1, c2);
          originalBondColors.push(0xaaaaaa, 0xaaaaaa);
        }
      }

      group.position.copy(pos);
      const randAxis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      const randAngle = Math.random() * Math.PI * 2;
      group.quaternion.setFromAxisAngle(randAxis, randAngle);

      this.scene.add(group);
      this.moleculeGroups.push({
        group,
        atomMeshes,
        bondMeshes,
        originalBondColors,
        moleculeData: molData,
        baseEmissiveIntensity: 0.15,
      });
    }
  }

  private createBondCylinder(start: THREE.Vector3, end: THREE.Vector3, color: number, radius: number): THREE.Mesh {
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const dir = new THREE.Vector3().subVectors(end, start);
    const length = Math.max(dir.length(), 0.01);
    const geo = new THREE.CylinderGeometry(radius, radius, length, 6, 1);
    const mat = new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity: 0.6,
      roughness: 0.5,
      metalness: 0.0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(mid);
    const up = new THREE.Vector3(0, 1, 0);
    const dirN = dir.clone().normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(up, dirN);
    mesh.quaternion.copy(quat);
    return mesh;
  }

  updateVolatilityScale(scale: number): void {
    this.volatilityScale = scale;
  }

  highlightMolecule(index: number): void {
    this.selectedIndex = index;

    for (let i = 0; i < this.moleculeGroups.length; i++) {
      const mg = this.moleculeGroups[i];
      const isSelected = i === index;

      for (const am of mg.atomMeshes) {
        const mat = am.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = isSelected ? mg.baseEmissiveIntensity * 1.5 : mg.baseEmissiveIntensity;
        mat.opacity = isSelected ? 1.0 : 0.3;
      }

      for (let j = 0; j < mg.bondMeshes.length; j++) {
        const bm = mg.bondMeshes[j];
        const mat = bm.material as THREE.MeshStandardMaterial;
        mat.color.set(isSelected ? 0x00ffff : mg.originalBondColors[j]);
        mat.opacity = isSelected ? 0.9 : 0.2;
      }
    }
  }

  clearHighlight(): void {
    this.selectedIndex = -1;
    for (const mg of this.moleculeGroups) {
      for (const am of mg.atomMeshes) {
        const mat = am.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = mg.baseEmissiveIntensity;
        mat.opacity = 1.0;
      }
      for (let j = 0; j < mg.bondMeshes.length; j++) {
        const bm = mg.bondMeshes[j];
        const mat = bm.material as THREE.MeshStandardMaterial;
        mat.color.set(mg.originalBondColors[j]);
        mat.opacity = 0.6;
      }
    }
  }

  update(dt: number): void {
    this.elapsedTime += dt;
    this.emitParticles(dt);
    this.updateParticles(dt);
  }

  private getDominantAtom(molData: MoleculeData): AtomSymbol {
    const counts: Record<AtomSymbol, number> = { C: 0, O: 0, N: 0, H: 0 };
    for (const a of molData.atoms) counts[a.symbol]++;
    let maxSym: AtomSymbol = 'C';
    let maxCount = 0;
    for (const sym of ['C', 'O', 'N', 'H'] as AtomSymbol[]) {
      if (sym !== 'H' && counts[sym] > maxCount) {
        maxCount = counts[sym];
        maxSym = sym;
      }
    }
    return maxSym;
  }

  private emitParticles(dt: number): void {
    for (let i = 0; i < this.moleculeGroups.length; i++) {
      const mg = this.moleculeGroups[i];
      const effectiveVol = mg.moleculeData.volatility * this.volatilityScale;
      const targetCount = Math.floor(effectiveVol * 200);
      const currentCount = this.particles.filter(p => p.moleculeIndex === i).length;

      if (currentCount < targetCount && this.particles.length < MAX_PARTICLES) {
        const emitCount = Math.min(
          Math.ceil(effectiveVol * 8 * dt * 60),
          targetCount - currentCount,
          MAX_PARTICLES - this.particles.length
        );

        const domAtom = this.getDominantAtom(mg.moleculeData);
        const particleColor = COMPLEMENT_COLORS[domAtom];

        for (let e = 0; e < emitCount; e++) {
          const atomIdx = Math.floor(Math.random() * mg.atomMeshes.length);
          const atomMesh = mg.atomMeshes[atomIdx];

          const localPos = atomMesh.position.clone();
          const worldPos = localPos.clone();
          mg.group.localToWorld(worldPos);

          const mesh = this.getParticleMesh(particleColor);
          mesh.position.copy(worldPos);
          mesh.material.opacity = 1.0;

          const dir = new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
          ).normalize();

          const speed = 0.5 + effectiveVol * 1.5;

          this.particles.push({
            mesh,
            velocity: dir.multiplyScalar(speed),
            life: 0,
            maxLife: PARTICLE_LIFETIME,
            moleculeIndex: i,
          });
        }
      }
    }
  }

  private getParticleMesh(color: number): THREE.Mesh {
    for (let i = this.particlePool.length - 1; i >= 0; i--) {
      const pm = this.particlePool[i];
      const mat = pm.material as THREE.MeshBasicMaterial;
      if (mat.color.getHex() === color) {
        this.particlePool.splice(i, 1);
        pm.visible = true;
        return pm;
      }
    }

    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 1.0,
    });
    const mesh = new THREE.Mesh(this.particleGeometry, mat);
    this.scene.add(mesh);
    return mesh;
  }

  private updateParticles(dt: number): void {
    const toRemove: number[] = [];

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.life += dt;

      if (p.life >= p.maxLife) {
        toRemove.push(i);
        continue;
      }

      p.mesh.position.addScaledVector(p.velocity, dt);

      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      const fadeRatio = p.life / p.maxLife;
      mat.opacity = 1.0 - fadeRatio;

      if (this.particles.length - toRemove.length > MAX_PARTICLES) {
        toRemove.push(i);
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      const p = this.particles[idx];
      p.mesh.visible = false;
      this.particlePool.push(p.mesh);
      this.particles.splice(idx, 1);
    }
  }

  getMoleculeGroups(): MoleculeGroup[] {
    return this.moleculeGroups;
  }

  getMoleculeAtIntersection(intersect: THREE.Intersection): number {
    const obj = intersect.object;
    if (obj.userData && obj.userData.moleculeIndex !== undefined) {
      return obj.userData.moleculeIndex;
    }
    let parent = obj.parent;
    while (parent) {
      for (let i = 0; i < this.moleculeGroups.length; i++) {
        if (this.moleculeGroups[i].group === parent) {
          return i;
        }
      }
      parent = parent.parent;
    }
    return -1;
  }

  getSelectedIndex(): number {
    return this.selectedIndex;
  }

  getParticleCount(): number {
    return this.particles.length;
  }
}
