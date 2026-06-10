import * as THREE from 'three';
import { Reef } from './Reef';
import { ParticleFlow } from './ParticleFlow';
import { Controller, EnvParams, StatsData } from './Controller';

class FloatingReefApp {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  
  private reef: Reef | null = null;
  private particleFlow: ParticleFlow | null = null;
  private controller: Controller | null = null;
  
  private targetRotationX = 0;
  private targetRotationY = 0;
  private currentRotationX = 0;
  private currentRotationY = 0;
  
  private targetZoom = 1;
  private currentZoom = 1;
  
  private isDragging = false;
  private previousMouseX = 0;
  private previousMouseY = 0;
  
  private dragStartX = 0;
  private dragStartY = 0;
  private isViewDrag = false;
  
  private rotationSpeed = 0.005;
  private zoomSpeed = 0.001;
  private smoothFactor = 0.1;
  
  private minRotationX = -Math.PI / 6;
  private maxRotationX = Math.PI / 6;
  private minRotationY = -Math.PI;
  private maxRotationY = Math.PI;
  
  private minZoom = 0.5;
  private maxZoom = 2;
  
  private reefGroup: THREE.Group;
  private particlesGroup: THREE.Group;
  
  private animationFrameId: number | null = null;
  
  private ambientLight: THREE.AmbientLight;
  private pointLight: THREE.PointLight;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();
    
    this.scene = new THREE.Scene();
    
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 20;
    
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    
    this.container.appendChild(this.renderer.domElement);
    
    this.reefGroup = new THREE.Group();
    this.particlesGroup = new THREE.Group();
    this.scene.add(this.reefGroup);
    this.scene.add(this.particlesGroup);
    
    this.ambientLight = new THREE.AmbientLight(0x404050, 0.5);
    this.scene.add(this.ambientLight);
    
    this.pointLight = new THREE.PointLight(0xffffff, 1, 100);
    this.pointLight.position.set(5, 10, 10);
    this.scene.add(this.pointLight);
    
