import * as THREE from 'three';

export interface BubbleData {
  id: number;
  position: THREE.Vector3;
  baseRadius: number;
  color: THREE.Color;
  velocity: THREE.Vector3;
  speed: number;
  directionChangeTimer: number;
  pulsePhase: number;
  pulsePeriod: number;
  noiseDensity: number;
  isFlashing: boolean;
  flashTimer: number;
  expansionTimer: number;
  isFocused: boolean;
  focusOpacity: number;
}

const BUBBLE_COUNT = 800;
const SPHERE_RADIUS = 300;
const MIN_DISTANCE = 8;
const MIN_RADIUS = 3;
const MAX_RADIUS = 15;
const MEAN_RADIUS = 8;
const STD_RADIUS = 3;
const MIN_SPEED = 0.2;
const MAX_SPEED = 0.8;
const DIRECTION_CHANGE_INTERVAL = 2;
const MIN_PULSE_PERIOD = 1.5;
const MAX_PULSE_PERIOD = 2.5;
const PULSE_AMPLITUDE = 0.05;
const COLOR_SMALL = new THREE.Color(0x6366f1);
const COLOR_LARGE = new THREE.Color(0xf97316);
const SPHERE_BOUNCE_DAMPING = 0.95;

export class BubbleSystem {
  public bubbles: BubbleData[] = [];
  public instancedMesh: THREE.InstancedMesh;
  public group: THREE.Group = new THREE.Group();

  private dummy: THREE.Object3D = new THREE.Object3D();
  private tempColor: THREE.Color = new THREE.Color();
  private geometry: THREE.SphereGeometry;
  private material: THREE.ShaderMaterial;

  constructor() {
    this.geometry = new THREE.SphereGeometry(1, 16, 12);
    this.material = this.createBubbleMaterial();
    this.instancedMesh = new THREE.InstancedMesh(this.geometry, this.material, BUBBLE_COUNT);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.generateBubbles();
    this.group.add(this.instancedMesh);
  }

  private createBubbleMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        attribute vec3 aBaseColor;
        attribute float aNoiseDensity;
        attribute float aPulsePhase;
        attribute float aPulsePeriod;
        attribute float aFlashIntensity;
        attribute float aExpansion;
        attribute float aFocusScale;

        uniform float uTime;
        uniform float uPixelRatio;

        varying vec3 vNormal;
        varying vec3 vBaseColor;
        varying vec3 vViewDir;
        varying float vNoiseDensity;
        varying float vFlashIntensity;
        varying float vFocusScale;

        float hash(vec3 p) {
          p = fract(p * vec3(443.897, 441.423, 437.195));
          p += dot(p, p.yxz + 19.19);
          return fract((p.x + p.y) * p.z);
        }

        float noise(vec3 p) {
          vec3 i = floor(p);
          vec3 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);

