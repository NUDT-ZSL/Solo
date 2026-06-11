import * as THREE from 'three';
import { StarPointData, StarConnectionData } from './transformer';

type AnimPhase = 'idle' | 'preparing' | 'flying' | 'pulsing' | 'connecting' | 'rotating';

const MAX_STARS = 200;
const TRAIL_LENGTH = 12;
const GLOW_POOL_SIZE = 50;
const GLOW_DURATION = 300;
const CONNECT_FADE_DURATION = 500;

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

  private stars: StarPointData[] = [];
  private connections: StarConnectionData[] = [];
  private starReached: boolean[] = [];

  private starsMesh: THREE.InstancedMesh | null = null;
  private starColors: Float32Array | null = null;
  private dummyObj = new THREE.Object3D();
  private tmpColor = new THREE.Color();
  private tmpVecA = new THREE.Vector3();
  private tmpVecB = new THREE.Vector3();
  private tmpVecC = new THREE.Vector3();
  private tmpVecCtrl = new THREE.Vector3();

  private trailPoints: THREE.Points | null = null;
  private trailPositions: Float32Array | null = null;
  private trailColors: Float32Array | null = null;
  private trailSizes: Float32Array | null = null;
  private trailHead: number[] = [];

  private glowMesh: THREE.InstancedMesh | null = null;
  private glowPool: { active: boolean; startTime: number; position: THREE.Vector3; color: THREE.Color }[] = [];

  private lineSegments: THREE.LineSegments | null = null;
  private linePositions: Float32Array | null = null;
  private lineColors: Float32Array | null = null;

  private rotationSpeed = 1.5;

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
    const geometry = new THREE.SphereGeometry(0.45, 24, 24);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying float vBrightness;
        attribute vec3 aColor;
        attribute float aBrightness;
        varying vec3 vColor;
        void main() {
          vec4 worldPos = instanceMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          mat3 normalMat = mat3(instanceMatrix);
          vNormal = normalize(normalMatrix * normalMat * normal);
          vColor = aColor;
          vBrightness = aBrightness;
          vec4 mvPosition = viewMatrix * worldPos;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying vec3 vColor;
        varying float vBrightness;
        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 2.0);
          float pulse = 0.85 + 0.15 * sin(uTime * 2.0 + vWorldPos.x * 3.0);
          vec3 color = vColor * vBrightness * pulse;
          vec3 glow = vColor * fresnel * 1.6 * vBrightness;
          vec3 final = color + glow;
          float alpha = 0.85 + fresnel * 0.15;
          gl_FragColor = vec4(final, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.starsMesh = new THREE.InstancedMesh(geometry, material, MAX_STARS);
    this.starsMesh.count = 0;
    this.starsMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    this.starColors = new Float32Array(MAX_STARS * 3);
    const brightnessArr = new Float32Array(MAX_STARS);
    const colorAttr = new THREE.InstancedBufferAttribute(this.starColors, 3);
    colorAttr.setUsage(THREE.DynamicDrawUsage);
    this.starsMesh.geometry.setAttribute('aColor', colorAttr);
    const brightAttr = new THREE.InstancedBufferAttribute(brightnessArr, 1);
    brightAttr.setUsage(THREE.DynamicDrawUsage);
    this.starsMesh.geometry.setAttribute('aBrightness', brightAttr);

    this.group.add(this.starsMesh);
  }

  private initTrails(): void {
    const totalVerts = MAX_STARS * TRAIL_LENGTH;
    const positions = new Float32Array(totalVerts * 3);
    const colors = new Float32Array(totalVerts * 3);
    const sizes = new Float32Array(totalVerts);
    const ages = new Float32Array(totalVerts);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aAge', new THREE.BufferAttribute(ages, 1).setUsage(THREE.DynamicDrawUsage));

    const material = new THREE.ShaderMaterial({
      uniforms: { uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) } },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aAge;
        varying vec3 vColor;
        varying float vAge;
        uniform float uPixelRatio;
        void main() {
          vColor = aColor;
          vAge = aAge;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (300.0 / -mv.z);
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
          float alpha = (1.0 - d * 2.0) * (1.0 - vAge);
          gl_FragColor = vec4(vColor * (0.6 + 0.4 * (1.0 - vAge)), alpha * 0.75);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.trailPoints = new THREE.Points(geometry, material);
    this.trailPositions = positions;
    this.trailColors = colors;
    this.trailSizes = sizes;
    this.trailHead = new Array(MAX_STARS).fill(-1);

    const ageAttr = this.trailPoints.geometry.getAttribute('aAge') as THREE.BufferAttribute;
    for (let i = 0; i < totalVerts; i++) ageAttr.setX(i, 1);
    ageAttr.needsUpdate = true;

    this.group.add(this.trailPoints);
  }

  private initGlows(): void {
    const size = 1;
    const geometry = new THREE.PlaneGeometry(size, size);
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

    const glowColorAttr = new THREE.InstancedBufferAttribute(new Float32Array(GLOW_POOL_SIZE * 3), 3);
    glowColorAttr.setUsage(THREE.DynamicDrawUsage);
    this.glowMesh.geometry.setAttribute('aColor', glowColorAttr);
    const glowAlphaAttr = new THREE.InstancedBufferAttribute(new Float32Array(GLOW_POOL_SIZE), 1);
    glowAlphaAttr.setUsage(THREE.DynamicDrawUsage);
    this.glowMesh.geometry.setAttribute('aAlpha', glowAlphaAttr);
    const glowScaleAttr = new THREE.InstancedBufferAttribute(new Float32Array(GLOW_POOL_SIZE), 1);
    glowScaleAttr.setUsage(THREE.DynamicDrawUsage);
    this.glowMesh.geometry.setAttribute('aScale', glowScaleAttr);

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

    const material = new THREE.ShaderMaterial({
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
          gl_FragColor = vec4(vColor * 0.8, uGlobalAlpha * 0.45);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.lineSegments = new THREE.LineSegments(geometry, material);
    this.linePositions = positions;
    this.lineColors = colors;
    this.group.add(this.lineSegments);
  }

  setStars(data: StarPointData[], connections: StarConnectionData[]): void {
    this.clear();
    this.stars = data;
    this.connections = connections;
    this.starReached = new Array(data.length).fill(false);

    if (!this.starsMesh || !this.starColors) return;

    const colorAttr = this.starsMesh.geometry.getAttribute('aColor') as THREE.InstancedBufferAttribute;
    const brightAttr = this.starsMesh.geometry.getAttribute('aBrightness') as THREE.InstancedBufferAttribute;

    for (let i = 0; i < data.length; i++) {
      const s = data[i];
      this.dummyObj.position.copy(s.startPosition);
      this.dummyObj.scale.setScalar(s.brightness * 0.5 + 0.4);
      this.dummyObj.updateMatrix();
      this.starsMesh.setMatrixAt(i, this.dummyObj.matrix);

      const rgb = hexToRgb(s.color);
      colorAttr.setXYZ(i, rgb.r, rgb.g, rgb.b);
      brightAttr.setX(i, s.brightness);
    }
    this.starsMesh.count = data.length;
    this.starsMesh.instanceMatrix.needsUpdate = true;
    colorAttr.needsUpdate = true;
    brightAttr.needsUpdate = true;

    for (let i = 0; i < data.length; i++) {
      this.trailHead[i] = -1;
    }
    this.hideTrails();

    this.phase = 'preparing';
    this.phaseStartTime = performance.now();
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
    if (this.lineSegments) {
      const mat = this.lineSegments.material as THREE.ShaderMaterial;
      mat.uniforms.uGlobalAlpha.value = 0;
    }
    this.hideTrails();

    for (const g of this.glowPool) g.active = false;
    if (this.glowMesh) this.glowMesh.count = 0;
  }

  start(): void {
    if (this.phase === 'idle' || this.stars.length === 0) return;
    this.phase = 'flying';
    this.phaseStartTime = performance.now();
  }

  private bezierPoint(t: number, p0: THREE.Vector3, pc: THREE.Vector3, p2: THREE.Vector3, out: THREE.Vector3): void {
    const u = 1 - t;
    out.x = u * u * p0.x + 2 * u * t * pc.x + t * t * p2.x;
    out.y = u * u * p0.y + 2 * u * t * pc.y + t * t * p2.y;
    out.z = u * u * p0.z + 2 * u * t * pc.z + t * t * p2.z;
  }

  private spawnGlow(position: THREE.Vector3, colorHex: string): void {
    const pool = this.glowPool;
    for (let i = 0; i < pool.length; i++) {
      if (!pool[i].active) {
        pool[i].active = true;
        pool[i].startTime = performance.now();
        pool[i].position.copy(position);
        pool[i].color.set(colorHex);
        return;
      }
    }
  }

  private updateTrail(starIdx: number, pos: THREE.Vector3, colorHex: string, nowMs: number, dtSec: number): void {
    if (!this.trailPoints || !this.trailPositions || !this.trailColors || !this.trailSizes) return;

    this.trailHead[starIdx] = (this.trailHead[starIdx] + 1) % TRAIL_LENGTH;
    const slotIdx = starIdx * TRAIL_LENGTH + this.trailHead[starIdx];

    this.trailPositions[slotIdx * 3 + 0] = pos.x;
    this.trailPositions[slotIdx * 3 + 1] = pos.y;
    this.trailPositions[slotIdx * 3 + 2] = pos.z;

    const rgb = hexToRgb(colorHex);
    this.trailColors[slotIdx * 3 + 0] = rgb.r;
    this.trailColors[slotIdx * 3 + 1] = rgb.g;
    this.trailColors[slotIdx * 3 + 2] = rgb.b;
    this.trailSizes[slotIdx] = 4.5;

    const ageAttr = this.trailPoints.geometry.getAttribute('aAge') as THREE.BufferAttribute;
    const sizeAttr = this.trailPoints.geometry.getAttribute('aSize') as THREE.BufferAttribute;
    const colorAttr = this.trailPoints.geometry.getAttribute('aColor') as THREE.BufferAttribute;
    const posAttr = this.trailPoints.geometry.getAttribute('position') as THREE.BufferAttribute;

    for (let k = 0; k < TRAIL_LENGTH; k++) {
      const absIdx = starIdx * TRAIL_LENGTH + k;
      const relAge = (k - this.trailHead[starIdx] + TRAIL_LENGTH) % TRAIL_LENGTH;
      const ageNorm = relAge / (TRAIL_LENGTH - 1);
      ageAttr.setX(absIdx, ageNorm);
      sizeAttr.setX(absIdx, 4.5 * (1 - ageNorm * 0.8));
      if (this.trailHead[starIdx] === -1) ageAttr.setX(absIdx, 1);
    }

    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    ageAttr.needsUpdate = true;
  }

  private updateStars(now: number): void {
    if (!this.starsMesh || !this.stars.length) return;

    const count = this.stars.length;
    let reachedCount = 0;

    for (let i = 0; i < count; i++) {
      const s = this.stars[i];
      const elapsed = now - this.phaseStartTime - s.delay;

      if (elapsed < 0) {
        this.dummyObj.position.copy(s.startPosition);
        this.dummyObj.scale.setScalar(0);
        this.dummyObj.updateMatrix();
        this.starsMesh.setMatrixAt(i, this.dummyObj.matrix);
        continue;
      }

      let t = Math.min(1, elapsed / s.duration);
      const eased = easeOutCubic(t);

      const mid = this.tmpVecA.copy(s.startPosition).add(s.targetPosition).multiplyScalar(0.5);
      const ctrl = this.tmpVecCtrl.set(
        mid.x + (s.targetPosition.x - s.startPosition.x) * 0.15 + Math.sin(i * 1.3) * 5,
        mid.y + 10 + Math.cos(i * 2.1) * 4,
        mid.z + (s.targetPosition.z - s.startPosition.z) * 0.1 + Math.sin(i * 0.9) * 4
      );

      const pos = this.tmpVecB;
      this.bezierPoint(eased, s.startPosition, ctrl, s.targetPosition, pos);

      this.dummyObj.position.copy(pos);
      const appearScale = easeOutQuad(Math.min(1, elapsed / 180));
      const scale = (s.brightness * 0.5 + 0.4) * appearScale;
      this.dummyObj.scale.setScalar(scale);
      this.dummyObj.updateMatrix();
      this.starsMesh.setMatrixAt(i, this.dummyObj.matrix);

      if (elapsed < s.duration) {
        this.updateTrail(i, pos, s.color, now, 0.016);
      } else {
        this.tmpVecC.copy(s.targetPosition);
        this.starReached[i] = true;
      }

      if (t >= 1 && !this.starReached[i]) {
        this.starReached[i] = true;
        this.spawnGlow(s.targetPosition, s.color);
      }

      if (this.starReached[i]) reachedCount++;
    }

    this.starsMesh.instanceMatrix.needsUpdate = true;

    const mat = this.starsMesh.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = now / 1000;

    if (this.callbacks.onProgress) {
      this.callbacks.onProgress(reachedCount, count);
    }

    const firstReached = this.starReached.some(r => r);
    if (this.phase === 'flying' && firstReached) {
      this.phase = 'pulsing';
    }

    const pct = reachedCount / count;
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
    if (!this.lineSegments || !this.linePositions || !this.lineColors) return;

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

      this.linePositions[vertA + 0] = a.targetPosition.x;
      this.linePositions[vertA + 1] = a.targetPosition.y;
      this.linePositions[vertA + 2] = a.targetPosition.z;
      this.linePositions[vertB + 0] = b.targetPosition.x;
      this.linePositions[vertB + 1] = b.targetPosition.y;
      this.linePositions[vertB + 2] = b.targetPosition.z;

      const ca = hexToRgb(a.color);
      const cb = hexToRgb(b.color);
      const distBoost = 0.3 + conn.distance * 0.9;
      this.lineColors[vertA + 0] = ca.r * distBoost;
      this.lineColors[vertA + 1] = ca.g * distBoost;
      this.lineColors[vertA + 2] = ca.b * distBoost;
      this.lineColors[vertB + 0] = cb.r * distBoost;
      this.lineColors[vertB + 1] = cb.g * distBoost;
      this.lineColors[vertB + 2] = cb.b * distBoost;

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
      const t = Math.min(1, elapsed / GLOW_DURATION);

      if (t >= 1) {
        g.active = false;
        continue;
      }

      this.dummyObj.position.copy(g.position);
      this.dummyObj.rotation.z = 0;
      const scale = easeOutQuad(t) * 1.8 + 0.2;
      this.dummyObj.scale.setScalar(scale);
      this.dummyObj.updateMatrix();
      this.glowMesh.setMatrixAt(activeCount, this.dummyObj.matrix);

      colorAttr.setXYZ(activeCount, g.color.r, g.color.g, g.color.b);
      const alpha = (1 - t) * 0.9;
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
    if (!this.lineSegments) return;
    const mat = this.lineSegments.material as THREE.ShaderMaterial;
    if (this.phase === 'connecting' || this.phase === 'rotating') {
      const t = Math.min(1, (now - this.connectStartTime) / CONNECT_FADE_DURATION);
      mat.uniforms.uGlobalAlpha.value = easeOutQuad(t);
    } else {
      mat.uniforms.uGlobalAlpha.value = 0;
    }
  }

  private updateRotation(now: number, dt: number): void {
    if (this.phase !== 'rotating' && this.phase !== 'connecting') return;
    const radPerSec = (this.rotationSpeed * Math.PI) / 180;
    this.group.rotation.y += radPerSec * dt;
  }

  update(now: number, dt: number): void {
    if (this.phase === 'flying' || this.phase === 'pulsing' || this.phase === 'connecting' || this.phase === 'rotating') {
      this.updateStars(now);
    }
    this.updateGlows(now);
    this.updateConnections(now);
    this.updateRotation(now, dt);
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  getStarCount(): number {
    return this.stars.length;
  }
}
