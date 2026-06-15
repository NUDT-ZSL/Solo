import * as THREE from 'three';
import type { MoleculeData, AtomSymbol } from './moleculeData';

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
const BOND_DOUBLE_SPACING = 0.3;

export class MoleculeVisualizer {
  private scene: THREE.Scene;
  private moleculeGroups: MoleculeGroup[] = [];
  private particles: Particle[] = [];
  private particlePool: THREE.Mesh[] = [];
  private selectedIndex: number = -1;
  private volatilityScale: number = 1.0;
  private particleGeometry: THREE.BoxGeometry;
  private _atomGeom: Map<string, THREE.SphereGeometry> = new Map();
  private _cylGeom: Map<string, THREE.CylinderGeometry> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.particleGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.05);
  }

  private getAtomGeom(radius: number): THREE.SphereGeometry {
    const key = radius.toFixed(4);
    if (!this._atomGeom.has(key)) {
      this._atomGeom.set(key, new THREE.SphereGeometry(radius, 10, 8));
    }
    return this._atomGeom.get(key)!;
  }

  private getCylGeom(radius: number, length: number): THREE.CylinderGeometry {
    const key = radius.toFixed(4) + '_' + length.toFixed(4);
    if (!this._cylGeom.has(key)) {
      this._cylGeom.set(key, new THREE.CylinderGeometry(radius, radius, length, 6, 1));
    }
    return this._cylGeom.get(key)!;
  }

  buildMolecules(molecules: MoleculeData[]): void {
    const shellRadius = 15;
    const count = molecules.length;
    const phiStep = Math.atan(Math.sqrt(count)) * 2;
    const thetaStep = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < count; i++) {
      const molData = molecules[i];
      const group = new THREE.Group();

      const y = i / count * 2 - 1 + 1 / count;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = thetaStep * i;
      const phi = phiStep * i;

      const x = Math.cos(phi) * radiusAtY * shellRadius;
      const z = Math.sin(phi) * radiusAtY * shellRadius;
      const yy = y * shellRadius + (i * 0.01 % 1) * 0.3;

      const atomMeshes: THREE.Mesh[] = [];
      for (const at of molData.atoms) {
        const geo = this.getAtomGeom(at.radius);
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
          const perp = this.perpendicularTo(dir).multiplyScalar(BOND_DOUBLE_SPACING / 2);

          const c1 = this.createBondCylinder(
            a1.clone().add(perp), a2.clone().add(perp), 0xaaaaaa, 0.06
          );
          const c2 = this.createBondCylinder(
            a1.clone().sub(perp), a2.clone().sub(perp), 0xaaaaaa, 0.06
          );
          group.add(c1, c2);
          bondMeshes.push(c1, c2);
          originalBondColors.push(0xaaaaaa, 0xaaaaaa);
        }
      }

      group.position.set(x, yy, z);
      const randAxis = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize();
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

  private perpendicularTo(dir: THREE.Vector3): THREE.Vector3 {
    const a = dir.clone().normalize();
    const absX = Math.abs(a.x);
    const absY = Math.abs(a.y);
    const absZ = Math.abs(a.z);

    let upAxis: THREE.Vector3;
    if (absX <= absY && absX <= absZ) {
      upAxis = new THREE.Vector3(1, 0, 0);
    } else if (absY <= absX && absY <= absZ) {
      upAxis = new THREE.Vector3(0, 1, 0);
    } else {
      upAxis = new THREE.Vector3(0, 0, 1);
    }
    return new THREE.Vector3().crossVectors(a, upAxis).normalize();
  }

  private createBondCylinder(start: THREE.Vector3, end: THREE.Vector3, color: number, radius: number): THREE.Mesh {
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const dir = new THREE.Vector3().subVectors(end, start);
    const length = Math.max(dir.length(), 0.01);
    const geo = this.getCylGeom(radius, length);
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
      const dimOpacity = isSelected ? 1.0 : 0.3;
      const bondOpacity = isSelected ? 0.9 : 0.2;
      const emissiveMul = isSelected ? 1.5 : 1.0;

      for (const am of mg.atomMeshes) {
        const mat = am.material as THREE.MeshStandardMaterial;
        mat.transparent = true;
        mat.emissiveIntensity = mg.baseEmissiveIntensity * emissiveMul;
        mat.opacity = dimOpacity;
      }

      for (let j = 0; j < mg.bondMeshes.length; j++) {
        const bm = mg.bondMeshes[j];
        const mat = bm.material as THREE.MeshStandardMaterial;
        mat.transparent = true;
        mat.color.set(isSelected ? 0x00ffff : mg.originalBondColors[j]);
        mat.opacity = bondOpacity;
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
    if (this.volatilityScale <= 0) return;

    let totalTarget = 0;
    const perMolTarget: number[] = [];

    for (let i = 0; i < this.moleculeGroups.length; i++) {
      const mg = this.moleculeGroups[i];
      const effectiveVol = mg.moleculeData.volatility * this.volatilityScale;
      const tgt = Math.floor(effectiveVol * 200);
      perMolTarget.push(tgt);
      totalTarget += tgt;
    }

    const scaleFactor = totalTarget > MAX_PARTICLES ? MAX_PARTICLES / totalTarget : 1.0;

    for (let i = 0; i < this.moleculeGroups.length; i++) {
      const targetCount = Math.floor(perMolTarget[i] * scaleFactor);
      const currentCount = this.countMolParticles(i);
      const availableSlots = MAX_PARTICLES - this.particles.length;

      if (currentCount < targetCount && availableSlots > 0) {
        const mg = this.moleculeGroups[i];
        const effectiveVol = mg.moleculeData.volatility * this.volatilityScale;

        const emitPerSec = Math.max(1, Math.floor(effectiveVol * 10));
        let toEmit = Math.min(
          Math.ceil(emitPerSec * dt),
          targetCount - currentCount,
          availableSlots
        );

        const domAtom = this.getDominantAtom(mg.moleculeData);
        const particleColor = COMPLEMENT_COLORS[domAtom];

        for (let e = 0; e < toEmit; e++) {
          const atomIdx = Math.floor(Math.random() * mg.atomMeshes.length);
          const atomMesh = mg.atomMeshes[atomIdx];

          const worldPos = atomMesh.getWorldPosition(new THREE.Vector3());

          const mesh = this.getParticleMesh(particleColor);
          mesh.position.copy(worldPos);
          (mesh.material as THREE.MeshBasicMaterial).opacity = 1.0;

          const dir = new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
          ).normalize();

          const baseSpeed = 0.4;
          const varSpeed = effectiveVol * 2.2;
          const speed = baseSpeed + varSpeed;

          this.particles.push({
            mesh,
            velocity: dir.multiplyScalar(speed),
            life: 0,
            maxLife: PARTICLE_LIFETIME,
            moleculeIndex: i,
          });

          if (this.particles.length >= MAX_PARTICLES) break;
        }
      }
    }
  }

  private countMolParticles(molIdx: number): number {
    let c = 0;
    for (const p of this.particles) if (p.moleculeIndex === molIdx) c++;
    return c;
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
    if (this.volatilityScale > 0) {
      const speedMul = 0.3 + 0.7 * this.volatilityScale;
      for (const p of this.particles) {
        p.life += dt;
        p.mesh.position.addScaledVector(p.velocity, dt * speedMul);

        const fadeR = p.life / p.maxLife;
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = 1.0 - fadeR;
      }
    }

    if (this.particles.length > MAX_PARTICLES) {
      const indexed = this.particles.map((p, i) => ({ i, life: p.life }));
      indexed.sort((a, b) => b.life - a.life);
      const excess = this.particles.length - MAX_PARTICLES;
      const toRemove = indexed.slice(0, excess).map(x => x.i);
      toRemove.sort((a, b) => b - a);
      for (const idx of toRemove) {
        const p = this.particles[idx];
        p.mesh.visible = false;
        this.particlePool.push(p.mesh);
        this.particles.splice(idx, 1);
      }
      return;
    }

    const deadIndices: number[] = [];
    for (let i = 0; i < this.particles.length; i++) {
      if (this.particles[i].life >= this.particles[i].maxLife) {
        deadIndices.push(i);
      }
    }
    deadIndices.sort((a, b) => b - a);
    for (const idx of deadIndices) {
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