          float n = mix(
            mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
            mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
            f.z
          );
          return n;
        }

        void main() {
          float pulse = sin(uTime * 6.28318 / aPulsePeriod + aPulsePhase);
          float totalScale = aFocusScale * (1.0 + 0.05 * pulse + aExpansion);

          float displacement = noise(normal * (3.0 + aNoiseDensity * 5.0) + uTime * 0.3) * 0.08 * aNoiseDensity;
          vec3 displaced = normal * displacement;

          vec3 newPosition = position * totalScale + displaced;

          vNormal = normalize(normalMatrix * (normal + displacement * 0.5));
          vBaseColor = aBaseColor;
          vNoiseDensity = aNoiseDensity;
          vFlashIntensity = aFlashIntensity;
          vFocusScale = aFocusScale;

          vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
          vViewDir = normalize(-mvPosition.xyz);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vBaseColor;
        varying vec3 vViewDir;
        varying float vNoiseDensity;
        varying float vFlashIntensity;
        varying float vFocusScale;

        float hash(vec3 p) {
          p = fract(p * vec3(443.897, 441.423, 437.195));
          p += dot(p, p.yxz + 19.19);
          return fract((p.x + p.y) * p.z);
        }

        float noise(vec3 p) {
          vec3 i = floor(p);
          vec3 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);

          float n = mix(
            mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
            mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
            f.z
          );
          return n;
        }

        void main() {
          float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 2.5);

          float n = noise(vNormal * (4.0 + vNoiseDensity * 8.0)) * vNoiseDensity * 0.15;

          vec3 baseColor = vBaseColor + vec3(n * 0.5, n * 0.3, n * 0.6);
          vec3 rimColor = baseColor * 1.8;
          vec3 finalColor = mix(baseColor * 0.7, rimColor, fresnel * 0.8);

          finalColor += vFlashIntensity * vec3(0.3, 0.3, 0.3);

          float alpha = 0.35 + fresnel * 0.4;
          alpha *= 0.8 + vFocusScale * 0.2;

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
  }

  private generateGaussian(mean: number, std: number): number {
    let u1 = 0, u2 = 0;
    while (u1 === 0) u1 = Math.random();
    while (u2 === 0) u2 = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z * std + mean;
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

  private isValidPosition(pos: THREE.Vector3): boolean {
    for (const b of this.bubbles) {
      if (pos.distanceTo(b.position) < MIN_DISTANCE) return false;
    }
    return true;
  }

  private generateBubbles(): void {
    const baseColorAttr = new Float32Array(BUBBLE_COUNT * 3);
    const noiseDensityAttr = new Float32Array(BUBBLE_COUNT);
    const pulsePhaseAttr = new Float32Array(BUBBLE_COUNT);
    const pulsePeriodAttr = new Float32Array(BUBBLE_COUNT);
    const flashIntensityAttr = new Float32Array(BUBBLE_COUNT);
    const expansionAttr = new Float32Array(BUBBLE_COUNT);
    const focusScaleAttr = new Float32Array(BUBBLE_COUNT);

    let attempts = 0;
    const maxAttempts = BUBBLE_COUNT * 50;

    while (this.bubbles.length < BUBBLE_COUNT && attempts < maxAttempts) {
      const pos = this.randomPointInSphere(SPHERE_RADIUS);
      if (!this.isValidPosition(pos)) {
        attempts++;
        continue;
      }

      let radius = this.generateGaussian(MEAN_RADIUS, STD_RADIUS);
      radius = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, radius));

      const t = (radius - MIN_RADIUS) / (MAX_RADIUS - MIN_RADIUS);
      const color = COLOR_SMALL.clone().lerp(COLOR_LARGE, t);

      const speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(speed);

      const noiseDensity = 0.3 + t * 0.7;

      const idx = this.bubbles.length;
      this.bubbles.push({
        id: idx,
        position: pos,
        baseRadius: radius,
        color: color,
        velocity: velocity,
        speed: speed,
        directionChangeTimer: Math.random() * DIRECTION_CHANGE_INTERVAL,
        pulsePhase: Math.random() * Math.PI * 2,
        pulsePeriod: MIN_PULSE_PERIOD + Math.random() * (MAX_PULSE_PERIOD - MIN_PULSE_PERIOD),
        noiseDensity: noiseDensity,
        isFlashing: false,
        flashTimer: 0,
        expansionTimer: 0,
        isFocused: false,
        focusOpacity: 1.0
      });

      baseColorAttr[idx * 3] = color.r;
      baseColorAttr[idx * 3 + 1] = color.g;
      baseColorAttr[idx * 3 + 2] = color.b;
      noiseDensityAttr[idx] = noiseDensity;
      pulsePhaseAttr[idx] = this.bubbles[idx].pulsePhase;
      pulsePeriodAttr[idx] = this.bubbles[idx].pulsePeriod;
      flashIntensityAttr[idx] = 0;
      expansionAttr[idx] = 0;
      focusScaleAttr[idx] = 1.0;

      attempts++;
    }

    this.geometry.setAttribute('aBaseColor', new THREE.InstancedBufferAttribute(baseColorAttr, 3));
    this.geometry.setAttribute('aNoiseDensity', new THREE.InstancedBufferAttribute(noiseDensityAttr, 1));
    this.geometry.setAttribute('aPulsePhase', new THREE.InstancedBufferAttribute(pulsePhaseAttr, 1));
    this.geometry.setAttribute('aPulsePeriod', new THREE.InstancedBufferAttribute(pulsePeriodAttr, 1));
    this.geometry.setAttribute('aFlashIntensity', new THREE.InstancedBufferAttribute(flashIntensityAttr, 1));
    this.geometry.setAttribute('aExpansion', new THREE.InstancedBufferAttribute(expansionAttr, 1));
    this.geometry.setAttribute('aFocusScale', new THREE.InstancedBufferAttribute(focusScaleAttr, 1));

    this.updateInstanceMatrices();
  }

  private updateInstanceMatrices(): void {
    const flashAttr = this.geometry.getAttribute('aFlashIntensity') as THREE.InstancedBufferAttribute;
    const expansionAttr = this.geometry.getAttribute('aExpansion') as THREE.InstancedBufferAttribute;
    const focusScaleAttr = this.geometry.getAttribute('aFocusScale') as THREE.InstancedBufferAttribute;

    for (let i = 0; i < this.bubbles.length; i++) {
      const b = this.bubbles[i];

      let expansion = 0;
      if (b.expansionTimer > 0) {
        const t = b.expansionTimer / 0.4;
        expansion = Math.sin(t * Math.PI) * 0.5;
      }

      let focusScale = 1.0;
      if (b.isFocused) focusScale = 1.1;

      const r = b.baseRadius;
      this.dummy.position.copy(b.position);
      this.dummy.scale.setScalar(r);
      this.dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);

      flashAttr.setX(i, b.isFlashing ? 0.3 : 0);
      expansionAttr.setX(i, expansion);
      focusScaleAttr.setX(i, focusScale);
    }

    flashAttr.needsUpdate = true;
    expansionAttr.needsUpdate = true;
    focusScaleAttr.needsUpdate = true;
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  public triggerClick(bubbleId: number): void {
    const b = this.bubbles[bubbleId];
    if (b) {
      b.expansionTimer = 0.4;
    }
  }

  public triggerFlash(bubbleId: number): void {
    const b = this.bubbles[bubbleId];
    if (b) {
      b.isFlashing = true;
      b.flashTimer = 0.2;
    }
  }

  public setFocusedBubbles(connectedIds: Set<number>): void {
    for (const b of this.bubbles) {
      if (connectedIds.has(b.id)) {
        b.isFocused = true;
        b.focusOpacity = 1.0;
      } else {
        b.isFocused = false;
        b.focusOpacity = 0.2;
      }
    }
  }

  public clearFocus(): void {
    for (const b of this.bubbles) {
      b.isFocused = false;
      b.focusOpacity = 1.0;
    }
  }

  public update(deltaTime: number, currentTime: number): void {
    for (const b of this.bubbles) {
      b.directionChangeTimer -= deltaTime;
      if (b.directionChangeTimer <= 0) {
        b.directionChangeTimer = DIRECTION_CHANGE_INTERVAL;
        b.velocity.set(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        ).normalize().multiplyScalar(b.speed);
      }

      b.position.addScaledVector(b.velocity, deltaTime);

      const distFromCenter = b.position.length();
      if (distFromCenter > SPHERE_RADIUS) {
        const normal = b.position.clone().normalize();
        b.velocity.reflect(normal).multiplyScalar(SPHERE_BOUNCE_DAMPING);
        b.position.copy(normal.multiplyScalar(SPHERE_RADIUS - 0.1));
      }

      if (b.flashTimer > 0) {
        b.flashTimer -= deltaTime;
        if (b.flashTimer <= 0) b.isFlashing = false;
      }

      if (b.expansionTimer > 0) {
        b.expansionTimer -= deltaTime;
        if (b.expansionTimer < 0) b.expansionTimer = 0;
      }
    }

    this.material.uniforms.uTime.value = currentTime;
    this.updateInstanceMatrices();
  }

  public getBubblePositions(): Float32Array {
    const arr = new Float32Array(this.bubbles.length * 3);
    for (let i = 0; i < this.bubbles.length; i++) {
      arr[i * 3] = this.bubbles[i].position.x;
      arr[i * 3 + 1] = this.bubbles[i].position.y;
      arr[i * 3 + 2] = this.bubbles[i].position.z;
    }
    return arr;
  }

  public getBubbleColors(): Float32Array {
    const arr = new Float32Array(this.bubbles.length * 3);
    for (let i = 0; i < this.bubbles.length; i++) {
      arr[i * 3] = this.bubbles[i].color.r;
      arr[i * 3 + 1] = this.bubbles[i].color.g;
      arr[i * 3 + 2] = this.bubbles[i].color.b;
    }
    return arr;
  }

  public getBubbleRadii(): Float32Array {
    const arr = new Float32Array(this.bubbles.length);
    for (let i = 0; i < this.bubbles.length; i++) {
      arr[i] = this.bubbles[i].baseRadius;
    }
    return arr;
  }

  public findBubblesInRadius(center: THREE.Vector3, radius: number): number[] {
    const ids: number[] = [];
    for (const b of this.bubbles) {
      if (b.position.distanceTo(center) < radius) {
        ids.push(b.id);
      }
    }
    return ids;
  }
}
