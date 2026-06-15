import * as THREE from 'three';

export type ConstellationMode = 'random' | 'spiral' | 'binary';

export interface StarData {
  id: number;
  baseColor: THREE.Color;
  currentColor: THREE.Color;
  pulsePhase: number;
  pulseSpeed: number;
  baseSize: number;
  targetPosition: THREE.Vector3;
  currentPosition: THREE.Vector3;
  transitionProgress: number;
  isHighlighted: boolean;
  highlightTime: number;
  isPulseHit: boolean;
  pulseHitTime: number;
  isHovered: boolean;
  connectedIds: Set<number>;
}

export interface PulseEffect {
  originId: number;
  position: THREE.Vector3;
  radius: number;
  maxRadius: number;
  progress: number;
  duration: number;
  elapsed: number;
  active: boolean;
}

export class StarSystem {
  public stars: StarData[] = [];
  public pulses: PulseEffect[] = [];
  public points!: THREE.Points;
  public group: THREE.Group = new THREE.Group();
  private particleCount: number;
  private sphereRadius: number;
  private geometry!: THREE.BufferGeometry;
  private material!: THREE.ShaderMaterial;
  private colorTexture!: THREE.Texture;

  constructor(particleCount: number = 500, sphereRadius: number = 15) {
    this.particleCount = particleCount;
    this.sphereRadius = sphereRadius;
  }

  public init(scene: THREE.Scene): void {
    this.colorTexture = this.createGlowTexture();
    this.createStars('random');
    this.setupGeometry();
    this.setupMaterial();
    this.points = new THREE.Points(this.geometry, this.material);
    this.group.add(this.points);
    scene.add(this.group);
  }

