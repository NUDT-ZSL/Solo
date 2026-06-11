import * as THREE from 'three';
import { InteractiveCube } from './cube';
import { LightRaySystem, LightSourceConfig } from './lightRays';
import { UIManager, UILightSource } from './ui';
import { BackgroundNebula } from './nebula';

class LightWeaveCubeApp {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private container!: HTMLElement;

  private cube!: InteractiveCube;
  private lightRaySystem!: LightRaySystem;
  private uiManager!: UIManager;
  private nebula!: BackgroundNebula;

  private clock!: THREE.Clock;
  private elapsedTime: number = 0;

  private raycaster!: THREE.Raycaster;
  private mouse!: THREE.Vector2;
  private isDraggingScene: boolean = false;
  private lastMousePos: { x: number; y: number } = { x: 0, y: 0 };

  private lightMeshes: Map<string, THREE.Mesh> = new Map();
  private draggingLight: string | null = null;
  private dragPlane: THREE.Plane = new THREE.Plane();
  private dragOffset: THREE.Vector3 = new THREE.Vector3();

  private readonly CAMERA_DISTANCE = 6;

  constructor() {
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.container = document.getElementById('canvas-container')!;
    
    this.initRenderer();
    this.initCamera();
    
    this.cube = new InteractiveCube();
    this.scene.add(this.cube.group);

    this.lightRaySystem = new LightRaySystem(this.cube);
    this.scene.add(this.lightRaySystem.group);

    this.nebula = new BackgroundNebula();
    this.scene.add(this.nebula.points);

    this.uiManager = new UIManager({
      onLightPositionChange: (id, pos) => this.handleLightPositionChange(id, pos),
      onLightColorChange: (id, color, hue) => this.handleLightColorChange(id, color, hue),
      onLightIntensityChange: (id, intensity) => this.handleLightIntensityChange(id, intensity),
    });

    this.setupLights();
    this.setupSceneLights();
    this.setupEventListeners();
    this.hideLoadingScreen();
    this.animate();
  }

