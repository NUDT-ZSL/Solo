import * as THREE from 'three';
import { StarPointData, StarConnectionData } from './transformer';

type AnimPhase = 'idle' | 'preparing' | 'flying_out' | 'pulsing' | 'connecting' | 'rotating';

const MAX_STARS = 200;
const TRAIL_LENGTH = 12;
const TRAIL_DURATION_SEC = 0.2;
const GLOW_POOL_SIZE = 50;
const GLOW_DURATION_MS = 300;
const CONNECT_FADE_DURATION_MS = 500;
const PIXEL_RATIO = Math.min(window.devicePixelRatio, 2);

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

function hexToRgb(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

export interface StarSystemCallbacks {
  onProgress?: (reachedCount: number, total: number) => void;
  onComplete?: () => void;
}

export class StarSystem {
  private scene: THREE.Scene;
  private group: THREE.Group;
  private callbacks: StarSystemCallbacks;

  private phase: AnimPhase = 'idle';
  private phaseStartTime = 0;
  private connectStartTime = 0;
  private maxDelay = 0;
  private maxDuration = 0;
  private flightStartTime = 0;

  private stars: StarPointData[] = [];
  private connections: StarConnectionData[] = [];
  private starReached: boolean[] = [];

  private starsMesh: THREE.InstancedMesh | null = null;
  private starsMaterial: THREE.ShaderMaterial | null = null;
  private dummyObj = new THREE.Object3D();
  private tmpColor = new THREE.Color();
  private tmpVec = new THREE.Vector3();

  private trailPoints: THREE.Points | null = null;
  private trailPositions: Float32Array | null = null;
  private trailColors: Float32Array | null = null;
  private trailLastUpdate: number[] = [];

  private glowMesh: THREE.InstancedMesh | null = null;
  private glowPool: {
    active: boolean;
    startTime: number;
    position: THREE.Vector3;
    color: THREE.Color;
  }[] = [];

  private lineSegments: THREE.LineSegments | null = null;
  private lineMaterial: THREE.ShaderMaterial | null = null;

  private rotationSpeed = 1.5;
  private timeUniform = { value: 0 };
  private animTimeUniform = { value: 0 };

  constructor(scene: THREE.Scene, callbacks: StarSystemCallbacks = {}) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.initLayers();
  }

  private initLayers(): void {
    this.initStarsMesh();
    this.initTrails();
    this.initGlows();
    this.initLines();
  }

  private initStarsMesh(): void {
    const geometry = new THREE.SphereGeometry(0.45, 20, 20);
    this.starsMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: this.timeUniform,
        uAnimTime: this.animTimeUniform,
      },
      vertexShader: `
        uniform float uTime;
        uniform float uAnimTime;

        attribute vec3 aStartPos;
        attribute vec3 aControlPos;
        attribute vec3 aTargetPos;
        attribute vec3 aColor;
        attribute float aBrightness;
        attribute float aDelay;
        attribute float aDuration;

        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying vec3 vColor;
        varying float vBrightness;
        varying float vAlpha;

        vec3 bezier(vec3 p0, vec3 p1, vec3 p2, float t) {
          float u = 1.0 - t;
          return u * u * p0 + 2.0 * u * t * p1 + t * t * p2;
        }

        float easeOutCubic(float t) {
          return 1.0 - pow(1.0 - t, 3.0);
        }

        float easeOutQuad(float t) {
          return 1.0 - (1.0 - t) * (1.0 - t);
        }

        void main() {
          float elapsed = max(0.0, uAnimTime - aDelay);
          float rawT = min(1.0, elapsed / aDuration);
          float t = easeOutCubic(rawT);

          vec3 pos;
          if (uAnimTime < aDelay) {
            pos = aStartPos;
            vAlpha = 0.0;
          } else if (rawT < 1.0) {
            pos = bezier(aStartPos, aControlPos, aTargetPos, t);
            vAlpha = easeOutQuad(min(1.0, elapsed / 180.0));
          } else {
            pos = aTargetPos;
            vAlpha = 1.0;
          }

          vec4 worldPos = instanceMatrix * vec4(pos, 1.0);
          vWorldPos = worldPos.xyz;

          mat3 normalMat = mat3(instanceMatrix);
          vNormal = normalize(normalMatrix * normalMat * normal);
          vColor = aColor;
          vBrightness = aBrightness;

          float baseScale = aBrightness * 0.5 + 0.4;
          float appearScale = easeOutQuad(min(1.0, elapsed / 180.0));
          float scale = baseScale * appearScale;

          vec3 scaledPos = position * scale;
          vec4 finalWorld = instanceMatrix * vec4(pos + scaledPos, 1.0);
          vWorldPos = finalWorld.xyz;

          vec4 mv = viewMatrix * finalWorld;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying vec3 vColor;
        varying float vBrightness;
        varying float vAlpha;

        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 2.0);
          float pulse = 0.85 + 0.15 * sin(uTime * 2.0 + vWorldPos.x * 3.0);
          vec3 color = vColor * vBrightness * pulse;
          vec3 glow = vColor * fresnel * 1.6 * vBrightness;
          vec3 final = color + glow;
          float alpha = (0.85 + fresnel * 0.15) * vAlpha;
          gl_FragColor = vec4(final, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.starsMesh = new THREE.InstancedMesh(geometry, this.starsMaterial, MAX_STARS);
    this.starsMesh.count = 0;
    this.starsMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const initF32 = (n: number, size: number) => {
      const arr = new Float32Array(n * size);
      const attr = new THREE.InstancedBufferAttribute(arr, size);
      attr.setUsage(THREE.DynamicDrawUsage);
      return { arr, attr };
    };

    const start = initF32(MAX_STARS, 3);
    const control = initF32(MAX_STARS, 3);
    const target = initF32(MAX_STARS, 3);
    const color = initF32(MAX_STARS, 3);
    const brightness = initF32(MAX_STARS, 1);
    const delay = initF32(MAX_STARS, 1);
    const duration = initF32(MAX_STARS, 1);

    this.starsMesh.geometry.setAttribute('aStartPos', start.attr);
    this.starsMesh.geometry.setAttribute('aControlPos', control.attr);
    this.starsMesh.geometry.setAttribute('aTargetPos', target.attr);
    this.starsMesh.geometry.setAttribute('aColor', color.attr);
    this.starsMesh.geometry.setAttribute('aBrightness', brightness.attr);
    this.starsMesh.geometry.setAttribute('aDelay', delay.attr);
    this.starsMesh.geometry.setAttribute('aDuration', duration.attr);

    this.group.add(this.starsMesh);
  }

  private initTrails(): void {
    const totalVerts = MAX_STARS * TRAIL_LENGTH;
    const positions = new Float32Array(totalVerts * 3);
    const colors = new Float32Array(totalVerts * 3);
    const ages = new Float32Array(totalVerts);
    const sizes = new Float32Array(totalVerts);

    for (let i = 0; i < totalVerts; i++) {
      ages[i] = 1;
      sizes[i] = 0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aAge', new THREE.BufferAttribute(ages, 1).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1).setUsage(THREE.DynamicDrawUsage));

    const material = new THREE.ShaderMaterial({
      uniforms: { uPixelRatio: { value: PIXEL_RATIO } },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aAge;
        attribute float aSize;
        varying vec3 vColor;
        varying float vAge;
        uniform float uPixelRatio;
        void main() {
          vColor = aColor;
          vAge = aAge;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (280.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAge;
        void main() {
          vec2 c = gl_PointCoord - vec2(0.5);
          float d = length(c);
          if (d > 0.5) discard;
          float core = smoothstep(0.5, 0.0, d);
          float alpha = core * (1.0 - vAge);
          gl_FragColor = vec4(vColor * (0.5 + 0.5 * (1.0 - vAge)), alpha * 0.8);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.trailPoints = new THREE.Points(geometry, material);
    this.trailPositions = positions;
    this.trailColors = colors;
    this.trailLastUpdate = new Array(MAX_STARS).fill(0);

    this.group.add(this.trailPoints);
  }

  private initGlows(): void {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: `
        attribute vec3 aColor;
        attribute float aAlpha;
        attribute float aScale;
        varying vec3 vColor;
        varying float vAlpha;
        varying vec2 vUv;

        void main() {
          vColor = aColor;
          vAlpha = aAlpha;
          vUv = uv;

          vec4 worldCenter = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
          vec3 camUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          vec3 worldPos = worldCenter.xyz
            + camRight * position.x * aScale
            + camUp * position.y * aScale;

          vec4 mv = viewMatrix * vec4(worldPos, 1.0);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        varying vec2 vUv;

        void main() {
          vec2 c = vUv - vec2(0.5);
          float d = length(c);
          if (d > 0.5) discard;
          float falloff = pow(1.0 - d * 2.0, 1.5);
          gl_FragColor = vec4(vColor * (0.6 + falloff * 0.8), falloff * vAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    this.glowMesh = new THREE.InstancedMesh(geometry, material, GLOW_POOL_SIZE);
    this.glowMesh.count = 0;
    this.glowMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const initIAttr = (n: number, size: number) => {
      const arr = new Float32Array(n * size);
      const attr = new THREE.InstancedBufferAttribute(arr, size);
      attr.setUsage(THREE.DynamicDrawUsage);
      return attr;
    };

    this.glowMesh.geometry.setAttribute('aColor', initIAttr(GLOW_POOL_SIZE, 3));
    this.glowMesh.geometry.setAttribute('aAlpha', initIAttr(GLOW_POOL_SIZE, 1));
    this.glowMesh.geometry.setAttribute('aScale', initIAttr(GLOW_POOL_SIZE, 1));

    for (let i = 0; i < GLOW_POOL_SIZE; i++) {
      this.glowPool.push({
        active: false,
        startTime: 0,
        position: new THREE.Vector3(),
        color: new THREE.Color(),
      });
    }

    this.group.add(this.glowMesh);
  }

  private initLines(): void {
    const maxSegments = MAX_STARS * 3;
    const positions = new Float32Array(maxSegments * 2 * 3);
    const colors = new Float32Array(maxSegments * 2 * 3);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setDrawRange(0, 0);

    this.lineMaterial = new THREE.ShaderMaterial({
      uniforms: { uGlobalAlpha: { value: 0 } },
      vertexShader: `
        attribute vec3 aColor;
        varying vec3 vColor;
        void main() {
          vColor = aColor;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uGlobalAlpha;
        varying vec3 vColor;
        void main() {
          gl_FragColor = vec4(vColor * 0.85, uGlobalAlpha * 0.45);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.lineSegments = new THREE.LineSegments(geometry, this.lineMaterial);
    this.group.add(this.lineSegments);
  }

  setStars(
    data: StarPointData[],
    connections: StarConnectionData[],
    maxDelay: number,
    maxDuration: number
  ): void {
    this.clear();
    this.stars = data;
    this.connections = connections;
    this.starReached = new Array(data.length).fill(false);
    this.maxDelay = maxDelay;
    this.maxDuration = maxDuration;

    if (!this.starsMesh) return;

    const getAttr = (name: string) =>
      this.starsMesh!.geometry.getAttribute(name) as THREE.InstancedBufferAttribute;

    const startAttr = getAttr('aStartPos');
    const controlAttr = getAttr('aControlPos');
    const targetAttr = getAttr('aTargetPos');
    const colorAttr = getAttr('aColor');
    const brightAttr = getAttr('aBrightness');
    const delayAttr = getAttr('aDelay');
    const durationAttr = getAttr('aDuration');

    for (let i = 0; i < data.length; i++) {
      const s = data[i];

      startAttr.setXYZ(i, s.startPosition.x, s.startPosition.y, s.startPosition.z);
      controlAttr.setXYZ(i, s.controlPosition.x, s.controlPosition.y, s.controlPosition.z);
      targetAttr.setXYZ(i, s.targetPosition.x, s.targetPosition.y, s.targetPosition.z);

      const rgb = hexToRgb(s.color);
      colorAttr.setXYZ(i, rgb.r, rgb.g, rgb.b);
      brightAttr.setX(i, s.brightness);
      delayAttr.setX(i, s.delay);
      durationAttr.setX(i, s.duration);

      this.dummyObj.position.copy(s.targetPosition);
      this.dummyObj.updateMatrix();
      this.starsMesh.setMatrixAt(i, this.dummyObj.matrix);
    }

    this.starsMesh.count = data.length;
    this.starsMesh.instanceMatrix.needsUpdate = true;
    startAttr.needsUpdate = true;
    controlAttr.needsUpdate = true;
    targetAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    brightAttr.needsUpdate = true;
    delayAttr.needsUpdate = true;
    durationAttr.needsUpdate = true;

    for (let i = 0; i < data.length; i++) {
      this.trailLastUpdate[i] = -9999;
    }
    this.hideTrails();

    this.phase = 'preparing';
    this.phaseStartTime = performance.now();
    this.animTimeUniform.value = 0;
  }

  private hideTrails(): void {
    if (!this.trailPoints) return;
    const ageAttr = this.trailPoints.geometry.getAttribute('aAge') as THREE.BufferAttribute;
    for (let i = 0; i < MAX_STARS * TRAIL_LENGTH; i++) ageAttr.setX(i, 1);
    ageAttr.needsUpdate = true;
  }

  setRotationSpeed(degPerSec: number): void {
    this.rotationSpeed = degPerSec;
  }

  clear(): void {
    this.stars = [];
    this.connections = [];
    this.starReached = [];
    this.phase = 'idle';

    if (this.starsMesh) this.starsMesh.count = 0;
    if (this.lineSegments) this.lineSegments.geometry.setDrawRange(0, 0);
    if (this.lineMaterial) this.lineMaterial.uniforms.uGlobalAlpha.value = 0;
    this.hideTrails();

    for (const g of this.glowPool) g.active = false;
    if (this.glowMesh) this.glowMesh.count = 0;

    this.animTimeUniform.value = 0;
  }

  start(): void {
    if (this.phase === 'idle' || this.stars.length === 0) return;
    this.phase = 'flying_out';
    this.flightStartTime = performance.now();
    this.phaseStartTime = this.flightStartTime;
    this.animTimeUniform.value = 0;
  }

  private spawnGlow(position: THREE.Vector3, colorHex: string): void {
    for (let i = 0; i < this.glowPool.length; i++) {
      if (!this.glowPool[i].active) {
        this.glowPool[i].active = true;
        this.glowPool[i].startTime = performance.now();
        this.glowPool[i].position.copy(position);
        this.glowPool[i].color.set(colorHex);
        return;
      }
    }
  }

  private updateTrail(starIdx: number, pos: THREE.Vector3, colorHex: string, now: number): void {
    if (!this.trailPoints || !this.trailPositions || !this.trailColors) return;

    const slot = (Math.floor(now / (TRAIL_DURATION_SEC * 1000 / TRAIL_LENGTH)) + starIdx) % TRAIL_LENGTH;
    const absIdx = starIdx * TRAIL_LENGTH + slot;

    this.trailPositions[absIdx * 3 + 0] = pos.x;
    this.trailPositions[absIdx * 3 + 1] = pos.y;
    this.trailPositions[absIdx * 3 + 2] = pos.z;

    const rgb = hexToRgb(colorHex);
    this.trailColors[absIdx * 3 + 0] = rgb.r;
    this.trailColors[absIdx * 3 + 1] = rgb.g;
    this.trailColors[absIdx * 3 + 2] = rgb.b;

    const ageAttr = this.trailPoints.geometry.getAttribute('aAge') as THREE.BufferAttribute;
    const sizeAttr = this.trailPoints.geometry.getAttribute('aSize') as THREE.BufferAttribute;
    const colorAttr = this.trailPoints.geometry.getAttribute('aColor') as THREE.BufferAttribute;
    const posAttr = this.trailPoints.geometry.getAttribute('position') as THREE.BufferAttribute;

    for (let k = 0; k < TRAIL_LENGTH; k++) {
      const idx = starIdx * TRAIL_LENGTH + k;
      const relAge = (k - slot + TRAIL_LENGTH) % TRAIL_LENGTH / (TRAIL_LENGTH - 1);
      ageAttr.setX(idx, relAge);
      sizeAttr.setX(idx, 5.5 * (1 - relAge * 0.85));
    }

    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    ageAttr.needsUpdate = true;

    this.trailLastUpdate[starIdx] = now;
  }

  private computeStarPosition(star: StarPointData, animTimeMs: number): THREE.Vector3 | null {
    const elapsed = animTimeMs - star.delay;
    if (elapsed < 0) return null;

    const rawT = Math.min(1, elapsed / star.duration);
    const t = easeOutCubic(rawT);

    const p0 = star.startPosition;
    const p1 = star.controlPosition;
    const p2 = star.targetPosition;
    const u = 1 - t;

    this.tmpVec.set(
      u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
      u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
      u * u * p0.z + 2 * u * t * p1.z + t * t * p2.z
    );

    return rawT >= 1 ? star.targetPosition : this.tmpVec;
  }

  private updateStars(now: number, animTimeMs: number): void {
    if (!this.stars.length) return;

    const count = this.stars.length;
    let reachedCount = 0;

    for (let i = 0; i < count; i++) {
      const s = this.stars[i];
      const elapsed = animTimeMs - s.delay;

      if (elapsed < 0) continue;

      const rawT = Math.min(1, elapsed / s.duration);
      const pos = this.computeStarPosition(s, animTimeMs);

      if (pos && rawT < 1) {
        this.updateTrail(i, pos, s.color, now);
      }

      if (rawT >= 1 && !this.starReached[i]) {
        this.starReached[i] = true;
        this.spawnGlow(s.targetPosition, s.color);
      }

      if (this.starReached[i]) reachedCount++;
    }

    if (this.starsMesh && this.starsMaterial) {
      this.starsMaterial.uniforms.uTime.value = now / 1000;
      this.starsMaterial.uniforms.uAnimTime.value = animTimeMs;
    }

    if (this.callbacks.onProgress) {
      this.callbacks.onProgress(reachedCount, count);
    }

    const firstReached = this.starReached.some(r => r);
    const pct = reachedCount / count;

    if (this.phase === 'flying_out' && firstReached) {
      this.phase = 'pulsing';
    }
    if (this.phase === 'pulsing' && pct >= 0.9) {
      this.phase = 'connecting';
      this.connectStartTime = now;
      this.buildLineGeometry();
    }
    if (pct >= 1 && this.phase !== 'rotating') {
      this.phase = 'rotating';
      if (this.callbacks.onComplete) this.callbacks.onComplete();
    }
  }

  private buildLineGeometry(): void {
    if (!this.lineSegments || !this.trailPositions || !this.trailColors) return;

    const posAttr = this.lineSegments.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colorAttr = this.lineSegments.geometry.getAttribute('aColor') as THREE.BufferAttribute;

    const idToStar = new Map(this.stars.map(s => [s.id, s]));
    let segIdx = 0;

    for (const conn of this.connections) {
      const a = idToStar.get(conn.fromId);
      const b = idToStar.get(conn.toId);
      if (!a || !b) continue;

      const vertA = segIdx * 2 * 3;
      const vertB = (segIdx * 2 + 1) * 3;

      posAttr.setX(segIdx * 2, a.targetPosition.x);
      posAttr.setY(segIdx * 2, a.targetPosition.y);
      posAttr.setZ(segIdx * 2, a.targetPosition.z);
      posAttr.setX(segIdx * 2 + 1, b.targetPosition.x);
      posAttr.setY(segIdx * 2 + 1, b.targetPosition.y);
      posAttr.setZ(segIdx * 2 + 1, b.targetPosition.z);

      const ca = hexToRgb(a.color);
      const cb = hexToRgb(b.color);
      const boost = 0.3 + conn.distance * 0.95;
      colorAttr.setXYZ(segIdx * 2, ca.r * boost, ca.g * boost, ca.b * boost);
      colorAttr.setXYZ(segIdx * 2 + 1, cb.r * boost, cb.g * boost, cb.b * boost);

      segIdx++;
      if (segIdx >= MAX_STARS * 3) break;
    }

    this.lineSegments.geometry.setDrawRange(0, segIdx * 2);
    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
  }

  private updateGlows(now: number): void {
    if (!this.glowMesh) return;

    const colorAttr = this.glowMesh.geometry.getAttribute('aColor') as THREE.InstancedBufferAttribute;
    const alphaAttr = this.glowMesh.geometry.getAttribute('aAlpha') as THREE.InstancedBufferAttribute;
    const scaleAttr = this.glowMesh.geometry.getAttribute('aScale') as THREE.InstancedBufferAttribute;

    let activeCount = 0;
    for (let i = 0; i < this.glowPool.length; i++) {
      const g = this.glowPool[i];
      if (!g.active) continue;

      const elapsed = now - g.startTime;
      const t = Math.min(1, elapsed / GLOW_DURATION_MS);

      if (t >= 1) {
        g.active = false;
        continue;
      }

      this.dummyObj.position.copy(g.position);
      const scale = easeOutQuad(t) * 1.8 + 0.2;
      this.dummyObj.scale.setScalar(scale);
      this.dummyObj.updateMatrix();
      this.glowMesh.setMatrixAt(activeCount, this.dummyObj.matrix);

      colorAttr.setXYZ(activeCount, g.color.r, g.color.g, g.color.b);
      const alpha = (1 - t) * 0.95;
      alphaAttr.setX(activeCount, alpha);
      scaleAttr.setX(activeCount, scale);

      activeCount++;
    }

    this.glowMesh.count = activeCount;
    if (activeCount > 0) {
      this.glowMesh.instanceMatrix.needsUpdate = true;
      colorAttr.needsUpdate = true;
      alphaAttr.needsUpdate = true;
      scaleAttr.needsUpdate = true;
    }
  }

  private updateConnections(now: number): void {
    if (!this.lineMaterial) return;
    if (this.phase === 'connecting' || this.phase === 'rotating') {
      const t = Math.min(1, (now - this.connectStartTime) / CONNECT_FADE_DURATION_MS);
      this.lineMaterial.uniforms.uGlobalAlpha.value = easeOutQuad(t);
    } else {
      this.lineMaterial.uniforms.uGlobalAlpha.value = 0;
    }
  }

  private updateRotation(dt: number): void {
    if (this.phase !== 'rotating' && this.phase !== 'connecting') return;
    const radPerSec = (this.rotationSpeed * Math.PI) / 180;
    this.group.rotation.y += radPerSec * dt;
  }

  update(now: number, dt: number): void {
    let animTimeMs = 0;
    if (this.phase === 'flying_out' || this.phase === 'pulsing' ||
        this.phase === 'connecting' || this.phase === 'rotating') {
      animTimeMs = now - this.flightStartTime;
      this.updateStars(now, animTimeMs);
    }
    this.updateGlows(now);
    this.updateConnections(now);
    this.updateRotation(dt);
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  getStarCount(): number {
    return this.stars.length;
  }
}
