import * as THREE from 'three';

export type EmotionType = 'joy' | 'sadness' | 'nostalgia' | 'calm' | 'expectation';

export interface MemoryData {
  id: string;
  text: string;
  emotion: EmotionType;
  createdAt: number;
  center: THREE.Vector3;
  seed: number;
}

interface ParticleInfo {
  originalPos: THREE.Vector3;
  currentPos: THREE.Vector3;
  originalColor: THREE.Color;
  currentColor: THREE.Color;
  originalSize: number;
  currentSize: number;
}

export interface ParticleCluster {
  id: string;
  memory: MemoryData;
  particleInfos: ParticleInfo[];
  points: THREE.Points;
  geometry: THREE.BufferGeometry;
  center: THREE.Vector3;
  rotationAngle: number;
  isCollapsed: boolean;
  collapseStartTime: number | null;
  expandStartTime: number | null;
  colorTransitionStartTime: number | null;
  energyOrb: THREE.Mesh | null;
  textSprite: THREE.Sprite | null;
  highlightStartTime: number | null;
  isHighlighting: boolean;
}

const EMOTION_COLORS: Record<EmotionType, [THREE.Color, THREE.Color]> = {
  joy: [new THREE.Color('#FF8C00'), new THREE.Color('#FFD700')],
  sadness: [new THREE.Color('#00BFFF'), new THREE.Color('#DDA0DD')],
  nostalgia: [new THREE.Color('#8B4513'), new THREE.Color('#FFBF00')],
  calm: [new THREE.Color('#98FF98'), new THREE.Color('#87CEEB')],
  expectation: [new THREE.Color('#FF69B4'), new THREE.Color('#DDA0DD')],
};

const COLLAPSE_DURATION = 1000;
const EXPAND_DURATION = 1000;
const COLOR_TRANSITION_DURATION = 500;
const HIGHLIGHT_DURATION = 300;
const ROTATION_SPEED = 0.005;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateSeed(text: string): number {
  let seed = 0;
  for (let i = 0; i < text.length; i++) {
    seed = ((seed << 5) - seed + text.charCodeAt(i)) | 0;
  }
  return Math.abs(seed) || 1;
}

function getEmotionGradientColor(emotion: EmotionType, t: number): THREE.Color {
  const [c1, c2] = EMOTION_COLORS[emotion];
  return new THREE.Color().lerpColors(c1, c2, t);
}

function createTextSprite(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = 512;
  canvas.height = 256;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '48px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const maxWidth = canvas.width - 40;
  const words = text;
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine + words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine);

  const lineHeight = 58;
  const startY = canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, canvas.width / 2, startY + i * lineHeight);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(4, 2, 1);
  sprite.visible = false;

  return sprite;
}

function createEnergyOrb(center: THREE.Vector3): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(0.5, 32, 32);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const orb = new THREE.Mesh(geometry, material);
  orb.position.copy(center);
  orb.visible = false;
  return orb;
}