  private initRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000011, 1);
    this.container.appendChild(this.renderer.domElement);
  }

  private initCamera(): void {
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 0, this.CAMERA_DISTANCE);
    this.camera.lookAt(0, 0, 0);
  }

  private setupSceneLights(): void {
    const ambientLight = new THREE.AmbientLight(0x222244, 0.5);
    this.scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x4444ff, 0.3, 20);
    pointLight1.position.set(5, 5, 5);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff4488, 0.2, 20);
    pointLight2.position.set(-5, -5, -5);
    this.scene.add(pointLight2);
  }

  private setupLights(): void {
    const lightConfigs = [
      {
        id: 'light-red',
        name: '红色光源',
        position: new THREE.Vector3(2, 1, 1.5),
        color: new THREE.Color(0xff3366),
        hue: 345,
        intensity: 1.0,
      },
      {
        id: 'light-green',
        name: '绿色光源',
        position: new THREE.Vector3(-1.5, 2, -1),
        color: new THREE.Color(0x33ff99),
        hue: 150,
        intensity: 1.0,
      },
      {
        id: 'light-blue',
        name: '蓝色光源',
        position: new THREE.Vector3(0.5, -2, 2),
        color: new THREE.Color(0x3399ff),
        hue: 210,
        intensity: 1.0,
      },
    ];

    for (const config of lightConfigs) {
      const sphereGeom = new THREE.SphereGeometry(0.1, 16, 16);
      const sphereMat = new THREE.MeshBasicMaterial({
        color: config.color,
        transparent: true,
        opacity: 0.9,
      });
      const lightMesh = new THREE.Mesh(sphereGeom, sphereMat);
      lightMesh.position.copy(config.position);
      lightMesh.userData.lightId = config.id;
      this.scene.add(lightMesh);
      this.lightMeshes.set(config.id, lightMesh);

      const haloGeom = new THREE.SphereGeometry(0.15, 16, 16);
      const haloMat = new THREE.MeshBasicMaterial({
        color: config.color,
        transparent: true,
        opacity: 0.3,
      });
      const halo = new THREE.Mesh(haloGeom, haloMat);
      lightMesh.add(halo);

      const uiLight: UILightSource = {
        ...config,
        mesh: lightMesh,
      };
      this.uiManager.addLightSource(uiLight);

      const rayConfig: LightSourceConfig = {
        id: config.id,
        position: config.position.clone(),
        color: config.color.clone(),
        intensity: config.intensity,
      };
      this.lightRaySystem.addLightSource(rayConfig);
    }
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', (e) => this.onPointerUp(e));
    window.addEventListener('resize', () => this.onWindowResize());
  }

  private onPointerDown(e: PointerEvent): void {
    this.updateMouse(e);
    
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const lightMeshArray = Array.from(this.lightMeshes.values());
    const lightIntersects = this.raycaster.intersectObjects(lightMeshArray);

    if (lightIntersects.length > 0) {
      const lightId = lightIntersects[0].object.userData.lightId;
      if (lightId) {
        this.draggingLight = lightId;
        this.uiManager.startLightDrag(lightId);
        
        const intersectPoint = lightIntersects[0].point;
        this.dragPlane.setFromNormalAndCoplanarPoint(
          new THREE.Vector3(0, 0, 1),
          intersectPoint
        );
        this.dragOffset.copy(intersectPoint).sub(
          this.lightMeshes.get(lightId)!.position
        );
        this.lastMousePos = { x: e.clientX, y: e.clientY };
        return;
      }
    }

    const faceMeshes = this.cube.getFaceMeshes();
    const faceIntersects = this.raycaster.intersectObjects(faceMeshes);

    if (faceIntersects.length > 0) {
      const faceIndex = faceIntersects[0].object.userData.faceIndex;
      if (faceIndex !== undefined) {
        this.cube.startFaceDrag(faceIndex, e.clientX, e.clientY);
        this.lastMousePos = { x: e.clientX, y: e.clientY };
        return;
      }
    }

    this.isDraggingScene = true;
    this.cube.setAutoRotation(false);
    this.lastMousePos = { x: e.clientX, y: e.clientY };
  }

  private onPointerMove(e: PointerEvent): void {
    this.updateMouse(e);

    if (this.draggingLight) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersectPoint = new THREE.Vector3();
      
      if (this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint)) {
        let newPos = intersectPoint.sub(this.dragOffset);
        newPos = this.clampPosition(newPos);
        this.handleLightPositionChange(this.draggingLight, newPos);
        this.uiManager.updateLightDrag(newPos);
      }
      return;
    }

    if (this.cube.faceDragState.isDragging) {
      this.cube.updateFaceDrag(e.clientX, e.clientY);
      return;
    }

    if (this.isDraggingScene) {
      const dx = (e.clientX - this.lastMousePos.x) * 0.005;
      const dy = (e.clientY - this.lastMousePos.y) * 0.005;
      this.cube.rotate(dx, dy);
      this.lastMousePos = { x: e.clientX, y: e.clientY };
    }
  }

  private onPointerUp(_e: PointerEvent): void {
    if (this.draggingLight) {
      this.uiManager.endLightDrag();
      this.draggingLight = null;
    }

    if (this.cube.faceDragState.isDragging) {
      this.cube.endFaceDrag();
    }

    if (this.isDraggingScene) {
      this.isDraggingScene = false;
      setTimeout(() => {
        if (!this.cube.faceDragState.isDragging) {
          this.cube.setAutoRotation(true);
        }
      }, 2000);
    }
  }

  private updateMouse(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private clampPosition(pos: THREE.Vector3): THREE.Vector3 {
    const clamped = pos.clone();
    clamped.x = Math.max(-3, Math.min(3, clamped.x));
    clamped.y = Math.max(-3, Math.min(3, clamped.y));
    clamped.z = Math.max(-3, Math.min(3, clamped.z));
    return clamped;
  }

  private handleLightPositionChange(id: string, position: THREE.Vector3): void {
    const clamped = this.clampPosition(position);
    const lightMesh = this.lightMeshes.get(id);
    if (lightMesh) {
      lightMesh.position.copy(clamped);
    }
    this.lightRaySystem.updateLightSource(id, { position: clamped });
    this.uiManager.updateLightSource(id, { position: clamped });
  }

  private handleLightColorChange(id: string, color: THREE.Color, hue: number): void {
    const lightMesh = this.lightMeshes.get(id);
    if (lightMesh) {
      (lightMesh.material as THREE.MeshBasicMaterial).color.copy(color);
      const halo = lightMesh.children[0] as THREE.Mesh;
      if (halo && halo.material) {
        (halo.material as THREE.MeshBasicMaterial).color.copy(color);
      }
    }

    const light = this.uiManager.getLightSource(id);
    if (light) {
      light.color.copy(color);
      light.hue = hue;
    }

    this.lightRaySystem.updateLightSource(id, { color });
    this.uiManager.updateLightSource(id, { color });
  }

  private handleLightIntensityChange(id: string, intensity: number): void {
    const light = this.uiManager.getLightSource(id);
    if (light) {
      light.intensity = intensity;
    }
    this.lightRaySystem.updateLightSource(id, { intensity });
    this.uiManager.updateLightSource(id, { intensity });
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private hideLoadingScreen(): void {
    setTimeout(() => {
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        loadingScreen.classList.add('hidden');
        setTimeout(() => {
          loadingScreen.style.display = 'none';
        }, 1000);
      }
    }, 500);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    this.elapsedTime += deltaTime;

    this.cube.update(deltaTime);
    this.lightRaySystem.update(deltaTime);
    this.nebula.update(this.elapsedTime);

    for (const [id, mesh] of this.lightMeshes) {
      const pulse = 1 + Math.sin(this.elapsedTime * 2 + id.length) * 0.1;
      mesh.scale.setScalar(pulse);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new LightWeaveCubeApp();
});
