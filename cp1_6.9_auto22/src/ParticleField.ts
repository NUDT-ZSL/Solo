import * as THREE from 'three';
import type { WordData } from './TextAnalyzer';

interface ParticleData {
  id: number;
  wordData: WordData | null;
  position: THREE.Vector3;
  targetPosition: THREE.Vector3;
  basePosition: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  targetColor: THREE.Color;
  originalColor: THREE.Color;
  size: number;
  baseSize: number;
  life: number;
  scale: number;
  targetScale: number;
  phase: number;
  spiralRadius: number;
  spiralSpeed: number;
  spiralHeight: number;
  isHovered: boolean;
  isPulsed: boolean;
  pulseTime: number;
  birthDelay: number;
  birthTime: number;
  transitionStart: number;
  transitionDuration: number;
  isTransitioning: boolean;
}

interface PulseWave {
  center: THREE.Vector3;
  radius: number;
  maxRadius: number;
  duration: number;
  elapsed: number;
  active: boolean;
}

const POSITIVE_START = new THREE.Color('#8A2BE2');
const POSITIVE_END = new THREE.Color('#00FFFF');
const NEGATIVE_START = new THREE.Color('#FF4500');
const NEGATIVE_END = new THREE.Color('#C71585');
const NEUTRAL_COLOR = new THREE.Color('#AAAAAA');
const PULSE_COLOR = new THREE.Color('#FFFFFF');
const IDLE_COUNT = 200;
const BOUNDARY_RADIUS = 55;
const EASE = 0.08;
const HOVER_EASE = 0.15;

export class ParticleField {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private particles: ParticleData[] = [];
  private particleMesh!: THREE.Points;
  private particleGeometry!: THREE.BufferGeometry;
  private particleMaterial!: THREE.ShaderMaterial;
  private lineMesh!: THREE.LineSegments;
  private lineGeometry!: THREE.BufferGeometry;
  private lineMaterial!: THREE.ShaderMaterial;
  private pulseMesh!: THREE.Mesh;
  private pulseMaterial!: THREE.ShaderMaterial;
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  private hoveredIndex: number = -1;
  private pulseWaves: PulseWave[] = [];
  private elapsedTime: number = 0;
  private positions: Float32Array = new Float32Array(0);
  private colors: Float32Array = new Float32Array(0);
  private sizes: Float32Array = new Float32Array(0);
  private linePositions: Float32Array = new Float32Array(0);
  private lineColors: Float32Array = new Float32Array(0);
  private lineOpacities: Float32Array = new Float32Array(0);
  private connectionPairs: Array<{ from: number; to: number; relevance: number }> = [];

