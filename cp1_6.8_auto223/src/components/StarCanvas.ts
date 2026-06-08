import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { AppConfig } from '../types';
import {
  StarParticle,
  BurstParticle,
  BackgroundStar,
  Trail,
  createStarColor,
} from '../utils/starParticle';
import { InteractionManager } from '../utils/interaction';

const MAX_STAR_PARTICLES = 500;
const MAX_BURST_PARTICLES = 3000;
const MAX_TRAIL_POINTS = 10000;
const BG_STAR_COUNT = 800;

export class StarCanvas {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private controls: OrbitControls;
  private interaction: InteractionManager;
  private config: AppConfig;

  private starParticles: StarParticle[] = [];
  private burstParticles: BurstParticle[] = [];
  private backgroundStars: BackgroundStar[] = [];

  private trailLines: THREE.Line[] = [];
  private trailMeshGroup: THREE.Group;

  private starPointsMesh: THREE.Points | null = null;
  private starGeometry: THREE.BufferGeometry;
  private starPositions: Float32Array;
  private starColors: Float32Array;
  private starSizes: Float32Array;

  private burstPointsMesh: THREE.Points | null = null;
  private burstGeometry: THREE.BufferGeometry;
  private burstPositions: Float32Array;
  private burstColors: Float32Array;
  private burstSizes: Float32Array;
  private burstOpacities: Float32Array;

  private bgPointsMesh: THREE.Points | null = null;
  private bgGeometry: THREE.BufferGeometry;
  private bgPositions: Float32Array;
  private bgSizes: Float32Array;
  private bgOpacities: Float32Array;

  private clock: THREE.Clock;
  private animationId: number = 0;
  private trailUpdateCounter: number = 0;

