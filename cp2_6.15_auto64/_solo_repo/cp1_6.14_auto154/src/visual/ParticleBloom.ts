import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { eventBus } from '../utils/eventBus';
import type { AudioData } from '../audio/AudioAnalyzer';

const MAX_PARTICLES = 3000;
const MAX_FLOWERS = 200;
const GROUND_RADIUS = 60;

const COLOR_BUD = new THREE.Color('#ff69b4');
const COLOR_BLOOM = new THREE.Color('#c71585');
const COLOR_GROUND = new THREE.Color('#1a3a1a');

interface Flower {
  id: number;
  position: THREE.Vector3;
  growth: number;
  bloomProgress: number;
  petals: number[];
  isBloomed: boolean;
  bloomTimer: number;
  petalCount: number;
  hueOffset: number;
  isFadingOut: boolean;
  fadeOutProgress: number;
}

interface FallingPetal {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  opacity: number;
  phase: number;
  phaseOffsetX: number;
  phaseOffsetZ: number;
  frequency: number;
  amplitude: number;
  life: number;
  maxLife: number;
  alive: boolean;
}

export class ParticleBloom {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private groundMesh: THREE.Mesh | null = null;
  private particles: THREE.Points | null = null;
  private particleGeometry: THREE.BufferGeometry | null = null;
  private particleMaterial: THREE.PointsMaterial | null = null;
  private particlePositions: Float32Array | null = null;
  private particleColors: Float32Array | null = null;
  private particleSizes: Float32Array | null = null;
  private particleOpacities: Float32Array | null = null;

  private flowers: Flower[] = [];
  private fallingPetals: FallingPetal[] = [];
  private nextFlowerId = 0;
  private nextPetalId = 0;
  private flowerDensity: number = 80;
  private currentAudioData: AudioData | null = null;
  private animationId: number | null = null;
  private lastTime: number = 0;
  private spawnTimer: number = 0;
  private usedParticleSlots: boolean[] = [];
  private flowerParticleMap: Map<number, number[]> = new Map();
  private fallingParticleMap: Map<number, number> = new Map();
  private smoothedLowEnergy: number = 0;
  private smoothedMidHighEnergy: number = 0;
  private minLowEnergy: number = 1;
  private maxLowEnergy: number = 0;
  private adaptiveThreshold: number = 0.1;
  private energyHistory: number[] = [];
  private readonly ENERGY_HISTORY_SIZE: number = 300;
  private readonly ADAPTIVE_SPEED: number = 0.02;
  private readonly BASE_GROWTH_SPEED: number = 0.1;
  private readonly FADE_OUT_DURATION: number = 0.5;
  private densitySpawnTimers: number[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0a0a1a');
    this.scene.fog = new THREE.FogExp2('#0a0a1a', 0.008);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 50, 50);
    this.camera.lookAt(0, 10, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 150;
    this.controls.maxPolarAngle = Math.PI / 2.2;
    this.controls.target.set(0, 10, 0);

    this.createGround();
    this.createParticleSystem();
    this.setupEventListeners();
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
    this.spawnInitialFlower();
    this.startAnimation();
  }