  private createGlowTexture(): THREE.Texture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.85)');
    gradient.addColorStop(0.4, 'rgba(200, 220, 255, 0.4)');
    gradient.addColorStop(0.7, 'rgba(120, 170, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private generateRandomColor(): THREE.Color {
    const warmWhite = new THREE.Color(0xfff4e0);
    const coolBlue = new THREE.Color(0x6ab5ff);
    const t = Math.random();
    return warmWhite.clone().lerp(coolBlue, t);
  }

  private generateSpiralColor(index: number, total: number): THREE.Color {
    const t = index / total;
    const hue = 0.55 + Math.sin(t * Math.PI * 4) * 0.1;
    const saturation = 0.5 + Math.random() * 0.3;
    const lightness = 0.7 + Math.random() * 0.2;
    const color = new THREE.Color();
    color.setHSL(hue, saturation, lightness);
    return color;
  }

  private generateBinaryColor(isPrimary: boolean): THREE.Color {
    if (isPrimary) {
      const c = new THREE.Color();
      c.setHSL(0.08 + Math.random() * 0.05, 0.7, 0.75);
      return c;
    } else {
      const c = new THREE.Color();
      c.setHSL(0.58 + Math.random() * 0.05, 0.7, 0.75);
      return c;
    }
  }

  private randomPointInSphere(radius: number): THREE.Vector3 {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = radius * Math.cbrt(Math.random());
    return new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
  }

  private spiralPoint(index: number, total: number, radius: number): THREE.Vector3 {
    const arms = 4;
    const t = index / total;
    const armAngle = (index % arms) * (Math.PI * 2 / arms);
    const spiralR = radius * Math.pow(t, 0.6);
    const angle = t * Math.PI * 8 + armAngle + (Math.random() - 0.5) * 0.6;
    const height = (Math.random() - 0.5) * radius * 0.15 * (1 - t * 0.7);
    const wobble = (Math.random() - 0.5) * radius * 0.25;
    return new THREE.Vector3(
      spiralR * Math.cos(angle) + wobble * 0.3,
      height + wobble * 0.2,
      spiralR * Math.sin(angle) + wobble * 0.3
    );
  }

  private binaryPoint(index: number, _total: number, radius: number): { pos: THREE.Vector3; isPrimary: boolean } {
    const isPrimary = index % 2 === 0;
    const centerOffset = radius * 0.38;
    const centerX = isPrimary ? -centerOffset : centerOffset;
    const clusterRadius = radius * 0.48;
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = clusterRadius * Math.cbrt(Math.random() * 0.85 + 0.15);
    const corePull = Math.random() < 0.25 ? 0.35 : 1;
    return {
      pos: new THREE.Vector3(
        centerX + r * Math.sin(phi) * Math.cos(theta) * corePull,
        r * Math.sin(phi) * Math.sin(theta) * corePull,
        r * Math.cos(phi) * corePull
      ),
      isPrimary
    };
  }

  public createStars(mode: ConstellationMode): void {
    this.stars = [];
    for (let i = 0; i < this.particleCount; i++) {
      let targetPos: THREE.Vector3;
      let baseColor: THREE.Color;

      switch (mode) {
        case 'spiral':
          targetPos = this.spiralPoint(i, this.particleCount, this.sphereRadius);
          baseColor = this.generateSpiralColor(i, this.particleCount);
          break;
        case 'binary': {
          const bp = this.binaryPoint(i, this.particleCount, this.sphereRadius);
          targetPos = bp.pos;
          baseColor = this.generateBinaryColor(bp.isPrimary);
          break;
        }
        case 'random':
        default:
          targetPos = this.randomPointInSphere(this.sphereRadius);
          baseColor = this.generateRandomColor();
          break;
      }

      const currentPos = this.stars[i]
        ? this.stars[i].currentPosition.clone()
        : targetPos.clone();

      this.stars.push({
        id: i,
        baseColor: baseColor.clone(),
        currentColor: baseColor.clone(),
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: (1 + Math.random() * 2) / 1000,
        baseSize: 0.18 + Math.random() * 0.22,
        targetPosition: targetPos,
        currentPosition: currentPos,
        transitionProgress: 1,
        isHighlighted: false,
        highlightTime: 0,
        isPulseHit: false,
        pulseHitTime: 0,
        isHovered: false,
        connectedIds: new Set<number>()
      });
    }
  }

  public transitionToMode(mode: ConstellationMode): void {
    const newTargets: THREE.Vector3[] = [];
    const newColors: THREE.Color[] = [];

    for (let i = 0; i < this.particleCount; i++) {
      let targetPos: THREE.Vector3;
      let baseColor: THREE.Color;

      switch (mode) {
        case 'spiral':
          targetPos = this.spiralPoint(i, this.particleCount, this.sphereRadius);
          baseColor = this.generateSpiralColor(i, this.particleCount);
          break;
        case 'binary': {
          const bp = this.binaryPoint(i, this.particleCount, this.sphereRadius);
          targetPos = bp.pos;
          baseColor = this.generateBinaryColor(bp.isPrimary);
          break;
        }
        case 'random':
        default:
          targetPos = this.randomPointInSphere(this.sphereRadius);
          baseColor = this.generateRandomColor();
          break;
      }
      newTargets.push(targetPos);
      newColors.push(baseColor);
    }

    for (let i = 0; i < this.particleCount; i++) {
      this.stars[i].targetPosition = newTargets[i];
      this.stars[i].baseColor = newColors[i];
      this.stars[i].transitionProgress = 0;
    }
  }

  private setupGeometry(): void {
    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);
    const phases = new Float32Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      const star = this.stars[i];
      positions[i * 3] = star.currentPosition.x;
      positions[i * 3 + 1] = star.currentPosition.y;
      positions[i * 3 + 2] = star.currentPosition.z;
      colors[i * 3] = star.currentColor.r;
      colors[i * 3 + 1] = star.currentColor.g;
      colors[i * 3 + 2] = star.currentColor.b;
      sizes[i] = star.baseSize;
      phases[i] = star.pulsePhase;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    this.geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  }

  private setupMaterial(): void {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uTexture: { value: this.colorTexture },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        attribute float aSize;
        attribute float aPhase;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uTime;
        uniform float uPixelRatio;
        void main() {
          vColor = color;
          float pulse = 0.65 + 0.35 * sin(uTime * 0.0015 * (60.0 + aPhase * 30.0) + aPhase * 6.28318);
          float twinkle = 0.9 + 0.1 * sin(uTime * 0.004 + aPhase * 12.0);
          vAlpha = pulse * twinkle;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * vAlpha * (300.0 * uPixelRatio) / -mvPosition.z;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec4 tex = texture2D(uTexture, gl_PointCoord);
          if (tex.a < 0.02) discard;
          gl_FragColor = vec4(vColor, tex.a * vAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true
    });
  }

  public spawnPulse(starId: number): void {
    const star = this.stars[starId];
    if (!star) return;
    this.pulses.push({
      originId: starId,
      position: star.currentPosition.clone(),
      radius: 0.3,
      maxRadius: 4,
      progress: 0,
      duration: 0.6,
      elapsed: 0,
      active: true
    });
  }

  public setHoveredStar(starId: number | null): void {
    for (const star of this.stars) {
      star.isHovered = false;
      star.isHighlighted = false;
    }
    if (starId !== null && this.stars[starId]) {
      const hovered = this.stars[starId];
      hovered.isHovered = true;
      hovered.isHighlighted = true;
      for (const connId of hovered.connectedIds) {
        if (this.stars[connId]) {
          this.stars[connId].isHighlighted = true;
        }
      }
    }
  }

  public update(deltaMs: number, globalTimeMs: number): void {
    this.group.rotation.y += deltaMs * 0.00005 * (Math.PI * 2 / 20);

    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;
    const sizes = this.geometry.attributes.aSize.array as Float32Array;
    const pulseOrange = new THREE.Color(0xff9944);
    const transitionDuration = 1000;
    const pulseHitDuration = 300;

    for (let i = 0; i < this.particleCount; i++) {
      const star = this.stars[i];

      if (star.transitionProgress < 1) {
        star.transitionProgress = Math.min(1, star.transitionProgress + deltaMs / transitionDuration);
        const t = star.transitionProgress;
        const easeT = 1 - Math.pow(1 - t, 3);
        star.currentPosition.lerpVectors(
          star.currentPosition,
          star.targetPosition,
          easeT * 0.15 + (1 - easeT) * 0
        );
        star.currentPosition.lerp(star.targetPosition, easeT * 0.08);
      } else {
        star.currentPosition.copy(star.targetPosition);
      }

      if (!star.currentPosition.equals(star.targetPosition)) {
        const dx = star.targetPosition.x - star.currentPosition.x;
        const dy = star.targetPosition.y - star.currentPosition.y;
        const dz = star.targetPosition.z - star.currentPosition.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist > 0.001) {
          star.currentPosition.x += dx * 0.08;
          star.currentPosition.y += dy * 0.08;
          star.currentPosition.z += dz * 0.08;
        } else {
          star.currentPosition.copy(star.targetPosition);
        }
      }

      star.currentColor.copy(star.baseColor);

      if (star.isPulseHit) {
        star.pulseHitTime += deltaMs;
        if (star.pulseHitTime >= pulseHitDuration) {
          star.isPulseHit = false;
          star.pulseHitTime = 0;
        } else {
          const intensity = 1 - star.pulseHitTime / pulseHitDuration;
          star.currentColor.lerp(pulseOrange, intensity * 0.85);
        }
      }

      if (star.isHighlighted) {
        const boost = 0.4;
        star.currentColor.r = Math.min(1, star.currentColor.r * (1 + boost));
        star.currentColor.g = Math.min(1, star.currentColor.g * (1 + boost * 0.8));
        star.currentColor.b = Math.min(1, star.currentColor.b * (1 + boost * 0.5));
      }

      positions[i * 3] = star.currentPosition.x;
      positions[i * 3 + 1] = star.currentPosition.y;
      positions[i * 3 + 2] = star.currentPosition.z;
      colors[i * 3] = star.currentColor.r;
      colors[i * 3 + 1] = star.currentColor.g;
      colors[i * 3 + 2] = star.currentColor.b;

      let size = star.baseSize;
      if (star.isHovered) size *= 1.5;
      sizes[i] = size;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.aSize.needsUpdate = true;
    this.material.uniforms.uTime.value = globalTimeMs;

    this.updatePulses(deltaMs);
  }

  private updatePulses(deltaMs: number): void {
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const pulse = this.pulses[i];
      if (!pulse.active) {
        this.pulses.splice(i, 1);
        continue;
      }

      pulse.elapsed += deltaMs;
      pulse.progress = pulse.elapsed / (pulse.duration * 1000);
      if (pulse.progress >= 1) {
        pulse.active = false;
        continue;
      }

      const t = pulse.progress;
      pulse.radius = pulse.maxRadius * (1 - Math.pow(1 - t, 3));

      const prevRadius = pulse.radius - (pulse.maxRadius * deltaMs / (pulse.duration * 1000)) * 3;
      for (const star of this.stars) {
        if (star.id === pulse.originId) continue;
        const dx = star.currentPosition.x - pulse.position.x;
        const dy = star.currentPosition.y - pulse.position.y;
        const dz = star.currentPosition.z - pulse.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist >= prevRadius && dist <= pulse.radius && !star.isPulseHit) {
          star.isPulseHit = true;
          star.pulseHitTime = 0;
        }
      }
    }
  }

  public getStarAtScreenPosition(
    ndcX: number,
    ndcY: number,
    camera: THREE.Camera,
    thresholdPx: number = 20
  ): number | null {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    raycaster.params.Points = { threshold: thresholdPx / 100 };

    const intersects = raycaster.intersectObject(this.points, false);
    if (intersects.length > 0 && intersects[0].index !== undefined) {
      return intersects[0].index;
    }
    return null;
  }

  public getPulseRenderData(): Array<{ position: THREE.Vector3; radius: number; alpha: number }> {
    return this.pulses
      .filter(p => p.active)
      .map(p => ({
        position: p.position.clone(),
        radius: p.radius,
        alpha: (1 - p.progress) * 0.6
      }));
  }

  public resize(_width: number, _height: number): void {
    this.material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.colorTexture.dispose();
  }
}
