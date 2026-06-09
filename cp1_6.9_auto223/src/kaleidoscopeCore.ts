import * as THREE from 'three';
import { vertexShader, fragmentShader } from './shaders';

export interface RippleState {
  active: boolean;
  center: THREE.Vector2;
  radius: number;
  startTime: number;
  duration: number;
}

export interface DragState {
  offset: THREE.Vector2;
  influence: number;
  velocity: THREE.Vector2;
}

const MAX_SECTORS = 12;

export class KaleidoscopeCore {
  public mesh: THREE.Mesh;
  public geometry: THREE.BufferGeometry;
  public material: THREE.ShaderMaterial;

  private totalFragmentTarget: number = 2000;
  private baseFragmentsPerSector: number = 0;

  private symmetry: number = 6;
  private targetSymmetry: number = 6;
  private symmetryTransition: number = 1;

  private hueShift: number = 0;
  private hueShiftTarget: number = 0;

  private jitterAmount: number = 0;
  private jitterTime: number = 0;

  private splitAmount: number = 0;
  private splitCycleTime: number = 0;

  public ripple: RippleState = {
    active: false,
    center: new THREE.Vector2(),
    radius: 0,
    startTime: 0,
    duration: 1.5
  };

  public drag: DragState = {
    offset: new THREE.Vector2(),
    influence: 0,
    velocity: new THREE.Vector2()
  };

  private scaleBoost: number = 0;

  constructor(totalFragments: number = 2000) {
    this.totalFragmentTarget = Math.min(totalFragments, 3000);
    this.baseFragmentsPerSector = Math.max(40, Math.floor(this.totalFragmentTarget / MAX_SECTORS));

    this.geometry = this.createGeometry();
    this.material = this.createMaterial();
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
  }

  private createGeometry(): THREE.BufferGeometry {
    const geo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const centers: number[] = [];
    const angles: number[] = [];
    const radii: number[] = [];
    const indices: number[] = [];
    const fragmentIndices: number[] = [];
    const baseHues: number[] = [];
    const sectorIndices: number[] = [];
    const baseSectorFracs: number[] = [];

    const baseFragments: Array<{
      cx: number; cy: number; cz: number;
      angle: number; radius: number;
      hue: number;
      verts: Array<[number, number, number]>;
      fragIdx: number;
      baseFrac: number;
    }> = [];

    const maxRadius = 10;
    const baseSectorWidth = (Math.PI * 2) / MAX_SECTORS;
    const targetBaseCount = this.baseFragmentsPerSector;

    const rings = Math.max(3, Math.ceil(Math.sqrt(targetBaseCount)));
    const fragsPerRing = Math.ceil(targetBaseCount / rings);
    let globalFragIdx = 0;

    for (let ring = 0; ring < rings; ring++) {
      const ringRadius = ((ring + 0.5) / rings) * maxRadius;
      const ringFrags = Math.max(
        2,
        Math.floor(fragsPerRing * Math.max(0.4, (ring + 1) / rings))
      );
      const fragmentSize = (maxRadius / rings) * 0.75;

      for (let i = 0; i < ringFrags; i++) {
        const fracStart = (i / ringFrags) * 0.85 + 0.05;
        const fracMid = fracStart + (0.85 / ringFrags) * 0.5;
        const fragAngle = fracMid * baseSectorWidth;

        const cx = Math.cos(fragAngle) * ringRadius;
        const cy = Math.sin(fragAngle) * ringRadius;
        const cz = 0;

        const hue = (fracMid + ringRadius / maxRadius * 0.25 + ring * 0.02) % 1.0;

        const sizeVariation = 0.65 + Math.sin(ring * 2.3 + i * 1.7) * 0.35;
        const fragSize = fragmentSize * sizeVariation;

        const verts: Array<[number, number, number]> = [];
        const triRotations = [
          -Math.PI * 0.68 + ring * 0.12,
          Math.PI * 0.05 + i * 0.08,
          Math.PI * 0.68 - ring * 0.07
        ];
        const triScales = [
          0.92 + Math.sin(ring + i * 0.7) * 0.08,
          0.98 + Math.cos(ring * 0.5 + i) * 0.06,
          0.9 + Math.sin(i * 1.3 + ring * 0.8) * 0.1
        ];

        for (let v = 0; v < 3; v++) {
          const vAngle = fragAngle + triRotations[v];
          const vRad = fragSize * triScales[v];

          const px = cx + Math.cos(vAngle) * vRad;
          const py = cy + Math.sin(vAngle) * vRad;
          const pz = cz + Math.sin(ring * 1.7 + i * 2.3 + v * 1.9) * 0.08;

          verts.push([px, py, pz]);
        }

        baseFragments.push({
          cx, cy, cz,
          angle: fragAngle,
          radius: ringRadius,
          hue,
          verts,
          fragIdx: globalFragIdx++,
          baseFrac: fracMid
        });
      }
    }

    this.baseFragmentsPerSector = baseFragments.length;

    let vertexIndex = 0;
    for (let sector = 0; sector < MAX_SECTORS; sector++) {
      for (const frag of baseFragments) {
        for (let v = 0; v < 3; v++) {
          const [px, py, pz] = frag.verts[v];

          positions.push(px, py, pz);
          centers.push(frag.cx, frag.cy, frag.cz);
          angles.push(frag.angle);
          radii.push(frag.radius);
          fragmentIndices.push(frag.fragIdx);
          baseHues.push(frag.hue);
          sectorIndices.push(sector);
          baseSectorFracs.push(frag.baseFrac);
        }
        indices.push(
          vertexIndex,
          vertexIndex + 1,
          vertexIndex + 2
        );
        vertexIndex += 3;
      }
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('aCenter', new THREE.Float32BufferAttribute(centers, 3));
    geo.setAttribute('aAngle', new THREE.Float32BufferAttribute(angles, 1));
    geo.setAttribute('aRadius', new THREE.Float32BufferAttribute(radii, 1));
    geo.setAttribute('aFragmentIndex', new THREE.Float32BufferAttribute(fragmentIndices, 1));
    geo.setAttribute('aBaseHue', new THREE.Float32BufferAttribute(baseHues, 1));
    geo.setAttribute('aSectorIndex', new THREE.Float32BufferAttribute(sectorIndices, 1));
    geo.setAttribute('aBaseSectorFrac', new THREE.Float32BufferAttribute(baseSectorFracs, 1));
    geo.setIndex(indices);
    geo.computeBoundingSphere();

    return geo;
  }

  private createMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uJitterAmount: { value: 0 },
        uSplitAmount: { value: 0 },
        uSymmetry: { value: this.symmetry },
        uTargetSymmetry: { value: this.targetSymmetry },
        uSymmetryTransition: { value: this.symmetryTransition },
        uHueShift: { value: this.hueShift },
        uRippleCenter: { value: new THREE.Vector2(0, 0) },
        uRippleRadius: { value: 0 },
        uRippleActive: { value: 0 },
        uDragOffset: { value: new THREE.Vector2(0, 0) },
        uDragInfluence: { value: 0 },
        uScaleBoost: { value: 0 }
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }

