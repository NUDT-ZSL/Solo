import * as THREE from 'three';
import { SceneRenderer, AtomMesh } from './sceneRenderer';
import {
  ReactionData,
  getMoleculeById
} from './moleculeManager';
import { easeInOutCubic, easeOutCubic, easeInCubic, getAtomColor, getAtomRadius } from './utils';

export type ReactionPhase = 'idle' | 'glow' | 'break' | 'drift' | 'combine' | 'complete';

interface ReactionAtom {
  mesh: THREE.Mesh;
  element: string;
  startPosition: THREE.Vector3;
  driftPosition: THREE.Vector3;
  endPosition: THREE.Vector3;
  originalIndex: number;
  trail: THREE.Points | null;
  trailPositions: Float32Array | null;
  reactantIndex: number;
  currentPosition: THREE.Vector3;
}

interface ReactionBond {
  mesh: THREE.Mesh;
  fromAtomIndex: number;
  toAtomIndex: number;
  visible: boolean;
  breakProgress: number;
  reactantIndex: number;
}

interface MoleculeGroup {
  atoms: number[];
  bonds: number[];
  position: THREE.Vector3;
  rotation: number;
}

export class ReactionSimulator {
  private sceneRenderer: SceneRenderer;
  private currentReaction: ReactionData | null = null;
  private phase: ReactionPhase = 'idle';
  private isPaused = false;
  private isPlaying = false;
  private startTime = 0;
  private pauseTime = 0;
  private accumulatedPauseTime = 0;
  private phaseStartTime = 0;
  private currentPhaseElapsed = 0;

  private reactionAtoms: ReactionAtom[] = [];
  private reactionBonds: ReactionBond[] = [];
  private reactantGroups: MoleculeGroup[] = [];

  private animationFrameId: number | null = null;
  private onCompleteCallback: (() => void) | null = null;
  private onPhaseChangeCallback: ((phase: ReactionPhase) => void) | null = null;
  private onPauseChangeCallback: ((paused: boolean) => void) | null = null;

  private sparkTimers: Set<number> = new Set();
  private baseRotation: { x: number; y: number } = { x: 0, y: 0 };

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

    if (this.phase === 'idle') {
      this.setupReaction();
    }

    if (this.isPaused) {
      this.resumeReaction();
      return;
    }

    if (this.isPlaying) return;

    this.isPlaying = true;
    this.isPaused = false;
    this.startTime = performance.now();
    this.accumulatedPauseTime = 0;
    this.phaseStartTime = performance.now();
    this.currentPhaseElapsed = 0;

    this.phase = 'glow';
    this.baseRotation = { x: 0, y: 0 };

    if (this.onPhaseChangeCallback) {
      this.onPhaseChangeCallback(this.phase);
    }

