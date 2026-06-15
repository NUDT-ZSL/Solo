import * as THREE from 'three';
import { TerrainGenerator, TerrainData, OreVeinData, FaultPlaneData } from './terrainGenerator';
import { InteractionController } from './interactionController';

export class SceneManager {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private terrainGenerator: TerrainGenerator;
  private terrainData: TerrainData | null = null;
  private interactionController: InteractionController;

  private isDragging: boolean = false;
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private cameraTarget: THREE.Vector3;
  private cameraDistance: number = 250;
  private cameraTheta: number = Math.PI / 4;
  private cameraPhi: number = Math.PI / 3;
  private readonly MIN_DISTANCE = 100;
  private readonly MAX_DISTANCE = 500;
  private readonly MIN_PHI = Math.PI / 8;
  private readonly MAX_PHI = Math.PI / 2 - 0.1;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredWireframe: boolean = false;

  private cuttingParticles: THREE.Points | null = null;
  private particleVelocities: Float32Array | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera();
    this.renderer = new THREE.WebGLRenderer();
    this.terrainGenerator = new TerrainGenerator();
    this.cameraTarget = new THREE.Vector3(0, -5, 0);
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.interactionController = new InteractionController(this);
  }

  init(): void {
    this.setupRenderer();
    this.setupCamera();
    this.setupLighting();
    this.setupTerrain();
    this.setupEventListeners();
    this.interactionController.init();
    this.updateCameraPosition();
  }

  private setupRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);
  }

  private setupCamera(): void {
    this.camera = new THREE.PerspectiveCamera(
      55,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      2000
    );
    this.camera.position.set(150, 150, 150);
    this.camera.lookAt(this.cameraTarget);
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(100, 150, 80);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 500;
    mainLight.shadow.camera.left = -200;
    mainLight.shadow.camera.right = 200;
    mainLight.shadow.camera.top = 200;
    mainLight.shadow.camera.bottom = -200;
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x6688ff, 0.4);
    fillLight.position.set(-80, 60, -60);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffaa44, 0.3);
    rimLight.position.set(-60, 40, 100);
    this.scene.add(rimLight);

    const hemisphereLight = new THREE.HemisphereLight(0x8899bb, 0x332211, 0.4);
    this.scene.add(hemisphereLight);
  }

  private setupTerrain(): void {
    this.terrainData = this.terrainGenerator.generate();
    this.scene.add(this.terrainData.mesh);

    this.terrainData.oreVeins.forEach((vein) => {
      this.scene.add(vein.mesh);
      if (vein.haloParticles) {
        this.scene.add(vein.haloParticles);
      }
    });

    this.terrainData.faultPlanes.forEach((fault) => {
      this.scene.add(fault.mesh);
    });

    this.addFog();
    this.addAtmosphere();
  }

  private addFog(): void {
    this.scene.fog = new THREE.FogExp2(0x0a0a0a, 0.0015);
  }

  private addAtmosphere(): void {
    const starGeo = new THREE.BufferGeometry();
    const starCount = 500;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 800;
      positions[i * 3 + 1] = 100 + Math.random() * 200;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 800;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.8,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true
    });
    const stars = new THREE.Points(starGeo, starMat);
    this.scene.add(stars);
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

    canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.previousMousePosition = { x: e.clientX, y: e.clientY };
  }

  private onMouseMove(e: MouseEvent): void {
    this.updateMouseNDC(e.clientX, e.clientY);
    this.checkWireframeHover();

    if (this.isDragging) {
      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      this.cameraTheta -= deltaX * 0.005;
      this.cameraPhi = Math.max(
        this.MIN_PHI,
        Math.min(this.MAX_PHI, this.cameraPhi + deltaY * 0.005)
      );

      this.updateCameraPosition();
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (this.isDragging) {
      const deltaX = Math.abs(e.clientX - this.previousMousePosition.x);
      const deltaY = Math.abs(e.clientY - this.previousMousePosition.y);
      if (deltaX < 3 && deltaY < 3) {
        this.interactionController.handleClick(e.clientX, e.clientY);
      }
    }
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const zoomFactor = 1 + e.deltaY * 0.001;
    this.cameraDistance = Math.max(
      this.MIN_DISTANCE,
      Math.min(this.MAX_DISTANCE, this.cameraDistance * zoomFactor)
    );
    this.updateCameraPosition();
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.previousMousePosition = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1 && this.isDragging) {
      const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
      const deltaY = e.touches[0].clientY - this.previousMousePosition.y;

      this.cameraTheta -= deltaX * 0.005;
      this.cameraPhi = Math.max(
        this.MIN_PHI,
        Math.min(this.MAX_PHI, this.cameraPhi + deltaY * 0.005)
      );

      this.updateCameraPosition();
      this.previousMousePosition = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    this.isDragging = false;
  }

  private updateMouseNDC(clientX: number, clientY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  private checkWireframeHover(): void {
    if (!this.terrainData) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.terrainData.mesh);

    const wireframeMat = this.terrainData.wireframe.material as THREE.LineBasicMaterial;
    if (intersects.length > 0 && !this.hoveredWireframe) {
      wireframeMat.color.setHex(0x888888);
      wireframeMat.opacity = 0.8;
      this.hoveredWireframe = true;
    } else if (intersects.length === 0 && this.hoveredWireframe) {
      wireframeMat.color.setHex(0x444444);
      wireframeMat.opacity = 0.5;
      this.hoveredWireframe = false;
    }
  }

  private updateCameraPosition(): void {
    const x = this.cameraTarget.x + this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    const y = this.cameraTarget.y + this.cameraDistance * Math.cos(this.cameraPhi);
    const z = this.cameraTarget.z + this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.cameraTarget);
  }

  handleResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  update(timestamp: number): void {
    this.interactionController.update(timestamp);
    this.updateHaloParticles(timestamp);
    this.updateCuttingParticles();
  }

  private updateHaloParticles(timestamp: number): void {
    if (!this.terrainData) return;
    this.terrainData.oreVeins.forEach((vein) => {
      if (vein.haloParticles && vein.haloParticles.visible) {
        vein.haloParticles.rotation.y += 0.008;
        const positions = vein.haloParticles.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < positions.length; i += 3) {
          positions[i + 1] += Math.sin(timestamp * 0.002 + i) * 0.05;
        }
        vein.haloParticles.geometry.attributes.position.needsUpdate = true;
      }
    });
  }

  spawnCuttingParticles(cutPlaneNormal: THREE.Vector3, cutPlaneCenter: THREE.Vector3, count: number = 200): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    this.particleVelocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 20 + Math.random() * 60;
      const tangent1 = new THREE.Vector3(
        Math.random() - 0.5,
        0,
        Math.random() - 0.5
      ).normalize();
      const tangent2 = new THREE.Vector3().crossVectors(cutPlaneNormal, tangent1).normalize();

      const offset = tangent1.multiplyScalar(Math.cos(angle) * radius)
        .add(tangent2.multiplyScalar(Math.sin(angle) * radius));

      positions[i * 3] = cutPlaneCenter.x + offset.x;
      positions[i * 3 + 1] = cutPlaneCenter.y + offset.y;
      positions[i * 3 + 2] = cutPlaneCenter.z + offset.z;

      this.particleVelocities[i * 3] = (Math.random() - 0.5) * 0.1;
      this.particleVelocities[i * 3 + 1] = -0.3 - Math.random() * 0.2;
      this.particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const colors = new Float32Array(count * 3);
    const opacities = new Float32Array(count);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      colors[i * 3] = 0.8 + Math.random() * 0.2;
      colors[i * 3 + 1] = 0.75 + Math.random() * 0.2;
      colors[i * 3 + 2] = 0.7 + Math.random() * 0.2;
      opacities[i] = 0.4 + Math.random() * 0.2;
      sizes[i] = 1 + Math.random() * 1;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true,
      depthWrite: false
    });

    this.cuttingParticles = new THREE.Points(geometry, material);
    this.scene.add(this.cuttingParticles);
  }

  private updateCuttingParticles(): void {
    if (!this.cuttingParticles || !this.particleVelocities) return;

    const positions = this.cuttingParticles.geometry.attributes.position.array as Float32Array;
    const opacities = this.cuttingParticles.geometry.attributes.opacity.array as Float32Array;

    for (let i = 0; i < positions.length / 3; i++) {
      positions[i * 3] += this.particleVelocities[i * 3];
      positions[i * 3 + 1] += this.particleVelocities[i * 3 + 1];
      positions[i * 3 + 2] += this.particleVelocities[i * 3 + 2];
      opacities[i] *= 0.998;
    }

    this.cuttingParticles.geometry.attributes.position.needsUpdate = true;
    this.cuttingParticles.geometry.attributes.opacity.needsUpdate = true;
  }

  clearCuttingParticles(): void {
    if (this.cuttingParticles) {
      this.scene.remove(this.cuttingParticles);
      this.cuttingParticles.geometry.dispose();
      (this.cuttingParticles.material as THREE.Material).dispose();
      this.cuttingParticles = null;
      this.particleVelocities = null;
    }
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  getTerrainData(): TerrainData | null {
    return this.terrainData;
  }

  getRaycaster(): THREE.Raycaster {
    return this.raycaster;
  }

  getMouse(): THREE.Vector2 {
    return this.mouse;
  }

  getContainer(): HTMLElement {
    return this.container;
  }

  getOreVeins(): OreVeinData[] {
    return this.terrainData?.oreVeins || [];
  }

  getFaultPlanes(): FaultPlaneData[] {
    return this.terrainData?.faultPlanes || [];
  }
}