  public setSymmetry(symmetry: number): void {
    if (symmetry === this.symmetry && symmetry === this.targetSymmetry) return;
    const currentEffective = this.getCurrentEffectiveSymmetry();
    this.symmetry = Math.round(currentEffective);
    this.targetSymmetry = symmetry;
    this.symmetryTransition = 0;
    this.hueShiftTarget += 0.5 + Math.random() * 0.3;
  }

  private getCurrentEffectiveSymmetry(): number {
    return this.symmetry + (this.targetSymmetry - this.symmetry) * this.symmetryTransition;
  }

  public triggerRipple(worldPos: THREE.Vector3): void {
    this.ripple.active = true;
    this.ripple.center.set(worldPos.x, worldPos.y);
    this.ripple.radius = 0;
    this.ripple.startTime = performance.now();
  }

  public applyDrag(deltaX: number, deltaY: number): void {
    const speed = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (speed < 0.001) return;
    this.drag.velocity.set(deltaX, deltaY);
    this.drag.offset.set(deltaX, deltaY).clampLength(0, 0.5);
    this.drag.influence = Math.min(1, speed * 2);
  }

  public update(deltaTime: number, elapsedTime: number): void {
    this.jitterTime += deltaTime;
    this.jitterAmount = 0.5 + 0.5 * Math.sin(this.jitterTime * (Math.PI * 2 / 5));

    this.splitCycleTime += deltaTime;
    const splitCycle = 2.0;
    const splitPhaseTime = this.splitCycleTime % splitCycle;
    if (splitPhaseTime < 1.0) {
      const t = splitPhaseTime / 1.0;
      this.splitAmount = Math.sin(t * Math.PI);
    } else {
      this.splitAmount = 0;
    }

    if (this.symmetryTransition < 1) {
      this.symmetryTransition = Math.min(1, this.symmetryTransition + deltaTime / 1.2);
    }

    const hueDiff = this.hueShiftTarget - this.hueShift;
    this.hueShift += hueDiff * Math.min(1, deltaTime / 1.2);

    if (this.ripple.active) {
      const rippleElapsed = (performance.now() - this.ripple.startTime) / 1000;
      const progress = Math.min(1, rippleElapsed / this.ripple.duration);
      this.ripple.radius = progress * this.ripple.duration * 20;

      const boostCurve = Math.sin(progress * Math.PI);
      this.scaleBoost = boostCurve * 0.12;

      if (progress >= 1) {
        this.ripple.active = false;
        this.scaleBoost = 0;
      }
    }

    if (this.drag.influence > 0) {
      this.drag.influence = Math.max(0, this.drag.influence - deltaTime / 0.3);
      this.drag.offset.multiplyScalar(0.92);
    }

    const u = this.material.uniforms;
    u.uTime.value = elapsedTime;
    u.uJitterAmount.value = this.jitterAmount;
    u.uSplitAmount.value = this.splitAmount;
    u.uSymmetry.value = this.symmetry;
    u.uTargetSymmetry.value = this.targetSymmetry;
    u.uSymmetryTransition.value = this.symmetryTransition;
    u.uHueShift.value = this.hueShift;
    u.uRippleCenter.value.copy(this.ripple.center);
    u.uRippleRadius.value = this.ripple.radius;
    u.uRippleActive.value = this.ripple.active ? 1 : 0;
    u.uDragOffset.value.copy(this.drag.offset);
    u.uDragInfluence.value = this.drag.influence;
    u.uScaleBoost.value = this.scaleBoost;
  }

  public getSymmetry(): number {
    return this.getCurrentEffectiveSymmetry();
  }

  public getTotalFragmentCount(): number {
    const effectiveSym = Math.round(this.getCurrentEffectiveSymmetry());
    return this.baseFragmentsPerSector * effectiveSym;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
