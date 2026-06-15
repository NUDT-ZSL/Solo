import * as THREE from 'three';

export interface ParticleData {
  lineIndex: number;
  t: number;
  speed: number;
  trailPositions: THREE.Vector3[];
  highlightAmount: number;
  targetHighlight: number;
}

export interface ShockWave {
  position: THREE.Vector3;
  radius: number;
  maxRadius: number;
  alpha: number;
  life: number;
}

export class MagneticField {
  scene: THREE.Scene;
  particleCount: number;
  lineCount: number;
  particlesPerLine: number;

  particles!: THREE.Points;
  particlePositions!: Float32Array;
  particleColors!: Float32Array;
  particleSizes!: Float32Array;
  particleData: ParticleData[] = [];

  trailMeshes: THREE.Line[] = [];

  shockWaves: ShockWave[] = [];
  shockWaveMeshes: THREE.Mesh[] = [];

  stars!: THREE.Points;
  starCount: number = 100;

  northPole: THREE.Vector3 = new THREE.Vector3(0, 2.5, 0);
  southPole: THREE.Vector3 = new THREE.Vector3(0, -2.5, 0);

  fieldStrength: number = 0.5;
  fieldTime: number = 0;
  fieldPeriod: number = 10;

  baseSpeed: number = 0.5;
  currentSpeed: number = 0.5;
  baseSize: number = 3.5;
  currentSize: number = 3.5;

