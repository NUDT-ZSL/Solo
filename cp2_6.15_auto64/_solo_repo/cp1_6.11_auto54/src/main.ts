import * as THREE from 'three';
import { WindField } from './windField';
import { ParticleSystem } from './particleSystem';
import { UIController, UIParams } from './uiController';

class HaloEffect {
  public mesh: THREE.Mesh;
  public innerGlow: THREE.Mesh;
  public active: boolean;
  private startTime: number;
  private duration: number;
  private initialScale: number;
  private targetScale: number;

  constructor(position: THREE.Vector3) {
    const ringGeometry = new THREE.RingGeometry(0.2, 0.5, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.mesh = new THREE.Mesh(ringGeometry, ringMaterial);
    this.mesh.position.copy(position);

    const glowGeometry = new THREE.CircleGeometry(0.5, 64);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.innerGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.innerGlow.position.copy(position);
    this.mesh.add(this.innerGlow);

    this.active = true;
    this.startTime = performance.now();
    this.duration = 1000;
    this.initialScale = 0.5;
    this.targetScale = 2;
    this.mesh.scale.setScalar(this.initialScale);
  }

  update(): boolean {
    if (!this.active) return false;

    const elapsed = performance.now() - this.startTime;
    const progress = Math.min(elapsed / this.duration, 1);
    
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const currentScale = this.initialScale + (this.targetScale - this.initialScale) * easeProgress;
    this.mesh.scale.setScalar(currentScale);

    const ringMaterial = this.mesh.material as THREE.MeshBasicMaterial;
    ringMaterial.opacity = 1.0 * (1 - progress);

    const glowMaterial = this.innerGlow.material as THREE.MeshBasicMaterial;
    glowMaterial.opacity = 0.6 * Math.pow(1 - progress, 2);

    if (progress >= 1) {
      this.active = false;
      return false;
    }

    return true;
  }

  dispose(): void {
    (this.mesh.geometry as THREE.BufferGeometry).dispose();
    (this.mesh.material as THREE.Material).dispose();
    (this.innerGlow.geometry as THREE.BufferGeometry).dispose();
    (this.innerGlow.material as THREE.Material).dispose();
  }
}

class Streamline {
  public line: THREE.Line;
  public highlightLine: THREE.Line;
  public group: THREE.Group;
  public positions: THREE.Vector3[];
  public baseLineWidth: number;
  public startPoint: THREE.Vector3;
  public midPoint: THREE.Vector3;
  public avgSpeed: number;
  public highlighted: boolean;
  private highlightProgress: number;

  constructor(startPoint: THREE.Vector3, windField: WindField) {
    this.startPoint = startPoint.clone();
    this.positions = [];
    this.baseLineWidth = 1;
    this.highlighted = false;
    this.avgSpeed = 0;
    this.highlightProgress = 0;
    this.group = new THREE.Group();

    const steps = 30;
    const stepSize = 0.5;
    let currentPos = startPoint.clone();
    let totalSpeed = 0;

    for (let i = 0; i <= steps; i++) {
      this.positions.push(currentPos.clone());
      
      if (i < steps) {
        const velocity = windField.getWindVelocity(currentPos);
        totalSpeed += velocity.length();
        const stepDir = velocity.clone().normalize().multiplyScalar(stepSize);
        currentPos = currentPos.add(stepDir);
      }
    }

    this.avgSpeed = totalSpeed / steps;
    
    const midIndex = Math.floor(steps / 2);
    this.midPoint = this.positions[midIndex].clone();

    const positionArray = new Float32Array(this.positions.length * 3);
    const colorArray = new Float32Array(this.positions.length * 3);
    const highlightColorArray = new Float32Array(this.positions.length * 3);

    const startColor = new THREE.Color(0x00CED1);
    const endColor = new THREE.Color(0x8A2BE2);
    const highlightStartColor = new THREE.Color(0x40FFFF);
    const highlightEndColor = new THREE.Color(0xC77DFF);

    for (let i = 0; i < this.positions.length; i++) {
      const pos = this.positions[i];
      positionArray[i * 3] = pos.x;
      positionArray[i * 3 + 1] = pos.y;
      positionArray[i * 3 + 2] = pos.z;

      const t = i / (this.positions.length - 1);
      const color = new THREE.Color().lerpColors(startColor, endColor, t);
      colorArray[i * 3] = color.r;
      colorArray[i * 3 + 1] = color.g;
      colorArray[i * 3 + 2] = color.b;

      const highlightColor = new THREE.Color().lerpColors(highlightStartColor, highlightEndColor, t);
      highlightColorArray[i * 3] = highlightColor.r;
      highlightColorArray[i * 3 + 1] = highlightColor.g;
      highlightColorArray[i * 3 + 2] = highlightColor.b;
    }

    const baseGeometry = new THREE.BufferGeometry();
    baseGeometry.setAttribute('position', new THREE.BufferAttribute(positionArray.slice(), 3));
    baseGeometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

    const baseMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.line = new THREE.Line(baseGeometry, baseMaterial);
    this.group.add(this.line);

    const highlightGeometry = new THREE.BufferGeometry();
    highlightGeometry.setAttribute('position', new THREE.BufferAttribute(positionArray.slice(), 3));
    highlightGeometry.setAttribute('color', new THREE.BufferAttribute(highlightColorArray, 3));

    const highlightMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.highlightLine = new THREE.Line(highlightGeometry, highlightMaterial);
    this.highlightLine.renderOrder = 1;
    this.group.add(this.highlightLine);
  }