export class ParticleMemorySystem {
  private scene: THREE.Scene;
  private clusters: ParticleCluster[] = [];
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private onClusterClick: ((cluster: ParticleCluster) => void) | null = null;
  private onClusterRecall: ((cluster: ParticleCluster) => void) | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points.threshold = 0.5;
    this.mouse = new THREE.Vector2();
  }

  setOnClusterClick(cb: (cluster: ParticleCluster) => void) {
    this.onClusterClick = cb;
  }

  setOnClusterRecall(cb: (cluster: ParticleCluster) => void) {
    this.onClusterRecall = cb;
  }

  addMemory(id: string, text: string, emotion: EmotionType): ParticleCluster {
    const seed = generateSeed(text);
    const random = seededRandom(seed);

    const cx = (random() - 0.5) * 24;
    const cy = (random() - 0.5) * 16;
    const cz = (random() - 0.5) * 24;
    const center = new THREE.Vector3(cx, cy, cz);

    const particleCount = Math.floor(50 + random() * 31);
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const particleInfos: ParticleInfo[] = [];

    const shellRadius = 1.5 + random() * 1.5;

    for (let i = 0; i < particleCount; i++) {
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);
      const r = shellRadius * (0.8 + random() * 0.4);

      const x = center.x + r * Math.sin(phi) * Math.cos(theta);
      const y = center.y + r * Math.sin(phi) * Math.sin(theta);
      const z = center.z + r * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const colorT = random();
      const color = getEmotionGradientColor(emotion, colorT);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      const size = 0.1 + random() * 0.2;
      sizes[i] = size;

      particleInfos.push({
        originalPos: new THREE.Vector3(x, y, z),
        currentPos: new THREE.Vector3(x, y, z),
        originalColor: color.clone(),
        currentColor: color.clone(),
        originalSize: size,
        currentSize: size,
      });
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    const energyOrb = createEnergyOrb(center);
    this.scene.add(energyOrb);

    const textSprite = createTextSprite(text);
    textSprite.position.copy(center);
    this.scene.add(textSprite);

    const memory: MemoryData = {
      id,
      text,
      emotion,
      createdAt: Date.now(),
      center,
      seed,
    };

    const cluster: ParticleCluster = {
      id,
      memory,
      particleInfos,
      points,
      geometry,
      center,
      rotationAngle: 0,
      isCollapsed: false,
      collapseStartTime: null,
      expandStartTime: null,
      colorTransitionStartTime: null,
      energyOrb,
      textSprite,
      highlightStartTime: null,
      isHighlighting: false,
    };

    this.clusters.push(cluster);
    return cluster;
  }

  handleMouseClick(event: MouseEvent, camera: THREE.Camera, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, camera);

    for (const cluster of this.clusters) {
      if (cluster.isCollapsed && cluster.energyOrb) {
        const orbIntersects = this.raycaster.intersectObject(cluster.energyOrb);
        if (orbIntersects.length > 0) {
          this.expandCluster(cluster);
          return;
        }
      }

      const intersects = this.raycaster.intersectObject(cluster.points);
      if (intersects.length > 0) {
        if (!cluster.isCollapsed) {
          this.collapseCluster(cluster);
          if (this.onClusterClick) this.onClusterClick(cluster);
          if (this.onClusterRecall) this.onClusterRecall(cluster);
        }
        return;
      }
    }
  }

  private collapseCluster(cluster: ParticleCluster) {
    cluster.isCollapsed = true;
    cluster.collapseStartTime = performance.now();
    cluster.colorTransitionStartTime = performance.now();
  }

  private expandCluster(cluster: ParticleCluster) {
    cluster.isCollapsed = false;
    cluster.expandStartTime = performance.now();

    if (cluster.energyOrb) cluster.energyOrb.visible = false;
    if (cluster.textSprite) cluster.textSprite.visible = false;
  }

  expandClusterById(id: string) {
    const cluster = this.clusters.find(c => c.id === id);
    if (cluster && cluster.isCollapsed) {
      this.expandCluster(cluster);
    }
  }

  highlightCluster(id: string) {
    const cluster = this.clusters.find(c => c.id === id);
    if (cluster && !cluster.isCollapsed) {
      cluster.isHighlighting = true;
      cluster.highlightStartTime = performance.now();
    }
  }

  clearHighlight() {
    for (const cluster of this.clusters) {
      cluster.isHighlighting = false;
      cluster.highlightStartTime = null;
    }
  }

  getClusterById(id: string): ParticleCluster | undefined {
    return this.clusters.find(c => c.id === id);
  }

  getAllClusters(): ParticleCluster[] {
    return this.clusters;
  }

  getCollapsedCluster(): ParticleCluster | undefined {
    return this.clusters.find(c => c.isCollapsed);
  }

  update(time: number, delta: number) {
    for (const cluster of this.clusters) {
      if (!cluster.isCollapsed && cluster.expandStartTime === null) {
        cluster.rotationAngle += ROTATION_SPEED;
      }

      this.updateCollapseAnimation(cluster, time);
      this.updateExpandAnimation(cluster, time);
      this.updateHighlightAnimation(cluster, time);
      this.updateEnergyOrb(cluster, time);

      this.syncGeometry(cluster);
    }
  }

  private updateCollapseAnimation(cluster: ParticleCluster, time: number) {
    if (!cluster.isCollapsed || cluster.collapseStartTime === null) return;

    const elapsed = time - cluster.collapseStartTime;
    const progress = Math.min(elapsed / COLLAPSE_DURATION, 1);
    const easedProgress = easeOutCubic(progress);

    const colorProgress = cluster.colorTransitionStartTime
      ? Math.min((time - cluster.colorTransitionStartTime) / COLOR_TRANSITION_DURATION, 1)
      : 1;

    const whiteColor = new THREE.Color(0xffffff);

    for (let i = 0; i < cluster.particleInfos.length; i++) {
      const info = cluster.particleInfos[i];
      info.currentPos.lerpVectors(info.originalPos, cluster.center, easedProgress);
      info.currentColor.lerpColors(info.originalColor, whiteColor, colorProgress);
      info.currentSize = info.originalSize * (1 - easedProgress * 0.5);
    }

    if (progress >= 1) {
      cluster.collapseStartTime = null;
      cluster.colorTransitionStartTime = null;

      if (cluster.energyOrb) {
        cluster.energyOrb.visible = true;
      }
      if (cluster.textSprite) {
        cluster.textSprite.visible = true;
      }
      cluster.points.visible = false;
    }
  }

  private updateExpandAnimation(cluster: ParticleCluster, time: number) {
    if (cluster.isCollapsed || cluster.expandStartTime === null) return;

    const elapsed = time - cluster.expandStartTime;
    const progress = Math.min(elapsed / EXPAND_DURATION, 1);
    const easedProgress = easeOutCubic(progress);

    for (let i = 0; i < cluster.particleInfos.length; i++) {
      const info = cluster.particleInfos[i];
      info.currentPos.lerpVectors(cluster.center, info.originalPos, easedProgress);
      info.currentColor.lerpColors(new THREE.Color(0xffffff), info.originalColor, easedProgress);
      info.currentSize = info.originalSize * (0.5 + 0.5 * easedProgress);
    }

    if (progress >= 1) {
      cluster.expandStartTime = null;
      cluster.points.visible = true;
    }
  }

  private updateHighlightAnimation(cluster: ParticleCluster, time: number) {
    if (!cluster.isHighlighting || cluster.highlightStartTime === null) return;

    const elapsed = time - cluster.highlightStartTime;

    if (elapsed < HIGHLIGHT_DURATION) {
      const t = elapsed / HIGHLIGHT_DURATION;
      const scale = 1 + 0.5 * Math.sin(t * Math.PI);
      for (const info of cluster.particleInfos) {
        info.currentSize = info.originalSize * scale;
      }
    } else {
      cluster.isHighlighting = false;
      cluster.highlightStartTime = null;
      for (const info of cluster.particleInfos) {
        info.currentSize = info.originalSize;
      }
    }
  }

  private updateEnergyOrb(cluster: ParticleCluster, time: number) {
    if (!cluster.isCollapsed || !cluster.energyOrb || !cluster.energyOrb.visible) return;

    const scale = 1 + 0.1 * Math.sin((time / 1000) * Math.PI);
    cluster.energyOrb.scale.setScalar(scale);

    const material = cluster.energyOrb.material as THREE.MeshBasicMaterial;
    material.opacity = 0.6 + 0.05 * Math.sin((time / 1000) * Math.PI);
  }

  private syncGeometry(cluster: ParticleCluster) {
    const positions = cluster.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colors = cluster.geometry.getAttribute('color') as THREE.BufferAttribute;

    for (let i = 0; i < cluster.particleInfos.length; i++) {
      const info = cluster.particleInfos[i];

      const relX = info.currentPos.x - cluster.center.x;
      const relY = info.currentPos.y - cluster.center.y;
      const relZ = info.currentPos.z - cluster.center.z;

      if (!cluster.isCollapsed && cluster.expandStartTime === null) {
        const cos = Math.cos(cluster.rotationAngle);
        const sin = Math.sin(cluster.rotationAngle);
        const rotX = relX * cos - relZ * sin;
        const rotZ = relX * sin + relZ * cos;

        positions.setXYZ(i, cluster.center.x + rotX, cluster.center.y + relY, cluster.center.z + rotZ);
      } else {
        positions.setXYZ(i, info.currentPos.x, info.currentPos.y, info.currentPos.z);
      }

      colors.setXYZ(i, info.currentColor.r, info.currentColor.g, info.currentColor.b);
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;
  }

  getParticleCount(): number {
    let total = 0;
    for (const cluster of this.clusters) {
      total += cluster.particleInfos.length;
    }
    return total;
  }

  getEmotionColor(emotion: EmotionType): [string, string] {
    const [c1, c2] = EMOTION_COLORS[emotion];
    return ['#' + c1.getHexString(), '#' + c2.getHexString()];
  }
}
