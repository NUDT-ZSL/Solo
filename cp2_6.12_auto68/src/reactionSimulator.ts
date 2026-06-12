import * as THREE from 'three';
import { SceneRenderer } from './sceneRenderer';
import {
  ReactionData,
  MoleculeData,
  getMoleculeById
} from './moleculeManager';
import { lerp, easeInOutCubic, easeOutCubic, easeInCubic } from './utils';

type ReactionPhase = 'idle' | 'glow' | 'break' | 'drift' | 'combine' | 'complete';

interface ReactionAtom {
  mesh: THREE.Mesh;
  element: string;
  startPosition: THREE.Vector3;
  driftPosition: THREE.Vector3;
  endPosition: THREE.Vector3;
  originalIndex: number;
  trail: THREE.Points | null;
}

interface ReactionBond {
  mesh: THREE.Mesh;
  fromAtomIndex: number;
  toAtomIndex: number;
  visible: boolean;
}

interface TrailPoint {
  position: THREE.Vector3;
  life: number;
}

export class ReactionSimulator {
  private sceneRenderer: SceneRenderer;
  private currentReaction: ReactionData | null = null;
  private phase: ReactionPhase = 'idle';
  private isPaused = false;
  private startTime = 0;
  private pauseTime = 0;
  private accumulatedPauseTime = 0;

  private reactionAtoms: ReactionAtom[] = [];
  private reactionBonds: ReactionBond[] = [];
  private originalAtoms: THREE.Mesh[] = [];
  private originalBonds: THREE.Mesh[] = [];

  private animationFrameId: number | null = null;
  private onCompleteCallback: (() => void) | null = null;
  private onPhaseChangeCallback: ((phase: ReactionPhase) => void) | null = null;

  constructor(sceneRenderer: SceneRenderer) {
    this.sceneRenderer = sceneRenderer;
  }

  public setReaction(reaction: ReactionData): void {
    this.currentReaction = reaction;
    this.resetReaction();
  }

  public startReaction(): void {
    if (!this.currentReaction) return;
    if (this.phase === 'complete') {
      this.resetReaction();
    }

    if (this.isPaused) {
      this.resumeReaction();
      return;
    }

    this.setupReaction();
    this.phase = 'glow';
    this.startTime = performance.now();
    this.accumulatedPauseTime = 0;
    this.isPaused = false;

    if (this.onPhaseChangeCallback) {
      this.onPhaseChangeCallback(this.phase);
    }

    this.animate();
  }

