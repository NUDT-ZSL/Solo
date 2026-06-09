import * as THREE from 'three';
import type { StarData } from './starSystem';

export interface ConnectionData {
  idA: number;
  idB: number;
  distance: number;
  alpha: number;
  width: number;
  isHighlighted: boolean;
  breathPhase: number;
}

export class ConnectionSystem {
  public group: THREE.Group = new THREE.Group();
  private distanceThreshold: number;
  private connections: ConnectionData[] = [];
  private lineSegments!: THREE.LineSegments;
  private geometry!: THREE.BufferGeometry;
  private material!: THREE.ShaderMaterial;
  private starsRef: StarData[] = [];
  private maxConnections: number;
  private recomputeCooldown: number = 0;
  private lastRecomputePositions: Float32Array | null = null;

  constructor(distanceThreshold: number = 3, maxConnections: number = 4000) {
    this.distanceThreshold = distanceThreshold;
    this.maxConnections = maxConnections;
  }

  public init(scene: THREE.Scene, stars: StarData[]): void {
    this.starsRef = stars;
    this.setupGeometry();
    this.setupMaterial();
    this.lineSegments = new THREE.LineSegments(this.geometry, this.material);
    this.group.add(this.lineSegments);
    scene.add(this.group);
    this.recomputeConnections();
  }

  private setupGeometry(): void {
    const maxSegs = this.maxConnections;
    const positions = new Float32Array(maxSegs * 2 * 3);
    const colors = new Float32Array(maxSegs * 2 * 3);
    const alphas = new Float32Array(maxSegs * 2);
    const widths = new Float32Array(maxSegs * 2);
    const highlightFlags = new Float32Array(maxSegs * 2);
    const breathOffsets = new Float32Array(maxSegs * 2);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    this.geometry.setAttribute('aWidth', new THREE.BufferAttribute(widths, 1));
    this.geometry.setAttribute('aHighlight', new THREE.BufferAttribute(highlightFlags, 1));
    this.geometry.setAttribute('aBreath', new THREE.BufferAttribute(breathOffsets, 1));

    this.geometry.setDrawRange(0, 0);
  }

