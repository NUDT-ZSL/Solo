// ============================================================================
// src/oceanRenderer.ts - 洋流渲染核心模块
// 职责：创建箭头几何体、粒子流线，处理动画更新、深度层切换过渡、区域高亮
// 数据流向：
//   - 输入：data/oceanData.ts 的洋流数据
//   - 输出：Three.js 3D对象添加到场景，每帧更新渲染
// 调用关系：
//   - 被 src/main.ts 调用 init(scene, camera, renderer, domElement)
//   - 被 src/main.ts 调用 animate(deltaTime) 每帧更新
//   - 被 src/uiControls.ts 调用 updateFlow(depthLayer) 切换深度层
//   - 被 src/uiControls.ts 调用 setSpeedScale / setParticleSpeed 调整参数
// ============================================================================

import * as THREE from 'three';
import {
  OceanCurrentData,
  DepthLayer,
  DEPTH_VALUES,
  getOceanCurrentData,
  getParticlePathData,
  getDepthFactor,
  REGION_CENTERS
} from '../data/oceanData.js';

interface ArrowInstance {
  group: THREE.Group;
  shaft: THREE.Mesh;
  head: THREE.Mesh;
  basePosition: THREE.Vector3;
  direction: THREE.Vector3;
  speed: number;
  region: string;
  baseColor: THREE.Color;
  material: THREE.MeshPhongMaterial;
  headMaterial: THREE.MeshPhongMaterial;
  phaseOffset: number;
  isHighlighted: boolean;
}

interface ParticleSystem {
  geometry: THREE.BufferGeometry;
  material: THREE.PointsMaterial;
  points: THREE.Points;
  positions: Float32Array;
  colors: Float32Array;
  lifetimes: Float32Array;
  velocities: THREE.Vector3[];
  startPositions: THREE.Vector3[];
  trailGeometry: THREE.BufferGeometry;
  trailMaterial: THREE.LineBasicMaterial;
  trailLines: THREE.Line;
  trailPositions: Float32Array;
  trailColors: Float32Array;
  baseColor: THREE.Color;
}

interface HoverInfo {
  regionName: string;
  avgSpeed: number;
  depth: number;
  visible: boolean;
  screenX: number;
  screenY: number;
}

export interface OceanRendererOptions {
  onHoverChange?: (info: HoverInfo) => void;
  onTransitionStart?: () => void;
  onTransitionComplete?: () => void;
  onBackgroundColorChange?: (color: THREE.Color) => void;
}

const BG_COLOR_SURFACE = new THREE.Color(0x1a3a5e);
const BG_COLOR_MIDDLE = new THREE.Color(0x101838);
const BG_COLOR_DEEP = new THREE.Color(0x120828);

function getDepthColor(depthFactor: number, regionIdx: number): THREE.Color {
  if (depthFactor < 0.33) {
    const t = depthFactor / 0.33;
    const warm1 = new THREE.Color(0xff4444);
    const warm2 = new THREE.Color(0xff8833);
    const warm3 = new THREE.Color(0xffaa22);
    const colors = [warm1, warm2, warm3];
    return colors[regionIdx % 3].clone().lerp(new THREE.Color(0x66cc66), t * 0.3);
  } else if (depthFactor < 0.66) {
    const t = (depthFactor - 0.33) / 0.33;
    const greens = [new THREE.Color(0x33cc55), new THREE.Color(0x44dd77), new THREE.Color(0x55ee88)];
    return greens[regionIdx % 3].clone().lerp(new THREE.Color(0x3366cc), t * 0.4);
  } else {
    const t = (depthFactor - 0.66) / 0.34;
    const cool1 = new THREE.Color(0x3366ff);
    const cool2 = new THREE.Color(0x5555dd);
    const cool3 = new THREE.Color(0x7744bb);
    const colors = [cool1, cool2, cool3];
    return colors[regionIdx % 3].clone().lerp(new THREE.Color(0x9933aa), t * 0.5);
  }
}

function getBackgroundColorForDepth(depthLayer: DepthLayer): THREE.Color {
  switch (depthLayer) {
    case 'surface': return BG_COLOR_SURFACE.clone();
    case 'middle': return BG_COLOR_MIDDLE.clone();
    case 'deep': return BG_COLOR_DEEP.clone();
  }
}

export class OceanRenderer {
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private domElement: HTMLElement | null = null;
  private options: OceanRendererOptions;