    this.init();
  }

  private init(): void {
    const reefBounds = this.calculateReefBounds();
    const particleBounds = this.calculateParticleBounds();
    
    const initialParams: EnvParams = {
      temperature: 22,
      salinity: 32,
      light: 0.5
    };
    
    this.reef = new Reef(this.reefGroup, initialParams, reefBounds);
    
    const salinityFactor = (initialParams.salinity - 28) / (35 - 28);
    const particleCount = Math.floor(600 + salinityFactor * 400);
    this.particleFlow = new ParticleFlow(this.particlesGroup, {
      count: particleCount,
      speed: 0.5,
      bounds: particleBounds
    });
    
    this.controller = new Controller(initialParams, (params) => {
      this.handleParamsChange(params);
    });
    
    this.setupEventListeners();
    this.updateStats();
    
    this.animate();
  }

  private calculateReefBounds(): THREE.Box3 {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    const reefWidth = viewportWidth * 0.5;
    const reefHeight = viewportHeight * 0.65;
    
    const distance = this.camera.position.z;
    const vFov = (this.camera.fov * Math.PI) / 180;
    const visibleHeight = 2 * Math.tan(vFov / 2) * distance;
    const visibleWidth = visibleHeight * this.camera.aspect;
    
    const scaleX = (reefWidth / viewportWidth) * visibleWidth;
    const scaleY = (reefHeight / viewportHeight) * visibleHeight;
    const scaleZ = Math.min(scaleX, scaleY) * 0.6;
    
    const center = new THREE.Vector3(0, 0, 0);
    const halfSize = new THREE.Vector3(scaleX / 2, scaleY / 2, scaleZ / 2);
    
    return new THREE.Box3(
      center.clone().sub(halfSize),
      center.clone().add(halfSize)
    );
  }

  private calculateParticleBounds(): THREE.Box3 {
    const reefBounds = this.calculateReefBounds();
    const expanded = reefBounds.clone();
    expanded.expandByScalar(8);
    return expanded;
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;
    
    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    document.addEventListener('mouseup', () => this.onMouseUp());
    document.addEventListener('mouseleave', () => this.onMouseUp());
    
    canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    
    canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', () => this.onTouchEnd());
    
    window.addEventListener('resize', () => this.onResize());
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.previousMouseX = e.clientX;
    this.previousMouseY = e.clientY;
    this.isViewDrag = false;
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) {
      if (this.particleFlow) {
        const moveX = (e.clientX - window.innerWidth / 2) / window.innerWidth;
        const moveY = -(e.clientY - window.innerHeight / 2) / window.innerHeight;
        const dragDir = new THREE.Vector3(moveX * 0.5, moveY * 0.3, 0.2);
        this.particleFlow.applyDragForce(dragDir);
      }
      return;
    }
    
    const deltaX = e.clientX - this.previousMouseX;
    const deltaY = e.clientY - this.previousMouseY;
    
    const totalDeltaX = Math.abs(e.clientX - this.dragStartX);
    const totalDeltaY = Math.abs(e.clientY - this.dragStartY);
    
    if (totalDeltaX > 5 || totalDeltaY > 5) {
      this.isViewDrag = true;
      this.renderer.domElement.style.cursor = 'grabbing';
    }
    
    if (this.isViewDrag) {
      this.targetRotationY += deltaX * this.rotationSpeed;
      this.targetRotationX -= deltaY * this.rotationSpeed;
      
      this.targetRotationX = Math.max(this.minRotationX, Math.min(this.maxRotationX, this.targetRotationX));
      this.targetRotationY = Math.max(this.minRotationY, Math.min(this.maxRotationY, this.targetRotationY));
    }
    
    this.previousMouseX = e.clientX;
    this.previousMouseY = e.clientY;
  }

  private onMouseUp(): void {
    if (this.isDragging && !this.isViewDrag) {
      this.handleClick(this.previousMouseX, this.previousMouseY);
    }
    
    this.isDragging = false;
    this.isViewDrag = false;
    this.renderer.domElement.style.cursor = 'grab';
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    
    const delta = e.deltaY * this.zoomSpeed;
    this.targetZoom += delta;
    this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.targetZoom));
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.dragStartX = e.touches[0].clientX;
      this.dragStartY = e.touches[0].clientY;
      this.previousMouseX = e.touches[0].clientX;
      this.previousMouseY = e.touches[0].clientY;
      this.isViewDrag = false;
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (!this.isDragging || e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - this.previousMouseX;
    const deltaY = touch.clientY - this.previousMouseY;
    
    const totalDeltaX = Math.abs(touch.clientX - this.dragStartX);
    const totalDeltaY = Math.abs(touch.clientY - this.dragStartY);
    
    if (totalDeltaX > 10 || totalDeltaY > 10) {
      this.isViewDrag = true;
    }
    
    if (this.isViewDrag) {
      this.targetRotationY += deltaX * this.rotationSpeed;
      this.targetRotationX -= deltaY * this.rotationSpeed;
      
      this.targetRotationX = Math.max(this.minRotationX, Math.min(this.maxRotationX, this.targetRotationX));
      this.targetRotationY = Math.max(this.minRotationY, Math.min(this.maxRotationY, this.targetRotationY));
    }
    
    this.previousMouseX = touch.clientX;
    this.previousMouseY = touch.clientY;
  }

  private onTouchEnd(): void {
    if (this.isDragging && !this.isViewDrag) {
      this.handleClick(this.previousMouseX, this.previousMouseY);
    }
    this.isDragging = false;
    this.isViewDrag = false;
  }

  private handleClick(clientX: number, clientY: number): void {
    if (this.reef) {
      this.reef.handleClick(clientX, clientY, this.camera, this.renderer.domElement);
    }
  }

  private handleParamsChange(params: EnvParams): void {
    if (this.reef) {
      this.reef.updateParams(params);
    }
    
    if (this.particleFlow) {
      const salinityFactor = (params.salinity - 28) / (35 - 28);
      const particleCount = Math.floor(600 + salinityFactor * 400);
      this.particleFlow.updateCount(particleCount);
      this.particleFlow.setOpacity(0.2 + params.light * 0.2);
    }
    
    this.ambientLight.intensity = 0.3 + params.light * 0.4;
    this.pointLight.intensity = 0.5 + params.light * 1;
    
    this.updateStats();
  }

  private updateStats(): void {
    if (!this.controller || !this.reef || !this.particleFlow) return;
    
    const params = this.controller.getParams();
    const stats: StatsData = {
      temperature: params.temperature,
      salinity: params.salinity,
      light: params.light,
      coralCount: this.reef.getNodeCount(),
      particleCount: this.particleFlow.getCount()
    };
    
    this.controller.updateStats(stats);
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
    
    if (this.reef && this.particleFlow) {
      const reefBounds = this.calculateReefBounds();
      const particleBounds = this.calculateParticleBounds();
    }
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(() => this.animate());
    
    const deltaTime = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();
    
    this.currentRotationX += (this.targetRotationX - this.currentRotationX) * this.smoothFactor;
    this.currentRotationY += (this.targetRotationY - this.currentRotationY) * this.smoothFactor;
    this.currentZoom += (this.targetZoom - this.currentZoom) * this.smoothFactor;
    
    this.reefGroup.rotation.x = this.currentRotationX;
    this.reefGroup.rotation.y = this.currentRotationY;
    this.reefGroup.scale.setScalar(this.currentZoom);
    
    this.particlesGroup.rotation.x = this.currentRotationX;
    this.particlesGroup.rotation.y = this.currentRotationY;
    this.particlesGroup.scale.setScalar(this.currentZoom);
    
    if (this.reef) {
      this.reef.update(deltaTime, elapsedTime);
    }
    
    if (this.particleFlow) {
      this.particleFlow.update(deltaTime, elapsedTime);
    }
    
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    if (this.reef) {
      this.reef.dispose();
    }
    
    if (this.particleFlow) {
      this.particleFlow.dispose();
    }
    
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}

const app = new FloatingReefApp();