  update(windField: WindField): void {
    const steps = 30;
    const stepSize = 0.5;
    let currentPos = this.startPoint.clone();
    let totalSpeed = 0;
    const positions = this.line.geometry.attributes.position as THREE.BufferAttribute;
    const highlightPositions = this.highlightLine.geometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i <= steps; i++) {
      positions.setXYZ(i, currentPos.x, currentPos.y, currentPos.z);
      highlightPositions.setXYZ(i, currentPos.x, currentPos.y, currentPos.z);

      if (i < steps) {
        const velocity = windField.getWindVelocity(currentPos);
        totalSpeed += velocity.length();
        const stepDir = velocity.clone().normalize().multiplyScalar(stepSize);
        currentPos = currentPos.add(stepDir);
      }
    }

    this.avgSpeed = totalSpeed / steps;
    const midIndex = Math.floor(steps / 2);
    const midX = positions.getX(midIndex);
    const midY = positions.getY(midIndex);
    const midZ = positions.getZ(midIndex);
    this.midPoint.set(midX, midY, midZ);

    positions.needsUpdate = true;
    highlightPositions.needsUpdate = true;

    const targetProgress = this.highlighted ? 1.0 : 0.0;
    this.highlightProgress += (targetProgress - this.highlightProgress) * 0.15;

    const baseMaterial = this.line.material as THREE.LineBasicMaterial;
    const highlightMaterial = this.highlightLine.material as THREE.LineBasicMaterial;

    baseMaterial.opacity = 0.4 + this.highlightProgress * 0.2;
    highlightMaterial.opacity = this.highlightProgress * 1.0;
  }

  setHighlight(highlighted: boolean): void {
    this.highlighted = highlighted;
  }

  dispose(): void {
    (this.line.geometry as THREE.BufferGeometry).dispose();
    (this.line.material as THREE.Material).dispose();
    (this.highlightLine.geometry as THREE.BufferGeometry).dispose();
    (this.highlightLine.material as THREE.Material).dispose();
  }
}

class WindVisualizationApp {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private container!: HTMLElement;
  private windField!: WindField;
  private particleSystem!: ParticleSystem;
  private uiController!: UIController;
  private streamlines!: Streamline[];
  private halos!: HaloEffect[];
  private clock!: THREE.Clock;
  private raycaster!: THREE.Raycaster;
  private mouse!: THREE.Vector2;
  private cameraDirection!: THREE.Vector3;
  private spherical!: THREE.Spherical;
  private isDragging!: boolean;
  private previousMousePosition!: { x: number; y: number };
  private cameraTarget!: THREE.Vector3;
  private minDistance!: number;
  private maxDistance!: number;
  private speedLabel!: HTMLElement;
  private hoveredStreamline: Streamline | null = null;