  public pauseReaction(): void {
    if (this.phase === 'idle' || this.phase === 'complete') return;
    if (this.isPaused) return;

    this.isPaused = true;
    this.pauseTime = performance.now();

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public resumeReaction(): void {
    if (!this.isPaused) return;

    this.accumulatedPauseTime += performance.now() - this.pauseTime;
    this.isPaused = false;
    this.animate();
  }

  public resetReaction(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.phase = 'idle';
    this.isPaused = false;
    this.startTime = 0;
    this.accumulatedPauseTime = 0;

    this.clearReactionAtoms();

    if (this.onPhaseChangeCallback) {
      this.onPhaseChangeCallback(this.phase);
    }
  }

  private setupReaction(): void {
    if (!this.currentReaction) return;

    this.clearReactionAtoms();

    const moleculeGroup = this.sceneRenderer.getMoleculeGroup();

    const allAtoms: { element: string; position: THREE.Vector3 }[] = [];
    const allBonds: { from: number; to: number; order: number }[] = [];
    let atomOffset = 0;

    this.currentReaction.reactants.forEach((reactant, reactantIndex) => {
      const molecule = getMoleculeById(reactant.moleculeId);
      if (!molecule) return;

      const offset = reactant.offset;
      const offsetVec = new THREE.Vector3(offset.x, offset.y, offset.z);

      molecule.atoms.forEach(atom => {
        allAtoms.push({
          element: atom.element,
          position: new THREE.Vector3(
            atom.x + offsetVec.x,
            atom.y + offsetVec.y,
            atom.z + offsetVec.z
          )
        });
      });

      molecule.bonds.forEach(bond => {
        allBonds.push({
          from: bond.from + atomOffset,
          to: bond.to + atomOffset,
          order: bond.order || 1
        });
      });

      atomOffset += molecule.atoms.length;
    });

    allAtoms.forEach((atomData, index) => {
      const atom = this.createReactionAtom(atomData.element, atomData.position);
      this.reactionAtoms.push({
        mesh: atom,
        element: atomData.element,
        startPosition: atomData.position.clone(),
        driftPosition: new THREE.Vector3(),
        endPosition: atomData.position.clone(),
        originalIndex: index,
        trail: null
      });
      moleculeGroup.add(atom);
    });

    allBonds.forEach(bondData => {
      const fromAtom = this.reactionAtoms[bondData.from];
      const toAtom = this.reactionAtoms[bondData.to];
      if (!fromAtom || !toAtom) return;

      const bond = this.createBond(fromAtom.mesh, toAtom.mesh, bondData.order);
      this.reactionBonds.push({
        mesh: bond,
        fromAtomIndex: bondData.from,
        toAtomIndex: bondData.to,
        visible: true
      });
      moleculeGroup.add(bond);
    });

    this.calculateProductPositions();
    this.calculateDriftPositions();

    this.sceneRenderer.resetView();
  }

  private createReactionAtom(element: string, position: THREE.Vector3): THREE.Mesh {
    const radii: Record<string, number> = {
      H: 0.15, C: 0.35, N: 0.32, O: 0.30,
      F: 0.28, Cl: 0.45, Br: 0.55, I: 0.65,
      S: 0.50, P: 0.50, B: 0.40, Li: 0.60,
      Na: 0.65, K: 0.85, Ca: 0.75, Fe: 0.55,
      Cu: 0.55, Zn: 0.55
    };

    const colors: Record<string, number> = {
      H: 0xffffff, C: 0x909090, N: 0x3050f8, O: 0xff0d0d,
      F: 0x90e050, Cl: 0x1ff01f, Br: 0xa62929, I: 0x940094,
      S: 0xffff30, P: 0xff8000, B: 0xffb5b5, Li: 0xcc80ff,
      Na: 0xab5cf2, K: 0x8f40d4, Ca: 0x3dff00, Fe: 0xe06633,
      Cu: 0xc88033, Zn: 0x7d80b0
    };

    const radius = radii[element] || 0.4;
    const color = colors[element] || 0x808080;

    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.3,
      roughness: 0.2,
      emissive: color,
      emissiveIntensity: 0.1
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);

    return mesh;
  }

  private createBond(fromAtom: THREE.Mesh, toAtom: THREE.Mesh, order: number): THREE.Mesh {
    const direction = new THREE.Vector3()
      .subVectors(toAtom.position, fromAtom.position);
    const length = direction.length();

    const bondRadius = 0.08;
    const geometry = new THREE.CylinderGeometry(bondRadius, bondRadius, length, 16);
    const material = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      metalness: 0.5,
      roughness: 0.3,
      transparent: true,
      opacity: 1
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(fromAtom.position).add(toAtom.position).multiplyScalar(0.5);
    mesh.lookAt(toAtom.position);
    mesh.rotateX(Math.PI / 2);

    return mesh;
  }