  constructor(container: HTMLElement, config: AppConfig) {
    this.config = config;
    this.clock = new THREE.Clock();
    this.trailMeshGroup = new THREE.Group();

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0a2e, 0.008);

    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.camera.position.set(0, 5, 30);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0a0a2e, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      1.5,
      0.4,
      0.85
    );
    bloomPass.threshold = 0.1;
    bloomPass.strength = 1.8;
    bloomPass.radius = 0.6;
    this.composer.addPass(bloomPass);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enablePan = true;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 100;
    this.controls.mouseButtons = {
      LEFT: undefined as unknown as THREE.MOUSE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };

    this.starPositions = new Float32Array(MAX_STAR_PARTICLES * 3);
    this.starColors = new Float32Array(MAX_STAR_PARTICLES * 3);
    this.starSizes = new Float32Array(MAX_STAR_PARTICLES);
    this.starGeometry = new THREE.BufferGeometry();
    this.starGeometry.setAttribute('position', new THREE.BufferAttribute(this.starPositions, 3));
    this.starGeometry.setAttribute('aStarColor', new THREE.BufferAttribute(this.starColors, 3));
    this.starGeometry.setAttribute('aSize', new THREE.BufferAttribute(this.starSizes, 1));

    this.burstPositions = new Float32Array(MAX_BURST_PARTICLES * 3);
    this.burstColors = new Float32Array(MAX_BURST_PARTICLES * 3);
    this.burstSizes = new Float32Array(MAX_BURST_PARTICLES);
    this.burstOpacities = new Float32Array(MAX_BURST_PARTICLES);
    this.burstGeometry = new THREE.BufferGeometry();
    this.burstGeometry.setAttribute('position', new THREE.BufferAttribute(this.burstPositions, 3));
    this.burstGeometry.setAttribute('aBurstColor', new THREE.BufferAttribute(this.burstColors, 3));
    this.burstGeometry.setAttribute('aBurstSize', new THREE.BufferAttribute(this.burstSizes, 1));
    this.burstGeometry.setAttribute('aOpacity', new THREE.BufferAttribute(this.burstOpacities, 1));

    this.bgPositions = new Float32Array(BG_STAR_COUNT * 3);
    this.bgSizes = new Float32Array(BG_STAR_COUNT);
    this.bgOpacities = new Float32Array(BG_STAR_COUNT);
    this.bgGeometry = new THREE.BufferGeometry();
    this.bgGeometry.setAttribute('position', new THREE.BufferAttribute(this.bgPositions, 3));
    this.bgGeometry.setAttribute('aBgSize', new THREE.BufferAttribute(this.bgSizes, 1));
    this.bgGeometry.setAttribute('aBgOpacity', new THREE.BufferAttribute(this.bgOpacities, 1));

    this.initBackgroundStars();
    this.initMeshes();
    this.initInteraction();

    this.scene.add(this.trailMeshGroup);

    window.addEventListener('resize', this.onResize);
  }

  private initBackgroundStars(): void {
    for (let i = 0; i < BG_STAR_COUNT; i++) {
      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * 200,
        (Math.random() - 0.5) * 200,
        (Math.random() - 0.5) * 200
      );
      const star = new BackgroundStar(pos);
      this.backgroundStars.push(star);

      this.bgPositions[i * 3] = pos.x;
      this.bgPositions[i * 3 + 1] = pos.y;
      this.bgPositions[i * 3 + 2] = pos.z;
      this.bgSizes[i] = star.size;
      this.bgOpacities[i] = star.opacity;
    }
  }

  private createStarMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: `
        attribute vec3 aStarColor;
        attribute float aSize;
        varying vec3 vColor;
        void main() {
          vColor = aStarColor;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float glow = 1.0 - smoothstep(0.0, 0.5, dist);
          float core = 1.0 - smoothstep(0.0, 0.15, dist);
          vec3 color = vColor * glow + vec3(1.0) * core * 0.6;
          float alpha = glow * 0.9;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  private createBurstMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: `
        attribute vec3 aBurstColor;
        attribute float aBurstSize;
        attribute float aOpacity;
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          vColor = aBurstColor;
          vOpacity = aOpacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aBurstSize * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float glow = 1.0 - smoothstep(0.0, 0.5, dist);
          float core = 1.0 - smoothstep(0.0, 0.12, dist);
          vec3 color = vColor * glow + vec3(1.0) * core * 0.4;
          float alpha = glow * vOpacity;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  private createBgMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: `
        attribute float aBgSize;
        attribute float aBgOpacity;
        varying float vOpacity;
        void main() {
          vOpacity = aBgOpacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aBgSize * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vOpacity;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float glow = 1.0 - smoothstep(0.0, 0.5, dist);
          vec3 color = vec3(0.85, 0.82, 1.0);
          float alpha = glow * vOpacity * 0.7;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  private initMeshes(): void {
    this.starPointsMesh = new THREE.Points(this.starGeometry, this.createStarMaterial());
    this.scene.add(this.starPointsMesh);

    this.burstPointsMesh = new THREE.Points(this.burstGeometry, this.createBurstMaterial());
    this.scene.add(this.burstPointsMesh);

    this.bgPointsMesh = new THREE.Points(this.bgGeometry, this.createBgMaterial());
    this.scene.add(this.bgPointsMesh);
  }

  private initInteraction(): void {
    this.interaction = new InteractionManager();
    this.interaction.init(this.renderer.domElement, this.camera);
    this.interaction.setCallbacks(
      (pos) => this.emitStar(pos),
      (pos) => this.tryBurstTrail(pos)
    );
  }

  emitStar(position: THREE.Vector3): void {
    if (this.starParticles.length >= MAX_STAR_PARTICLES) {
      const oldest = this.starParticles.shift();
      if (oldest) {
        this.removeTrailLine(oldest.trail);
      }
    }

    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.3,
      0.1 + Math.random() * 0.2,
      (Math.random() - 0.5) * 0.3
    );

    const color = createStarColor();
    const particle = new StarParticle(position, velocity, color, this.config);
    this.starParticles.push(particle);

    this.createTrailLine(particle.trail);
  }

  private createTrailLine(trail: Trail): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX_TRAIL_POINTS * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setDrawRange(0, 0);

    const hsl = { h: 0, s: 0, l: 0 };
    trail.color.getHSL(hsl);
    const material = new THREE.LineBasicMaterial({
      color: trail.color,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const line = new THREE.Line(geometry, material);
    line.userData.trail = trail;
    this.trailMeshGroup.add(line);
    this.trailLines.push(line);
  }

  private removeTrailLine(trail: Trail): void {
    const index = this.trailLines.findIndex((l) => l.userData.trail === trail);
    if (index !== -1) {
      const line = this.trailLines[index];
      this.trailMeshGroup.remove(line);
      (line.geometry as THREE.BufferGeometry).dispose();
      (line.material as THREE.LineBasicMaterial).dispose();
      this.trailLines.splice(index, 1);
    }
  }

  private tryBurstTrail(clickPos: THREE.Vector3): void {
    const threshold = 1.5;
    let closestDist = Infinity;
    let closestParticle: StarParticle | null = null;

    for (const particle of this.starParticles) {
      if (!particle.isAlive) continue;
      for (const point of particle.trail.points) {
        const dist = clickPos.distanceTo(point);
        if (dist < threshold && dist < closestDist) {
          closestDist = dist;
          closestParticle = particle;
        }
      }
    }

    if (closestParticle) {
      const burstParts = closestParticle.burst(this.config.burstSpeed);
      this.burstParticles.push(...burstParts);
      if (this.burstParticles.length > MAX_BURST_PARTICLES) {
        this.burstParticles.splice(0, this.burstParticles.length - MAX_BURST_PARTICLES);
      }
      this.removeTrailLine(closestParticle.trail);
      const idx = this.starParticles.indexOf(closestParticle);
      if (idx !== -1) {
        this.starParticles.splice(idx, 1);
      }
    }
  }

  updateConfig(config: AppConfig): void {
    this.config = config;
  }

  reset(): void {
    for (const line of this.trailLines) {
      this.trailMeshGroup.remove(line);
      (line.geometry as THREE.BufferGeometry).dispose();
      (line.material as THREE.LineBasicMaterial).dispose();
    }
    this.trailLines = [];
    this.starParticles = [];
    this.burstParticles = [];
  }

  private updateStarParticles(dt: number): void {
    let aliveCount = 0;
    for (let i = this.starParticles.length - 1; i >= 0; i--) {
      const p = this.starParticles[i];
      p.update(dt);

      if (!p.isAlive && p.trail.points.length > 0) {
        const opacity = (p.trail.opacity || 1) - dt * 0.3;
        p.trail.opacity = Math.max(0, opacity);
        if (p.trail.opacity <= 0) {
          this.removeTrailLine(p.trail);
          this.starParticles.splice(i, 1);
          continue;
        }
      }

      if (aliveCount < MAX_STAR_PARTICLES) {
        this.starPositions[aliveCount * 3] = p.position.x;
        this.starPositions[aliveCount * 3 + 1] = p.position.y;
        this.starPositions[aliveCount * 3 + 2] = p.position.z;
        this.starColors[aliveCount * 3] = p.color.r;
        this.starColors[aliveCount * 3 + 1] = p.color.g;
        this.starColors[aliveCount * 3 + 2] = p.color.b;
        this.starSizes[aliveCount] = p.size * (p.isAlive ? 1.0 : 0.5);
        aliveCount++;
      }
    }

    for (let i = aliveCount; i < MAX_STAR_PARTICLES; i++) {
      this.starPositions[i * 3] = 0;
      this.starPositions[i * 3 + 1] = 0;
      this.starPositions[i * 3 + 2] = 0;
      this.starSizes[i] = 0;
    }

    this.starGeometry.attributes.position.needsUpdate = true;
    this.starGeometry.attributes.aStarColor.needsUpdate = true;
    this.starGeometry.attributes.aSize.needsUpdate = true;
    this.starGeometry.setDrawRange(0, aliveCount);
  }

  private updateBurstParticles(dt: number): void {
    let aliveCount = 0;
    for (let i = this.burstParticles.length - 1; i >= 0; i--) {
      const p = this.burstParticles[i];
      p.update(dt);

      if (!p.isAlive) {
        this.burstParticles.splice(i, 1);
        continue;
      }

      if (aliveCount < MAX_BURST_PARTICLES) {
        this.burstPositions[aliveCount * 3] = p.position.x;
        this.burstPositions[aliveCount * 3 + 1] = p.position.y;
        this.burstPositions[aliveCount * 3 + 2] = p.position.z;
        this.burstColors[aliveCount * 3] = p.color.r;
        this.burstColors[aliveCount * 3 + 1] = p.color.g;
        this.burstColors[aliveCount * 3 + 2] = p.color.b;
        this.burstSizes[aliveCount] = p.size;
        this.burstOpacities[aliveCount] = p.life / p.maxLife;
        aliveCount++;
      }
    }

    for (let i = aliveCount; i < MAX_BURST_PARTICLES; i++) {
      this.burstPositions[i * 3] = 0;
      this.burstPositions[i * 3 + 1] = 0;
      this.burstPositions[i * 3 + 2] = 0;
      this.burstSizes[i] = 0;
      this.burstOpacities[i] = 0;
    }

    this.burstGeometry.attributes.position.needsUpdate = true;
    this.burstGeometry.attributes.aBurstColor.needsUpdate = true;
    this.burstGeometry.attributes.aBurstSize.needsUpdate = true;
    this.burstGeometry.attributes.aOpacity.needsUpdate = true;
    this.burstGeometry.setDrawRange(0, aliveCount);
  }

  private updateTrails(): void {
    this.trailUpdateCounter++;
    if (this.trailUpdateCounter % 2 !== 0) return;

    for (const line of this.trailLines) {
      const trail: Trail = line.userData.trail;
      const posAttr = line.geometry.attributes.position as THREE.BufferAttribute;
      const points = trail.points;
      const count = Math.min(points.length, MAX_TRAIL_POINTS);

      for (let i = 0; i < count; i++) {
        posAttr.array[i * 3] = points[i].x;
        posAttr.array[i * 3 + 1] = points[i].y;
        posAttr.array[i * 3 + 2] = points[i].z;
      }

      posAttr.needsUpdate = true;
      line.geometry.setDrawRange(0, count);

      const mat = line.material as THREE.LineBasicMaterial;
      mat.opacity = trail.opacity * 0.7;
    }
  }

  private updateBackgroundStars(time: number): void {
    for (let i = 0; i < this.backgroundStars.length; i++) {
      this.backgroundStars[i].update(time);
      this.bgOpacities[i] = this.backgroundStars[i].opacity;
    }
    this.bgGeometry.attributes.aBgOpacity.needsUpdate = true;
  }

  start(): void {
    this.clock.start();
    this.animate();
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.getElapsedTime();

    this.controls.update();
    this.updateStarParticles(dt);
    this.updateBurstParticles(dt);
    this.updateTrails();
    this.updateBackgroundStars(elapsed);

    this.composer.render();
  };

  private onResize = (): void => {
    const container = this.renderer.domElement.parentElement;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
  };

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    cancelAnimationFrame(this.animationId);
    this.interaction.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    this.reset();
  }
}