  private createGround(): void {
    const geometry = new THREE.CircleGeometry(GROUND_RADIUS + 20, 64);
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshStandardMaterial({
      color: COLOR_GROUND,
      roughness: 0.9,
      metalness: 0.1
    });
    this.groundMesh = new THREE.Mesh(geometry, material);
    this.groundMesh.position.y = 0;
    this.scene.add(this.groundMesh);

    const gridHelper = new THREE.GridHelper(160, 40, 0x0f2f0f, 0x0f2f0f);
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);

    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(30, 60, 30);
    this.scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xff69b4, 1.5, 200);
    pointLight.position.set(0, 40, 0);
    this.scene.add(pointLight);
  }

  private createParticleSystem(): void {
    this.particleGeometry = new THREE.BufferGeometry();
    this.particlePositions = new Float32Array(MAX_PARTICLES * 3);
    this.particleColors = new Float32Array(MAX_PARTICLES * 3);
    this.particleSizes = new Float32Array(MAX_PARTICLES);
    this.particleOpacities = new Float32Array(MAX_PARTICLES);
    this.usedParticleSlots = new Array(MAX_PARTICLES).fill(false);

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particlePositions[i * 3] = 0;
      this.particlePositions[i * 3 + 1] = -1000;
      this.particlePositions[i * 3 + 2] = 0;
      this.particleColors[i * 3] = 1;
      this.particleColors[i * 3 + 1] = 0.4;
      this.particleColors[i * 3 + 2] = 0.7;
      this.particleSizes[i] = 0;
      this.particleOpacities[i] = 0;
    }

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(this.particleColors, 3));
    this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(this.particleSizes, 1));

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.6, 'rgba(255,255,255,0.3)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);

    this.particleMaterial = new THREE.PointsMaterial({
      size: 0.6,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: texture,
      sizeAttenuation: true
    });

    this.particles = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.scene.add(this.particles);
  }

  private acquireParticleSlot(): number {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (!this.usedParticleSlots[i]) {
        this.usedParticleSlots[i] = true;
        return i;
      }
    }
    return -1;
  }

  private releaseParticleSlot(index: number): void {
    if (index >= 0 && index < MAX_PARTICLES) {
      this.usedParticleSlots[index] = false;
      if (this.particlePositions && this.particleSizes && this.particleOpacities) {
        this.particlePositions[index * 3 + 1] = -1000;
        this.particleSizes[index] = 0;
        this.particleOpacities[index] = 0;
      }
    }
  }

  private setupEventListeners(): void {
    eventBus.on('audio:data', (data: AudioData) => {
      this.currentAudioData = data;
    });
  }

  private spawnInitialFlower(): void {
    this.spawnFlower(new THREE.Vector3(0, 0, 0));
  }

  private spawnFlower(position?: THREE.Vector3): void {
    if (this.flowers.length >= this.flowerDensity) return;

    let pos: THREE.Vector3;
    if (position) {
      pos = position.clone();
    } else {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * GROUND_RADIUS;
      pos = new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      );
    }

    const petalCount = 5 + Math.floor(Math.random() * 4);
    const petals: number[] = [];
    for (let i = 0; i < petalCount; i++) {
      petals.push(Math.random() * 0.5 + 0.5);
    }

    const flower: Flower = {
      id: this.nextFlowerId++,
      position: pos,
      growth: 0,
      bloomProgress: 0,
      petals,
      isBloomed: false,
      bloomTimer: 0,
      petalCount,
      hueOffset: (Math.random() - 0.5) * 0.08,
      isFadingOut: false,
      fadeOutProgress: 0
    };

    const particleSlots: number[] = [];
    const neededParticles = 1 + petalCount * 6;
    for (let i = 0; i < neededParticles; i++) {
      const slot = this.acquireParticleSlot();
      if (slot >= 0) {
        particleSlots.push(slot);
      }
    }

    if (particleSlots.length > 0) {
      this.flowers.push(flower);
      this.flowerParticleMap.set(flower.id, particleSlots);
    }
  }

  private spawnFallingPetal(from: THREE.Vector3, color: THREE.Color): void {
    const slot = this.acquireParticleSlot();
    if (slot < 0) return;

    const petal: FallingPetal = {
      id: this.nextPetalId++,
      position: from.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 2,
        (Math.random() - 0.5) * 2
      )),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.8,
        -Math.random() * 0.5 - 0.3,
        (Math.random() - 0.5) * 0.8
      ),
      color: color.clone(),
      size: Math.random() * 0.4 + 0.3,
      opacity: 1,
      phase: Math.random() * Math.PI * 2,
      phaseOffsetX: Math.random() * Math.PI * 2,
      phaseOffsetZ: Math.random() * Math.PI * 2,
      frequency: Math.random() * 0.015 + 0.008,
      amplitude: Math.random() * 5 + 5,
      life: 0,
      maxLife: 8 + Math.random() * 6,
      alive: true
    };

    this.fallingPetals.push(petal);
    this.fallingParticleMap.set(petal.id, slot);
  }

  private updateFlowers(delta: number, rawLowEnergy: number, rawMidHighEnergy: number): void {
    const smoothingFactor = 0.85 + Math.min(0.1, rawLowEnergy * 0.2);
    this.smoothedLowEnergy = this.smoothedLowEnergy * smoothingFactor + rawLowEnergy * (1 - smoothingFactor);
    this.smoothedMidHighEnergy = this.smoothedMidHighEnergy * smoothingFactor + rawMidHighEnergy * (1 - smoothingFactor);

    if (rawLowEnergy > 0) {
      this.energyHistory.push(rawLowEnergy);
      if (this.energyHistory.length > this.ENERGY_HISTORY_SIZE) {
        this.energyHistory.shift();
      }
      this.minLowEnergy = Math.min(this.minLowEnergy, rawLowEnergy);
      this.maxLowEnergy = Math.max(this.maxLowEnergy, rawLowEnergy);

      const range = this.maxLowEnergy - this.minLowEnergy;
      if (range > 0.05) {
        this.adaptiveThreshold = this.minLowEnergy + range * 0.3;
      }
    }

    const range = Math.max(0.1, this.maxLowEnergy - this.minLowEnergy);
    const normalizedEnergy = Math.max(0, Math.min(1, (this.smoothedLowEnergy - this.minLowEnergy) / range));

    const lowEnergy = this.smoothedLowEnergy;
    const midHighEnergy = this.smoothedMidHighEnergy;

    const hasEnoughEnergy = normalizedEnergy > 0.2 || lowEnergy > 0.05;
    const dynamicGrowthBoost = hasEnoughEnergy ? normalizedEnergy * 0.5 : 0;
    const dynamicBloomBoost = hasEnoughEnergy ? normalizedEnergy * 0.4 : 0;

    const adaptiveSmoothing = 0.9;
    this.minLowEnergy = this.minLowEnergy * adaptiveSmoothing + lowEnergy * (1 - adaptiveSmoothing);
    this.maxLowEnergy = this.maxLowEnergy * adaptiveSmoothing + Math.max(this.maxLowEnergy, lowEnergy) * (1 - adaptiveSmoothing);

    const growthSpeed = this.BASE_GROWTH_SPEED + dynamicGrowthBoost;
    const bloomSpeed = 0.08 + dynamicBloomBoost;

    for (let i = this.flowers.length - 1; i >= 0; i--) {
      const flower = this.flowers[i];

      if (flower.isFadingOut) {
        flower.fadeOutProgress += delta / this.FADE_OUT_DURATION;
        if (flower.fadeOutProgress >= 1) {
          this.removeFlower(i);
          continue;
        }
        this.renderFlower(flower, lowEnergy, midHighEnergy);
        continue;
      }

      if (flower.growth < 1) {
        const newGrowth = flower.growth + growthSpeed * delta;
        flower.growth = Math.min(1, Math.max(flower.growth, newGrowth));
      } else if (!flower.isBloomed) {
        const newBloom = flower.bloomProgress + bloomSpeed * delta;
        flower.bloomProgress = Math.min(1, Math.max(flower.bloomProgress, newBloom));
        if (flower.bloomProgress >= 1) {
          flower.isBloomed = true;
        }
      } else {
        flower.bloomTimer += delta;

        if (flower.bloomTimer > 2 + Math.random() * 3) {
          if (Math.random() < 0.05 + midHighEnergy * 0.15) {
            const slots = this.flowerParticleMap.get(flower.id);
            if (slots && slots.length > 1) {
              const bloomColor = new THREE.Color().lerpColors(
                COLOR_BUD, COLOR_BLOOM, 0.5 + flower.hueOffset
              );
              const petalPos = flower.position.clone();
              petalPos.y += flower.growth * 15;
              this.spawnFallingPetal(petalPos, bloomColor);
            }
          }
        }

        if (flower.bloomTimer > 10 + Math.random() * 8) {
          this.startFadeOut(i);
          continue;
        }
      }

      this.renderFlower(flower, lowEnergy, midHighEnergy);
    }

    this.spawnTimer += delta;
    if (this.spawnTimer > 0.8) {
      this.spawnTimer = 0;
      if (this.flowers.length < this.flowerDensity * 0.8) {
        this.spawnFlower();
      }
    }
  }

  private renderFlower(flower: Flower, lowEnergy: number, midHighEnergy: number): void {
    const slots = this.flowerParticleMap.get(flower.id);
    if (!slots || slots.length === 0) return;

    const fadeFactor = flower.isFadingOut ? Math.max(0, 1 - flower.fadeOutProgress) : 1;
    const stemHeight = flower.growth * 15;
    const centerY = flower.position.y + stemHeight;
    const scale = 0.5 + midHighEnergy;
    const flickerOpacity = 0.6 + Math.random() * 0.4 * midHighEnergy;
    const t = flower.bloomProgress;
    const color = new THREE.Color().lerpColors(
      COLOR_BUD,
      COLOR_BLOOM,
      Math.min(1, t + flower.hueOffset)
    );

    const centerSlot = slots[0];
    if (this.particlePositions && this.particleColors && this.particleSizes && this.particleOpacities) {
      this.particlePositions[centerSlot * 3] = flower.position.x;
      this.particlePositions[centerSlot * 3 + 1] = centerY;
      this.particlePositions[centerSlot * 3 + 2] = flower.position.z;
      this.particleColors[centerSlot * 3] = color.r;
      this.particleColors[centerSlot * 3 + 1] = color.g;
      this.particleColors[centerSlot * 3 + 2] = color.b;
      this.particleSizes[centerSlot] = (0.8 + lowEnergy * 0.5) * scale;
      this.particleOpacities[centerSlot] = 0.9 * flickerOpacity * fadeFactor;

      const stemSegments = 6;
      for (let s = 1; s <= stemSegments && s < slots.length; s++) {
        const sy = (flower.position.y + stemHeight * (s / stemSegments));
        const sway = Math.sin(Date.now() * 0.001 + flower.id + s) * 0.15 * midHighEnergy;
        const stemSlot = slots[s];
        if (stemSlot !== undefined) {
          this.particlePositions[stemSlot * 3] = flower.position.x + sway;
          this.particlePositions[stemSlot * 3 + 1] = sy;
          this.particlePositions[stemSlot * 3 + 2] = flower.position.z + sway;
          this.particleColors[stemSlot * 3] = 0.2 + color.r * 0.3;
          this.particleColors[stemSlot * 3 + 1] = 0.5 + color.g * 0.3;
          this.particleColors[stemSlot * 3 + 2] = 0.2 + color.b * 0.3;
          this.particleSizes[stemSlot] = 0.35;
          this.particleOpacities[stemSlot] = 0.85 * fadeFactor;
        }
      }

      const petalStartIdx = stemSegments + 1;
      for (let p = 0; p < flower.petalCount; p++) {
        const slotIdx = petalStartIdx + p;
        if (slotIdx >= slots.length) break;
        const petalSlot = slots[slotIdx];
        if (petalSlot === undefined) continue;

        const angle = (p / flower.petalCount) * Math.PI * 2 + Date.now() * 0.0003;
        const petalLength = (1.5 + flower.petals[p] * 2) * t * (0.8 + lowEnergy * 0.5);
        const petalHeight = petalLength * 0.5 * t;
        const petalOut = Math.cos(angle) * petalLength;
        const petalSide = Math.sin(angle) * petalLength;

        this.particlePositions[petalSlot * 3] = flower.position.x + petalOut;
        this.particlePositions[petalSlot * 3 + 1] = centerY + petalHeight * (0.5 + lowEnergy * 0.5);
        this.particlePositions[petalSlot * 3 + 2] = flower.position.z + petalSide;

        const petalColor = new THREE.Color().lerpColors(
          COLOR_BUD,
          COLOR_BLOOM,
          Math.min(1, t + p * 0.05 + flower.hueOffset)
        );
        this.particleColors[petalSlot * 3] = petalColor.r;
        this.particleColors[petalSlot * 3 + 1] = petalColor.g;
        this.particleColors[petalSlot * 3 + 2] = petalColor.b;
        this.particleSizes[petalSlot] = (0.6 + flower.petals[p] * 0.4) * scale;
        this.particleOpacities[petalSlot] = flickerOpacity * fadeFactor;
      }

      for (let p = 0; p < flower.petalCount; p++) {
        const slotIdx = petalStartIdx + flower.petalCount + p;
        if (slotIdx >= slots.length) break;
        const outerSlot = slots[slotIdx];
        if (outerSlot === undefined) continue;

        const angle = (p / flower.petalCount) * Math.PI * 2 + Math.PI / flower.petalCount + Date.now() * 0.0003;
        const petalLength = (1 + flower.petals[p] * 1.5) * t * (0.7 + lowEnergy * 0.4);
        const petalOut = Math.cos(angle) * petalLength * 1.3;
        const petalSide = Math.sin(angle) * petalLength * 1.3;

        this.particlePositions[outerSlot * 3] = flower.position.x + petalOut;
        this.particlePositions[outerSlot * 3 + 1] = centerY + petalLength * 0.3 * t;
        this.particlePositions[outerSlot * 3 + 2] = flower.position.z + petalSide;

        const outerColor = new THREE.Color().lerpColors(
          COLOR_BLOOM,
          new THREE.Color('#ff1493'),
          Math.random() * 0.3
        );
        this.particleColors[outerSlot * 3] = outerColor.r;
        this.particleColors[outerSlot * 3 + 1] = outerColor.g;
        this.particleColors[outerSlot * 3 + 2] = outerColor.b;
        this.particleSizes[outerSlot] = (0.4 + flower.petals[p] * 0.3) * scale;
        this.particleOpacities[outerSlot] = 0.7 * flickerOpacity * fadeFactor;
      }
    }
  }

  private startFadeOut(index: number): void {
    const flower = this.flowers[index];
    if (flower && !flower.isFadingOut) {
      flower.isFadingOut = true;
      flower.fadeOutProgress = 0;
    }
  }

  private removeFlower(index: number): void {
    const flower = this.flowers[index];
    const slots = this.flowerParticleMap.get(flower.id);
    if (slots) {
      for (const slot of slots) {
        this.releaseParticleSlot(slot);
      }
      this.flowerParticleMap.delete(flower.id);
    }
    this.flowers.splice(index, 1);
  }

  private updateFallingPetals(delta: number, time: number): void {
    for (let i = this.fallingPetals.length - 1; i >= 0; i--) {
      const petal = this.fallingPetals[i];
      if (!petal.alive) {
        const slot = this.fallingParticleMap.get(petal.id);
        if (slot !== undefined) {
          this.releaseParticleSlot(slot);
          this.fallingParticleMap.delete(petal.id);
        }
        this.fallingPetals.splice(i, 1);
        continue;
      }

      petal.life += delta;
      petal.phase += petal.frequency;

      const swayX = Math.sin(petal.phase + petal.phaseOffsetX) * petal.amplitude;
      const swayZ = Math.sin(petal.phase * 0.8 + petal.phaseOffsetZ) * petal.amplitude * 0.7;

      petal.velocity.y -= 0.015 * delta;
      petal.position.x += petal.velocity.x * delta + swayX * delta;
      petal.position.y += petal.velocity.y * delta;
      petal.position.z += petal.velocity.z * delta + swayZ * delta;

      if (petal.position.y <= 0.5) {
        petal.position.y = 0.5;
        petal.velocity.set(0, 0, 0);
        petal.opacity -= delta * 0.4;
        if (petal.opacity <= 0) {
          petal.alive = false;
        }
      }

      if (petal.life > petal.maxLife) {
        petal.opacity -= delta * 0.3;
        if (petal.opacity <= 0) {
          petal.alive = false;
        }
      }

      const slot = this.fallingParticleMap.get(petal.id);
      if (slot !== undefined && this.particlePositions && this.particleColors && this.particleSizes && this.particleOpacities) {
        this.particlePositions[slot * 3] = petal.position.x;
        this.particlePositions[slot * 3 + 1] = petal.position.y;
        this.particlePositions[slot * 3 + 2] = petal.position.z;
        this.particleColors[slot * 3] = petal.color.r;
        this.particleColors[slot * 3 + 1] = petal.color.g;
        this.particleColors[slot * 3 + 2] = petal.color.b;
        this.particleSizes[slot] = petal.size;
        this.particleOpacities[slot] = Math.max(0, petal.opacity);
      }
    }
  }

  private startAnimation(): void {
    this.lastTime = performance.now();
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;

      const lowEnergy = this.currentAudioData?.lowEnergy ?? 0;
      const midHighEnergy = this.currentAudioData?.midHighEnergy ?? 0;

      this.updateFlowers(delta, lowEnergy, midHighEnergy);
      this.updateFallingPetals(delta, now * 0.001);

      if (this.particleGeometry) {
        (this.particleGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        (this.particleGeometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
        (this.particleGeometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
      }

      if (this.particleMaterial && this.particleOpacities) {
        let maxOpacity = 0;
        for (let i = 0; i < this.particleOpacities.length; i++) {
          if (this.particleOpacities[i] > maxOpacity) maxOpacity = this.particleOpacities[i];
        }
        this.particleMaterial.opacity = maxOpacity || 0.01;
      }

      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  setFlowerDensity(density: number): void {
    const newDensity = Math.max(30, Math.min(200, density));
    const oldDensity = this.flowerDensity;
    this.flowerDensity = newDensity;

    for (const timerId of this.densitySpawnTimers) {
      clearTimeout(timerId);
    }
    this.densitySpawnTimers = [];

    if (newDensity > oldDensity) {
      const targetFlowerCount = Math.min(newDensity, MAX_FLOWERS);
      const flowersToAdd = Math.max(0, targetFlowerCount - this.flowers.length);
      const diff = newDensity - oldDensity;
      const interval = diff > 50 ? 50 : diff > 20 ? 80 : 120;

      if (flowersToAdd > 0 && diff > 50) {
        const batchCount = Math.floor(flowersToAdd / 3);
        for (let i = 0; i < batchCount; i++) {
          const timerId = window.setTimeout(() => {
            for (let j = 0; j < 3 && this.flowers.length < this.flowerDensity; j++) {
              this.spawnFlower();
            }
          }, i * interval);
          this.densitySpawnTimers.push(timerId);
        }
        const remaining = flowersToAdd % 3;
        for (let i = 0; i < remaining; i++) {
          const timerId = window.setTimeout(() => {
            if (this.flowers.length < this.flowerDensity) {
              this.spawnFlower();
            }
          }, batchCount * interval + i * interval);
          this.densitySpawnTimers.push(timerId);
        }
      } else {
        for (let i = 0; i < flowersToAdd; i++) {
          const timerId = window.setTimeout(() => {
            if (this.flowers.length < this.flowerDensity) {
              this.spawnFlower();
            }
          }, i * interval);
          this.densitySpawnTimers.push(timerId);
        }
      }
    } else if (newDensity < oldDensity) {
      const flowersToRemove = Math.max(0, this.flowers.length - newDensity);
      let removedCount = 0;
      for (let i = this.flowers.length - 1; i >= 0 && removedCount < flowersToRemove; i--) {
        const flower = this.flowers[i];
        if (flower && !flower.isFadingOut) {
          this.startFadeOut(i);
          removedCount++;
        }
      }
    }
  }

  private handleResize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  destroy(): void {
    window.removeEventListener('resize', this.handleResize);
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    for (const timerId of this.densitySpawnTimers) {
      clearTimeout(timerId);
    }
    this.densitySpawnTimers = [];
    if (this.particleGeometry) this.particleGeometry.dispose();
    if (this.particleMaterial) this.particleMaterial.dispose();
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }
}

export default ParticleBloom;
