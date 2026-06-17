import * as THREE from 'three';

export interface AuroraParams {
  hue: number;
  saturation: number;
  lightness: number;
  speed: number;
  bandCount: number;
  opacity: number;
}

interface AuroraBand {
  mesh: THREE.Mesh;
  controlPoints: THREE.Vector3[];
  baseX: number;
  baseY: number;
  amplitude: number;
  frequency: number;
  phase: number;
  driftSpeed: number;
  segmentCount: number;
}

export class AuroraController {
  private scene: THREE.Scene;
  private bands: AuroraBand[] = [];
  private group: THREE.Group;
  private params: AuroraParams;
  private targetParams: AuroraParams;
  private transitionStart = 0;
  private transitionDuration = 0.5;
  private isTransitioning = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.params = {
      hue: 160,
      saturation: 100,
      lightness: 60,
      speed: 1.0,
      bandCount: 12,
      opacity: 0.6
    };
    this.targetParams = { ...this.params };

    this.createBands();
  }

  private createBands() {
    this.clearBands();
    const count = Math.round(this.params.bandCount);
    for (let i = 0; i < count; i++) {
      this.bands.push(this.createSingleBand(i, count));
    }
  }

  private clearBands() {
    for (const band of this.bands) {
      this.group.remove(band.mesh);
      band.mesh.geometry.dispose();
      (band.mesh.material as THREE.Material).dispose();
    }
    this.bands = [];
  }

  private createSingleBand(index: number, total: number): AuroraBand {
    const segmentCount = 20;
    const controlPoints: THREE.Vector3[] = [];

    const baseX = (index / total - 0.5) * 40 + (Math.random() - 0.5) * 4;
    const baseY = Math.random() * 2;

    for (let i = 0; i < segmentCount; i++) {
      const t = i / (segmentCount - 1);
      controlPoints.push(new THREE.Vector3(baseX, baseY + t * 15, 0));
    }

    const geometry = this.buildBandGeometry(controlPoints);
    const material = new THREE.MeshBasicMaterial({
      color: this.getGradientColor(0),
      transparent: true,
      opacity: this.params.opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true
    });

    const mesh = new THREE.Mesh(geometry, material);
    this.group.add(mesh);

    return {
      mesh,
      controlPoints,
      baseX,
      baseY,
      amplitude: 2 + Math.random() * 2,
      frequency: 0.2 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2,
      driftSpeed: 0.1 * (Math.random() > 0.5 ? 1 : -1),
      segmentCount
    };
  }

  private buildBandGeometry(controlPoints: THREE.Vector3[]): THREE.BufferGeometry {
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const segmentCount = controlPoints.length - 1;

    for (let i = 0; i < controlPoints.length; i++) {
      const t = i / (controlPoints.length - 1);
      const width = 0.2 + t * 0.8;
      const cp = controlPoints[i];

      const color = this.getGradientColorTHREE(t);

      positions.push(cp.x - width / 2, cp.y, cp.z);
      colors.push(color.r, color.g, color.b);

      positions.push(cp.x + width / 2, cp.y, cp.z);
      colors.push(color.r, color.g, color.b);
    }

    for (let i = 0; i < segmentCount; i++) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = i * 2 + 2;
      const d = i * 2 + 3;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    return geometry;
  }

  private getGradientColor(t: number): number {
    const hue1 = this.params.hue;
    const hue2 = this.params.hue + 40;
    const hue = hue1 + (hue2 - hue1) * t;
    const color = new THREE.Color();
    color.setHSL(hue / 360, this.params.saturation / 100, this.params.lightness / 100);
    return color.getHex();
  }

  private getGradientColorTHREE(t: number): THREE.Color {
    const hue1 = this.params.hue;
    const hue2 = this.params.hue + 40;
    const hue = hue1 + (hue2 - hue1) * t;
    const color = new THREE.Color();
    color.setHSL(hue / 360, this.params.saturation / 100, this.params.lightness / 100);
    return color;
  }

  public update(time: number, delta: number) {
    if (this.isTransitioning) {
      const elapsed = time - this.transitionStart;
      const progress = Math.min(elapsed / this.transitionDuration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      this.params.hue = this.lerp(this.params.hue, this.targetParams.hue, eased);
      this.params.saturation = this.lerp(this.params.saturation, this.targetParams.saturation, eased);
      this.params.lightness = this.lerp(this.params.lightness, this.targetParams.lightness, eased);
      this.params.speed = this.lerp(this.params.speed, this.targetParams.speed, eased);
      this.params.opacity = this.lerp(this.params.opacity, this.targetParams.opacity, eased);

      const targetCount = Math.round(this.targetParams.bandCount);
      if (targetCount !== this.bands.length && progress > 0.5) {
        this.params.bandCount = targetCount;
        this.createBands();
      }

      if (progress >= 1) {
        this.isTransitioning = false;
        this.params.bandCount = this.targetParams.bandCount;
      }
    }

    for (const band of this.bands) {
      this.updateBand(band, time);
    }
  }

  private updateBand(band: AuroraBand, time: number) {
    const speed = this.params.speed;

    for (let i = 0; i < band.controlPoints.length; i++) {
      const t = i / (band.controlPoints.length - 1);
      const wave = Math.sin(time * band.frequency * speed + band.phase + t * 3) * band.amplitude * (0.3 + t * 0.7);
      const twist = Math.sin(time * band.frequency * 0.5 * speed + band.phase * 0.7) * 1.5 * t;
      band.controlPoints[i].x = band.baseX + time * band.driftSpeed * speed + twist;
      band.controlPoints[i].y = band.baseY + t * 15 + wave;
      band.controlPoints[i].z = Math.sin(time * band.frequency * 0.3 * speed + t * 2) * 2;
    }

    this.rebuildBandGeometry(band);
    (band.mesh.material as THREE.MeshBasicMaterial).opacity = this.params.opacity;
  }

  private rebuildBandGeometry(band: AuroraBand) {
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i < band.controlPoints.length; i++) {
      const t = i / (band.controlPoints.length - 1);
      const width = 0.2 + t * 0.8;
      const cp = band.controlPoints[i];
      const color = this.getGradientColorTHREE(t);

      let dx = 0, dz = 0;
      if (i < band.controlPoints.length - 1) {
        const next = band.controlPoints[i + 1];
        dx = next.x - cp.x;
        dz = next.z - cp.z;
      } else if (i > 0) {
        const prev = band.controlPoints[i - 1];
        dx = cp.x - prev.x;
        dz = cp.z - prev.z;
      }
      const len = Math.sqrt(dx * dx + dz * dz) || 1;
      const nx = -dz / len;
      const nz = dx / len;

      positions.push(cp.x + nx * width / 2, cp.y, cp.z + nz * width / 2);
      colors.push(color.r, color.g, color.b);

      positions.push(cp.x - nx * width / 2, cp.y, cp.z - nz * width / 2);
      colors.push(color.r, color.g, color.b);
    }

    for (let i = 0; i < band.controlPoints.length - 1; i++) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = i * 2 + 2;
      const d = i * 2 + 3;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }

    const geometry = band.mesh.geometry;
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute;
    const indexAttr = geometry.getIndex() as THREE.BufferAttribute;

    if (posAttr.count !== positions.length / 3) {
      geometry.dispose();
      band.mesh.geometry = this.buildBandGeometry(band.controlPoints);
      return;
    }

    posAttr.array.set(positions);
    posAttr.needsUpdate = true;
    colorAttr.array.set(colors);
    colorAttr.needsUpdate = true;
    indexAttr.array.set(indices);
    indexAttr.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  public setParams(params: Partial<AuroraParams>, currentTime: number) {
    this.targetParams = { ...this.targetParams, ...params };
    this.transitionStart = currentTime;
    this.isTransitioning = true;
  }

  public getStatus(): { bandCount: number; mainColor: string; speed: number } {
    const color = new THREE.Color();
    color.setHSL(this.params.hue / 360, this.params.saturation / 100, this.params.lightness / 100);
    const hex = '#' + color.getHexString().toUpperCase();
    return {
      bandCount: this.bands.length,
      mainColor: hex,
      speed: Math.round(this.params.speed * 10) / 10
    };
  }

  public getParams(): AuroraParams {
    return { ...this.params };
  }
}