  private calculateProductPositions(): void {
    if (!this.currentReaction) return;

    const productAtoms: { element: string; position: THREE.Vector3 }[] = [];

    this.currentReaction.products.forEach(product => {
      const molecule = getMoleculeById(product.moleculeId);
      if (!molecule) return;

      const offset = product.offset;
      const offsetVec = new THREE.Vector3(offset.x, offset.y, offset.z);

      molecule.atoms.forEach(atom => {
        productAtoms.push({
          element: atom.element,
          position: new THREE.Vector3(
            atom.x + offsetVec.x,
            atom.y + offsetVec.y,
            atom.z + offsetVec.z
          )
        });
      });
    });

    const reactantElements: { element: string; index: number }[] = [];
    this.reactionAtoms.forEach((atom, index) => {
      reactantElements.push({ element: atom.element, index });
    });

    productAtoms.forEach(productAtom => {
      let bestMatch = -1;
      let bestDistance = Infinity;

      reactantElements.forEach((reactant, idx) => {
        if (reactant.element !== productAtom.element) return;

        const reactantAtom = this.reactionAtoms[reactant.index];
        const distance = reactantAtom.startPosition.distanceTo(productAtom.position);

        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = idx;
        }
      });

      if (bestMatch >= 0) {
        const reactantIdx = reactantElements[bestMatch].index;
        this.reactionAtoms[reactantIdx].endPosition = productAtom.position.clone();
        reactantElements.splice(bestMatch, 1);
      }
    });
  }

  private calculateDriftPositions(): void {
    this.reactionAtoms.forEach(atom => {
      const direction = new THREE.Vector3()
        .subVectors(atom.endPosition, atom.startPosition)
        .normalize();

      const perpendicular = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize();

      const driftDistance = 2 + Math.random() * 2;
      atom.driftPosition.copy(atom.startPosition)
        .add(perpendicular.multiplyScalar(driftDistance));
    });
  }

  private clearReactionAtoms(): void {
    const moleculeGroup = this.sceneRenderer.getMoleculeGroup();

    this.reactionAtoms.forEach(atom => {
      moleculeGroup.remove(atom.mesh);
      atom.mesh.geometry.dispose();
      (atom.mesh.material as THREE.Material).dispose();

      if (atom.trail) {
        moleculeGroup.remove(atom.trail);
        atom.trail.geometry.dispose();
        (atom.trail.material as THREE.Material).dispose();
      }
    });
    this.reactionAtoms = [];

    this.reactionBonds.forEach(bond => {
      moleculeGroup.remove(bond.mesh);
      bond.mesh.geometry.dispose();
      (bond.mesh.material as THREE.Material).dispose();
    });
    this.reactionBonds = [];
  }

  private animate = (): void => {
    if (this.isPaused || !this.currentReaction) return;

    this.animationFrameId = requestAnimationFrame(this.animate);

    const elapsed = performance.now() - this.startTime - this.accumulatedPauseTime;
    const durations = this.currentReaction.durations;

    switch (this.phase) {
      case 'glow':
        this.updateGlowPhase(elapsed, durations.glow);
        if (elapsed >= durations.glow) {
          this.phase = 'break';
          this.startTime = performance.now() - this.accumulatedPauseTime;
          if (this.onPhaseChangeCallback) {
            this.onPhaseChangeCallback(this.phase);
          }
        }
        break;

      case 'break':
        this.updateBreakPhase(elapsed, durations.break);
        if (elapsed >= durations.break) {
          this.phase = 'drift';
          this.startTime = performance.now() - this.accumulatedPauseTime;
          if (this.onPhaseChangeCallback) {
            this.onPhaseChangeCallback(this.phase);
          }
        }
        break;

      case 'drift':
        this.updateDriftPhase(elapsed, durations.drift);
        if (elapsed >= durations.drift) {
          this.phase = 'combine';
          this.startTime = performance.now() - this.accumulatedPauseTime;
          if (this.onPhaseChangeCallback) {
            this.onPhaseChangeCallback(this.phase);
          }
        }
        break;

      case 'combine':
        this.updateCombinePhase(elapsed, durations.combine);
        if (elapsed >= durations.combine) {
          this.phase = 'complete';
          if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
          }
          if (this.onPhaseChangeCallback) {
            this.onPhaseChangeCallback(this.phase);
          }
          if (this.onCompleteCallback) {
            this.onCompleteCallback();
          }
        }
        break;
    }

    this.updateBonds();
  };

  private updateGlowPhase(elapsed: number, duration: number): void {
    const t = elapsed / duration;
    const glowIntensity = Math.sin(t * Math.PI) * 0.8;

    this.reactionAtoms.forEach(atom => {
      const material = atom.mesh.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.1 + glowIntensity;
    });

    const rotationSpeed = 0.02;
    this.sceneRenderer.getMoleculeGroup().rotation.y += rotationSpeed;
  }

  private updateBreakPhase(elapsed: number, duration: number): void {
    const t = elapsed / duration;
    const progress = easeInCubic(t);

    this.reactionBonds.forEach(bond => {
      const material = bond.mesh.material as THREE.MeshStandardMaterial;
      material.opacity = 1 - progress;

      if (progress > 0.3 && progress < 0.7 && Math.random() < 0.3) {
        const bondPos = bond.mesh.position.clone();
        this.sceneRenderer.createSparkParticles(bondPos, 3);
      }
    });

    if (t > 0.5 && this.reactionBonds.length > 0) {
      this.reactionBonds.forEach(bond => {
        bond.visible = false;
        bond.mesh.visible = false;
      });
    }
  }

  private updateDriftPhase(elapsed: number, duration: number): void {
    const t = elapsed / duration;
    const progress = easeOutCubic(t);

    this.reactionAtoms.forEach(atom => {
      atom.mesh.position.lerpVectors(
        atom.startPosition,
        atom.driftPosition,
        progress
      );

      const material = atom.mesh.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.1;
    });
  }

  private updateCombinePhase(elapsed: number, duration: number): void {
    const t = elapsed / duration;
    const progress = easeInOutCubic(t);

    this.reactionAtoms.forEach(atom => {
      atom.mesh.position.lerpVectors(
        atom.driftPosition,
        atom.endPosition,
        progress
      );

      this.updateAtomTrail(atom, progress);
    });
  }

  private updateAtomTrail(atom: ReactionAtom, progress: number): void {
    if (!atom.trail) {
      const trailLength = 10;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(trailLength * 3);
      const colors = new Float32Array(trailLength * 3);
      const sizes = new Float32Array(trailLength);

      for (let i = 0; i < trailLength; i++) {
        positions[i * 3] = atom.mesh.position.x;
        positions[i * 3 + 1] = atom.mesh.position.y;
        positions[i * 3 + 2] = atom.mesh.position.z;

        const color = new THREE.Color(0x00d4ff);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        sizes[i] = (1 - i / trailLength) * 0.3;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size: 0.1,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        sizeAttenuation: true
      });

      atom.trail = new THREE.Points(geometry, material);
      this.sceneRenderer.getMoleculeGroup().add(atom.trail);
    }

    const positions = atom.trail.geometry.attributes.position.array as Float32Array;
    const trailLength = positions.length / 3;

    for (let i = trailLength - 1; i > 0; i--) {
      positions[i * 3] = positions[(i - 1) * 3];
      positions[i * 3 + 1] = positions[(i - 1) * 3 + 1];
      positions[i * 3 + 2] = positions[(i - 1) * 3 + 2];
    }

    positions[0] = atom.mesh.position.x;
    positions[1] = atom.mesh.position.y;
    positions[2] = atom.mesh.position.z;

    atom.trail.geometry.attributes.position.needsUpdate = true;

    const material = atom.trail.material as THREE.PointsMaterial;
    material.opacity = 0.6 * (1 - progress);
  }

  private updateBonds(): void {
    this.reactionBonds.forEach(bond => {
      if (!bond.visible) return;

      const fromAtom = this.reactionAtoms[bond.fromAtomIndex];
      const toAtom = this.reactionAtoms[bond.toAtomIndex];
      if (!fromAtom || !toAtom) return;

      const fromPos = fromAtom.mesh.position;
      const toPos = toAtom.mesh.position;
      const direction = new THREE.Vector3().subVectors(toPos, fromPos);
      const length = direction.length();
      const midpoint = new THREE.Vector3().addVectors(fromPos, toPos).multiplyScalar(0.5);

      bond.mesh.position.copy(midpoint);
      bond.mesh.scale.y = length / (bond.mesh.geometry as THREE.CylinderGeometry).parameters.height;
      bond.mesh.lookAt(toPos);
      bond.mesh.rotateX(Math.PI / 2);
    });
  }

  public getPhase(): ReactionPhase {
    return this.phase;
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  public setOnCompleteCallback(callback: () => void): void {
    this.onCompleteCallback = callback;
  }

  public setOnPhaseChangeCallback(callback: (phase: ReactionPhase) => void): void {
    this.onPhaseChangeCallback = callback;
  }

  public dispose(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.clearReactionAtoms();
  }
}
