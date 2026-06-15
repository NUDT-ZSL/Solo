import * as THREE from 'three';
import { StarData, ConnectionData } from './transformer';

interface StarState {
  data: StarData;
  startTime: number;
  hasPulsed: boolean;
  pulseStartTime: number;
  arrived: boolean;
  trailQueue: { pos: THREE.Vector3; time: number }[];
  currentPosition: THREE.Vector3;
}

const TRAIL_DURATION_SEC = 0.2;
const PULSE_DURATION_SEC = 0.5;
const PULSE_RADIUS_PX = 10;
const MAX_STARS = 200;
const MAX_TRAIL_PARTICLES = 200;
const MAX_PULSE_MESHES = 100;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255
  };
}

function createPointSpriteTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const cx = 32;
  const cy = 32;
  const r = 30;

  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export class StarSystem {
  private scene: THREE.Scene;
  private startPosition: THREE.Vector3;
  private rotationGroup: THREE.Group;
  private rotationSpeed: number = 1.5;
  private isAnimating: boolean = false;
  private animationStartTime: number = 0;
  private lastPxPerUnit: number = 100;
  private lastPxCalcTime: number = 0;
  private _lastCamPos: THREE.Vector3 = new THREE.Vector3();

  private starTexture: THREE.Texture;

  private starPoints: THREE.Points | null = null;
  private starPositions: Float32Array | null = null;
  private starColors: Float32Array | null = null;
  private starSizes: Float32Array | null = null;

  private trailPoints: THREE.Points | null = null;
  private trailPositions: Float32Array | null = null;
  private trailColors: Float32Array | null = null;
  private trailSizes: Float32Array | null = null;

  private pulseMeshes: Map<number, { mesh: THREE.Mesh; startTime: number; center: THREE.Vector3 }> = new Map();
  private pulsePool: THREE.Mesh[] = [];
  private nextPulseId: number = 0;

  private connectionsLine: THREE.LineSegments | null = null;
  private connectionsPositions: Float32Array | null = null;
  private connectionsColors: Float32Array | null = null;
  private connectionsOpacity: number = 0;

  private stars: StarState[] = [];
  private starIndexMap: Map<string, number> = new Map();

  private environmentStars: THREE.Points | null = null;
  private cameraRef: THREE.PerspectiveCamera;

  constructor(scene: THREE.Scene, startPosition: THREE.Vector3, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.startPosition = startPosition.clone();
    this.cameraRef = camera;

    this.rotationGroup = new THREE.Group();
    this.scene.add(this.rotationGroup);

    this.starTexture = createPointSpriteTexture();

    this.initPulseMeshPool();
    this.createEnvironmentStars();
  }

  private initPulseMeshPool(): void {
    const pulseGeometry = new THREE.CircleGeometry(1, 32);
    for (let i = 0; i < MAX_PULSE_MESHES; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(pulseGeometry, material);
      mesh.visible = false;
      this.rotationGroup.add(mesh);
      this.pulsePool.push(mesh);
    }
  }

  private createEnvironmentStars(): void {
    const count = 100;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const radius = 50 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      const b = 0.4 + Math.random() * 0.6;
      colors[i * 3] = b;
      colors[i * 3 + 1] = b;
      colors[i * 3 + 2] = b;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      sizeAttenuation: true,
      depthWrite: false,
      map: this.starTexture,
      blending: THREE.AdditiveBlending
    });
    this.environmentStars = new THREE.Points(geom, mat);
    this.scene.add(this.environmentStars);
  }

  setStartPosition(position: THREE.Vector3): void {
    this.startPosition.copy(position);
  }

  setRotationSpeed(speed: number): void {
    this.rotationSpeed = Math.max(0.5, Math.min(5, speed));
  }

  private disposeStarGeometry(): void {
    if (this.starPoints) {
      this.rotationGroup.remove(this.starPoints);
      this.starPoints.geometry.dispose();
      (this.starPoints.material as THREE.Material).dispose();
      this.starPoints = null;
    }
    if (this.trailPoints) {
      this.rotationGroup.remove(this.trailPoints);
      this.trailPoints.geometry.dispose();
      (this.trailPoints.material as THREE.Material).dispose();
      this.trailPoints = null;
    }
    if (this.connectionsLine) {
      this.rotationGroup.remove(this.connectionsLine);
      this.connectionsLine.geometry.dispose();
      (this.connectionsLine.material as THREE.Material).dispose();
      this.connectionsLine = null;
    }
    for (const p of this.pulseMeshes.values()) {
      p.mesh.visible = false;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = 0;
    }
    this.pulseMeshes.clear();
  }

  clear(): void {
    this.disposeStarGeometry();
    this.stars = [];
    this.starIndexMap.clear();
    this.connectionsOpacity = 0;
  }

  createStars(starData: StarData[], connectionData: ConnectionData[]): void {
    this.clear();

    const limited = starData.slice(0, MAX_STARS);
    const numStars = limited.length;

    limited.forEach((d, idx) => {
      this.stars.push({
        data: d,
        startTime: 0,
        hasPulsed: false,
        pulseStartTime: 0,
        arrived: false,
        trailQueue: [],
        currentPosition: this.startPosition.clone()
      });
      this.starIndexMap.set(d.id, idx);
    });

    const starGeom = new THREE.BufferGeometry();
    this.starPositions = new Float32Array(numStars * 3);
    this.starColors = new Float32Array(numStars * 3);
    this.starSizes = new Float32Array(numStars);

    for (let i = 0; i < numStars; i++) {
      const s = this.stars[i];
      const rgb = hexToRgb(s.data.color);
      this.starPositions[i * 3] = this.startPosition.x;
      this.starPositions[i * 3 + 1] = this.startPosition.y;
      this.starPositions[i * 3 + 2] = this.startPosition.z;
      this.starColors[i * 3] = rgb.r;
      this.starColors[i * 3 + 1] = rgb.g;
      this.starColors[i * 3 + 2] = rgb.b;
      this.starSizes[i] = 0;
    }

    starGeom.setAttribute('position', new THREE.BufferAttribute(this.starPositions, 3));
    starGeom.setAttribute('color', new THREE.BufferAttribute(this.starColors, 3));
    const starMat = new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: this.starTexture },
        uBrightness: { value: 1.0 }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        uniform float uBrightness;
        varying vec3 vColor;
        void main() {
          vec4 tex = texture2D(pointTexture, gl_PointCoord);
          if (tex.a < 0.01) discard;
          gl_FragColor = vec4(vColor * uBrightness, tex.a);
        }
      `,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    (starGeom.attributes as any).size = new THREE.BufferAttribute(this.starSizes, 1);
    this.starPoints = new THREE.Points(starGeom, starMat);
    this.rotationGroup.add(this.starPoints);

    const trailGeom = new THREE.BufferGeometry();
    this.trailPositions = new Float32Array(MAX_TRAIL_PARTICLES * 3);
    this.trailColors = new Float32Array(MAX_TRAIL_PARTICLES * 3);
    this.trailSizes = new Float32Array(MAX_TRAIL_PARTICLES);
    trailGeom.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    trailGeom.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 3));
    (trailGeom.attributes as any).size = new THREE.BufferAttribute(this.trailSizes, 1);

    const trailMat = new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: this.starTexture }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        varying vec3 vColor;
        void main() {
          vec4 tex = texture2D(pointTexture, gl_PointCoord);
          if (tex.a < 0.01) discard;
          gl_FragColor = vec4(vColor, tex.a);
        }
      `,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.trailPoints = new THREE.Points(trailGeom, trailMat);
    this.trailPoints.frustumCulled = false;
    this.rotationGroup.add(this.trailPoints);

    const validConnections = connectionData.filter(
      c => this.starIndexMap.has(c.from) && this.starIndexMap.has(c.to)
    );
    const numConns = validConnections.length;
    const connGeom = new THREE.BufferGeometry();
    this.connectionsPositions = new Float32Array(numConns * 2 * 3);
    this.connectionsColors = new Float32Array(numConns * 2 * 3);

    for (let i = 0; i < numConns; i++) {
      const conn = validConnections[i];
      const fromIdx = this.starIndexMap.get(conn.from)!;
      const toIdx = this.starIndexMap.get(conn.to)!;
      const fromStar = this.stars[fromIdx];
      const toStar = this.stars[toIdx];
      const fromRgb = hexToRgb(fromStar.data.color);
      const toRgb = hexToRgb(toStar.data.color);

      this.connectionsPositions[i * 6] = fromStar.data.targetPosition.x;
      this.connectionsPositions[i * 6 + 1] = fromStar.data.targetPosition.y;
      this.connectionsPositions[i * 6 + 2] = fromStar.data.targetPosition.z;
      this.connectionsPositions[i * 6 + 3] = toStar.data.targetPosition.x;
      this.connectionsPositions[i * 6 + 4] = toStar.data.targetPosition.y;
      this.connectionsPositions[i * 6 + 5] = toStar.data.targetPosition.z;

      this.connectionsColors[i * 6] = fromRgb.r;
      this.connectionsColors[i * 6 + 1] = fromRgb.g;
      this.connectionsColors[i * 6 + 2] = fromRgb.b;
      this.connectionsColors[i * 6 + 3] = toRgb.r;
      this.connectionsColors[i * 6 + 4] = toRgb.g;
      this.connectionsColors[i * 6 + 5] = toRgb.b;
    }

    connGeom.setAttribute('position', new THREE.BufferAttribute(this.connectionsPositions, 3));
    connGeom.setAttribute('color', new THREE.BufferAttribute(this.connectionsColors, 3));
    const connMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.connectionsLine = new THREE.LineSegments(connGeom, connMat);
    this.rotationGroup.add(this.connectionsLine);

    this.isAnimating = true;
    this.animationStartTime = performance.now();
  }

  private triggerPulse(state: StarState): void {
    let mesh: THREE.Mesh | null = null;
    for (const m of this.pulsePool) {
      if (!m.visible) {
        mesh = m;
        break;
      }
    }
    if (!mesh) {
      let minStart = Infinity;
      let minId = -1;
      for (const [id, p] of this.pulseMeshes) {
        if (p.startTime < minStart) {
          minStart = p.startTime;
          minId = id;
        }
      }
      if (minId >= 0) {
        const p = this.pulseMeshes.get(minId)!;
        mesh = p.mesh;
        this.pulseMeshes.delete(minId);
      }
    }
    if (!mesh) return;

    const rgb = hexToRgb(state.data.color);
    const color = new THREE.Color(rgb.r, rgb.g, rgb.b);
    const mat = mesh.material as THREE.MeshBasicMaterial;
    mat.color.copy(color);
    mat.opacity = 0;

    const targetPos = state.data.targetPosition;
    mesh.position.copy(targetPos);

    const pulseId = this.nextPulseId++;
    mesh.visible = true;
    this.pulseMeshes.set(pulseId, {
      mesh,
      startTime: performance.now(),
      center: targetPos.clone()
    });
  }

  update(currentTime: number, deltaTime: number): void {
    const elapsedSec = (currentTime - this.animationStartTime) / 1000;

    if (this.environmentStars) {
      this.environmentStars.rotation.y += deltaTime * 0.015;
    }

    const numStars = this.stars.length;
    let allArrived = true;
    const camMoved = this._camMoved();
    const pxPerUnit = this.recomputePxPerUnitFast(currentTime, camMoved);

    if (this.isAnimating && numStars > 0) {
      allArrived = true;

      let trailIdx = 0;

      for (let i = 0; i < numStars; i++) {
        const s = this.stars[i];
        const d = s.data;

        if (elapsedSec < d.flyDelay) {
          allArrived = false;
          this.starSizes![i] = 0;
          continue;
        }

        if (s.startTime === 0) {
          s.startTime = currentTime;
        }

        const starElapsed = (currentTime - s.startTime) / 1000;
        const progress = Math.min(1, starElapsed / d.flyDuration);
        const eased = easeOutCubic(progress);

        s.currentPosition.lerpVectors(this.startPosition, d.targetPosition, eased);
        this.starPositions![i * 3] = s.currentPosition.x;
        this.starPositions![i * 3 + 1] = s.currentPosition.y;
        this.starPositions![i * 3 + 2] = s.currentPosition.z;

        const baseSizePx = 10 + d.brightness * 8;
        const worldSize = baseSizePx / pxPerUnit;
        const finalSize = progress < 0.05 ? worldSize * (progress / 0.05) : worldSize;
        this.starSizes![i] = finalSize;

        if (progress < 1) {
          allArrived = false;
          if (s.trailQueue.length === 0 || currentTime - s.trailQueue[s.trailQueue.length - 1].time > 20) {
            s.trailQueue.push({
              pos: s.currentPosition.clone(),
              time: currentTime
            });
          }

          const cutoff = currentTime - TRAIL_DURATION_SEC * 1000;
          while (s.trailQueue.length > 0 && s.trailQueue[0].time < cutoff) {
            s.trailQueue.shift();
          }
          while (s.trailQueue.length > 5) s.trailQueue.shift();

          const trailSteps = s.trailQueue.length;
          const rgb = hexToRgb(d.color);
          for (let t = 0; t < trailSteps; t++) {
            if (trailIdx >= MAX_TRAIL_PARTICLES) break;
            const entry = s.trailQueue[t];
            const ageRatio = 1 - (entry.time - (currentTime - TRAIL_DURATION_SEC * 1000)) / (TRAIL_DURATION_SEC * 1000);
            const fadeOut = Math.max(0, 1 - progress * 1.5);
            const alpha = (1 - ageRatio) * 0.7 * fadeOut;

            this.trailPositions![trailIdx * 3] = entry.pos.x;
            this.trailPositions![trailIdx * 3 + 1] = entry.pos.y;
            this.trailPositions![trailIdx * 3 + 2] = entry.pos.z;
            this.trailColors![trailIdx * 3] = rgb.r * alpha;
            this.trailColors![trailIdx * 3 + 1] = rgb.g * alpha;
            this.trailColors![trailIdx * 3 + 2] = rgb.b * alpha;

            const trailPxSize = (1 - ageRatio) * baseSizePx * 0.5;
            this.trailSizes![trailIdx] = trailPxSize / pxPerUnit;
            trailIdx++;
          }
        } else {
          const cutoff = currentTime - TRAIL_DURATION_SEC * 1000;
          while (s.trailQueue.length > 0 && s.trailQueue[0].time < cutoff) {
            s.trailQueue.shift();
          }
          const fadeOutStart = starElapsed - d.flyDuration;
          const fadeOutRatio = Math.max(0, 1 - fadeOutStart / 0.2);
          const trailSteps = s.trailQueue.length;
          const rgb = hexToRgb(d.color);
          for (let t = 0; t < trailSteps; t++) {
            if (trailIdx >= MAX_TRAIL_PARTICLES) break;
            const entry = s.trailQueue[t];
            const ageRatio = 1 - (entry.time - (currentTime - TRAIL_DURATION_SEC * 1000)) / (TRAIL_DURATION_SEC * 1000);
            const alpha = (1 - ageRatio) * 0.7 * fadeOutRatio;
            if (alpha <= 0.01) continue;
            this.trailPositions![trailIdx * 3] = entry.pos.x;
            this.trailPositions![trailIdx * 3 + 1] = entry.pos.y;
            this.trailPositions![trailIdx * 3 + 2] = entry.pos.z;
            this.trailColors![trailIdx * 3] = rgb.r * alpha;
            this.trailColors![trailIdx * 3 + 1] = rgb.g * alpha;
            this.trailColors![trailIdx * 3 + 2] = rgb.b * alpha;
            const trailPxSize = (1 - ageRatio) * baseSizePx * 0.5;
            this.trailSizes![trailIdx] = trailPxSize / pxPerUnit;
            trailIdx++;
          }
        }

        if (progress >= 1 && !s.hasPulsed) {
          s.hasPulsed = true;
          s.arrived = true;
          this.triggerPulse(s);
        }
      }

      if (this.starPoints) {
        (this.starPoints.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        (this.starPoints.geometry.attributes as any).size.needsUpdate = true;
      }

      if (this.trailPoints && this.trailPositions) {
        for (let i = trailIdx * 3; i < MAX_TRAIL_PARTICLES * 3; i++) {
          this.trailPositions[i] = 0;
        }
        (this.trailPoints.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        (this.trailPoints.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
        (this.trailPoints.geometry.attributes as any).size.needsUpdate = true;
      }

      if (allArrived && elapsedSec > 2.5) {
        this.isAnimating = false;
      }

      const connProgress = Math.min(1, Math.max(0, (elapsedSec - 1.5) / 0.8));
      if (connProgress > 0 && this.connectionsLine) {
        this.connectionsOpacity = easeOutQuad(connProgress) * 0.5;
        (this.connectionsLine.material as THREE.LineBasicMaterial).opacity = this.connectionsOpacity;
      }
    } else {
      if (this.starPoints && numStars > 0 && camMoved) {
        for (let i = 0; i < numStars; i++) {
          const s = this.stars[i];
          if (!s.arrived) continue;
          const baseSizePx = 10 + s.data.brightness * 8;
          this.starSizes![i] = baseSizePx / pxPerUnit;
        }
        (this.starPoints.geometry.attributes as any).size.needsUpdate = true;
      }
    }

    const expiredIds: number[] = [];
    for (const [id, p] of this.pulseMeshes) {
      const pulseElapsed = (currentTime - p.startTime) / 1000;
      const pulseProgress = pulseElapsed / PULSE_DURATION_SEC;

      if (pulseProgress >= 1) {
        expiredIds.push(id);
        continue;
      }

      const anim = Math.sin(pulseProgress * Math.PI);
      const alpha = anim * 0.9;

      const radiusPx = PULSE_RADIUS_PX * anim * 1.2 + 1;
      const worldRadius = radiusPx / pxPerUnit;
      p.mesh.scale.setScalar(worldRadius);
      p.mesh.position.copy(p.center);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = alpha;
    }

    for (const id of expiredIds) {
      const p = this.pulseMeshes.get(id)!;
      p.mesh.visible = false;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = 0;
      this.pulseMeshes.delete(id);
    }

    this.rotationGroup.rotation.y += (this.rotationSpeed * Math.PI / 180) * deltaTime;
  }

  private _camMoved(): boolean {
    const camPos = this.cameraRef.position;
    const d = camPos.distanceToSquared(this._lastCamPos);
    if (d > 0.001) {
      this._lastCamPos.copy(camPos);
      return true;
    }
    return false;
  }

  private recomputePxPerUnitFast(currentTime: number, force: boolean): number {
    if (!force && currentTime - this.lastPxCalcTime < 100) {
      return this.lastPxPerUnit;
    }
    this.lastPxCalcTime = currentTime;
    const origin = new THREE.Vector3(0, 0, 0);
    const v1 = origin.clone().project(this.cameraRef);
    const p2 = origin.clone();
    p2.x += 1.0;
    const v2 = p2.project(this.cameraRef);
    const px = Math.max(1, Math.abs(v2.x - v1.x) * window.innerWidth * 0.5);
    this.lastPxPerUnit = px;
    return px;
  }

  resetRotation(): void {
    this.rotationGroup.rotation.set(0, 0, 0);
  }

  getStarCount(): number {
    return this.stars.length;
  }

  dispose(): void {
    this.clear();

    if (this.environmentStars) {
      this.scene.remove(this.environmentStars);
      this.environmentStars.geometry.dispose();
      (this.environmentStars.material as THREE.Material).dispose();
    }

    for (const m of this.pulsePool) {
      this.rotationGroup.remove(m);
      (m.material as THREE.Material).dispose();
    }
    if (this.pulsePool.length > 0 && this.pulsePool[0].geometry) {
      this.pulsePool[0].geometry.dispose();
    }
    this.pulsePool = [];

    this.starTexture.dispose();

    this.scene.remove(this.rotationGroup);
  }
}
