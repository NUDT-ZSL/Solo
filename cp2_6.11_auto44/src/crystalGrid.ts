import * as THREE from 'three';

export interface CrystalAttributes {
  row: number;
  col: number;
  basePosition: THREE.Vector3;
  distanceFromCenter: number;
  warmColor: THREE.Color;
  coolColor: THREE.Color;
  staticTopColor: THREE.Color;
  breathPhase: number;
  breathPeriod: number;
  colorPhase: number;
  colorPeriod: number;
  rotationSpeed: number;
  rotationDirection: 1 | -1;
  floatOffset: number;
  centerWarmT: number;
  invColNorm: number;
  colNorm: number;
  centerT: number;
}

export interface InteractionState {
  hoverIndex: number | null;
  selectedIndex: number | null;
  distortLeft: number;
  distortRight: number;
  distortUp: number;
  distortDown: number;
}

const CRYSTAL_HEIGHT = 0.8;
const CRYSTAL_RADIUS = 0.3;
const CRYSTAL_SPACING = 0.5;

const BREATH_MIN = 0.9;
const BREATH_MAX = 1.2;
const SELF_ROTATION_SPEED_MIN = 0.01;
const SELF_ROTATION_SPEED_MAX = 0.03;

const HOVER_TWEEN = 0.3;
const RESONANCE_TWEEN = 0.2;
const DISTORT_TWEEN = 0.5;
const RECOVER_TWEEN = 0.8;

const WAVE_ANGLE_MAX = THREE.MathUtils.degToRad(15);
const HEIGHT_CENTER_MAX = 2.0;
const HEIGHT_OUTER_MIN = 0.7;

const HALO_RADIUS = 1.2;

const WARM_COLOR_START = new THREE.Color('#FF6F00');
const WARM_COLOR_END = new THREE.Color('#FFAB00');
const COOL_COLOR_START = new THREE.Color('#00BCD4');
const COOL_COLOR_END = new THREE.Color('#00E5FF');
const HOVER_COLOR = new THREE.Color('#FFFFFF');
const SELECTED_COLOR = new THREE.Color('#76FF03');
const BASE_BOTTOM_COLOR = new THREE.Color('#1A237E');

type HoverEffectMap = Map<number, { progress: number; type: 'hover' | 'resonance'; tween: number; state: 'in' | 'out' }>;

export class CrystalGrid {
  public readonly group: THREE.Group;
  public crystals: THREE.Mesh[] = [];
  public haloLight: THREE.PointLight | null = null;
  public haloIndex: number = -1;
  public rings: (THREE.Mesh | null)[] = [];
  public attributes: CrystalAttributes[] = [];
  public hoverEffect: HoverEffectMap = new Map();

  public gridSize: number = 15;
  private baseGeometry: THREE.CylinderGeometry | null = null;
  private ringGeometry: THREE.TorusGeometry | null = null;
  private meshToIndex: WeakMap<THREE.Object3D, number> = new WeakMap();

  private distortTargets = { left: 0, right: 0, up: 0, down: 0 };
  private distortValues = { left: 0, right: 0, up: 0, down: 0 };

