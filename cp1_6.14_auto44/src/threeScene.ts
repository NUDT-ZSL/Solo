import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { WaveCore, WaveformConfig } from './waveCore';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  life: number;
  maxLife: number;
  size: number;
}

export interface SceneConfig {
  autoRotate: boolean;
  autoRotateSpeed: number;
  particlesEnabled: boolean;
  particleCount: number;
  particleLifetime: number;
}

export class ThreeScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private waveCore: WaveCore;
  private waveGroup: THREE.Group;
  private particlesEnabled = true;
  private particles: Particle[] = [];
  private particleGeometry!: THREE.BufferGeometry;
  private particleMaterial!: THREE.PointsMaterial;
  private particleSystem!: THREE.Points;
  private particlePool: Particle[] = [];
  private maxParticles = 2000;
  private particlesPerSecond = 200;
  private particleLifetime = 0.8;
  private lastParticleTime = 0;
  private autoRotate = false;
  private autoRotateSpeed = 15;
  private targetRotationY = 0;
  private currentRotationY = 0;
  private easingDuration = 0.3;
  private isEasing = false;
  private easeStartTime = 0;
  private easeStartRotationY = 0;
  private easeTargetRotationY = 0;
  private animationFrameId: number | null = null;
  private onRenderCallback: (() => void) | null = null;

  constructor(containerId: string, waveCore: WaveCore) {
    this.container = document.getElementById(containerId)!;
    this.waveCore = waveCore;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);
    this.scene.fog = new THREE.Fog(0x0a0a1a, 50, 150);

    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 40, 60);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enableZoom = true;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 150;
    this.controls.minPolarAngle = Math.PI / 6;
    this.controls.maxPolarAngle = Math.PI / 2;
    this.controls.autoRotate = false;
    this.controls.enablePan = false;

    this.waveGroup = new THREE.Group();
    this.scene.add(this.waveGroup);

    this.setupLighting();
    this.setupGround();
    this.setupParticles();
    this.setupEventListeners();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(10, 50, 20);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 200;
    mainLight.shadow.camera.left = -100;
    mainLight.shadow.camera.right = 100;
    mainLight.shadow.camera.top = 100;
    mainLight.shadow.camera.bottom = -100;
    this.scene.add(mainLight);

    const blueLight = new THREE.PointLight(0x00bfff, 1, 100);
    blueLight.position.set(-50, 20, -30);
    this.scene.add(blueLight);

    const purpleLight = new THREE.PointLight(0x8a2be2, 0.8, 100);
    purpleLight.position.set(50, 20, 30);
    this.scene.add(purpleLight);

    const rimLight = new THREE.DirectionalLight(0x00bfff, 0.5);
    rimLight.position.set(0, 10, -50);
    this.scene.add(rimLight);
  }

  private setupGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      metalness: 0.3,
      roughness: 0.8,
      transparent: true,
      opacity: 0.8
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const gridHelper = new THREE.GridHelper(200, 50, 0x2a2a4e, 0x1a1a3e);
    gridHelper.position.y = -0.49;
    this.scene.add(gridHelper);
  }

  private setupParticles(): void {
    this.particleGeometry = new THREE.BufferGeometry();
    this.particleMaterial = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particleSystem = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.scene.add(this.particleSystem);

    for (let i = 0; i < this.maxParticles; i++) {
      this.particlePool.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        color: new THREE.Color(),
        life: 0,
        maxLife: this.particleLifetime,
        size: 0.3
      });
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize.bind(this));

    this.controls.addEventListener('change', () => {
      if (!this.autoRotate && !this.isEasing) {
        this.targetRotationY = this.getAzimuthalAngle();
        this.currentRotationY = this.targetRotationY;
      }
    });

    this.controls.addEventListener('start', () => {
      this.isEasing = false;
    });
  }

  private onResize(): void {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  startAnimationLoop(): void {
    const animate = (time: number) => {
      this.animationFrameId = requestAnimationFrame(animate);
      this.update(time);
      this.render();
      
      if (this.onRenderCallback) {
        this.onRenderCallback();
      }
    };
    this.animationFrameId = requestAnimationFrame(animate);
  }

  stopAnimationLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private update(time: number): void {
    this.updateWaveMeshes();

    if (this.particlesEnabled) {
      this.emitParticles(time);
      this.updateParticles();
    }

    if (this.autoRotate) {
      const deltaTime = 1 / 60;
      this.targetRotationY += (this.autoRotateSpeed * Math.PI / 180) * deltaTime;
      this.startEasing(this.targetRotationY);
    }

    if (this.isEasing) {
      this.updateEasing(time);
    }

    this.controls.update();
  }

  private updateWaveMeshes(): void {
    const meshes = this.waveCore.getBarMeshes();

    meshes.forEach((mesh) => {
      if (!mesh.parent) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.waveGroup.add(mesh);
      }
    });
  }

  private emitParticles(time: number): void {
    const interval = 1000 / this.particlesPerSecond;
    const elapsed = time - this.lastParticleTime;
    
    if (elapsed < interval) return;
    
    const batches = Math.floor(elapsed / interval);
    this.lastParticleTime = time - (elapsed % interval);

    const bars = this.waveCore.getBars();
    const activeBars = bars.filter(bar => bar.height > 0.3);
    
    if (activeBars.length === 0) return;

    for (let batch = 0; batch < batches; batch++) {
      const bar = activeBars[Math.floor(Math.random() * activeBars.length)];
      const particle = this.particlePool.find(p => p.life <= 0);
      
      if (particle) {
        const barThickness = this.waveCore.getConfig().barThickness * 0.1;
        
        particle.position.set(
          bar.position.x + (Math.random() - 0.5) * barThickness * 0.8,
          bar.height,
          bar.position.z + (Math.random() - 0.5) * barThickness * 0.8
        );
        
        const heightFactor = Math.min(1, bar.height / 10);
        particle.velocity.set(
          (Math.random() - 0.5) * 0.5,
          0.5 + heightFactor * 2.5 + Math.random() * 1.5,
          (Math.random() - 0.5) * 0.5
        );
        
        particle.color.copy(bar.color);
        particle.life = this.particleLifetime;
        particle.maxLife = this.particleLifetime;
        particle.size = 0.15 + Math.random() * 0.2 + heightFactor * 0.1;
        
        if (!this.particles.includes(particle)) {
          this.particles.push(particle);
        }
      }
      
      if (this.particles.length >= this.maxParticles) break;
    }
  }

  private updateParticles(): void {
    const positions: number[] = [];
    const colors: number[] = [];
    const sizes: number[] = [];

    const deltaTime = 1 / 60;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      if (particle.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      particle.life -= deltaTime;
      
      particle.velocity.multiplyScalar(0.98);
      particle.velocity.y -= 1.5 * deltaTime;
      particle.position.addScaledVector(particle.velocity, deltaTime);

      const lifeRatio = particle.life / particle.maxLife;
      const easeOutRatio = Math.pow(lifeRatio, 0.5);
      const alpha = Math.max(0, easeOutRatio);

      positions.push(particle.position.x, particle.position.y, particle.position.z);
      colors.push(
        particle.color.r * alpha,
        particle.color.g * alpha,
        particle.color.b * alpha
      );
      sizes.push(particle.size * (0.3 + alpha * 0.7));
    }

    this.particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.particleGeometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    this.particleGeometry.attributes.position.needsUpdate = true;
    this.particleGeometry.attributes.color.needsUpdate = true;
  }

  private startEasing(targetRotation: number): void {
    this.isEasing = true;
    this.easeStartTime = performance.now();
    this.easeStartRotationY = this.currentRotationY;
    this.easeTargetRotationY = targetRotation;
  }

  private updateEasing(time: number): void {
    const elapsed = (time - this.easeStartTime) / 1000;
    const progress = Math.min(1, elapsed / this.easingDuration);
    
    const easeOut = 1 - Math.pow(1 - progress, 3);
    
    this.currentRotationY = this.easeStartRotationY + 
      (this.easeTargetRotationY - this.easeStartRotationY) * easeOut;

    const spherical = new THREE.Spherical();
    spherical.setFromVector3(this.camera.position);
    spherical.theta = this.currentRotationY;
    this.camera.position.setFromSpherical(spherical);
    this.camera.lookAt(this.controls.target);

    if (progress >= 1) {
      this.isEasing = false;
    }
  }

  private render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  setAutoRotate(enabled: boolean): void {
    if (this.autoRotate === enabled) return;
    
    this.autoRotate = enabled;
    
    const currentAzimuth = this.getAzimuthalAngle();
    this.targetRotationY = currentAzimuth;
    this.currentRotationY = currentAzimuth;
    
    if (enabled) {
      this.startEasing(this.targetRotationY);
    } else {
      this.startEasing(this.currentRotationY);
    }
  }

  private getAzimuthalAngle(): number {
    const offset = new THREE.Vector3();
    offset.copy(this.camera.position).sub(this.controls.target);
    return Math.atan2(offset.x, offset.z);
  }

  getAutoRotate(): boolean {
    return this.autoRotate;
  }

  setParticlesEnabled(enabled: boolean): void {
    this.particlesEnabled = enabled;
    if (!enabled) {
      this.particles.forEach(p => p.life = 0);
      this.particles = [];
      this.particleGeometry.dispose();
      this.setupParticles();
    }
  }

  getParticlesEnabled(): boolean {
    return this.particlesEnabled;
  }

  resetView(): void {
    this.camera.position.set(0, 40, 60);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    this.targetRotationY = 0;
    this.currentRotationY = 0;
    this.autoRotate = false;
  }

  refreshWaveMeshes(): void {
    while (this.waveGroup.children.length > 0) {
      const child = this.waveGroup.children[0];
      this.waveGroup.remove(child);
    }
    this.waveCore.recreateMeshes();
  }

  setOnRenderCallback(callback: () => void): void {
    this.onRenderCallback = callback;
  }

  getSceneState(): {
    cameraPosition: THREE.Vector3;
    cameraTarget: THREE.Vector3;
    waveConfig: WaveformConfig;
    sceneConfig: SceneConfig;
  } {
    return {
      cameraPosition: this.camera.position.clone(),
      cameraTarget: this.controls.target.clone(),
      waveConfig: this.waveCore.getConfig(),
      sceneConfig: {
        autoRotate: this.autoRotate,
        autoRotateSpeed: this.autoRotateSpeed,
        particlesEnabled: this.particlesEnabled,
        particleCount: this.particlesPerSecond,
        particleLifetime: this.particleLifetime
      }
    };
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  cleanup(): void {
    this.stopAnimationLoop();
    
    window.removeEventListener('resize', this.onResize.bind(this));
    
    this.renderer.dispose();
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
    
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach(m => m.dispose());
        } else {
          object.material.dispose();
        }
      }
    });

    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
