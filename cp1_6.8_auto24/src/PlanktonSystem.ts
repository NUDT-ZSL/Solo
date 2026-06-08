import * as THREE from 'three';
import { OceanScene } from './OceanScene';

const PLANKTON_COUNT = 500;
const TRAIL_LENGTH = 20;
const SURGE_PARTICLE_COUNT = 32;
const SURGE_DURATION = 1.5;

const PLANKTON_NAMES = [
  '蓝泪藻',
  '磷光伞水母',
  '星辉水螅',
  '月影浮游',
  '碧波萤虫',
  '幽光海葵',
  '银丝虫',
  '紫晶水母',
  '翡翠海星',
  '极光藻',
  '琉璃虫',
  '幻影水母',
  '珊瑚萤',
  '深渊之光',
  '海月水母',
  '潮汐萤',
  '星尘藻',
  '夜光螺',
  '碧落虫',
  '灵光水母',
];

const HIGHLIGHT_COLOR = new THREE.Color(0xff66aa);

interface PlanktonData {
  mesh: THREE.Mesh;
  name: string;
  brightness: number;
  clickCount: number;
  pulsePhase: number;
  pulseSpeed: number;
  baseColor: THREE.Color;
  baseScale: THREE.Vector3;
  driftVelocity: THREE.Vector3;
  rotationAxis: THREE.Vector3;
  rotationSpeed: number;
  isHovered: boolean;
  isSurging: boolean;
  surgeProgress: number;
  trailHistory: THREE.Vector3[];
}

interface SurgeEffect {
  points: THREE.Points;
  velocities: THREE.Vector3[];
  age: number;
  maxAge: number;
}

export class PlanktonSystem {
  private scene: THREE.Scene;
  private ocean: OceanScene;
  private planktonList: PlanktonData[] = [];
  private glowPoints: THREE.Points;
  private glowPositions: Float32Array;
  private glowColors: Float32Array;
  private glowSizes: Float32Array;
  private trailPoints: THREE.Points;
  private trailPositions: Float32Array;
  private trailColors: Float32Array;
  private surgeEffects: SurgeEffect[] = [];
  private elapsedCache: number = 0;
  private tideSpeedCache: number = 1;