  private setupMaterial(): void {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        attribute float aAlpha;
        attribute float aWidth;
        attribute float aHighlight;
        attribute float aBreath;
        varying float vAlpha;
        varying float vHighlight;
        varying vec3 vColor;
        uniform float uTime;
        uniform float uPixelRatio;

        void main() {
          vColor = color;
          float breath = 0.85 + 0.15 * sin(uTime * 0.0018 + aBreath * 6.28318);
          float baseAlpha = aAlpha * breath;
          if (aHighlight > 0.5) {
            baseAlpha = min(1.0, baseAlpha * 1.6 + 0.15);
          }
          vAlpha = baseAlpha;
          vHighlight = aHighlight;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying float vHighlight;
        varying vec3 vColor;

        void main() {
          vec3 finalColor = vColor;
          if (vHighlight > 0.5) {
            finalColor = mix(finalColor, vec3(0.85, 0.95, 1.0), 0.35);
          }
          gl_FragColor = vec4(finalColor, vAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true
    });
  }

  public recomputeConnections(force: boolean = false): void {
    const stars = this.starsRef;
    const count = stars.length;
    const threshold = this.distanceThreshold;
    const thresholdSq = threshold * threshold;

    if (!force && this.lastRecomputePositions) {
      let totalMoveSq = 0;
      for (let i = 0; i < count; i++) {
        const s = stars[i];
        const dx = s.currentPosition.x - this.lastRecomputePositions[i * 3];
        const dy = s.currentPosition.y - this.lastRecomputePositions[i * 3 + 1];
        const dz = s.currentPosition.z - this.lastRecomputePositions[i * 3 + 2];
        totalMoveSq += dx * dx + dy * dy + dz * dz;
      }
      if (totalMoveSq < count * 0.001) {
        return;
      }
    }

    if (!this.lastRecomputePositions || this.lastRecomputePositions.length !== count * 3) {
      this.lastRecomputePositions = new Float32Array(count * 3);
    }
    for (let i = 0; i < count; i++) {
      const s = stars[i];
      this.lastRecomputePositions[i * 3] = s.currentPosition.x;
      this.lastRecomputePositions[i * 3 + 1] = s.currentPosition.y;
      this.lastRecomputePositions[i * 3 + 2] = s.currentPosition.z;
    }

    for (const s of stars) {
      s.connectedIds.clear();
    }

    const newConnections: ConnectionData[] = [];
    const cellSize = threshold * 1.01;
    const grid = new Map<string, number[]>();

    for (let i = 0; i < count; i++) {
      const s = stars[i];
      const cx = Math.floor(s.currentPosition.x / cellSize);
      const cy = Math.floor(s.currentPosition.y / cellSize);
      const cz = Math.floor(s.currentPosition.z / cellSize);
      const key = `${cx},${cy},${cz}`;
      let bucket = grid.get(key);
      if (!bucket) {
        bucket = [];
        grid.set(key, bucket);
      }
      bucket.push(i);
    }

    const checkedPairs = new Set<number>();

    for (let i = 0; i < count; i++) {
      const si = stars[i];
      const cxi = Math.floor(si.currentPosition.x / cellSize);
      const cyi = Math.floor(si.currentPosition.y / cellSize);
      const czi = Math.floor(si.currentPosition.z / cellSize);

      for (let dxi = -1; dxi <= 1; dxi++) {
        for (let dyi = -1; dyi <= 1; dyi++) {
          for (let dzi = -1; dzi <= 1; dzi++) {
            const key = `${cxi + dxi},${cyi + dyi},${czi + dzi}`;
            const bucket = grid.get(key);
            if (!bucket) continue;

            for (const j of bucket) {
              if (j <= i) continue;
              const pairKey = i * count + j;
              if (checkedPairs.has(pairKey)) continue;
              checkedPairs.add(pairKey);

              const sj = stars[j];
              const dx = sj.currentPosition.x - si.currentPosition.x;
              const dy = sj.currentPosition.y - si.currentPosition.y;
              const dz = sj.currentPosition.z - si.currentPosition.z;
              const distSq = dx * dx + dy * dy + dz * dz;

              if (distSq <= thresholdSq) {
                const dist = Math.sqrt(distSq);
                const tNorm = dist / threshold;
                const alpha = (1 - tNorm) * 0.55 + 0.05;
                const width = (1 - tNorm) * 2.5 + 0.5;

                newConnections.push({
                  idA: i,
                  idB: j,
                  distance: dist,
                  alpha,
                  width,
                  isHighlighted: false,
                  breathPhase: Math.random()
                });

                si.connectedIds.add(j);
                sj.connectedIds.add(i);

                if (newConnections.length >= this.maxConnections) {
                  break;
                }
              }
            }
            if (newConnections.length >= this.maxConnections) break;
          }
          if (newConnections.length >= this.maxConnections) break;
        }
        if (newConnections.length >= this.maxConnections) break;
      }
      if (newConnections.length >= this.maxConnections) break;
    }

    this.connections = newConnections;
  }

  public update(deltaMs: number, globalTimeMs: number): void {
    this.recomputeCooldown -= deltaMs;
    if (this.recomputeCooldown <= 0) {
      this.recomputeConnections(false);
      this.recomputeCooldown = 120;
    }

    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;
    const alphas = this.geometry.attributes.aAlpha.array as Float32Array;
    const widths = this.geometry.attributes.aWidth.array as Float32Array;
    const highlights = this.geometry.attributes.aHighlight.array as Float32Array;
    const breaths = this.geometry.attributes.aBreath.array as Float32Array;

    const threshold = this.distanceThreshold;
    const count = this.connections.length;

    for (let c = 0; c < count; c++) {
      const conn = this.connections[c];
      const starA = this.starsRef[conn.idA];
      const starB = this.starsRef[conn.idB];
      if (!starA || !starB) continue;

      const dx = starB.currentPosition.x - starA.currentPosition.x;
      const dy = starB.currentPosition.y - starA.currentPosition.y;
      const dz = starB.currentPosition.z - starA.currentPosition.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      const dist = Math.sqrt(distSq);

      conn.distance = dist;
      if (dist <= threshold) {
        const tNorm = dist / threshold;
        conn.alpha = (1 - tNorm) * 0.55 + 0.05;
        conn.width = (1 - tNorm) * 2.5 + 0.5;
      } else {
        conn.alpha = Math.max(0, conn.alpha - deltaMs * 0.003);
      }

      conn.isHighlighted = starA.isHovered || starB.isHovered ||
        (starA.isHighlighted && starB.isHighlighted);

      const idxA = c * 2 * 3;
      const idxB = (c * 2 + 1) * 3;
      positions[idxA] = starA.currentPosition.x;
      positions[idxA + 1] = starA.currentPosition.y;
      positions[idxA + 2] = starA.currentPosition.z;
      positions[idxB] = starB.currentPosition.x;
      positions[idxB + 1] = starB.currentPosition.y;
      positions[idxB + 2] = starB.currentPosition.z;

      const mixFactor = 0.5;
      colors[idxA] = starA.currentColor.r * (1 - mixFactor) + starB.currentColor.r * mixFactor;
      colors[idxA + 1] = starA.currentColor.g * (1 - mixFactor) + starB.currentColor.g * mixFactor;
      colors[idxA + 2] = starA.currentColor.b * (1 - mixFactor) + starB.currentColor.b * mixFactor;
      colors[idxB] = starB.currentColor.r * (1 - mixFactor) + starA.currentColor.r * mixFactor;
      colors[idxB + 1] = starB.currentColor.g * (1 - mixFactor) + starA.currentColor.g * mixFactor;
      colors[idxB + 2] = starB.currentColor.b * (1 - mixFactor) + starA.currentColor.b * mixFactor;

      alphas[c * 2] = conn.alpha;
      alphas[c * 2 + 1] = conn.alpha;
      widths[c * 2] = conn.width;
      widths[c * 2 + 1] = conn.width;
      const hi = conn.isHighlighted ? 1.0 : 0.0;
      highlights[c * 2] = hi;
      highlights[c * 2 + 1] = hi;
      breaths[c * 2] = conn.breathPhase;
      breaths[c * 2 + 1] = conn.breathPhase;
    }

    this.geometry.setDrawRange(0, count * 2);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.aAlpha.needsUpdate = true;
    this.geometry.attributes.aWidth.needsUpdate = true;
    this.geometry.attributes.aHighlight.needsUpdate = true;
    this.geometry.attributes.aBreath.needsUpdate = true;

    this.material.uniforms.uTime.value = globalTimeMs;
  }

  public forceRecompute(): void {
    this.recomputeCooldown = 0;
    this.recomputeConnections(true);
  }

  public resize(_width: number, _height: number): void {
    this.material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