  particleTexture!: THREE.Texture;
  glowTexture!: THREE.Texture;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.lineCount = 60;
    this.particlesPerLine = 30;
    this.particleCount = this.lineCount * this.particlesPerLine;
  }

  init(): void {
    this.createParticleTexture();
    this.createParticles();
    this.createTrails();
    this.createStars();
    this.initParticleData();
  }

  createParticleTexture(): void {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    this.particleTexture = new THREE.CanvasTexture(canvas);
    this.particleTexture.needsUpdate = true;

    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = size;
    glowCanvas.height = size;
    const glowCtx = glowCanvas.getContext('2d')!;
    const glowGradient = glowCtx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    glowGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.2)');
    glowGradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.05)');
    glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    glowCtx.fillStyle = glowGradient;
    glowCtx.fillRect(0, 0, size, size);
    this.glowTexture = new THREE.CanvasTexture(glowCanvas);
  }

  getFieldLinePoint(lineIndex: number, t: number): THREE.Vector3 {
    const phi = (lineIndex / this.lineCount) * Math.PI * 2;
    const tiltAngle = ((lineIndex % 10) / 10 - 0.5) * 0.6;
    const baseTilt = (lineIndex / this.lineCount) * Math.PI * 0.8 - Math.PI * 0.4;

    const theta = t * Math.PI;

    const loopRadius = 3.0 + Math.sin(theta * 2) * 0.5;
    const r = loopRadius * Math.sin(theta);
    const y = 2.5 * Math.cos(theta);

    const x = r * Math.cos(phi + baseTilt);
    const z = r * Math.sin(phi + tiltAngle);

    const warp = Math.sin(theta * 3) * 0.15;
    const xw = x + warp * Math.cos(phi * 2);
    const zw = z + warp * Math.sin(phi * 2);

    return new THREE.Vector3(xw, y, zw);
  }

  getPolarity(t: number): number {
    return Math.cos(t * Math.PI);
  }

  createParticles(): void {
    const geometry = new THREE.BufferGeometry();
    this.particlePositions = new Float32Array(this.particleCount * 3);
    this.particleColors = new Float32Array(this.particleCount * 3);
    this.particleSizes = new Float32Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      this.particleSizes[i] = this.baseSize;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.particleColors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(this.particleSizes, 1));

    const material = new THREE.PointsMaterial({
      size: this.baseSize,
      map: this.particleTexture,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      emissiveIntensity: 0.3
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  createTrails(): void {
    for (let i = 0; i < this.particleCount; i++) {
      const positions = new Float32Array(10 * 3);
      const colors = new Float32Array(10 * 3);

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const line = new THREE.Line(geometry, material);
      this.trailMeshes.push(line);
      this.scene.add(line);
    }
  }

  createStars(): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.starCount * 3);
    const colors = new Float32Array(this.starCount * 3);
    const sizes = new Float32Array(this.starCount);

    for (let i = 0; i < this.starCount; i++) {
      const r = 20 + Math.random() * 10;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const brightness = 0.1 + Math.random() * 0.2;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness * 1.1;
      colors[i * 3 + 2] = brightness * 1.3;

      sizes[i] = 1 + Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 1.5,
      map: this.particleTexture,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  }

  initParticleData(): void {
    for (let lineIdx = 0; lineIdx < this.lineCount; lineIdx++) {
      for (let pIdx = 0; pIdx < this.particlesPerLine; pIdx++) {
        const i = lineIdx * this.particlesPerLine + pIdx;
        const t = (pIdx / this.particlesPerLine + lineIdx * 0.03) % 1;

        this.particleData.push({
          lineIndex: lineIdx,
          t: t,
          speed: this.baseSpeed * (0.8 + Math.random() * 0.4),
          trailPositions: [],
          highlightAmount: 0,
          targetHighlight: 0
        });
      }
    }
  }

  updateFieldStrength(delta: number): void {
    this.fieldTime += delta;
    const phase = (this.fieldTime % this.fieldPeriod) / this.fieldPeriod;
    const sine = Math.sin(phase * Math.PI * 2);
    this.fieldStrength = 0.5 + sine * 0.5;

    this.currentSpeed = 0.3 + this.fieldStrength * 0.5;
    this.currentSize = 2 + this.fieldStrength * 3;
  }

  updateParticles(delta: number): void {
    for (let i = 0; i < this.particleCount; i++) {
      const data = this.particleData[i];

      data.t += delta * this.currentSpeed * data.speed * 0.1;
      if (data.t >= 1) data.t -= 1;

      const pos = this.getFieldLinePoint(data.lineIndex, data.t);

      this.particlePositions[i * 3] = pos.x;
      this.particlePositions[i * 3 + 1] = pos.y;
      this.particlePositions[i * 3 + 2] = pos.z;

      const hlDiff = data.targetHighlight - data.highlightAmount;
      data.highlightAmount += hlDiff * Math.min(1, delta / 0.2);

      const polarity = this.getPolarity(data.t);
      const baseR: number, baseG: number, baseB: number;
      if (polarity >= 0) {
        baseR = 0.3 + polarity * 0.1;
        baseG = 0.4;
        baseB = 0.9 - polarity * 0.2;
      } else {
        baseR = 0.6 - polarity * 0.3;
        baseG = 0.3;
        baseB = 0.7 + polarity * 0.1;
      }

      const hl = data.highlightAmount;
      const r = baseR * (1 - hl) + (1.0 + hl * 0.0) * hl;
      const g = baseG * (1 - hl) + (0.6 + hl * 0.2) * hl;
      const b = baseB * (1 - hl) + (0.1) * hl;

      const intensity = 0.7 + this.fieldStrength * 0.5;
      this.particleColors[i * 3] = r * intensity;
      this.particleColors[i * 3 + 1] = g * intensity;
      this.particleColors[i * 3 + 2] = b * intensity;

      const sizeFactor = 1 + data.highlightAmount * 1.5;
      this.particleSizes[i] = this.currentSize * sizeFactor;

      data.trailPositions.unshift(pos.clone());
      if (data.trailPositions.length > 10) {
        data.trailPositions.pop();
      }

      this.updateTrail(i, data, polarity);
    }

    const posAttr = this.particles.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colorAttr = this.particles.geometry.getAttribute('color') as THREE.BufferAttribute;
    const sizeAttr = this.particles.geometry.getAttribute('size') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;

    const mat = this.particles.material as THREE.PointsMaterial;
    mat.size = this.currentSize;
  }

  updateTrail(index: number, data: ParticleData, polarity: number): void {
    const line = this.trailMeshes[index];
    const posAttr = line.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colorAttr = line.geometry.getAttribute('color') as THREE.BufferAttribute;

    const positions = posAttr.array as Float32Array;
    const colors = colorAttr.array as Float32Array;

    const trailLen = data.trailPositions.length;
    for (let i = 0; i < 10; i++) {
      if (i < trailLen) {
        const p = data.trailPositions[i];
        positions[i * 3] = p.x;
        positions[i * 3 + 1] = p.y;
        positions[i * 3 + 2] = p.z;

        const fade = 1 - i / 10;
        const alpha = fade * 0.8;

        let r: number, g: number, b: number;
        if (polarity >= 0) {
          r = 0.3 * fade;
          g = 0.5 * fade;
          b = 1.0 * fade;
        } else {
          r = 1.0 * fade;
          g = 0.3 * fade;
          b = 0.4 * fade;
        }

        const hl = data.highlightAmount;
        r = r * (1 - hl) + 1.0 * hl * fade;
        g = g * (1 - hl) + 0.7 * hl * fade;
        b = b * (1 - hl) + 0.1 * hl * fade;

        colors[i * 3] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;

        const lineMat = line.material as THREE.LineBasicMaterial;
        lineMat.opacity = alpha * 0.6;
      } else {
        const lastIdx = Math.max(0, trailLen - 1);
        if (lastIdx < trailLen) {
          const p = data.trailPositions[lastIdx];
          positions[i * 3] = p.x;
          positions[i * 3 + 1] = p.y;
          positions[i * 3 + 2] = p.z;
        }
        colors[i * 3] = 0;
        colors[i * 3 + 1] = 0;
        colors[i * 3 + 2] = 0;
      }
    }

    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
  }

  createShockWave(position: THREE.Vector3): void {
    for (const existing of this.shockWaves) {
      if (existing.position.distanceTo(position) < 1.0) {
        return;
      }
    }

    const shockWave: ShockWave = {
      position: position.clone(),
      radius: 0.1,
      maxRadius: 3.0,
      alpha: 0.8,
      life: 0.6
    };
    this.shockWaves.push(shockWave);

    const ringGeometry = new THREE.RingGeometry(0, 0.15, 48);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa44,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    ringMesh.position.copy(position);
    ringMesh.lookAt(new THREE.Vector3(0, position.y, 0).add(new THREE.Vector3(position.x * 2, position.y, position.z * 2)));
    this.shockWaveMeshes.push(ringMesh);
    this.scene.add(ringMesh);
  }

  updateShockWaves(delta: number): void {
    for (let i = this.shockWaves.length - 1; i >= 0; i--) {
      const sw = this.shockWaves[i];
      const mesh = this.shockWaveMeshes[i];

      sw.radius += delta * (sw.maxRadius / 0.6);
      sw.life -= delta;
      const lifeRatio = Math.max(0, sw.life / 0.6);
      sw.alpha = 0.8 * lifeRatio;

      const innerR = Math.max(0, sw.radius - 0.15);
      const newGeom = new THREE.RingGeometry(innerR, sw.radius, 48);
      mesh.geometry.dispose();
      mesh.geometry = newGeom;

      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = sw.alpha;
      mat.color.setHSL(0.08 + lifeRatio * 0.05, 0.9, 0.6);

      if (sw.life <= 0) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        this.shockWaves.splice(i, 1);
        this.shockWaveMeshes.splice(i, 1);
      }
    }
  }

  highlightNearPoint(point: THREE.Vector3, threshold: number = 2): void {
    for (let i = 0; i < this.particleCount; i++) {
      const data = this.particleData[i];
      const px = this.particlePositions[i * 3];
      const py = this.particlePositions[i * 3 + 1];
      const pz = this.particlePositions[i * 3 + 2];

      const dx = px - point.x;
      const dy = py - point.y;
      const dz = pz - point.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq < threshold * threshold) {
        const dist = Math.sqrt(distSq);
        const falloff = 1 - dist / threshold;
        data.targetHighlight = Math.max(data.targetHighlight, falloff);
      }
    }
  }

  clearHighlights(): void {
    for (const data of this.particleData) {
      data.targetHighlight = 0;
    }
  }

  update(delta: number): void {
    this.updateFieldStrength(delta);
    this.updateParticles(delta);
    this.updateShockWaves(delta);

    if (this.stars) {
      this.stars.rotation.y += delta * 0.01;
    }
  }

  dispose(): void {
    this.scene.remove(this.particles);
    this.particles.geometry.dispose();
    (this.particles.material as THREE.Material).dispose();

    for (const line of this.trailMeshes) {
      this.scene.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }

    for (const mesh of this.shockWaveMeshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }

    if (this.stars) {
      this.scene.remove(this.stars);
      this.stars.geometry.dispose();
      (this.stars.material as THREE.Material).dispose();
    }

    this.particleTexture.dispose();
    this.glowTexture.dispose();
  }
}