  private dragStartPosition: { x: number; y: number } | null = null;
  private dragMovedDistance: number = 0;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.speedLabel = document.getElementById('speed-label')!;
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points.threshold = 0.6;
    this.raycaster.params.Line.threshold = 0.8;
    this.mouse = new THREE.Vector2();
    this.cameraDirection = new THREE.Vector3();
    this.spherical = new THREE.Spherical();
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };
    this.cameraTarget = new THREE.Vector3(0, 0, 0);
    this.minDistance = 5;
    this.maxDistance = 50;
    this.streamlines = [];
    this.halos = [];
    this.hoveredStreamline = null;

    this.initRenderer();
    this.initCamera();
    this.initWindField();
    this.initParticleSystem();
    this.initStreamlines();
    this.initUIController();
    this.initEventListeners();
    this.hideLoadingScreen();
    this.animate();
  }

  private initRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);
  }

  private initCamera(): void {
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    
    this.spherical.set(30, Math.PI / 3, Math.PI / 4);
    this.updateCameraPosition();
    this.camera.lookAt(this.cameraTarget);
  }

  private updateCameraPosition(): void {
    const offset = new THREE.Vector3();
    offset.setFromSpherical(this.spherical);
    this.camera.position.copy(this.cameraTarget).add(offset);
  }

  private initWindField(): void {
    this.windField = new WindField({
      strength: 8,
      turbulence: 2
    });
  }

  private initParticleSystem(): void {
    this.particleSystem = new ParticleSystem(this.windField, {
      particleCount: 8000,
      bounds: 20,
      particleSize: 0.3,
      defaultLifetime: 5
    });
    this.scene.add(this.particleSystem.getPoints());
  }

  private initStreamlines(): void {
    const startPoints: THREE.Vector3[] = [];
    const radius = 14;
    const numPoints = 12;

    for (let i = 0; i < numPoints; i++) {
      const phi = Math.acos(-1 + (2 * i) / numPoints);
      const theta = Math.sqrt(numPoints * Math.PI) * phi;
      
      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(phi);
      
      startPoints.push(new THREE.Vector3(x, y, z));
    }

    for (let i = 0; i < 100; i++) {
      const basePoint = startPoints[i % numPoints];
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8
      );
      const finalPoint = basePoint.clone().add(offset);
      const streamline = new Streamline(finalPoint, this.windField);
      this.streamlines.push(streamline);
      this.scene.add(streamline.group);
    }
  }

  private initUIController(): void {
    this.uiController = new UIController(this.windField, this.particleSystem, {
      onParamsChange: (_params: UIParams) => {
        this.streamlines.forEach(s => s.update(this.windField));
      },
      onReset: () => {
        this.particleSystem.reset();
        this.streamlines.forEach(s => s.update(this.windField));
      }
    });
  }

  private initEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    canvas.addEventListener('click', this.onClick.bind(this));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0) {
      this.isDragging = true;
      this.dragStartPosition = { x: e.clientX, y: e.clientY };
      this.dragMovedDistance = 0;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button === 0) {
      this.isDragging = false;
      this.dragStartPosition = null;
    }
  }

  private onMouseMove(e: MouseEvent): void {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    if (this.isDragging && this.dragStartPosition) {
      const dx = e.clientX - this.previousMousePosition.x;
      const dy = e.clientY - this.previousMousePosition.y;
      this.dragMovedDistance += Math.sqrt(dx * dx + dy * dy);

      const rotateSpeed = 0.005;
      this.spherical.theta -= dx * rotateSpeed;
      this.spherical.phi = Math.max(
        0.1,
        Math.min(Math.PI - 0.1, this.spherical.phi - dy * rotateSpeed)
      );

      this.updateCameraPosition();
      this.camera.lookAt(this.cameraTarget);

      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    } else {
      this.checkStreamlineHover(e.clientX, e.clientY);
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    
    const zoomSpeed = 0.001;
    this.spherical.radius += e.deltaY * zoomSpeed * this.spherical.radius;
    this.spherical.radius = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, this.spherical.radius)
    );

    this.updateCameraPosition();
    this.camera.lookAt(this.cameraTarget);
  }

  private onClick(e: MouseEvent): void {
    if (this.dragMovedDistance > 5) return;

    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const particlePoints = this.particleSystem.getPoints();
    const intersects = this.raycaster.intersectObject(particlePoints);

    if (intersects.length > 0) {
      const hitPoint = intersects[0].point.clone();
      this.createHalo(hitPoint);
      this.windField.addPerturbation(hitPoint, 1.5, 3);
    } else {
      const dir = new THREE.Vector3();
      this.camera.getWorldDirection(dir);
      const dist = 20;
      const hitPoint = this.camera.position.clone().add(dir.multiplyScalar(dist));
      this.createHalo(hitPoint);
      this.windField.addPerturbation(hitPoint, 1.5, 3);
    }
  }

  private checkStreamlineHover(clientX: number, clientY: number): void {
    this.mouse.x = (clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const lineObjects: THREE.Object3D[] = [];
    this.streamlines.forEach(s => {
      lineObjects.push(s.line);
      lineObjects.push(s.highlightLine);
    });
    const intersects = this.raycaster.intersectObjects(lineObjects, false);

    if (intersects.length > 0) {
      const hitObject = intersects[0].object as THREE.Object3D;
      const streamline = this.streamlines.find(s => 
        s.line === hitObject || s.highlightLine === hitObject
      );

      if (streamline && streamline !== this.hoveredStreamline) {
        if (this.hoveredStreamline) {
          this.hoveredStreamline.setHighlight(false);
        }
        streamline.setHighlight(true);
        this.hoveredStreamline = streamline;
      }

      if (streamline) {
        this.updateSpeedLabel(streamline, clientX, clientY);
      }
    } else {
      if (this.hoveredStreamline) {
        this.hoveredStreamline.setHighlight(false);
        this.hoveredStreamline = null;
      }
      this.hideSpeedLabel();
    }
  }

  private updateSpeedLabel(streamline: Streamline, clientX: number, clientY: number): void {
    const speed = streamline.avgSpeed.toFixed(2);
    this.speedLabel.textContent = `风速: ${speed} m/s`;
    this.speedLabel.style.left = `${clientX}px`;
    this.speedLabel.style.top = `${clientY - 15}px`;
    this.speedLabel.classList.remove('hidden');
  }

  private hideSpeedLabel(): void {
    this.speedLabel.classList.add('hidden');
  }

  private createHalo(position: THREE.Vector3): void {
    const halo = new HaloEffect(position);
    this.halos.push(halo);
    this.scene.add(halo.mesh);
  }

  private updateHalos(): void {
    for (let i = this.halos.length - 1; i >= 0; i--) {
      const halo = this.halos[i];
      const active = halo.update();
      
      if (!active) {
        this.scene.remove(halo.mesh);
        halo.dispose();
        this.halos.splice(i, 1);
      }
    }
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private hideLoadingScreen(): void {
    setTimeout(() => {
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        loadingScreen.classList.add('hidden');
        setTimeout(() => {
          loadingScreen.style.display = 'none';
        }, 800);
      }
    }, 500);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    this.windField.updateTime(deltaTime);

    this.camera.getWorldDirection(this.cameraDirection);
    this.particleSystem.update(deltaTime, this.cameraDirection);

    if (this.halos.length > 0) {
      this.halos.forEach(halo => {
        halo.mesh.lookAt(this.camera.position);
      });
      this.updateHalos();
    }

    if (this.hoveredStreamline) {
      this.streamlines.forEach(s => {
        if (s === this.hoveredStreamline || Math.random() < 0.01) {
          s.update(this.windField);
        }
      });
    } else if (Math.random() < 0.05) {
      const randomIndex = Math.floor(Math.random() * this.streamlines.length);
      this.streamlines[randomIndex].update(this.windField);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new WindVisualizationApp();
});