  private arrows: ArrowInstance[] = [];
  private arrowGroup: THREE.Group = new THREE.Group();
  private particleSystems: ParticleSystem[] = [];
  private particleGroup: THREE.Group = new THREE.Group();

  private currentDepth: DepthLayer = 'surface';
  private targetDepth: DepthLayer = 'surface';
  private isTransitioning = false;
  private transitionProgress = 0;
  private readonly TRANSITION_DURATION = 1.5;

  private speedScale = 1.0;
  private particleSpeed = 0.5;

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private hoveredRegion: string | null = null;
  private hoveredArrowIdx: number = -1;

  private elapsedTime = 0;

  private currentBgColor = BG_COLOR_SURFACE.clone();
  private targetBgColor = BG_COLOR_SURFACE.clone();
  private bgTransitionProgress = 1;

  constructor(options: OceanRendererOptions = {}) {
    this.options = options;
  }

  init(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    domElement: HTMLElement
  ): void {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.domElement = domElement;

    scene.add(this.arrowGroup);
    scene.add(this.particleGroup);

    this.buildForDepth('surface');
    this.updateMaterialOpacity(1);

    if (domElement) {
      domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    }
  }

  private buildForDepth(depthLayer: DepthLayer): void {
    this.clearAllObjects();

    const oceanData = getOceanCurrentData(depthLayer);
    const particleData = getParticlePathData(depthLayer);
    const depthFactor = getDepthFactor(DEPTH_VALUES[depthLayer]);

    oceanData.forEach((regionData, regionIdx) => {
      const regionColor = getDepthColor(depthFactor, regionIdx);
      this.createArrowsForRegion(regionData, regionIdx, regionColor);
    });

    particleData.forEach((regionParticle, regionIdx) => {
      const regionColor = getDepthColor(depthFactor, regionIdx);
      this.createParticleSystem(regionParticle, regionColor);
    });
  }