  private tmpColorA: THREE.Color = new THREE.Color();
  private tmpColorB: THREE.Color = new THREE.Color();
  private tmpPos: THREE.Vector3 = new THREE.Vector3();
  private elapsedSeconds: number = 0;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'CrystalGrid';
  }

  public build(gridSize: number): void {
    this.disposeInternal();
    this.gridSize = gridSize;

    this.baseGeometry = new THREE.CylinderGeometry(
      CRYSTAL_RADIUS,
      CRYSTAL_RADIUS,
      CRYSTAL_HEIGHT,
      6,
      1,
      false
    );
    this.baseGeometry.translate(0, CRYSTAL_HEIGHT / 2, 0);
    this.addVertexNoise(this.baseGeometry);

    this.ringGeometry = new THREE.TorusGeometry(CRYSTAL_RADIUS * 1.8, 0.035, 8, 64);
    this.ringGeometry.rotateX(Math.PI / 2);

    this.haloLight = new THREE.PointLight(0xffffff, 0, HALO_RADIUS * 2, 2);
    this.haloLight.distance = HALO_RADIUS * 2;
    this.haloLight.visible = false;
    this.group.add(this.haloLight);
    this.haloIndex = -1;

    const step = CRYSTAL_RADIUS * 2 + CRYSTAL_SPACING;
    const offset = -(gridSize - 1) * step / 2;
    const centerIdx = (gridSize - 1) / 2;
    const maxDist = Math.sqrt(centerIdx * centerIdx + centerIdx * centerIdx) || 1;
    const denom = gridSize > 1 ? gridSize - 1 : 1;

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const index = r * gridSize + c;
        const x = offset + c * step;
        const z = offset + r * step;

        const dx = c - centerIdx;
        const dz = r - centerIdx;
        const distNorm = Math.sqrt(dx * dx + dz * dz) / maxDist;

        const warmT = Math.random() * 0.7 + 0.3;
        const coolT = Math.random() * 0.7 + 0.3;
        const warmColor = new THREE.Color().lerpColors(WARM_COLOR_START, WARM_COLOR_END, warmT);
        const coolColor = new THREE.Color().lerpColors(COOL_COLOR_START, COOL_COLOR_END, coolT);

        const centerWarmT = THREE.MathUtils.clamp(1 - distNorm, 0, 1);
        const staticTopColor = new THREE.Color().lerpColors(coolColor, warmColor, centerWarmT);
        const colNorm = c / denom;
        const invColNorm = 1 - colNorm;
        const centerT = 1 - Math.abs(distNorm * 2 - 1);

        const attributes: CrystalAttributes = {
          row: r,
          col: c,
          basePosition: new THREE.Vector3(x, 0, z),
          distanceFromCenter: distNorm,
          warmColor,
          coolColor,
          staticTopColor,
          breathPhase: Math.random() * Math.PI * 2,
          breathPeriod: 1.5 + Math.random() * 1.5,
          colorPhase: Math.random() * Math.PI * 2,
          colorPeriod: 2 + Math.random() * 2,
          rotationSpeed: SELF_ROTATION_SPEED_MIN + Math.random() * (SELF_ROTATION_SPEED_MAX - SELF_ROTATION_SPEED_MIN),
          rotationDirection: Math.random() > 0.5 ? 1 : -1,
          floatOffset: Math.random() * Math.PI * 2,
          centerWarmT,
          invColNorm,
          colNorm,
          centerT,
        };
        this.attributes.push(attributes);

        const material = this.createCrystalMaterial(distNorm);
        material.color.copy(staticTopColor);
        material.emissive.copy(staticTopColor);
        const mesh = new THREE.Mesh(this.baseGeometry, material);
        mesh.position.copy(attributes.basePosition);
        mesh.userData.crystalIndex = index;
        this.meshToIndex.set(mesh, index);
        this.crystals.push(mesh);
        this.group.add(mesh);

        this.rings.push(null);
      }
    }
  }

  public rebuildForSize(gridSize: number): void {
    this.build(gridSize);
  }

  public getCrystalIndexFromMesh(mesh: THREE.Mesh): number {
    const idx = this.meshToIndex.get(mesh);
    return idx !== undefined ? idx : -1;
  }

  public getAdjacentIndices(index: number): number[] {
    const r = Math.floor(index / this.gridSize);
    const c = index % this.gridSize;
    const result: number[] = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < this.gridSize && nc >= 0 && nc < this.gridSize) {
          result.push(nr * this.gridSize + nc);
        }
      }
    }
    return result;
  }

  public triggerHover(index: number): void {
    for (const [idx, effect] of this.hoverEffect) {
      this.hoverEffect.set(idx, { ...effect, state: 'out' });
    }
    this.hoverEffect.set(index, { progress: 0, type: 'hover', tween: HOVER_TWEEN, state: 'in' });
    const adjacents = this.getAdjacentIndices(index);
    for (const adj of adjacents) {
      if (!this.hoverEffect.has(adj)) {
        this.hoverEffect.set(adj, { progress: 0, type: 'resonance', tween: RESONANCE_TWEEN, state: 'in' });
      }
    }
    this.haloIndex = index;
    if (this.haloLight) {
      this.haloLight.visible = true;
      this.haloLight.intensity = 0;
      this.haloLight.color.copy(HOVER_COLOR);
      const attr = this.attributes[index];
      if (attr) {
        this.haloLight.position.set(attr.basePosition.x, CRYSTAL_HEIGHT * 1.2, attr.basePosition.z);
      }
    }
  }

  public clearHoverEffects(): void {
    for (const [idx, effect] of this.hoverEffect) {
      this.hoverEffect.set(idx, { ...effect, state: 'out' });
    }
    if (this.haloLight) {
      this.haloLight.visible = false;
      this.haloLight.intensity = 0;
    }
    this.haloIndex = -1;
  }

  public selectCrystal(index: number | null): void {
    for (let i = 0; i < this.rings.length; i++) {
      const ring = this.rings[i];
      if (ring) {
        this.group.remove(ring);
        (ring.material as THREE.Material).dispose();
        this.rings[i] = null;
      }
    }
    if (index !== null && index >= 0 && index < this.crystals.length) {
      const ringMat = new THREE.MeshBasicMaterial({
        color: SELECTED_COLOR,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(this.ringGeometry!, ringMat);
      const attr = this.attributes[index];
      ring.position.copy(attr.basePosition);
      ring.position.y += CRYSTAL_HEIGHT * 1.1;
      this.rings[index] = ring;
      this.group.add(ring);
    }
  }

  public setDistortTargets(left: number, right: number, up: number, down: number): void {
    this.distortTargets.left = left;
    this.distortTargets.right = right;
    this.distortTargets.up = up;
    this.distortTargets.down = down;
  }

  public update(dt: number, _state: InteractionState): void {
    this.elapsedSeconds += dt;
    this.updateDistortValues(dt);

    const { left, right, up, down } = this.distortValues;
    const hasLeft = left > 0.001;
    const hasRight = right > 0.001;
    const hasUp = up > 0.001;
    const hasDown = down > 0.001;
    const PI2 = Math.PI * 2;
    void HEIGHT_CENTER_MAX;

    for (let i = 0; i < this.crystals.length; i++) {
      const mesh = this.crystals[i];
      const attr = this.attributes[i];

      const breathAngle = attr.breathPhase + (this.elapsedSeconds / attr.breathPeriod) * PI2;
      const breath = (Math.sin(breathAngle) + 1) * 0.5;
      const breathScale = BREATH_MIN + breath * (BREATH_MAX - BREATH_MIN);

      let hoverScale = 0;
      let hoverEasedP = 0;
      const hoverEffect = this.hoverEffect.get(i);
      const isHover = hoverEffect !== undefined && hoverEffect.type === 'hover';
      const isResonance = hoverEffect !== undefined && hoverEffect.type === 'resonance';
      if (hoverEffect) {
        const speed = hoverEffect.state === 'in' ? 1 / hoverEffect.tween : 1 / (hoverEffect.tween * 1.2);
        hoverEffect.progress += hoverEffect.state === 'in' ? dt * speed : -dt * speed;
        if (hoverEffect.progress >= 1) hoverEffect.progress = 1;
        if (hoverEffect.progress <= 0) {
          this.hoverEffect.delete(i);
          hoverScale = 0;
        } else {
          const t = hoverEffect.progress;
          const eased = 1 - (1 - t) * (1 - t) * (1 - t);
          hoverEasedP = eased;
          if (isHover) {
            hoverScale = eased * 0.6;
          } else if (isResonance) {
            hoverScale = eased * 0.1;
          }
        }
      }

      let baseHeightMult = 1 + hoverScale;

      if (hasUp) {
        const centerFactor = attr.centerT;
        const outerFactor = 1 - centerFactor;
        const centerExp = HEIGHT_CENTER_MAX;
        const outerComp = HEIGHT_OUTER_MIN;
        const targetHeight = outerComp * outerFactor + centerExp * centerFactor;
        baseHeightMult = THREE.MathUtils.lerp(baseHeightMult, targetHeight, up);
      }
      if (hasDown) {
        const centerFactor = attr.centerT;
        const outerFactor = 1 - centerFactor;
        const centerComp = HEIGHT_OUTER_MIN;
        const outerExp = 1.0;
        const targetHeight = outerExp * outerFactor + centerComp * centerFactor;
        baseHeightMult = THREE.MathUtils.lerp(baseHeightMult, targetHeight, down);
      }

      let tiltX = 0;
      let tiltZ = 0;
      if (hasLeft) {
        tiltX = attr.invColNorm * WAVE_ANGLE_MAX * left;
        tiltZ = -attr.invColNorm * WAVE_ANGLE_MAX * left * 0.3;
      }
      if (hasRight) {
        tiltX = -attr.colNorm * WAVE_ANGLE_MAX * right;
        tiltZ = attr.colNorm * WAVE_ANGLE_MAX * right * 0.3;
      }

      const finalHeightMult = baseHeightMult * breathScale;

      mesh.scale.setScalar(finalHeightMult);
      mesh.rotation.y += attr.rotationSpeed * attr.rotationDirection * dt;
      mesh.rotation.x = tiltX;
      mesh.rotation.z = tiltZ;

      const floatAngle = attr.floatOffset + this.elapsedSeconds * 0.25 * PI2;
      const floatY = Math.sin(floatAngle) * 0.03 * attr.distanceFromCenter;
      mesh.position.set(
        attr.basePosition.x,
        attr.basePosition.y + floatY,
        attr.basePosition.z
      );

      const mat = mesh.material as THREE.MeshStandardMaterial;
      const isSelected = _state.selectedIndex === i;

      if (isSelected) {
        const ring = this.rings[i];
        if (ring) {
          ring.rotation.y += dt * 2.0;
          ring.position.y = attr.basePosition.y + CRYSTAL_HEIGHT * finalHeightMult * 1.1;
          ring.scale.setScalar(1 + Math.sin(this.elapsedSeconds * 3) * 0.05);
        }
        mat.color.copy(SELECTED_COLOR);
        mat.emissive.copy(SELECTED_COLOR);
        mat.emissiveIntensity = 0.6;
      } else if (isHover && hoverEasedP > 0) {
        const colorAngle = attr.colorPhase + (this.elapsedSeconds / attr.colorPeriod) * PI2;
        const colorT = (Math.sin(colorAngle) + 1) * 0.5;
        this.tmpColorA.copy(attr.coolColor).lerp(attr.warmColor, colorT);
        this.tmpColorB.copy(this.tmpColorA).lerp(HOVER_COLOR, hoverEasedP);
        mat.color.copy(this.tmpColorB);
        mat.emissive.copy(HOVER_COLOR);
        mat.emissiveIntensity = 0.3 + hoverEasedP * 0.7;
        if (this.haloLight && this.haloIndex === i) {
          this.haloLight.intensity = hoverEasedP * 2.5;
          this.tmpPos.set(
            attr.basePosition.x,
            attr.basePosition.y + CRYSTAL_HEIGHT * finalHeightMult * 1.2,
            attr.basePosition.z
          );
          this.haloLight.position.copy(this.tmpPos);
        }
      } else {
        const colorAngle = attr.colorPhase + (this.elapsedSeconds / attr.colorPeriod) * PI2;
        const colorT = (Math.sin(colorAngle) + 1) * 0.5;
        this.tmpColorA.copy(attr.coolColor).lerp(attr.warmColor, colorT);
        this.tmpColorB.copy(attr.staticTopColor).lerp(this.tmpColorA, 0.35);
        mat.color.copy(this.tmpColorB);
        mat.emissive.copy(this.tmpColorB);
        mat.emissiveIntensity = 0.3;
      }
    }
    void _state;
    void BASE_BOTTOM_COLOR;
  }

  private updateDistortValues(dt: number): void {
    const keys: ('left' | 'right' | 'up' | 'down')[] = ['left', 'right', 'up', 'down'];
    for (const k of keys) {
      const target = this.distortTargets[k];
      const cur = this.distortValues[k];
      const speed = target > cur ? 1 / DISTORT_TWEEN : 1 / RECOVER_TWEEN;
      this.distortValues[k] = THREE.MathUtils.damp(cur, target, speed, dt);
    }
  }

  private addVertexNoise(geometry: THREE.BufferGeometry): void {
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const vertex = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      vertex.fromBufferAttribute(pos, i);
      const noise = (Math.random() - 0.5) * 0.008;
      vertex.x += noise;
      vertex.z += noise;
      vertex.y += (Math.random() - 0.5) * 0.015;
      pos.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  private createCrystalMaterial(distNorm: number): THREE.MeshStandardMaterial {
    const roughness = 0.4 + distNorm * 0.2;
    const metalness = 0.15 + (1 - distNorm) * 0.15;
    return new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x000000,
      emissiveIntensity: 0.3,
      roughness,
      metalness,
      flatShading: true,
      transparent: false,
    });
  }

  private disposeInternal(): void {
    for (let i = this.group.children.length - 1; i >= 0; i--) {
      const obj = this.group.children[i];
      this.group.remove(obj);
    }
    for (const mesh of this.crystals) {
      (mesh.material as THREE.Material).dispose();
    }
    for (const ring of this.rings) {
      if (ring) (ring.material as THREE.Material).dispose();
    }
    if (this.baseGeometry) this.baseGeometry.dispose();
    if (this.ringGeometry) this.ringGeometry.dispose();
    this.haloLight = null;
    this.crystals = [];
    this.rings = [];
    this.attributes = [];
    this.hoverEffect.clear();
    this.meshToIndex = new WeakMap();
    this.haloIndex = -1;
    this.elapsedSeconds = 0;
  }

  public dispose(): void {
    this.disposeInternal();
  }
}
