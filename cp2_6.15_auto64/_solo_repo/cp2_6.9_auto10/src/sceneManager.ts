import * as THREE from 'three';
import { gsap, Power2 } from 'gsap';
import type { InteractionEvent, Transform } from './interaction';

export type SculptureType = 'icosahedron' | 'torusKnot' | 'twistedTorus';

interface SculptureData {
  type: SculptureType;
  mesh: THREE.Mesh;
  group: THREE.Group;
  halo: THREE.Sprite;
  basePosition: THREE.Vector3;
  baseScale: number;
  isSelected: boolean;
  currentHue: number;
  colorPulseActive: boolean;
  colorPulseTime: number;
}

interface ParticleData {
  originalPosition: THREE.Vector3;
  targetPosition: THREE.Vector3;
  bezierControl1: THREE.Vector3;
  bezierControl2: THREE.Vector3;
  originalColor: THREE.Color;
  currentColor: THREE.Color;
  sculptureIndex: number;
}

interface TrailParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
}

interface ParticleState {
  isDissolving: boolean;
  isReassembling: boolean;
  progress: number;
  activeSculptureIndex: number;
}

export class SceneManager {
  public readonly scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  private sculptureGroup: THREE.Group;
  private sculptures: SculptureData[] = [];

  private particleSystem: THREE.Points | null = null;
  private particleGeometry: THREE.BufferGeometry | null = null;
  private particlePositions: Float32Array | null = null;
  private particleColors: Float32Array | null = null;
  private particleData: ParticleData[] = [];
  private particleState: ParticleState = {
    isDissolving: false,
    isReassembling: false,
    progress: 0,
    activeSculptureIndex: -1
  };

  private backgroundStars: THREE.Points | null = null;
  private backgroundStarBrightness: Float32Array | null = null;

  private trailParticles: TrailParticle[] = [];
  private trailSystem: THREE.Points | null = null;
  private trailGeometry: THREE.BufferGeometry | null = null;
  private trailPositions: Float32Array | null = null;
  private trailColors: Float32Array | null = null;
  private trailSizes: Float32Array | null = null;

  private transformState: Transform = {
    rotationX: 0,
    rotationY: 0,
    scale: 1,
    position: new THREE.Vector3()
  };

  private targetTransform: Transform = {
    rotationX: 0,
    rotationY: 0,
    scale: 1,
    position: new THREE.Vector3()
  };

  private time: number = 0;
  private readonly PARTICLE_COUNT = 5000;
  private readonly STAR_COUNT = 2000;
  private readonly MAX_TRAIL_PARTICLES = 150;
  private readonly COLOR_CYCLE_PERIOD = 30;
  private readonly DISSOLVE_DURATION = 0.8;
  private readonly REASSEMBLE_DURATION = 1.2;
  private readonly DISSOLVE_RADIUS = 5;
  private readonly AUTO_ROTATE_SPEED = (15 * Math.PI) / 180;
  private readonly ORBIT_PERIOD = 10;

  private raycaster: THREE.Raycaster;
  private isMobile: boolean;

  private _debugMode = 'Idle';
  public get debugMode(): string { return this._debugMode; }

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || window.innerWidth < 768;

    this.sculptureGroup = new THREE.Group();
    this.scene.add(this.sculptureGroup);