  private createArrowsForRegion(
    data: OceanCurrentData,
    regionIdx: number,
    baseColor: THREE.Color
  ): void {
    const shaftGeometry = new THREE.CylinderGeometry(1, 1, 1, 8);
    const headGeometry = new THREE.ConeGeometry(1, 1, 8);

    for (let i = 0; i < data.position.length; i++) {
      const pos = data.position[i];
      const dir = data.direction[i];
      const speed = data.speed[i];

      const speedFactor = (speed - 0.5) / (5.0 - 0.5);
      const arrowLength = 0.5 + speedFactor * 2.5;
      const arrowDiameter = 0.08 + speedFactor * 0.22;

      const arrowMaterial = new THREE.MeshPhongMaterial({
        color: baseColor.clone(),
        transparent: true,
        opacity: 0.85,
        shininess: 80,
        emissive: baseColor.clone().multiplyScalar(0.15)
      });

      const headMaterial = new THREE.MeshPhongMaterial({
        color: baseColor.clone(),
        transparent: true,
        opacity: 0.9,
        shininess: 100,
        emissive: baseColor.clone().multiplyScalar(0.2)
      });

      const shaft = new THREE.Mesh(shaftGeometry, arrowMaterial);
      const head = new THREE.Mesh(headGeometry, headMaterial);

      const group = new THREE.Group();
      group.add(shaft);
      group.add(head);

      const shaftLength = arrowLength * 0.75;
      const headLength = arrowLength * 0.25;

      shaft.scale.set(arrowDiameter, shaftLength, arrowDiameter);
      shaft.position.y = shaftLength / 2;

      head.scale.set(arrowDiameter * 2, headLength, arrowDiameter * 2);
      head.position.y = shaftLength + headLength / 2;

      group.position.copy(pos);
      const up = new THREE.Vector3(0, 1, 0);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize());
      group.quaternion.copy(quaternion);

      group.userData = { arrowIndex: this.arrows.length, region: data.region };

      this.arrowGroup.add(group);
      this.arrows.push({
        group,
        shaft,
        head,
        basePosition: pos.clone(),
        direction: dir.clone(),
        speed,
        region: data.region,
        baseColor: baseColor.clone(),
        material: arrowMaterial,
        headMaterial,
        phaseOffset: Math.random() * Math.PI * 2,
        isHighlighted: false
      });
    }
  }

  private createParticleSystem(
    regionParticle: { startPositions: THREE.Vector3[]; velocities: THREE.Vector3[] },
    baseColor: THREE.Color
  ): void {
    const count = regionParticle.startPositions.length;
    const TRAIL_LENGTH = 30;

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);
    const velocities: THREE.Vector3[] = [];
    const startPositions: THREE.Vector3[] = [];

    for (let i = 0; i < count; i++) {
      const sp = regionParticle.startPositions[i];
      positions[i * 3] = sp.x;
      positions[i * 3 + 1] = sp.y;
      positions[i * 3 + 2] = sp.z;

      colors[i * 3] = baseColor.r;
      colors[i * 3 + 1] = baseColor.g;
      colors[i * 3 + 2] = baseColor.b;

      lifetimes[i] = Math.random() * 2.0;
      velocities.push(regionParticle.velocities[i].clone());
      startPositions.push(sp.clone());
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.25,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    const points = new THREE.Points(geometry, material);

    const trailCount = count * TRAIL_LENGTH;
    const trailPositions = new Float32Array(trailCount * 3);
    const trailColors = new Float32Array(trailCount * 3);

    for (let i = 0; i < count; i++) {
      for (let t = 0; t < TRAIL_LENGTH; t++) {
        const idx = (i * TRAIL_LENGTH + t) * 3;
        const sp = regionParticle.startPositions[i];
        trailPositions[idx] = sp.x;
        trailPositions[idx + 1] = sp.y;
        trailPositions[idx + 2] = sp.z;

        const alpha = 1 - t / TRAIL_LENGTH;
        trailColors[idx] = baseColor.r * alpha;
        trailColors[idx + 1] = baseColor.g * alpha;
        trailColors[idx + 2] = baseColor.b * alpha;
      }
    }

    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));

    const trailMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const trailLines = new THREE.Line(trailGeometry, trailMaterial);

    this.particleGroup.add(points);
    this.particleGroup.add(trailLines);

    this.particleSystems.push({
      geometry,
      material,
      points,
      positions,
      colors,
      lifetimes,
      velocities,
      startPositions,
      trailGeometry,
      trailMaterial,
      trailLines,
      trailPositions,
      trailColors,
      baseColor: baseColor.clone()
    });
  }

  private clearAllObjects(): void {
    this.arrows.forEach(a => {
      this.arrowGroup.remove(a.group);
      a.material.dispose();
      a.headMaterial.dispose();
    });
    this.arrows = [];

    this.particleSystems.forEach(ps => {
      this.particleGroup.remove(ps.points);
      this.particleGroup.remove(ps.trailLines);
      ps.geometry.dispose();
      ps.material.dispose();
      ps.trailGeometry.dispose();
      ps.trailMaterial.dispose();
    });
    this.particleSystems = [];
  }

  updateFlow(depthLayer: DepthLayer): void {
    if (this.isTransitioning || depthLayer === this.currentDepth) return;

    this.targetDepth = depthLayer;
    this.isTransitioning = true;
    this.transitionProgress = 0;
    this.hoveredRegion = null;
    this.updateHoverState();

    this.targetBgColor = getBackgroundColorForDepth(depthLayer);
    this.bgTransitionProgress = 0;

    this.options.onTransitionStart?.();
  }

  private updateTransition(delta: number): void {
    if (!this.isTransitioning) return;

    this.transitionProgress += delta / this.TRANSITION_DURATION;
    this.bgTransitionProgress = Math.min(1, this.bgTransitionProgress + delta / this.TRANSITION_DURATION);

    let displayOpacity: number;
    if (this.transitionProgress < 0.5) {
      displayOpacity = 1 - this.transitionProgress * 2;
    } else {
      if (this.transitionProgress >= 0.5 && this.currentDepth !== this.targetDepth) {
        this.currentDepth = this.targetDepth;
        this.buildForDepth(this.targetDepth);
      }
      displayOpacity = (this.transitionProgress - 0.5) * 2;
    }

    this.updateMaterialOpacity(displayOpacity);

    this.updateBackgroundColor();

    if (this.transitionProgress >= 1) {
      this.transitionProgress = 1;
      this.isTransitioning = false;
      this.updateMaterialOpacity(1);
      this.options.onTransitionComplete?.();
    }
  }

  private updateBackgroundColor(): void {
    if (this.bgTransitionProgress < 1) {
      this.currentBgColor.copy(this.currentBgColor).lerp(this.targetBgColor, 0.05);
    } else {
      this.currentBgColor.copy(this.targetBgColor);
    }
    this.options.onBackgroundColorChange?.(this.currentBgColor);
    if (this.renderer) {
      this.renderer.setClearColor(this.currentBgColor, 1);
    }
  }

  private updateMaterialOpacity(opacity: number): void {
    this.arrows.forEach(a => {
      const target = a.isHighlighted ? 0.9 : opacity * 0.85;
      a.material.opacity += (target - a.material.opacity) * 0.2;
      a.headMaterial.opacity += ((a.isHighlighted ? 0.95 : opacity * 0.9) - a.headMaterial.opacity) * 0.2;
    });

    this.particleSystems.forEach(ps => {
      ps.material.opacity = opacity * 0.9;
      ps.trailMaterial.opacity = opacity * 0.4;
    });
  }

  setSpeedScale(scale: number): void {
    this.speedScale = scale;
  }

  setParticleSpeed(speed: number): void {
    this.particleSpeed = speed;
  }

  get isInTransition(): boolean {
    return this.isTransitioning;
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.domElement || !this.camera || this.isTransitioning) return;

    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const arrowMeshes = this.arrows.map(a => a.shaft).concat(this.arrows.map(a => a.head));
    const intersects = this.raycaster.intersectObjects(arrowMeshes, false);

    let newHoveredRegion: string | null = null;
    let newHoveredIdx = -1;

    if (intersects.length > 0) {
      const hitObj = intersects[0].object;
      const parentGroup = hitObj.parent as THREE.Group;
      if (parentGroup && parentGroup.userData && parentGroup.userData.region) {
        newHoveredRegion = parentGroup.userData.region;
        newHoveredIdx = parentGroup.userData.arrowIndex;
      }
    }

    if (newHoveredRegion !== this.hoveredRegion) {
      this.hoveredRegion = newHoveredRegion;
      this.hoveredArrowIdx = newHoveredIdx;
      this.updateArrowHighlight();
      this.updateHoverState(e.clientX, e.clientY);
    } else if (this.hoveredRegion) {
      this.updateHoverState(e.clientX, e.clientY);
    }
  }

  private updateArrowHighlight(): void {
    this.arrows.forEach(arrow => {
      const shouldHighlight = this.hoveredRegion !== null && arrow.region === this.hoveredRegion;

      if (shouldHighlight !== arrow.isHighlighted) {
        arrow.isHighlighted = shouldHighlight;
        const highlightColor = new THREE.Color(0xffff44);

        if (shouldHighlight) {
          arrow.material.color.copy(highlightColor);
          arrow.headMaterial.color.copy(highlightColor);
          arrow.material.emissive.setHex(0x888800);
          arrow.headMaterial.emissive.setHex(0xaaaa00);
          arrow.material.opacity = 0.9;
          arrow.headMaterial.opacity = 0.95;
        } else {
          arrow.material.color.copy(arrow.baseColor);
          arrow.headMaterial.color.copy(arrow.baseColor);
          arrow.material.emissive.copy(arrow.baseColor).multiplyScalar(0.15);
          arrow.headMaterial.emissive.copy(arrow.baseColor).multiplyScalar(0.2);
        }
      }
    });
  }

  private updateHoverState(screenX?: number, screenY?: number): void {
    if (this.hoveredRegion) {
      const regionArrows = this.arrows.filter(a => a.region === this.hoveredRegion);
      const avgSpeed = regionArrows.reduce((sum, a) => sum + a.speed, 0) / Math.max(1, regionArrows.length);

      this.options.onHoverChange?.({
        regionName: this.hoveredRegion,
        avgSpeed: +(avgSpeed * this.speedScale).toFixed(2),
        depth: DEPTH_VALUES[this.currentDepth],
        visible: true,
        screenX: screenX ?? 0,
        screenY: screenY ?? 0
      });
    } else {
      this.options.onHoverChange?.({
        regionName: '',
        avgSpeed: 0,
        depth: 0,
        visible: false,
        screenX: 0,
        screenY: 0
      });
    }
  }

  animate(deltaTime: number): void {
    this.elapsedTime += deltaTime;

    this.updateTransition(deltaTime);
    this.updateArrows(deltaTime);
    this.updateParticles(deltaTime);
    this.updateBackgroundColor();
  }

  private updateArrows(deltaTime: number): void {
    const FLOAT_AMPLITUDE = 0.15;
    const FLOAT_FREQUENCY = 1.2;

    this.arrows.forEach(arrow => {
      const offsetY = Math.sin(this.elapsedTime * FLOAT_FREQUENCY + arrow.phaseOffset) * FLOAT_AMPLITUDE;
      arrow.group.position.y = arrow.basePosition.y + offsetY;
    });
  }

  private updateParticles(deltaTime: number): void {
    const TRAIL_FADE_SECONDS = 2.0;
    const TRAIL_LENGTH = 30;
    const LIFETIME = 2.0;
    const BOUNDARY = 55;

    this.particleSystems.forEach(ps => {
      const count = ps.startPositions.length;

      for (let i = 0; i < count; i++) {
        ps.lifetimes[i] += deltaTime * this.particleSpeed;

        if (ps.lifetimes[i] >= LIFETIME) {
          ps.lifetimes[i] = 0;
          ps.positions[i * 3] = ps.startPositions[i].x + (Math.random() - 0.5) * 2;
          ps.positions[i * 3 + 1] = ps.startPositions[i].y + (Math.random() - 0.5) * 2;
          ps.positions[i * 3 + 2] = ps.startPositions[i].z + (Math.random() - 0.5) * 2;
        }

        const vel = ps.velocities[i];
        const moveSpeed = this.speedScale * this.particleSpeed * 2;
        ps.positions[i * 3] += vel.x * deltaTime * moveSpeed;
        ps.positions[i * 3 + 1] += vel.y * deltaTime * moveSpeed;
        ps.positions[i * 3 + 2] += vel.z * deltaTime * moveSpeed;

        if (Math.abs(ps.positions[i * 3]) > BOUNDARY || Math.abs(ps.positions[i * 3 + 2]) > BOUNDARY) {
          ps.positions[i * 3] = ps.startPositions[i].x;
          ps.positions[i * 3 + 1] = ps.startPositions[i].y;
          ps.positions[i * 3 + 2] = ps.startPositions[i].z;
          ps.lifetimes[i] = 0;
        }

        const lifeRatio = ps.lifetimes[i] / LIFETIME;
        const colorFade = lifeRatio < 0.1 ? lifeRatio / 0.1 : (lifeRatio > 0.8 ? (1 - lifeRatio) / 0.2 : 1);
        ps.colors[i * 3] = ps.baseColor.r * colorFade;
        ps.colors[i * 3 + 1] = ps.baseColor.g * colorFade;
        ps.colors[i * 3 + 2] = ps.baseColor.b * colorFade;

        for (let t = TRAIL_LENGTH - 1; t > 0; t--) {
          const dstIdx = (i * TRAIL_LENGTH + t) * 3;
          const srcIdx = (i * TRAIL_LENGTH + (t - 1)) * 3;
          ps.trailPositions[dstIdx] = ps.trailPositions[srcIdx];
          ps.trailPositions[dstIdx + 1] = ps.trailPositions[srcIdx + 1];
          ps.trailPositions[dstIdx + 2] = ps.trailPositions[srcIdx + 2];

          const fadeAlpha = (1 - t / TRAIL_LENGTH) * colorFade;
          const fadeOut = Math.max(0, 1 - ps.lifetimes[i] / TRAIL_FADE_SECONDS);
          const totalAlpha = fadeAlpha * fadeOut;
          ps.trailColors[dstIdx] = ps.baseColor.r * totalAlpha;
          ps.trailColors[dstIdx + 1] = ps.baseColor.g * totalAlpha;
          ps.trailColors[dstIdx + 2] = ps.baseColor.b * totalAlpha;
        }

        const headIdx = i * TRAIL_LENGTH * 3;
        ps.trailPositions[headIdx] = ps.positions[i * 3];
        ps.trailPositions[headIdx + 1] = ps.positions[i * 3 + 1];
        ps.trailPositions[headIdx + 2] = ps.positions[i * 3 + 2];
        ps.trailColors[headIdx] = ps.baseColor.r * colorFade;
        ps.trailColors[headIdx + 1] = ps.baseColor.g * colorFade;
        ps.trailColors[headIdx + 2] = ps.baseColor.b * colorFade;
      }

      (ps.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (ps.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
      (ps.trailGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (ps.trailGeometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    });
  }

  getCurrentDepth(): DepthLayer {
    return this.currentDepth;
  }
}