  constructor(scene: THREE.Scene, ocean: OceanScene) {
    this.scene = scene;
    this.ocean = ocean;

    this.glowPositions = new Float32Array(PLANKTON_COUNT * 3);
    this.glowColors = new Float32Array(PLANKTON_COUNT * 3);
    this.glowSizes = new Float32Array(PLANKTON_COUNT);

    const glowGeometry = new THREE.BufferGeometry();
    glowGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.glowPositions, 3)
    );
    glowGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(this.glowColors, 3)
    );
    glowGeometry.setAttribute(
      'size',
      new THREE.BufferAttribute(this.glowSizes, 1)
    );

    const glowTexture = this.createGlowTexture();
    const glowMaterial = new THREE.PointsMaterial({
      size: 4,
      map: glowTexture,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
      sizeAttenuation: true,
    });

    this.glowPoints = new THREE.Points(glowGeometry, glowMaterial);
    scene.add(this.glowPoints);

    this.trailPositions = new Float32Array(PLANKTON_COUNT * TRAIL_LENGTH * 3);
    this.trailColors = new Float32Array(PLANKTON_COUNT * TRAIL_LENGTH * 3);

    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.trailPositions, 3)
    );
    trailGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(this.trailColors, 3)
    );

    const trailMaterial = new THREE.PointsMaterial({
      size: 0.3,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
      sizeAttenuation: true,
    });

    this.trailPoints = new THREE.Points(trailGeometry, trailMaterial);
    scene.add(this.trailPoints);

    const bodyGeometry = new THREE.IcosahedronGeometry(0.35, 1);

    for (let i = 0; i < PLANKTON_COUNT; i++) {
      const hue = 0.5 + Math.random() * 0.25;
      const saturation = 0.6 + Math.random() * 0.4;
      const lightness = 0.4 + Math.random() * 0.3;
      const color = new THREE.Color().setHSL(hue, saturation, lightness);

      const material = new THREE.MeshBasicMaterial({
        color: color.clone(),
        transparent: true,
        opacity: 0.9,
      });

      const mesh = new THREE.Mesh(bodyGeometry, material);

      const x = (Math.random() - 0.5) * 120;
      const z = (Math.random() - 0.5) * 120;
      const y = ocean.getWaveHeight(x, z, 0, 1) + 0.5 + Math.random() * 1.5;

      mesh.position.set(x, y, z);
      const scaleX = 0.8 + Math.random() * 0.4;
      const scaleY = 0.6 + Math.random() * 0.3;
      const scaleZ = 0.8 + Math.random() * 0.4;
      mesh.scale.set(scaleX, scaleY, scaleZ);
      scene.add(mesh);

      const trailHistory: THREE.Vector3[] = [];
      for (let t = 0; t < TRAIL_LENGTH; t++) {
        trailHistory.push(new THREE.Vector3(x, y, z));
      }

      this.planktonList.push({
        mesh,
        name: PLANKTON_NAMES[Math.floor(Math.random() * PLANKTON_NAMES.length)],
        brightness: Math.floor(Math.random() * 101),
        clickCount: 0,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.5 + Math.random() * 2,
        baseColor: color.clone(),
        baseScale: new THREE.Vector3(scaleX, scaleY, scaleZ),
        driftVelocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          0,
          (Math.random() - 0.5) * 0.3
        ),
        rotationAxis: new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize(),
        rotationSpeed: (Math.random() - 0.5) * 0.5,
        isHovered: false,
        isSurging: false,
        surgeProgress: 0,
        trailHistory,
      });
    }
  }

  private createGlowTexture(): THREE.Texture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    );
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(200,220,255,0.6)');
    gradient.addColorStop(0.5, 'rgba(100,150,255,0.2)');
    gradient.addColorStop(1, 'rgba(0,0,50,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  }

  getMeshes(): THREE.Mesh[] {
    return this.planktonList.map((p) => p.mesh);
  }

  getPlanktonByMesh(mesh: THREE.Mesh): PlanktonData | undefined {
    return this.planktonList.find((p) => p.mesh === mesh);
  }

  setHovered(mesh: THREE.Mesh | null) {
    for (const p of this.planktonList) {
      if (p.mesh === mesh && !p.isHovered) {
        p.isHovered = true;
        p.mesh.material = new THREE.MeshBasicMaterial({
          color: HIGHLIGHT_COLOR.clone(),
          transparent: true,
          opacity: 0.95,
        });
        p.mesh.scale.copy(p.baseScale).multiplyScalar(1.2);
      } else if (p.mesh !== mesh && p.isHovered) {
        p.isHovered = false;
        p.mesh.material = new THREE.MeshBasicMaterial({
          color: p.baseColor.clone(),
          transparent: true,
          opacity: 0.9,
        });
        p.mesh.scale.copy(p.baseScale);
      }
    }
  }

  triggerSurge(mesh: THREE.Mesh): PlanktonData | null {
    const plankton = this.getPlanktonByMesh(mesh);
    if (!plankton || plankton.isSurging) return null;

    plankton.isSurging = true;
    plankton.surgeProgress = 0;
    plankton.clickCount++;

    const pos = plankton.mesh.position.clone();
    this.ocean.addRipple(pos.x, pos.z);

    this.createSurgeEffect(pos, plankton.baseColor);

    return plankton;
  }

  private createSurgeEffect(origin: THREE.Vector3, color: THREE.Color) {
    const positions = new Float32Array(SURGE_PARTICLE_COUNT * 3);
    const colors = new Float32Array(SURGE_PARTICLE_COUNT * 3);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < SURGE_PARTICLE_COUNT; i++) {
      const angle = (i / SURGE_PARTICLE_COUNT) * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 8 + Math.random() * 4;
      const dir = new THREE.Vector3(
        Math.sin(phi) * Math.cos(angle),
        Math.sin(phi) * Math.sin(angle) * 0.3 + 0.3,
        Math.cos(phi)
      ).normalize();

      velocities.push(dir.multiplyScalar(speed));

      positions[i * 3] = origin.x;
      positions[i * 3 + 1] = origin.y;
      positions[i * 3 + 2] = origin.z;

      const c = color.clone();
      c.offsetHSL(Math.random() * 0.1 - 0.05, 0, Math.random() * 0.2);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 1.0,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
      sizeAttenuation: true,
      map: this.createGlowTexture(),
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.surgeEffects.push({
      points,
      velocities,
      age: 0,
      maxAge: SURGE_DURATION,
    });
  }

  update(
    elapsed: number,
    delta: number,
    glowIntensity: number,
    trailEnabled: boolean,
    tideSpeed: number = 1
  ) {
    this.elapsedCache = elapsed;
    this.tideSpeedCache = tideSpeed;

    for (let i = 0; i < this.planktonList.length; i++) {
      const p = this.planktonList[i];

      p.mesh.position.x += p.driftVelocity.x * delta;
      p.mesh.position.z += p.driftVelocity.z * delta;

      if (Math.abs(p.mesh.position.x) > 60) p.driftVelocity.x *= -1;
      if (Math.abs(p.mesh.position.z) > 60) p.driftVelocity.z *= -1;

      const waveY = this.ocean.getWaveHeight(
        p.mesh.position.x,
        p.mesh.position.z,
        elapsed,
        tideSpeed
      );
      p.mesh.position.y = waveY + 0.5 + Math.sin(elapsed * 0.8 + i) * 0.3;

      if (!p.isHovered) {
        const quat = new THREE.Quaternion().setFromAxisAngle(
          p.rotationAxis,
          p.rotationSpeed * delta
        );
        p.mesh.quaternion.multiply(quat);
      }

      if (p.isSurging) {
        p.surgeProgress += delta / SURGE_DURATION;
        if (p.surgeProgress >= 1) {
          p.isSurging = false;
          p.surgeProgress = 0;
          if (!p.isHovered) {
            p.mesh.scale.copy(p.baseScale);
          }
        } else {
          const surgeScale = 1 + Math.sin(p.surgeProgress * Math.PI) * 2;
          const scaleVec = p.baseScale.clone().multiplyScalar(
            p.isHovered ? 1.2 * surgeScale : surgeScale
          );
          p.mesh.scale.copy(scaleVec);

          const flashIntensity =
            Math.sin(p.surgeProgress * Math.PI * 6) * 0.5 + 0.5;
          const mat = p.mesh.material as THREE.MeshBasicMaterial;
          mat.opacity = 0.5 + flashIntensity * 0.5;
        }
      }

      const pulseValue =
        (Math.sin(elapsed * p.pulseSpeed + p.pulsePhase) + 1) * 0.5;
      const brightness = (0.4 + pulseValue * 0.6) * glowIntensity;

      if (!p.isHovered && !p.isSurging) {
        const mat = p.mesh.material as THREE.MeshBasicMaterial;
        const pulsedColor = p.baseColor.clone().multiplyScalar(brightness);
        mat.color.copy(pulsedColor);
        mat.opacity = 0.6 + pulseValue * 0.4;
      }

      const i3 = i * 3;
      this.glowPositions[i3] = p.mesh.position.x;
      this.glowPositions[i3 + 1] = p.mesh.position.y;
      this.glowPositions[i3 + 2] = p.mesh.position.z;

      const glowColor = p.isHovered
        ? HIGHLIGHT_COLOR.clone()
        : p.baseColor.clone().multiplyScalar(brightness * 1.5);
      this.glowColors[i3] = glowColor.r;
      this.glowColors[i3 + 1] = glowColor.g;
      this.glowColors[i3 + 2] = glowColor.b;

      this.glowSizes[i] = (2 + pulseValue * 2) * glowIntensity;

      p.trailHistory.pop();
      p.trailHistory.unshift(p.mesh.position.clone());

      for (let t = 0; t < TRAIL_LENGTH; t++) {
        const idx = (i * TRAIL_LENGTH + t) * 3;
        if (trailEnabled) {
          this.trailPositions[idx] = p.trailHistory[t].x;
          this.trailPositions[idx + 1] = p.trailHistory[t].y;
          this.trailPositions[idx + 2] = p.trailHistory[t].z;

          const fade = 1 - t / TRAIL_LENGTH;
          const trailBrightness = fade * brightness * 0.8;
          const tc = p.baseColor.clone().multiplyScalar(trailBrightness);
          this.trailColors[idx] = tc.r;
          this.trailColors[idx + 1] = tc.g;
          this.trailColors[idx + 2] = tc.b;
        } else {
          this.trailPositions[idx] = 0;
          this.trailPositions[idx + 1] = -100;
          this.trailPositions[idx + 2] = 0;
          this.trailColors[idx] = 0;
          this.trailColors[idx + 1] = 0;
          this.trailColors[idx + 2] = 0;
        }
      }
    }

    (
      this.glowPoints.geometry.attributes.position as THREE.BufferAttribute
    ).needsUpdate = true;
    (
      this.glowPoints.geometry.attributes.color as THREE.BufferAttribute
    ).needsUpdate = true;
    (
      this.glowPoints.geometry.attributes.size as THREE.BufferAttribute
    ).needsUpdate = true;

    (
      this.trailPoints.geometry.attributes.position as THREE.BufferAttribute
    ).needsUpdate = true;
    (
      this.trailPoints.geometry.attributes.color as THREE.BufferAttribute
    ).needsUpdate = true;

    this.trailPoints.visible = trailEnabled;

    for (let i = this.surgeEffects.length - 1; i >= 0; i--) {
      const effect = this.surgeEffects[i];
      effect.age += delta;

      if (effect.age >= effect.maxAge) {
        this.scene.remove(effect.points);
        effect.points.geometry.dispose();
        (effect.points.material as THREE.Material).dispose();
        this.surgeEffects.splice(i, 1);
        continue;
      }

      const progress = effect.age / effect.maxAge;
      const posAttr = effect.points.geometry.attributes
        .position as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;

      for (let j = 0; j < effect.velocities.length; j++) {
        const j3 = j * 3;
        posArray[j3] += effect.velocities[j].x * delta;
        posArray[j3 + 1] += effect.velocities[j].y * delta;
        posArray[j3 + 2] += effect.velocities[j].z * delta;
        effect.velocities[j].multiplyScalar(0.97);
      }
      posAttr.needsUpdate = true;

      (effect.points.material as THREE.PointsMaterial).opacity =
        (1 - progress) * 0.8;
      (effect.points.material as THREE.PointsMaterial).size =
        1.0 * (1 - progress * 0.5);
    }
  }
}
