import * as THREE from 'three';
import type { Star } from './starData';

export interface ReliefParams {
  rippleCount: number;
  baseCurvature: number;
  bumpScale: number;
  colorTempShift: number;
  rotationSpeed: number;
  autoRotate: boolean;
  starDensity: number;
}

interface StarVisual {
  group: THREE.Group;
  bump: THREE.Mesh;
  ripples: THREE.Mesh[];
  baseHeight: number;
  baseRadius: number;
  baseColor: THREE.Color;
  distanceFromCenter: number;
}

const SPECTRAL_COLORS: Record<string, THREE.Color> = {
  O: new THREE.Color(0x9bb0ff),
  B: new THREE.Color(0xaabfff),
  A: new THREE.Color(0xcad7ff),
  F: new THREE.Color(0xf8f7ff),
  G: new THREE.Color(0xfff4ea),
  K: new THREE.Color(0xffd2a1),
  M: new THREE.Color(0xff8040)
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function spectralToColor(spectralType: string, tempShift: number): THREE.Color {
  const key = (spectralType || 'G').charAt(0).toUpperCase();
  const base = SPECTRAL_COLORS[key] || SPECTRAL_COLORS.G;
  const result = base.clone();
  if (tempShift !== 0) {
    const hsl = { h: 0, s: 0, l: 0 };
    result.getHSL(hsl);
    hsl.h = clamp(hsl.h + tempShift * 0.15, 0, 1);
    result.setHSL(hsl.h, hsl.s, hsl.l);
  }
  return result;
}

function magnitudeToHeight(mag: number): number {
  const normalized = clamp((7 - mag) / 8, 0.1, 1);
  return 0.25 + normalized * 1.4;
}

function magnitudeToRadius(mag: number): number {
  const normalized = clamp((7 - mag) / 8, 0.15, 1);
  return 0.12 + normalized * 0.38;
}

function raDecToPosition(ra: number, dec: number): { x: number; z: number } {
  const x = (ra - 3.0) * 1.8;
  const z = -dec * 12;
  return { x: clamp(x, -6, 6), z: clamp(z, -6, 6) };
}

export class ReliefScene {
  public readonly scene: THREE.Scene;
  public readonly rootGroup: THREE.Group;

  private stars: Star[] = [];
  private starVisuals: StarVisual[] = [];
  private basePlane!: THREE.Mesh;
  private backgroundStars!: THREE.Points;
  private ambientLight!: THREE.AmbientLight;
  private keyLight!: THREE.DirectionalLight;
  private fillLight!: THREE.DirectionalLight;
  private rimLight!: THREE.DirectionalLight;

  private params: ReliefParams = {
    rippleCount: 6,
    baseCurvature: 0,
    bumpScale: 1,
    colorTempShift: 0,
    rotationSpeed: 1,
    autoRotate: true,
    starDensity: 80
  };

  private highlightedIndex: number = -1;
  private transitionActive: boolean = false;
  private transitionStartTime: number = 0;
  private prevParams: ReliefParams;
  private transitionDuration: number = 300;

  private bumpGeometry: THREE.SphereGeometry;
  private rippleGeometry: THREE.TorusGeometry;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);
    this.prevParams = { ...this.params };

    this.bumpGeometry = new THREE.SphereGeometry(1, 32, 24);
    this.rippleGeometry = new THREE.TorusGeometry(1, 0.012, 8, 96);

    this.setupLighting();
    this.setupBasePlane();
    this.setupBackgroundStars();
  }

  private setupLighting(): void {
    this.ambientLight = new THREE.AmbientLight(0x4A0066, 0.55);
    this.rootGroup.add(this.ambientLight);

    this.keyLight = new THREE.DirectionalLight(0xE0F0FF, 1.1);
    this.keyLight.position.set(5, 8, 5);
    this.rootGroup.add(this.keyLight);

    this.fillLight = new THREE.DirectionalLight(0x8844AA, 0.35);
    this.fillLight.position.set(-6, 3, -4);
    this.rootGroup.add(this.fillLight);

    this.rimLight = new THREE.DirectionalLight(0xFF66AA, 0.3);
    this.rimLight.position.set(0, 5, -7);
    this.rootGroup.add(this.rimLight);
  }

  private setupBasePlane(): void {
    const geometry = new THREE.CircleGeometry(7.2, 64);
    const material = new THREE.MeshPhongMaterial({
      color: 0x180030,
      specular: 0x440066,
      shininess: 18,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide
    });
    this.basePlane = new THREE.Mesh(geometry, material);
    this.basePlane.rotation.x = -Math.PI / 2;
    this.basePlane.position.y = 0;
    this.rootGroup.add(this.basePlane);
  }

  private setupBackgroundStars(): void {
    const count = 200;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const r = 20 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const shade = 0.6 + Math.random() * 0.4;
      const tint = Math.random();
      colors[i * 3] = shade * (0.7 + tint * 0.3);
      colors[i * 3 + 1] = shade * (0.6 + tint * 0.2);
      colors[i * 3 + 2] = shade;
    }

    const bgGeo = new THREE.BufferGeometry();
    bgGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    bgGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const bgMat = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });

    this.backgroundStars = new THREE.Points(bgGeo, bgMat);
    this.scene.add(this.backgroundStars);
  }

  public setStars(stars: Star[]): void {
    this.clearStars();
    this.stars = stars;
    this.buildStarVisuals();
  }

  private clearStars(): void {
    for (const sv of this.starVisuals) {
      this.rootGroup.remove(sv.group);
      sv.ripples.forEach(r => {
        (r.material as THREE.Material).dispose();
      });
      (sv.bump.material as THREE.Material).dispose();
    }
    this.starVisuals = [];
  }

  private buildStarVisuals(): void {
    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];
      const { x, z } = raDecToPosition(star.ra, star.dec);
      const distFromCenter = Math.sqrt(x * x + z * z);

      const group = new THREE.Group();
      group.position.set(x, 0, z);

      const baseHeight = magnitudeToHeight(star.magnitude);
      const baseRadius = magnitudeToRadius(star.magnitude);
      const baseColor = spectralToColor(star.spectralType, this.params.colorTempShift);

      const bumpMat = new THREE.MeshPhongMaterial({
        color: baseColor.clone(),
        specular: 0xE0F0FF,
        shininess: 85,
        transparent: true,
        opacity: 0.96
      });
      const bump = new THREE.Mesh(this.bumpGeometry, bumpMat);
      bump.scale.set(baseRadius, baseHeight * this.params.bumpScale, baseRadius);
      bump.position.y = baseHeight * this.params.bumpScale * 0.5;
      bump.userData.starIndex = i;
      group.add(bump);

      const ripples: THREE.Mesh[] = [];
      for (let r = 0; r < this.params.rippleCount; r++) {
        const rippleMat = new THREE.MeshPhongMaterial({
          color: baseColor.clone(),
          specular: 0xE0F0FF,
          shininess: 60,
          transparent: true,
          opacity: 0.5 - r * (0.35 / Math.max(1, this.params.rippleCount)),
          side: THREE.DoubleSide
        });
        const ripple = new THREE.Mesh(this.rippleGeometry, rippleMat);
        ripple.rotation.x = -Math.PI / 2;
        const radius = baseRadius * (1.8 + r * 0.7);
        ripple.scale.set(radius, radius, 1);
        ripple.position.y = 0.01 + r * 0.003;
        ripples.push(ripple);
        group.add(ripple);
      }

      this.rootGroup.add(group);
      this.starVisuals.push({
        group,
        bump,
        ripples,
        baseHeight,
        baseRadius,
        baseColor: baseColor.clone(),
        distanceFromCenter: distFromCenter
      });
    }
  }

  public updateParams(params: Partial<ReliefParams>): void {
    this.prevParams = { ...this.params };
    this.params = { ...this.params, ...params };

    if (params.rippleCount !== undefined && params.rippleCount !== this.prevParams.rippleCount) {
      const savedStars = this.stars.slice();
      this.clearStars();
      this.stars = savedStars;
      this.buildStarVisuals();
      return;
    }

    this.transitionActive = true;
    this.transitionStartTime = performance.now();
  }

  public getParams(): ReliefParams {
    return { ...this.params };
  }

  public highlightStar(index: number): void {
    if (this.highlightedIndex === index) return;
    if (this.highlightedIndex >= 0 && this.highlightedIndex < this.starVisuals.length) {
      const prev = this.starVisuals[this.highlightedIndex].bump.material as THREE.MeshPhongMaterial;
      prev.emissive.setHex(0x000000);
      prev.emissiveIntensity = 0;
    }
    this.highlightedIndex = index;
    if (index >= 0 && index < this.starVisuals.length) {
      const curr = this.starVisuals[index].bump.material as THREE.MeshPhongMaterial;
      curr.emissive.copy(curr.color);
      curr.emissiveIntensity = 0.3;
    }
  }

  public getStarWorldPosition(index: number): THREE.Vector3 | null {
    if (index < 0 || index >= this.starVisuals.length) return null;
    const sv = this.starVisuals[index];
    const pos = new THREE.Vector3();
    sv.bump.getWorldPosition(pos);
    pos.y += sv.baseHeight * this.params.bumpScale * 0.5;
    return pos;
  }

  public getStar(index: number): Star | null {
    if (index < 0 || index >= this.stars.length) return null;
    return this.stars[index];
  }

  public getBumpMeshes(): THREE.Mesh[] {
    return this.starVisuals.map(sv => sv.bump);
  }

  public animate(elapsed: number, userIsInteracting: boolean): void {
    const autoRot = this.params.autoRotate && !userIsInteracting;
    if (autoRot) {
      const period = 30000 / Math.max(0.05, this.params.rotationSpeed);
      this.rootGroup.rotation.y = (elapsed / period) * Math.PI * 2;
    }

    if (this.transitionActive) {
      this.updateTransition();
    }

    for (let i = 0; i < this.starVisuals.length; i++) {
      const sv = this.starVisuals[i];
      const t = performance.now() * 0.001 + i * 0.7;
      for (let r = 0; r < sv.ripples.length; r++) {
        const ripple = sv.ripples[r];
        const pulse = 1 + Math.sin(t * 0.8 + r * 0.4) * 0.03;
        const baseScale = sv.baseRadius * (1.8 + r * 0.7);
        ripple.scale.set(baseScale * pulse, baseScale * pulse, 1);
      }
    }
  }

  private updateTransition(): void {
    const now = performance.now();
    const elapsed = now - this.transitionStartTime;
    if (elapsed >= this.transitionDuration) {
      this.applyParamsInstant(this.params);
      this.transitionActive = false;
      return;
    }
    const maxDist = 8.5;
    for (const sv of this.starVisuals) {
      const delayRatio = sv.distanceFromCenter / maxDist;
      const localStart = this.transitionStartTime + delayRatio * this.transitionDuration * 0.5;
      const localElapsed = now - localStart;
      if (localElapsed <= 0) continue;
      const t = clamp(localElapsed / (this.transitionDuration * 0.5), 0, 1);
      const eased = t * t * (3 - 2 * t);
      const bumpScale = lerp(this.prevParams.bumpScale, this.params.bumpScale, eased);
      sv.bump.scale.set(sv.baseRadius, sv.baseHeight * bumpScale, sv.baseRadius);
      sv.bump.position.y = sv.baseHeight * bumpScale * 0.5;
      const colorShift = lerp(this.prevParams.colorTempShift, this.params.colorTempShift, eased);
      const star = this.stars[this.starVisuals.indexOf(sv)];
      if (star) {
        const newColor = spectralToColor(star.spectralType, colorShift);
        (sv.bump.material as THREE.MeshPhongMaterial).color.copy(newColor);
        for (const ripple of sv.ripples) {
          (ripple.material as THREE.MeshPhongMaterial).color.copy(newColor);
        }
      }
    }
    this.applyBaseCurvature(
      lerp(this.prevParams.baseCurvature, this.params.baseCurvature, clamp(elapsed / this.transitionDuration, 0, 1))
    );
    this.applyStarDensity(
      Math.round(lerp(this.prevParams.starDensity, this.params.starDensity, clamp(elapsed / this.transitionDuration, 0, 1)))
    );
  }

  private applyParamsInstant(params: ReliefParams): void {
    for (let i = 0; i < this.starVisuals.length; i++) {
      const sv = this.starVisuals[i];
      const star = this.stars[i];
      sv.bump.scale.set(sv.baseRadius, sv.baseHeight * params.bumpScale, sv.baseRadius);
      sv.bump.position.y = sv.baseHeight * params.bumpScale * 0.5;
      const color = spectralToColor(star.spectralType, params.colorTempShift);
      (sv.bump.material as THREE.MeshPhongMaterial).color.copy(color);
      for (const ripple of sv.ripples) {
        (ripple.material as THREE.MeshPhongMaterial).color.copy(color);
      }
    }
    this.applyBaseCurvature(params.baseCurvature);
    this.applyStarDensity(params.starDensity);
  }

  private applyBaseCurvature(curvature: number): void {
    this.basePlane.position.y = 0;
    if (Math.abs(curvature) < 0.001) {
      this.basePlane.rotation.x = -Math.PI / 2;
      this.basePlane.scale.set(1, 1, 1);
      return;
    }
    const baseMat = this.basePlane.material as THREE.MeshPhongMaterial;
    const geo = this.basePlane.geometry as THREE.CircleGeometry;
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const vz = posAttr.getZ(i);
      const dist = Math.sqrt(vx * vx + vz * vz);
      const newY = vy - curvature * dist * dist * 0.18;
      posAttr.setY(i, newY);
    }
    posAttr.needsUpdate = true;
    geo.computeVertexNormals();
    void baseMat;
  }

  private applyStarDensity(count: number): void {
    const posAttr = this.backgroundStars.geometry.attributes.position as THREE.BufferAttribute;
    const colAttr = this.backgroundStars.geometry.attributes.color as THREE.BufferAttribute;
    const total = posAttr.count;
    const visible = Math.min(count, total);
    for (let i = 0; i < total; i++) {
      const alpha = i < visible ? 0.7 + Math.random() * 0.3 : 0;
      colAttr.setXYZ(i,
        (colAttr.getX(i) || 1) * (i < visible ? 1 : 0.001),
        (colAttr.getY(i) || 1) * (i < visible ? 1 : 0.001),
        (colAttr.getZ(i) || 1) * (i < visible ? 1 : 0.001)
      );
      void alpha;
    }
    (this.backgroundStars.material as THREE.PointsMaterial).opacity = visible > 0 ? 0.85 : 0;
    colAttr.needsUpdate = true;
  }

  public resizeBackgroundStars(count: number): void {
    this.scene.remove(this.backgroundStars);
    this.backgroundStars.geometry.dispose();
    (this.backgroundStars.material as THREE.Material).dispose();

    const total = Math.max(200, count);
    const positions = new Float32Array(total * 3);
    const colors = new Float32Array(total * 3);

    for (let i = 0; i < total; i++) {
      const r = 20 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const shade = 0.6 + Math.random() * 0.4;
      const tint = Math.random();
      colors[i * 3] = shade * (0.7 + tint * 0.3);
      colors[i * 3 + 1] = shade * (0.6 + tint * 0.2);
      colors[i * 3 + 2] = shade;
    }

    const bgGeo = new THREE.BufferGeometry();
    bgGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    bgGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const bgMat = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });

    this.backgroundStars = new THREE.Points(bgGeo, bgMat);
    this.scene.add(this.backgroundStars);
    this.params.starDensity = count;
  }
}