  public onHover: ((word: string | null, position: THREE.Vector3 | null) => void) | null = null;
  public onClick: ((word: string | null) => void) | null = null;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2(-999, -999);
    this.createParticleSystem();
    this.createLineSystem();
    this.createPulseSystem();
    this.initIdleParticles();
  }

  private createParticleSystem(): void {
    this.particleGeometry = new THREE.BufferGeometry();
    this.particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uTime: { value: 0 }
      },
      vertexShader: `
        attribute float aSize;
        varying vec3 vColor;
        varying float vSize;
        uniform float uPixelRatio;
        uniform float uTime;
        void main() {
          vColor = color;
          vSize = aSize;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vSize;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float dist = length(uv);
          if (dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, dist);
          float glow = smoothstep(0.5, 0.15, dist) * 0.6;
          vec3 finalColor = vColor + vColor * glow;
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.particleMesh = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.particleMesh.frustumCulled = false;
    this.scene.add(this.particleMesh);
  }

  private createLineSystem(): void {
    this.lineGeometry = new THREE.BufferGeometry();
    this.lineMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }
      },
      vertexShader: `
        attribute float aOpacity;
        varying float vOpacity;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vOpacity = aOpacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          gl_FragColor = vec4(vColor, vOpacity);
        }
      `,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.lineMesh = new THREE.LineSegments(this.lineGeometry, this.lineMaterial);
    this.lineMesh.frustumCulled = false;
    this.scene.add(this.lineMesh);
  }

  private createPulseSystem(): void {
    const segments = 64;
    const geometry = new THREE.RingGeometry(0, 1, segments);
    this.pulseMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uProgress: { value: 0 },
        uColor: { value: new THREE.Color('#00FFFF') }
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vRadius;
        void main() {
          vUv = uv;
          vec3 pos = position;
          vRadius = length(pos.xy);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uProgress;
        uniform vec3 uColor;
        varying vec2 vUv;
        varying float vRadius;
        void main() {
          float ringWidth = 0.08;
          float center = 0.5 + (uProgress * 0.5);
          float alpha = 1.0 - smoothstep(center - ringWidth, center, vRadius) * smoothstep(center, center + ringWidth, vRadius);
          alpha *= (1.0 - uProgress) * 0.8;
          vec3 glow = uColor * 1.5;
          gl_FragColor = vec4(glow, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.pulseMesh = new THREE.Mesh(geometry, this.pulseMaterial);
    this.pulseMesh.scale.setScalar(0);
    this.pulseMesh.visible = false;
    this.scene.add(this.pulseMesh);
  }

  private getSentimentColor(sentiment: string, strength: number): THREE.Color {
    const t = Math.min(1, Math.max(0, strength));
    if (sentiment === 'positive') {
      return POSITIVE_START.clone().lerp(POSITIVE_END, t);
    } else if (sentiment === 'negative') {
      return NEGATIVE_START.clone().lerp(NEGATIVE_END, t);
    }
    return NEUTRAL_COLOR.clone();
  }

  private createParticleData(
    index: number,
    wordData: WordData | null,
    spawnFromCenter: boolean = false
  ): ParticleData {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = 15 + Math.random() * 30;

    const basePos = new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi)
    );

    const startPos = spawnFromCenter ? new THREE.Vector3(0, 0, 0) : basePos.clone();
    const freq = wordData?.frequency ?? (0.2 + Math.random() * 0.6);
    const baseSize = 3 + freq * 5;
    const sentiment = wordData?.sentiment ?? 'neutral';
    const strength = wordData?.strength ?? (0.3 + Math.random() * 0.5);
    const color = this.getSentimentColor(sentiment, strength);

    return {
      id: index,
      wordData,
      position: startPos,
      targetPosition: basePos.clone(),
      basePosition: basePos,
      velocity: new THREE.Vector3(0, 0, 0),
      color: color.clone(),
      targetColor: color.clone(),
      originalColor: color.clone(),
      size: baseSize,
      baseSize,
      life: 0,
      scale: spawnFromCenter ? 0 : 1,
      targetScale: 1,
      phase: Math.random() * Math.PI * 2,
      spiralRadius: 1 + Math.random() * 2,
      spiralSpeed: 0.3 + Math.random() * 0.7,
      spiralHeight: 0.5 + Math.random() * 1.5,
      isHovered: false,
      isPulsed: false,
      pulseTime: 0,
      birthDelay: spawnFromCenter ? Math.random() * 0.5 : 0,
      birthTime: 0,
      transitionStart: this.elapsedTime,
      transitionDuration: 0.8,
      isTransitioning: true
    };
  }

  private initIdleParticles(): void {
    this.particles = [];
    for (let i = 0; i < IDLE_COUNT; i++) {
      this.particles.push(this.createParticleData(i, null, false));
    }
    this.updateBuffers();
    this.updateConnections();
  }

  public updateParticles(wordDataArray: WordData[]): void {
    const targetCount = Math.min(Math.max(wordDataArray.length, 50), 800);
    const newParticles: ParticleData[] = [];

    for (let i = 0; i < targetCount; i++) {
      const wd = i < wordDataArray.length ? wordDataArray[i] : null;
      newParticles.push(this.createParticleData(i, wd, true));
    }

    this.particles = newParticles;
    this.hoveredIndex = -1;
    this.updateBuffers();
    this.updateConnections();
  }

  public resetToIdle(): void {
    this.initIdleParticles();
    this.hoveredIndex = -1;
    this.pulseWaves = [];
    this.pulseMesh.visible = false;
    if (this.onHover) this.onHover(null, null);
  }

  private updateBuffers(): void {
    const count = this.particles.length;
    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      this.positions[i * 3] = p.position.x;
      this.positions[i * 3 + 1] = p.position.y;
      this.positions[i * 3 + 2] = p.position.z;
      this.colors[i * 3] = p.color.r;
      this.colors[i * 3 + 1] = p.color.g;
      this.colors[i * 3 + 2] = p.color.b;
      this.sizes[i] = p.size * p.scale;
    }

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.particleGeometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.particleGeometry.attributes.position.needsUpdate = true;
    this.particleGeometry.attributes.color.needsUpdate = true;
    (this.particleGeometry.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
  }

  private updateConnections(): void {
    const pairs: Array<{ from: number; to: number; relevance: number }> = [];
    const maxPairs = this.particles.length * 2;
    const added = new Set<string>();

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.wordData && p.wordData.connections.length > 0) {
        for (const conn of p.wordData.connections) {
          if (conn.targetIndex >= this.particles.length) continue;
          const key = i < conn.targetIndex ? `${i}-${conn.targetIndex}` : `${conn.targetIndex}-${i}`;
          if (added.has(key)) continue;
          added.add(key);
          pairs.push({ from: i, to: conn.targetIndex, relevance: conn.relevance });
        }
      }
    }

    if (pairs.length < Math.min(maxPairs, this.particles.length)) {
      for (let i = 0; i < this.particles.length && pairs.length < maxPairs; i++) {
        const nearby = this.findNearbyParticles(i, 5);
        for (const j of nearby) {
          if (pairs.length >= maxPairs) break;
          const key = i < j ? `${i}-${j}` : `${j}-${i}`;
          if (added.has(key)) continue;
          added.add(key);
          const dist = this.particles[i].basePosition.distanceTo(this.particles[j].basePosition);
          const rel = Math.max(0.2, 1 - dist / 60);
          pairs.push({ from: i, to: j, relevance: rel });
        }
      }
    }

    this.connectionPairs = pairs.slice(0, maxPairs);
    this.updateLineBuffers();
  }

  private findNearbyParticles(index: number, count: number): number[] {
    const results: Array<{ idx: number; dist: number }> = [];
    const pos = this.particles[index].basePosition;
    for (let i = 0; i < this.particles.length; i++) {
      if (i === index) continue;
      const d = pos.distanceTo(this.particles[i].basePosition);
      if (d < 25) {
        results.push({ idx: i, dist: d });
      }
    }
    results.sort((a, b) => a.dist - b.dist);
    return results.slice(0, count).map(r => r.idx);
  }

  private updateLineBuffers(): void {
    const count = this.connectionPairs.length;
    this.linePositions = new Float32Array(count * 6);
    this.lineColors = new Float32Array(count * 6);
    this.lineOpacities = new Float32Array(count * 2);

    for (let i = 0; i < count; i++) {
      const pair = this.connectionPairs[i];
      const pA = this.particles[pair.from];
      const pB = this.particles[pair.to];
      const baseOpacity = 0.3 + pair.relevance * 0.6;

      this.linePositions[i * 6] = pA.position.x;
      this.linePositions[i * 6 + 1] = pA.position.y;
      this.linePositions[i * 6 + 2] = pA.position.z;
      this.linePositions[i * 6 + 3] = pB.position.x;
      this.linePositions[i * 6 + 4] = pB.position.y;
      this.linePositions[i * 6 + 5] = pB.position.z;

      const mixA = pA.isPulsed ? 1 : (pA.isHovered ? 0.3 : 0);
      const mixB = pB.isPulsed ? 1 : (pB.isHovered ? 0.3 : 0);
      const lineColorA = pA.originalColor.clone().lerp(PULSE_COLOR, mixA);
      const lineColorB = pB.originalColor.clone().lerp(PULSE_COLOR, mixB);

      this.lineColors[i * 6] = lineColorA.r;
      this.lineColors[i * 6 + 1] = lineColorA.g;
      this.lineColors[i * 6 + 2] = lineColorA.b;
      this.lineColors[i * 6 + 3] = lineColorB.r;
      this.lineColors[i * 6 + 4] = lineColorB.g;
      this.lineColors[i * 6 + 5] = lineColorB.b;

      const isHighlighted = pA.isHovered || pB.isHovered || pA.isPulsed || pB.isPulsed;
      const finalOpacity = isHighlighted ? Math.min(1, baseOpacity + 0.3) : baseOpacity;
      this.lineOpacities[i * 2] = finalOpacity;
      this.lineOpacities[i * 2 + 1] = finalOpacity;
    }

    this.lineGeometry.setAttribute('position', new THREE.BufferAttribute(this.linePositions, 3));
    this.lineGeometry.setAttribute('color', new THREE.BufferAttribute(this.lineColors, 3));
    this.lineGeometry.setAttribute('aOpacity', new THREE.BufferAttribute(this.lineOpacities, 1));
    this.lineGeometry.attributes.position.needsUpdate = true;
    this.lineGeometry.attributes.color.needsUpdate = true;
    (this.lineGeometry.attributes.aOpacity as THREE.BufferAttribute).needsUpdate = true;
  }

  private updateSpiralMotion(p: ParticleData, delta: number): void {
    const t = this.elapsedTime * p.spiralSpeed + p.phase;
    const spiralOffset = new THREE.Vector3(
      Math.cos(t) * p.spiralRadius,
      Math.sin(t * 0.7) * p.spiralHeight,
      Math.sin(t) * p.spiralRadius
    );

    const speed = 2 + (p.wordData?.frequency ?? 0.5) * 3;
    const pulseMultiplier = p.isPulsed ? 2.5 : 1;
    const moveSpeed = speed * pulseMultiplier * delta;

    const ideal = p.basePosition.clone().add(spiralOffset);
    p.targetPosition.copy(ideal);

    p.position.lerp(p.targetPosition, Math.min(1, EASE * (1 + moveSpeed)));

    const dist = p.position.length();
    if (dist > BOUNDARY_RADIUS) {
      const pullBack = p.position.clone().normalize().multiplyScalar(-(dist - BOUNDARY_RADIUS) * 0.05);
      p.position.add(pullBack);
    }
  }

  private updateParticleAppearance(p: ParticleData): void {
    if (p.isPulsed) {
      p.pulseTime -= 0.016;
      if (p.pulseTime <= 0) {
        p.isPulsed = false;
        p.targetColor.copy(p.originalColor);
      } else {
        const t = p.pulseTime / 0.3;
        p.targetColor.copy(p.originalColor).lerp(PULSE_COLOR, t * 0.8);
      }
    } else if (p.isHovered) {
      p.targetColor.copy(p.originalColor).lerp(PULSE_COLOR, 0.3);
    } else {
      p.targetColor.copy(p.originalColor);
    }

    p.color.lerp(p.targetColor, HOVER_EASE);

    const targetScale = p.isHovered ? 1.5 : 1;
    p.targetScale = targetScale;
    p.scale += (p.targetScale - p.scale) * HOVER_EASE;
  }

  private handleBirthAnimation(p: ParticleData, delta: number): void {
    p.birthTime += delta;
    if (p.birthTime < p.birthDelay) {
      p.scale = 0;
      return;
    }
    const localTime = (p.birthTime - p.birthDelay) / 0.4;
    const eased = 1 - Math.pow(1 - Math.min(1, localTime), 3);
    if (!p.isHovered) {
      p.scale = Math.max(p.scale, eased);
    }
  }

  private checkPulseWaves(delta: number): void {
    for (let i = this.pulseWaves.length - 1; i >= 0; i--) {
      const wave = this.pulseWaves[i];
      wave.elapsed += delta;
      const t = wave.elapsed / wave.duration;
      wave.radius = wave.maxRadius * Math.min(1, t);

      for (const p of this.particles) {
        const d = p.position.distanceTo(wave.center);
        const waveThickness = 4;
        if (Math.abs(d - wave.radius) < waveThickness && !p.isPulsed) {
          p.isPulsed = true;
          p.pulseTime = 0.3;
        }
      }

      if (wave.elapsed >= wave.duration) {
        wave.active = false;
        this.pulseWaves.splice(i, 1);
      }
    }

    if (this.pulseWaves.length > 0) {
      const latestWave = this.pulseWaves[this.pulseWaves.length - 1];
      this.pulseMesh.visible = true;
      this.pulseMesh.position.copy(latestWave.center);
      const t = latestWave.elapsed / latestWave.duration;
      this.pulseMesh.scale.setScalar(latestWave.maxRadius * 2 * t);
      this.pulseMaterial.uniforms.uProgress.value = t;
      this.pulseMesh.lookAt(this.camera.position);
    } else {
      this.pulseMesh.visible = false;
    }
  }

  public animate(delta: number): void {
    this.elapsedTime += delta;

    for (const p of this.particles) {
      this.handleBirthAnimation(p, delta);
      this.updateSpiralMotion(p, delta);
      this.updateParticleAppearance(p);
    }

    this.checkPulseWaves(delta);

    const posAttr = this.particleGeometry.attributes.position as THREE.BufferAttribute;
    const colorAttr = this.particleGeometry.attributes.color as THREE.BufferAttribute;
    const sizeAttr = this.particleGeometry.attributes.aSize as THREE.BufferAttribute;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      posAttr.array[i * 3] = p.position.x;
      posAttr.array[i * 3 + 1] = p.position.y;
      posAttr.array[i * 3 + 2] = p.position.z;
      colorAttr.array[i * 3] = p.color.r;
      colorAttr.array[i * 3 + 1] = p.color.g;
      colorAttr.array[i * 3 + 2] = p.color.b;
      (sizeAttr.array as Float32Array)[i] = p.size * p.scale;
    }
    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;

    this.updateLinePositionBuffers();

    this.particleMaterial.uniforms.uTime.value = this.elapsedTime;
    this.lineMaterial.uniforms.uTime.value = this.elapsedTime;
  }

  private updateLinePositionBuffers(): void {
    const posAttr = this.lineGeometry.attributes.position as THREE.BufferAttribute;
    const opacityAttr = this.lineGeometry.attributes.aOpacity as THREE.BufferAttribute;
    const colorAttr = this.lineGeometry.attributes.color as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;
    const opacityArr = opacityAttr.array as Float32Array;
    const colorArr = colorAttr.array as Float32Array;

    for (let i = 0; i < this.connectionPairs.length; i++) {
      const pair = this.connectionPairs[i];
      const pA = this.particles[pair.from];
      const pB = this.particles[pair.to];

      posArr[i * 6] = pA.position.x;
      posArr[i * 6 + 1] = pA.position.y;
      posArr[i * 6 + 2] = pA.position.z;
      posArr[i * 6 + 3] = pB.position.x;
      posArr[i * 6 + 4] = pB.position.y;
      posArr[i * 6 + 5] = pB.position.z;

      const isHighlighted = pA.isHovered || pB.isHovered || pA.isPulsed || pB.isPulsed;
      const baseOpacity = 0.3 + pair.relevance * 0.6;
      const finalOpacity = isHighlighted ? Math.min(1, baseOpacity + 0.3) : baseOpacity;
      opacityArr[i * 2] = finalOpacity;
      opacityArr[i * 2 + 1] = finalOpacity;

      const mixA = pA.isPulsed ? (pA.pulseTime / 0.3) * 0.8 : (pA.isHovered ? 0.3 : 0);
      const mixB = pB.isPulsed ? (pB.pulseTime / 0.3) * 0.8 : (pB.isHovered ? 0.3 : 0);
      const lcA = pA.originalColor.clone().lerp(PULSE_COLOR, mixA);
      const lcB = pB.originalColor.clone().lerp(PULSE_COLOR, mixB);
      colorArr[i * 6] = lcA.r;
      colorArr[i * 6 + 1] = lcA.g;
      colorArr[i * 6 + 2] = lcA.b;
      colorArr[i * 6 + 3] = lcB.r;
      colorArr[i * 6 + 4] = lcB.g;
      colorArr[i * 6 + 5] = lcB.b;
    }

    posAttr.needsUpdate = true;
    opacityAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
  }

  public handlePointerMove(normalizedX: number, normalizedY: number): void {
    this.pointer.set(normalizedX, normalizedY);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObject(this.particleMesh);

    let newHoveredIndex = -1;
    if (intersects.length > 0) {
      const idx = intersects[0].index;
      if (idx !== undefined && idx >= 0 && idx < this.particles.length) {
        newHoveredIndex = idx;
      }
    }

    if (newHoveredIndex !== this.hoveredIndex) {
      if (this.hoveredIndex >= 0 && this.hoveredIndex < this.particles.length) {
        this.particles[this.hoveredIndex].isHovered = false;
      }
      this.hoveredIndex = newHoveredIndex;
      if (this.hoveredIndex >= 0) {
        this.particles[this.hoveredIndex].isHovered = true;
      }
      this.updateHoverCallback();
    }
  }

  private updateHoverCallback(): void {
    if (this.onHover) {
      if (this.hoveredIndex >= 0 && this.hoveredIndex < this.particles.length) {
        const p = this.particles[this.hoveredIndex];
        const word = p.wordData?.word ?? null;
        this.onHover(word, p.position.clone());
      } else {
        this.onHover(null, null);
      }
    }
  }

  public handleClick(normalizedX: number, normalizedY: number): void {
    this.pointer.set(normalizedX, normalizedY);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObject(this.particleMesh);

    if (intersects.length > 0) {
      const idx = intersects[0].index;
      if (idx !== undefined && idx >= 0 && idx < this.particles.length) {
        const p = this.particles[idx];
        this.pulseWaves.push({
          center: p.position.clone(),
          radius: 0,
          maxRadius: 30,
          duration: 1,
          elapsed: 0,
          active: true
        });
        if (this.onClick) {
          this.onClick(p.wordData?.word ?? null);
        }
      }
    }
  }

  public dispose(): void {
    this.scene.remove(this.particleMesh);
    this.scene.remove(this.lineMesh);
    this.scene.remove(this.pulseMesh);
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
    this.lineGeometry.dispose();
    this.lineMaterial.dispose();
    this.pulseMesh.geometry.dispose();
    this.pulseMaterial.dispose();
  }
}