    this.animate();
  }

  public pauseReaction(): void {
    if (!this.isPlaying || this.phase === 'idle' || this.phase === 'complete') return;
    if (this.isPaused) return;

    this.isPaused = true;
    this.pauseTime = performance.now();

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.onPauseChangeCallback) {
      this.onPauseChangeCallback(true);
    }
  }

  public resumeReaction(): void {
    if (!this.isPaused) return;

    this.accumulatedPauseTime += performance.now() - this.pauseTime;
    this.isPaused = false;

    if (this.onPauseChangeCallback) {
      this.onPauseChangeCallback(false);
    }

    this.animate();
  }

  public togglePause(): void {
    if (this.isPaused) {
      this.resumeReaction();
    } else {
      this.pauseReaction();
    }
  }

  public resetReaction(): void {
    this.isPlaying = false;
    this.isPaused = false;
    this.phase = 'idle';
    this.startTime = 0;
    this.pauseTime = 0;
    this.accumulatedPauseTime = 0;
    this.phaseStartTime = 0;
    this.currentPhaseElapsed = 0;

    this.sparkTimers.forEach(id => clearTimeout(id));
    this.sparkTimers.clear();

    this.clearReactionAtoms();

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.onPhaseChangeCallback) {
      this.onPhaseChangeCallback(this.phase);
    }

    if (this.onPauseChangeCallback) {
      this.onPauseChangeCallback(false);
    }
  }

  public replayReaction(): void {
    this.resetReaction();
    setTimeout(() => this.startReaction(), 100);
  }

  private setupReaction(): void {
    if (!this.currentReaction) return;

    this.clearReactionAtoms();

    const moleculeGroup = this.sceneRenderer.getMoleculeGroup();

    let atomOffset = 0;
    let bondOffset = 0;

    this.currentReaction.reactants.forEach((reactant, reactantIndex) => {
      const molecule = getMoleculeById(reactant.moleculeId);
      if (!molecule) return;

      const offset = reactant.offset;
      const offsetVec = new THREE.Vector3(offset.x, offset.y, offset.z);

      const atomIndices: number[] = [];
      const bondIndices: number[] = [];

      molecule.atoms.forEach(atom => {
        const position = new THREE.Vector3(
          atom.x + offsetVec.x,
          atom.y + offsetVec.y,
          atom.z + offsetVec.z
        );

        const atomMesh = this.createReactionAtom(atom.element, position);
        this.reactionAtoms.push({
          mesh: atomMesh,
          element: atom.element,
          startPosition: position.clone(),
          driftPosition: new THREE.Vector3(),
          endPosition: position.clone(),
          originalIndex: this.reactionAtoms.length,
          trail: null,
          trailPositions: null,
          reactantIndex,
          currentPosition: position.clone()
        });

        moleculeGroup.add(atomMesh);
        atomIndices.push(atomOffset + this.reactionAtoms.length - 1 - atomOffset);
      });

      molecule.bonds.forEach(bond => {
        const fromIdx = bond.from + atomOffset;
        const toIdx = bond.to + atomOffset;

        if (fromIdx < this.reactionAtoms.length && toIdx < this.reactionAtoms.length) {
          const fromAtom = this.reactionAtoms[fromIdx];
          const toAtom = this.reactionAtoms[toIdx];

          const bondMesh = this.createBond(fromAtom.mesh, toAtom.mesh, bond.order || 1);
          this.reactionBonds.push({
            mesh: bondMesh,
            fromAtomIndex: fromIdx,
            toAtomIndex: toIdx,
            visible: true,
            breakProgress: 0,
            reactantIndex
          });

          moleculeGroup.add(bondMesh);
          bondIndices.push(bondOffset + this.reactionBonds.length - 1 - bondOffset);
        }
      });

      this.reactantGroups.push({
        atoms: atomIndices,
        bonds: bondIndices,
        position: offsetVec.clone(),
        rotation: 0
      });

      atomOffset += molecule.atoms.length;
      bondOffset += molecule.bonds.length;
    });

    this.calculateProductPositions();
    this.calculateDriftPositions();

    this.sceneRenderer.resetView();
  }

  private createReactionAtom(element: string, position: THREE.Vector3): THREE.Mesh {
    const radius = getAtomRadius(element);
    const color = getAtomColor(element);

    const geometry = new THREE.SphereGeometry(radius, 48, 48);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.85,
      roughness: 0.15,
      emissive: color,
      emissiveIntensity: 0.05,
      envMapIntensity: 1.2,
      transparent: true,
      opacity: 1
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);

    return mesh;
  }

  private createBond(fromAtom: THREE.Mesh, toAtom: THREE.Mesh, order: number): THREE.Mesh {
    const direction = new THREE.Vector3()
      .subVectors(toAtom.position, fromAtom.position);
    const length = direction.length();

    const bondRadius = 0.07;
    const geometry = new THREE.CylinderGeometry(bondRadius, bondRadius, length, 24);
    const material = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.9,
      roughness: 0.1,
      envMapIntensity: 1.5,
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
      const midPoint = new THREE.Vector3()
        .addVectors(atom.startPosition, atom.endPosition)
        .multiplyScalar(0.5);

      const perpendicular = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize();

      const driftDistance = 2.5 + Math.random() * 1.5;
      atom.driftPosition.copy(midPoint)
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

    this.reactantGroups = [];
  }

  private animate = (): void => {
    if (this.isPaused || !this.isPlaying || !this.currentReaction) return;

    this.animationFrameId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const phaseElapsed = now - this.phaseStartTime - this.accumulatedPauseTime;
    this.currentPhaseElapsed = phaseElapsed;

    const durations = this.currentReaction.durations;

    switch (this.phase) {
      case 'glow':
        this.updateGlowPhase(phaseElapsed, durations.glow);
        if (phaseElapsed >= durations.glow) {
          this.goToNextPhase();
        }
        break;

      case 'break':
        this.updateBreakPhase(phaseElapsed, durations.break);
        if (phaseElapsed >= durations.break) {
          this.goToNextPhase();
        }
        break;

      case 'drift':
        this.updateDriftPhase(phaseElapsed, durations.drift);
        if (phaseElapsed >= durations.drift) {
          this.goToNextPhase();
        }
        break;

      case 'combine':
        this.updateCombinePhase(phaseElapsed, durations.combine);
        if (phaseElapsed >= durations.combine) {
          this.goToNextPhase();
        }
        break;
    }

    this.updateBonds();
  };

  private goToNextPhase(): void {
    if (!this.currentReaction) return;

    const phases: ReactionPhase[] = ['glow', 'break', 'drift', 'combine', 'complete'];
    const currentIndex = phases.indexOf(this.phase);

    if (currentIndex < phases.length - 1) {
      this.phase = phases[currentIndex + 1];
      this.phaseStartTime = performance.now();
      this.accumulatedPauseTime = 0;
      this.currentPhaseElapsed = 0;

      if (this.phase === 'complete') {
        this.isPlaying = false;
        if (this.animationFrameId) {
          cancelAnimationFrame(this.animationFrameId);
          this.animationFrameId = null;
        }
        if (this.onCompleteCallback) {
          this.onCompleteCallback();
        }
      }

      if (this.onPhaseChangeCallback) {
        this.onPhaseChangeCallback(this.phase);
      }
    }
  }

  private updateGlowPhase(elapsed: number, duration: number): void {
    const t = elapsed / duration;
    const glowIntensity = Math.sin(t * Math.PI) * 0.8;

    this.reactionAtoms.forEach(atom => {
      const material = atom.mesh.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.05 + glowIntensity;
    });

    const totalRotation = Math.PI * 4;
    const rotationProgress = t;

    this.reactantGroups.forEach((group, groupIndex) => {
      const groupCenter = group.position.clone();

      group.atoms.forEach(atomIdx => {
        const atom = this.reactionAtoms[atomIdx];
        if (!atom) return;

        const relativePos = new THREE.Vector3()
          .subVectors(atom.startPosition, groupCenter);

        const angle = totalRotation * rotationProgress * (groupIndex % 2 === 0 ? 1 : -1);
        const rotatedPos = relativePos.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);

        const newPos = new THREE.Vector3().addVectors(groupCenter, rotatedPos);
        atom.mesh.position.copy(newPos);
        atom.currentPosition.copy(newPos);
      });
    });
  }

  private updateBreakPhase(elapsed: number, duration: number): void {
    const t = elapsed / duration;
    const progress = easeInCubic(t);

    this.reactionBonds.forEach(bond => {
      bond.breakProgress = progress;

      const material = bond.mesh.material as THREE.MeshStandardMaterial;
      material.opacity = 1 - progress;

      if (progress > 0.2 && progress < 0.8) {
        const sparkChance = 0.15;
        if (Math.random() < sparkChance) {
          const bondPos = bond.mesh.position.clone();
          this.sceneRenderer.createSparkParticles(bondPos, 8);
        }
      }

      if (progress >= 1) {
        bond.visible = false;
        bond.mesh.visible = false;
      }
    });

    this.reactionAtoms.forEach(atom => {
      const material = atom.mesh.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.05 + (1 - progress) * 0.3;
    });
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
      atom.currentPosition.copy(atom.mesh.position);

      const material = atom.mesh.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.05;
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
      atom.currentPosition.copy(atom.mesh.position);

      this.updateAtomTrail(atom, progress);
    });

    if (progress > 0.7) {
      this.reactionBonds.forEach(bond => {
        if (bond.reactantIndex === 0) {
          const fromAtom = this.reactionAtoms[bond.fromAtomIndex];
          const toAtom = this.reactionAtoms[bond.toAtomIndex];
          if (fromAtom && toAtom) {
            const dist = fromAtom.mesh.position.distanceTo(toAtom.mesh.position);
            if (dist < 1.5) {
              bond.visible = true;
              bond.mesh.visible = true;
              const bondProgress = (1.5 - dist) / 1.5;
              const material = bond.mesh.material as THREE.MeshStandardMaterial;
              material.opacity = bondProgress;
            }
          }
        }
      });
    }
  }

  private updateAtomTrail(atom: ReactionAtom, progress: number): void {
    if (!atom.trail) {
      const trailLength = 15;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(trailLength * 3);
      const colors = new Float32Array(trailLength * 3);

      const elementColor = new THREE.Color(getAtomColor(atom.element));

      for (let i = 0; i < trailLength; i++) {
        positions[i * 3] = atom.mesh.position.x;
        positions[i * 3 + 1] = atom.mesh.position.y;
        positions[i * 3 + 2] = atom.mesh.position.z;

        const colorT = i / trailLength;
        colors[i * 3] = elementColor.r * (1 - colorT * 0.5) + 0.5;
        colors[i * 3 + 1] = elementColor.g * (1 - colorT * 0.5) + 0.5;
        colors[i * 3 + 2] = elementColor.b * (1 - colorT * 0.5) + 0.5;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size: 0.12,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      atom.trail = new THREE.Points(geometry, material);
      atom.trailPositions = positions;
      this.sceneRenderer.getMoleculeGroup().add(atom.trail);
    }

    const positions = atom.trailPositions!;
    const trailLength = positions.length / 3;

    for (let i = trailLength - 1; i > 0; i--) {
      positions[i * 3] = positions[(i - 1) * 3];
      positions[i * 3 + 1] = positions[(i - 1) * 3 + 1];
      positions[i * 3 + 2] = positions[(i - 1) * 3 + 2];
    }

    positions[0] = atom.mesh.position.x;
    positions[1] = atom.mesh.position.y;
    positions[2] = atom.mesh.position.z;

    atom.trail!.geometry.attributes.position.needsUpdate = true;

    const material = atom.trail!.material as THREE.PointsMaterial;
    const trailOpacity = Math.sin(progress * Math.PI);
    material.opacity = 0.7 * trailOpacity;
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

      const originalLength = (bond.mesh.geometry as THREE.CylinderGeometry).parameters.height;
      if (originalLength > 0) {
        bond.mesh.scale.y = length / originalLength;
      }

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

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentPhaseProgress(): number {
    if (!this.currentReaction || this.phase === 'idle' || this.phase === 'complete') return 0;

    const durations = this.currentReaction.durations;
    const duration = durations[this.phase as keyof typeof durations] as number;
    return Math.min(this.currentPhaseElapsed / duration, 1);
  }

  public setOnCompleteCallback(callback: () => void): void {
    this.onCompleteCallback = callback;
  }

  public setOnPhaseChangeCallback(callback: (phase: ReactionPhase) => void): void {
    this.onPhaseChangeCallback = callback;
  }

  public setOnPauseChangeCallback(callback: (paused: boolean) => void): void {
    this.onPauseChangeCallback = callback;
  }

  public dispose(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.sparkTimers.forEach(id => clearTimeout(id));
    this.sparkTimers.clear();

    this.clearReactionAtoms();
  }
}
