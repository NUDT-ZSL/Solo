import * as THREE from 'three';

export interface FieldLineData {
  curve: THREE.CatmullRomCurve3;
  basePoints: THREE.Vector3[];
  offsets: number[];
  frequencies: number[];
  line: THREE.Line;
  baseColorA: THREE.Color;
  baseColorB: THREE.Color;
}

export class FieldCore {
  private group: THREE.Group;
  private fieldLines: FieldLineData[] = [];
  private intensity: number = 50;
  private colorSpeed: number = 2;
  private hueOffset: number = 0;
  private time: number = 0;
  private angularVelocity: number = 0.005;
  private baseLineCount: number = 400;
  private baseNodeCount: number = 20;
  private nodeDensityMultiplier: number = 1;
  private particleDensityMultiplier: number = 1;
  private particleSizeMultiplier: number = 1;

  constructor() {
    this.group = new THREE.Group();
    this.createFieldLines();
  }

  getObject3D(): THREE.Group {
    return this.group;
  }

  getFieldLines(): FieldLineData[] {
    return this.fieldLines;
  }

  setIntensity(value: number): void {
    this.intensity = value;
  }

  setColorSpeed(value: number): void {
    this.colorSpeed = value;
  }

  getParticleDensityMultiplier(): number {
    return this.particleDensityMultiplier;
  }

  getParticleSizeMultiplier(): number {
    return this.particleSizeMultiplier;
  }

  updateWindowSize(width: number, height: number): void {
    const aspect = width / height;
    let needsRebuild = false;

    if (aspect >= 1.5) {
      const newDensity = 1.1;
      if (Math.abs(newDensity - this.particleDensityMultiplier) > 0.01) {
        this.particleDensityMultiplier = newDensity;
        this.particleSizeMultiplier = 1.0;
        needsRebuild = true;
      }
    } else if (aspect <= 0.75) {
      const newDensity = 0.9;
      if (Math.abs(newDensity - this.particleDensityMultiplier) > 0.01) {
        this.particleDensityMultiplier = newDensity;
        this.particleSizeMultiplier = 1.1;
        needsRebuild = true;
      }
    } else {
      if (Math.abs(1.0 - this.particleDensityMultiplier) > 0.01) {
        this.particleDensityMultiplier = 1.0;
        this.particleSizeMultiplier = 1.0;
        needsRebuild = true;
      }
    }

    if (needsRebuild) {
      this.rebuildFieldLines();
    }
  }

  applyPerformanceDegradation(): void {
    this.nodeDensityMultiplier *= 0.85;
    this.particleDensityMultiplier *= 0.8;
    this.rebuildFieldLines();
  }

  private rebuildFieldLines(): void {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      if (child instanceof THREE.Line) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    }
    this.fieldLines = [];
    this.createFieldLines();
  }

  private createFieldLines(): void {
    const lineCount = Math.floor(this.baseLineCount * this.particleDensityMultiplier);
    const nodeCount = Math.max(5, Math.floor(this.baseNodeCount * this.nodeDensityMultiplier));

    for (let i = 0; i < lineCount; i++) {
      const { basePoints, offsets, frequencies } = this.generateFieldLinePoints(nodeCount);
      const curve = new THREE.CatmullRomCurve3(basePoints, true);
      const curvePoints = curve.getPoints(80);
      const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);

      const colorA = new THREE.Color('#E040FB');
      const colorB = new THREE.Color('#7C4DFF');
      const colors = new Float32Array(curvePoints.length * 3);
      for (let j = 0; j < curvePoints.length; j++) {
        const t = j / (curvePoints.length - 1);
        const c = colorA.clone().lerp(colorB, t);
        colors[j * 3] = c.r;
        colors[j * 3 + 1] = c.g;
        colors[j * 3 + 2] = c.b;
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const line = new THREE.Line(geometry, material);

      this.group.add(line);
      this.fieldLines.push({
        curve,
        basePoints,
        offsets,
        frequencies,
        line,
        baseColorA: colorA,
        baseColorB: colorB
      });
    }
  }

  private generateFieldLinePoints(nodeCount: number) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const basePoints: THREE.Vector3[] = [];
    const offsets: number[] = [];
    const frequencies: number[] = [];
    const radius = 6;

    const baseX = radius * Math.sin(phi) * Math.cos(theta);
    const baseY = radius * Math.sin(phi) * Math.sin(theta);
    const baseZ = radius * Math.cos(phi);

    for (let i = 0; i < nodeCount; i++) {
      const t = (i / nodeCount) * Math.PI * 2;
      const ringRadius = 3 + Math.random() * 2;
      const offsetTheta = theta + t * 0.3;
      const offsetPhi = phi + Math.sin(t) * 0.4;

      const x = baseX * 0.3 + ringRadius * Math.sin(offsetPhi) * Math.cos(offsetTheta);
      const y = baseY * 0.3 + ringRadius * Math.sin(offsetPhi) * Math.sin(offsetTheta);
      const z = baseZ * 0.3 + ringRadius * Math.cos(offsetPhi);

      basePoints.push(new THREE.Vector3(x, y, z));
      offsets.push(Math.random() * Math.PI * 2);
      frequencies.push(1 + Math.random() * 2);
    }

    return { basePoints, offsets, frequencies };
  }

  update(deltaTime: number): void {
    this.time += deltaTime;
    this.hueOffset = (this.hueOffset + deltaTime * this.colorSpeed * 0.05) % 1;

    const intensityFactor = this.intensity / 100;
    const waveAmplitude = 0.3 * (0.5 + intensityFactor * 1.5);

    for (const fl of this.fieldLines) {
      for (let i = 0; i < fl.basePoints.length; i++) {
        const offset = fl.offsets[i];
        const freq = fl.frequencies[i];
        const wave = Math.sin(this.time * freq * Math.PI * 2 + offset) * waveAmplitude;

        const dir = fl.basePoints[i].clone().normalize();
        const newPoint = fl.basePoints[i].clone().add(dir.multiplyScalar(wave));

        (fl.curve as any).points[i].copy(newPoint);
      }
      fl.curve.updateArcLengths();

      const curvePoints = fl.curve.getPoints(80);
      const positions = (fl.line.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
      const colors = (fl.line.geometry.attributes.color as THREE.BufferAttribute).array as Float32Array;

      for (let j = 0; j < curvePoints.length; j++) {
        positions[j * 3] = curvePoints[j].x;
        positions[j * 3 + 1] = curvePoints[j].y;
        positions[j * 3 + 2] = curvePoints[j].z;

        const t = j / (curvePoints.length - 1);
        const cA = this.shiftHue(fl.baseColorA, this.hueOffset);
        const cB = this.shiftHue(fl.baseColorB, this.hueOffset + 0.3);
        const c = cA.lerp(cB, t);
        colors[j * 3] = c.r;
        colors[j * 3 + 1] = c.g;
        colors[j * 3 + 2] = c.b;
      }
      fl.line.geometry.attributes.position.needsUpdate = true;
      fl.line.geometry.attributes.color.needsUpdate = true;
    }

    this.group.rotation.y += this.angularVelocity * deltaTime * 60;
  }

  private shiftHue(color: THREE.Color, hueOffset: number): THREE.Color {
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    hsl.h = (hsl.h + hueOffset) % 1;
    if (hsl.h < 0) hsl.h += 1;
    return new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
  }

  getHueOffset(): number {
    return this.hueOffset;
  }

  getIntensityFactor(): number {
    return this.intensity / 100;
  }
}