    this.init();
  }

  private init(): void {
    this.createSculptures();
    this.createParticleSystem();
    this.createBackgroundStars();
    this.createTrailSystem();
    this.setupLighting();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404080, 0.6);
    this.scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x9d4edd, 1.5, 50);
    pointLight1.position.set(5, 5, 5);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xf72585, 1, 50);
    pointLight2.position.set(-5, -3, 3);
    this.scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0x7209b7, 1, 50);
    pointLight3.position.set(0, 5, -5);
    this.scene.add(pointLight3);
  }

  private createSculptures(): void {
    const types: SculptureType[] = ['icosahedron', 'torusKnot', 'twistedTorus'];
    const angles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
    const orbitRadius = 3.5;

    types.forEach((type, index) => {
      const geometry = this.createSculptureGeometry(type);
      const material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color().setHSL(index / 3, 0.8, 0.5),
        transparent: true,
        opacity: 0.85,
        emissive: new THREE.Color().setHSL(index / 3, 0.8, 0.3),
        emissiveIntensity: 0.3,
        metalness: 0.3,
        roughness: 0.2,
        clearcoat: 0.8,
        clearcoatRoughness: 0.2,
        side: THREE.DoubleSide,
        depthWrite: false
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const group = new THREE.Group();
      const angle = angles[index];
      const basePos = new THREE.Vector3(
        Math.cos(angle) * orbitRadius,
        Math.sin(angle * 2) * 0.8,
        Math.sin(angle) * orbitRadius
      );
      group.position.copy(basePos);
      group.add(mesh);

      const haloTexture = this.createHaloTexture();
      const haloMaterial = new THREE.SpriteMaterial({
        map: haloTexture,
        transparent: true,
        opacity: 0,
        color: 0xc77dff,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const halo = new THREE.Sprite(haloMaterial);
      halo.scale.set(3.5, 3.5, 1);
      group.add(halo);

      this.sculptureGroup.add(group);

      this.sculptures.push({
        type,
        mesh,
        group,
        halo,
        basePosition: basePos.clone(),
        baseScale: 1,
        isSelected: false,
        currentHue: index / 3,
        colorPulseActive: false,
        colorPulseTime: 0
      });
    });
  }

  private createSculptureGeometry(type: SculptureType): THREE.BufferGeometry {
    switch (type) {
      case 'icosahedron': {
        const geo = new THREE.IcosahedronGeometry(1.2, 1);
        return this.subdivideAndWarp(geo, 1, 0.05);
      }
      case 'torusKnot': {
        const geo = new THREE.TorusKnotGeometry(0.9, 0.3, 128, 16, 2, 5);
        return this.subdivideAndWarp(geo, 1, 0.03);
      }
      case 'twistedTorus': {
        const geo = new THREE.ParametricGeometry((u, v, target) => {
          u *= Math.PI * 2;
          v *= Math.PI * 2;
          const twist = u * 3;
          const tubeRadius = 0.35;
          const ringRadius = 1.1;
          const x = (ringRadius + tubeRadius * Math.cos(v + twist)) * Math.cos(u);
          const y = (ringRadius + tubeRadius * Math.cos(v + twist)) * Math.sin(u);
          const z = tubeRadius * Math.sin(v + twist);
          target.set(x, y, z);
        }, 80, 32);
        geo.computeVertexNormals();
        return geo;
      }
      default:
        return new THREE.SphereGeometry(1, 32, 32);
    }
  }

  private subdivideAndWarp(geometry: THREE.BufferGeometry, subdivisions: number, warpAmount: number): THREE.BufferGeometry {
    let geo = geometry;
    for (let i = 0; i < subdivisions; i++) {
      geo = new THREE.SubdivisionModifier ? geo : geo;
    }

    const positions = geo.attributes.position;
    if (positions) {
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);
        const noise = (Math.sin(x * 3) * Math.cos(y * 2) * Math.sin(z * 4)) * warpAmount;
        const len = Math.sqrt(x * x + y * y + z * z) || 1;
        positions.setXYZ(i, x + (x / len) * noise, y + (y / len) * noise, z + (z / len) * noise);
      }
      geo.computeVertexNormals();
    }
    return geo;
  }

  private createHaloTexture(): THREE.Texture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(199, 125, 255, 0)');
    gradient.addColorStop(0.65, 'rgba(199, 125, 255, 0)');
    gradient.addColorStop(0.75, 'rgba(199, 125, 255, 0.9)');
    gradient.addColorStop(0.85, 'rgba(199, 125, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(199, 125, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private createParticleGradientTexture(): THREE.Texture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = 1;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, size, 0);
    gradient.addColorStop(0, '#4361ee');
    gradient.addColorStop(0.25, '#7209b7');
    gradient.addColorStop(0.5, '#b5179e');
    gradient.addColorStop(0.75, '#f72585');
    gradient.addColorStop(1, '#ff6b35');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, 1);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private createParticleSystem(): void {
    this.particleGeometry = new THREE.BufferGeometry();
    this.particlePositions = new Float32Array(this.PARTICLE_COUNT * 3);
    this.particleColors = new Float32Array(this.PARTICLE_COUNT * 3);

    const particlesPerSculpture = Math.floor(this.PARTICLE_COUNT / this.sculptures.length);

    this.sculptures.forEach((sculpture, sIndex) => {
      const geo = sculpture.mesh.geometry;
      const positions = geo.attributes.position;
      const startIdx = sIndex * particlesPerSculpture;
      const count = sIndex === this.sculptures.length - 1
        ? this.PARTICLE_COUNT - startIdx
        : particlesPerSculpture;

      for (let i = 0; i < count; i++) {
        const pIdx = startIdx + i;
        const vertexIdx = Math.floor(Math.random() * positions.count);
        const x = positions.getX(vertexIdx) + (Math.random() - 0.5) * 0.1;
        const y = positions.getY(vertexIdx) + (Math.random() - 0.5) * 0.1;
        const z = positions.getZ(vertexIdx) + (Math.random() - 0.5) * 0.1;

        const worldPos = new THREE.Vector3(x, y, z);
        worldPos.applyMatrix4(sculpture.group.matrixWorld);

        this.particlePositions[pIdx * 3] = worldPos.x;
        this.particlePositions[pIdx * 3 + 1] = worldPos.y;
        this.particlePositions[pIdx * 3 + 2] = worldPos.z;

        const hue = (sIndex / this.sculptures.length + Math.random() * 0.05) % 1;
        const color = new THREE.Color().setHSL(hue, 0.85, 0.6);
        this.particleColors[pIdx * 3] = color.r;
        this.particleColors[pIdx * 3 + 1] = color.g;
        this.particleColors[pIdx * 3 + 2] = color.b;

        this.particleData.push({
          originalPosition: worldPos.clone(),
          targetPosition: worldPos.clone(),
          bezierControl1: new THREE.Vector3(),
          bezierControl2: new THREE.Vector3(),
          originalColor: color.clone(),
          currentColor: color.clone(),
          sculptureIndex: sIndex
        });
      }
    });

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(this.particleColors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: this.isMobile ? 0.06 : 0.045,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: this.createParticleGradientTexture(),
      sizeAttenuation: true
    });

    this.particleSystem = new THREE.Points(this.particleGeometry, particleMaterial);
    this.particleSystem.visible = false;
    this.scene.add(this.particleSystem);
  }

  private createBackgroundStars(): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.STAR_COUNT * 3);
    const colors = new Float32Array(this.STAR_COUNT * 3);
    this.backgroundStarBrightness = new Float32Array(this.STAR_COUNT);

    const starRadius = 60;

    for (let i = 0; i < this.STAR_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = starRadius * (0.7 + Math.random() * 0.3);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const hue = 0.6 + Math.random() * 0.2;
      const color = new THREE.Color().setHSL(hue, 0.5, 0.7);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      this.backgroundStarBrightness[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: this.isMobile ? 0.15 : 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: false
    });

    this.backgroundStars = new THREE.Points(geometry, material);
    this.scene.add(this.backgroundStars);
  }

  private createTrailSystem(): void {
    this.trailGeometry = new THREE.BufferGeometry();
    this.trailPositions = new Float32Array(this.MAX_TRAIL_PARTICLES * 3);
    this.trailColors = new Float32Array(this.MAX_TRAIL_PARTICLES * 3);
    this.trailSizes = new Float32Array(this.MAX_TRAIL_PARTICLES);

    for (let i = 0; i < this.MAX_TRAIL_PARTICLES; i++) {
      this.trailPositions[i * 3] = 0;
      this.trailPositions[i * 3 + 1] = -1000;
      this.trailPositions[i * 3 + 2] = 0;
      this.trailColors[i * 3] = 0.8;
      this.trailColors[i * 3 + 1] = 0.5;
      this.trailColors[i * 3 + 2] = 1;
      this.trailSizes[i] = 0;
    }

    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    this.trailGeometry.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.trailSystem = new THREE.Points(this.trailGeometry, material);
    this.scene.add(this.trailSystem);
  }

  public handleInteractionEvent(event: InteractionEvent): void {
    switch (event.type) {
      case 'transform':
        if (event.transform) {
          if (event.transform.rotationX !== undefined) this.targetTransform.rotationX = event.transform.rotationX;
          if (event.transform.rotationY !== undefined) this.targetTransform.rotationY = event.transform.rotationY;
          if (event.transform.scale !== undefined) this.targetTransform.scale = event.transform.scale;
        }
        break;

      case 'select':
        if (event.pointerWorld) {
          this.handleSelection(event.pointerWorld);
        }
        break;

      case 'flick':
        if (event.pointerWorld) {
          this.handleFlick(event.pointerWorld);
        }
        break;

      case 'pulse':
        this.handleColorPulse();
        break;

      case 'trail':
        if (event.pointerWorld) {
          this.addTrailParticle(event.pointerWorld);
        }
        break;
    }
  }

  private handleSelection(worldPos: THREE.Vector3): void {
    let nearestIndex = -1;
    let nearestDist = Infinity;

    this.sculptures.forEach((sculpture, index) => {
      const dist = sculpture.group.position.distanceTo(worldPos);
      if (dist < nearestDist && dist < 4) {
        nearestDist = dist;
        nearestIndex = index;
      }
    });

    if (nearestIndex >= 0) {
      this.selectSculpture(nearestIndex);
    } else {
      this.deselectAll();
    }
  }

  private selectSculpture(index: number): void {
    this.sculptures.forEach((s, i) => {
      s.isSelected = i === index;
      const targetScale = i === index ? 1.2 : 1;
      const halo = s.halo.material as THREE.SpriteMaterial;

      gsap.to(s.group.scale, {
        x: targetScale,
        y: targetScale,
        z: targetScale,
        duration: 0.35,
        ease: Power2.inOut
      });

      gsap.to(halo, {
        opacity: i === index ? 0.6 : 0,
        duration: 0.35,
        ease: Power2.inOut
      });
    });

    this._debugMode = `Selected: ${this.sculptures[index].type}`;
  }

  private deselectAll(): void {
    this.sculptures.forEach(s => {
      s.isSelected = false;
      gsap.to(s.group.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.35,
        ease: Power2.inOut
      });

      const halo = s.halo.material as THREE.SpriteMaterial;
      gsap.to(halo, {
        opacity: 0,
        duration: 0.35,
        ease: Power2.inOut
      });
    });
    this._debugMode = 'Idle';
  }

  private handleFlick(worldPos: THREE.Vector3): void {
    if (this.particleState.isDissolving || this.particleState.isReassembling) return;

    let nearestIndex = -1;
    let nearestDist = Infinity;

    this.sculptures.forEach((sculpture, index) => {
      const dist = sculpture.group.position.distanceTo(worldPos);
      if (dist < nearestDist && dist < 5) {
        nearestDist = dist;
        nearestIndex = index;
      }
    });

    if (nearestIndex < 0) {
      nearestIndex = Math.floor(Math.random() * this.sculptures.length);
    }

    this.triggerDissolve(nearestIndex);
  }

  private triggerDissolve(sculptureIndex: number): void {
    this.particleState = {
      isDissolving: true,
      isReassembling: false,
      progress: 0,
      activeSculptureIndex: sculptureIndex
    };

    const sculpture = this.sculptures[sculptureIndex];
    const center = sculpture.group.position.clone();

    this.sculptures.forEach((s, i) => {
      if (i === sculptureIndex) {
        gsap.to(s.mesh.material as THREE.MeshPhysicalMaterial, {
          opacity: 0,
          duration: 0.3,
          ease: Power2.easeOut
        });
      }
    });

    const particlesPerSculpture = Math.floor(this.PARTICLE_COUNT / this.sculptures.length);
    const startIdx = sculptureIndex * particlesPerSculpture;
    const count = sculptureIndex === this.sculptures.length - 1
      ? this.PARTICLE_COUNT - startIdx
      : particlesPerSculpture;

    for (let i = 0; i < count; i++) {
      const pIdx = startIdx + i;
      const data = this.particleData[pIdx];

      data.originalPosition.copy(data.originalPosition);

      const direction = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize();

      const distance = this.DISSOLVE_RADIUS * (0.5 + Math.random() * 0.5);
      data.targetPosition.copy(center).add(direction.multiplyScalar(distance));

      const mid1 = data.originalPosition.clone().lerp(data.targetPosition, 0.3);
      mid1.add(new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ));
      data.bezierControl1.copy(mid1);

      const mid2 = data.originalPosition.clone().lerp(data.targetPosition, 0.7);
      mid2.add(new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.5
      ));
      data.bezierControl2.copy(mid2);
    }

    if (this.particleSystem) {
      this.particleSystem.visible = true;
    }

    this._debugMode = `Dissolving: ${sculpture.type}`;

    gsap.to(this.particleState, {
      progress: 1,
      duration: this.DISSOLVE_DURATION,
      ease: Power2.easeOut,
      onComplete: () => {
        this.startReassemble(sculptureIndex);
      }
    });
  }

  private startReassemble(sculptureIndex: number): void {
    this.particleState.isDissolving = false;
    this.particleState.isReassembling = true;
    this.particleState.progress = 0;

    const sculpture = this.sculptures[sculptureIndex];
    const center = sculpture.group.position.clone();

    const particlesPerSculpture = Math.floor(this.PARTICLE_COUNT / this.sculptures.length);
    const startIdx = sculptureIndex * particlesPerSculpture;
    const count = sculptureIndex === this.sculptures.length - 1
      ? this.PARTICLE_COUNT - startIdx
      : particlesPerSculpture;

    for (let i = 0; i < count; i++) {
      const pIdx = startIdx + i;
      const data = this.particleData[pIdx];

      const geo = sculpture.mesh.geometry;
      const positions = geo.attributes.position;
      const vertexIdx = Math.floor(Math.random() * positions.count);
      const localPos = new THREE.Vector3(
        positions.getX(vertexIdx),
        positions.getY(vertexIdx),
        positions.getZ(vertexIdx)
      );
      const worldPos = localPos.clone().applyMatrix4(sculpture.group.matrixWorld);

      data.targetPosition.copy(data.originalPosition);

      const direction = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize();
      data.bezierControl1.copy(center).add(direction.multiplyScalar(this.DISSOLVE_RADIUS * 0.7));

      const mid2 = worldPos.clone().lerp(center, 0.5);
      mid2.add(new THREE.Vector3(
        (Math.random() - 0.5) * 1,
        (Math.random() - 0.5) * 1,
        (Math.random() - 0.5) * 1
      ));
      data.bezierControl2.copy(mid2);
    }

    this._debugMode = `Reassembling: ${sculpture.type}`;

    gsap.to(this.particleState, {
      progress: 1,
      duration: this.REASSEMBLE_DURATION,
      ease: Power2.inOut,
      onComplete: () => {
        this.finishReassemble(sculptureIndex);
      }
    });
  }

  private finishReassemble(sculptureIndex: number): void {
    this.particleState.isReassembling = false;
    this.particleState.activeSculptureIndex = -1;

    const sculpture = this.sculptures[sculptureIndex];
    gsap.to(sculpture.mesh.material as THREE.MeshPhysicalMaterial, {
      opacity: 0.85,
      duration: 0.4,
      ease: Power2.easeIn
    });

    setTimeout(() => {
      if (this.particleSystem && !this.particleState.isDissolving && !this.particleState.isReassembling) {
        this.particleSystem!.visible = false;
      }
    }, 400);

    this._debugMode = 'Idle';
  }

  private handleColorPulse(): void {
    this.sculptures.forEach(s => {
      s.colorPulseActive = true;
      s.colorPulseTime = 0;
    });
    this._debugMode = 'Color Pulse';
    setTimeout(() => { this._debugMode = 'Idle'; }, 300);
  }

  private addTrailParticle(worldPos: THREE.Vector3): void {
    const life = 0.2;
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 0.5
    );

    if (this.trailParticles.length >= this.MAX_TRAIL_PARTICLES) {
      this.trailParticles.shift();
    }

    this.trailParticles.push({
      position: worldPos.clone(),
      velocity,
      life,
      maxLife: life,
      size: 0.08 + Math.random() * 0.04
    });
  }

  private bezier3(t: number, p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, out: THREE.Vector3): void {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;

    out.x = mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x;
    out.y = mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y;
    out.z = mt3 * p0.z + 3 * mt2 * t * p1.z + 3 * mt * t2 * p2.z + t3 * p3.z;
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;

    gsap.utils.interpolate(this.transformState.rotationX, this.targetTransform.rotationX, 0.15);
    this.transformState.rotationX += (this.targetTransform.rotationX - this.transformState.rotationX) * 0.15;
    this.transformState.rotationY += (this.targetTransform.rotationY - this.transformState.rotationY) * 0.15;
    this.transformState.scale += (this.targetTransform.scale - this.transformState.scale) * 0.15;

    this.sculptureGroup.rotation.x = this.transformState.rotationX;
    this.sculptureGroup.rotation.y = this.transformState.rotationY;
    this.sculptureGroup.scale.setScalar(this.transformState.scale);

    this.updateSculptures(deltaTime);
    this.updateParticleAnimation();
    this.updateBackgroundStars(deltaTime);
    this.updateTrailParticles(deltaTime);
  }

  private updateSculptures(deltaTime: number): void {
    this.sculptures.forEach((sculpture, index) => {
      sculpture.mesh.rotation.x += this.AUTO_ROTATE_SPEED * deltaTime;
      sculpture.mesh.rotation.y += this.AUTO_ROTATE_SPEED * 0.8 * deltaTime;

      const orbitAngle = (this.time / this.ORBIT_PERIOD) * Math.PI * 2;
      const baseAngle = (index / this.sculptures.length) * Math.PI * 2;
      const totalAngle = baseAngle + orbitAngle;
      const orbitRadius = 3.5;

      const targetPos = new THREE.Vector3(
        Math.cos(totalAngle) * orbitRadius,
        Math.sin(totalAngle * 2) * 0.8,
        Math.sin(totalAngle) * orbitRadius
      );

      sculpture.group.position.lerp(targetPos, 0.03);

      const baseHue = index / this.sculptures.length;
      let hue = (baseHue + this.time / this.COLOR_CYCLE_PERIOD) % 1;
      let saturation = 0.8;

      if (sculpture.colorPulseActive) {
        sculpture.colorPulseTime += deltaTime;
        if (sculpture.colorPulseTime < 0.3) {
          const t = sculpture.colorPulseTime / 0.3;
          saturation = t < 0.5
            ? 0.8 + t * 2 * 0.2
            : 1.0 - (t - 0.5) * 2 * 0.2;
        } else {
          sculpture.colorPulseActive = false;
          saturation = 0.8;
        }
      }

      sculpture.currentHue = hue;
      const material = sculpture.mesh.material as THREE.MeshPhysicalMaterial;
      const color = new THREE.Color().setHSL(hue, saturation, 0.5);
      material.color.copy(color);
      material.emissive = new THREE.Color().setHSL(hue, saturation, 0.3);

      if (sculpture.isSelected) {
        const haloMaterial = sculpture.halo.material as THREE.SpriteMaterial;
        const pulseHue = (hue + 0.1) % 1;
        haloMaterial.color = new THREE.Color().setHSL(pulseHue, 0.9, 0.7);
      }
    });
  }

  private updateParticleAnimation(): void {
    if (!this.particleSystem || !this.particleGeometry || !this.particlePositions || !this.particleColors) return;
    if (!this.particleState.isDissolving && !this.particleState.isReassembling) return;

    const { isDissolving, isReassembling, progress, activeSculptureIndex } = this.particleState;
    if (activeSculptureIndex < 0) return;

    const particlesPerSculpture = Math.floor(this.PARTICLE_COUNT / this.sculptures.length);
    const startIdx = activeSculptureIndex * particlesPerSculpture;
    const count = activeSculptureIndex === this.sculptures.length - 1
      ? this.PARTICLE_COUNT - startIdx
      : particlesPerSculpture;

    const sculpture = this.sculptures[activeSculptureIndex];
    const hue = sculpture.currentHue;
    const tempPos = new THREE.Vector3();
    const tempColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const pIdx = startIdx + i;
      const data = this.particleData[pIdx];

      if (isDissolving) {
        this.bezier3(progress, data.originalPosition, data.bezierControl1, data.bezierControl2, data.targetPosition, tempPos);
      } else if (isReassembling) {
        this.bezier3(progress, data.targetPosition, data.bezierControl1, data.bezierControl2, data.originalPosition, tempPos);
      }

      this.particlePositions[pIdx * 3] = tempPos.x;
      this.particlePositions[pIdx * 3 + 1] = tempPos.y;
      this.particlePositions[pIdx * 3 + 2] = tempPos.z;

      const particleHue = (hue + (i / count) * 0.15) % 1;
      const lightness = isDissolving
        ? 0.5 + progress * 0.2
        : 0.7 - progress * 0.2;
      tempColor.setHSL(particleHue, 0.9, lightness);
      this.particleColors[pIdx * 3] = tempColor.r;
      this.particleColors[pIdx * 3 + 1] = tempColor.g;
      this.particleColors[pIdx * 3 + 2] = tempColor.b;
    }

    this.particleGeometry.attributes.position.needsUpdate = true;
    this.particleGeometry.attributes.color.needsUpdate = true;
  }

  private updateBackgroundStars(deltaTime: number): void {
    if (!this.backgroundStars || !this.backgroundStarBrightness) return;

    const colors = (this.backgroundStars.geometry.attributes.color as THREE.BufferAttribute).array as Float32Array;

    for (let i = 0; i < this.STAR_COUNT; i++) {
      const phase = this.backgroundStarBrightness[i] * Math.PI * 2;
      const brightness = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(this.time * (Math.PI * 2 / 1.5) + phase));
      const hue = 0.65 + Math.sin(phase) * 0.1;
      const color = new THREE.Color().setHSL(hue, 0.6, brightness * 0.8);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    this.backgroundStars.geometry.attributes.color.needsUpdate = true;
    this.backgroundStars.rotation.y += deltaTime * 0.005;
  }

  private updateTrailParticles(deltaTime: number): void {
    if (!this.trailGeometry || !this.trailPositions || !this.trailColors || !this.trailSizes) return;

    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      const p = this.trailParticles[i];
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.trailParticles.splice(i, 1);
        continue;
      }

      p.position.add(p.velocity.clone().multiplyScalar(deltaTime));
    }

    for (let i = 0; i < this.MAX_TRAIL_PARTICLES; i++) {
      if (i < this.trailParticles.length) {
        const p = this.trailParticles[i];
        const lifeRatio = p.life / p.maxLife;
        this.trailPositions[i * 3] = p.position.x;
        this.trailPositions[i * 3 + 1] = p.position.y;
        this.trailPositions[i * 3 + 2] = p.position.z;

        const hue = 0.75 + (1 - lifeRatio) * 0.15;
        const color = new THREE.Color().setHSL(hue, 0.9, 0.6 * lifeRatio + 0.2);
        this.trailColors[i * 3] = color.r;
        this.trailColors[i * 3 + 1] = color.g;
        this.trailColors[i * 3 + 2] = color.b;
      } else {
        this.trailPositions[i * 3] = 0;
        this.trailPositions[i * 3 + 1] = -1000;
        this.trailPositions[i * 3 + 2] = 0;
      }
    }

    this.trailGeometry.attributes.position.needsUpdate = true;
    this.trailGeometry.attributes.color.needsUpdate = true;
  }

  public getParticleCount(): number {
    return this.PARTICLE_COUNT + this.STAR_COUNT;
  }

  public resize(): void {
  }

  public dispose(): void {
    this.sculptures.forEach(s => {
      s.mesh.geometry.dispose();
      (s.mesh.material as THREE.Material).dispose();
      (s.halo.material as THREE.Material).dispose();
    });

    if (this.particleGeometry) this.particleGeometry.dispose();
    if (this.particleSystem) (this.particleSystem.material as THREE.Material).dispose();
    if (this.backgroundStars) {
      this.backgroundStars.geometry.dispose();
      (this.backgroundStars.material as THREE.Material).dispose();
    }
    if (this.trailGeometry) this.trailGeometry.dispose();
    if (this.trailSystem) (this.trailSystem.material as THREE.Material).dispose();
  }
}
