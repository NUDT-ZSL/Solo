import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PipeSystem } from './PipeSystem';
import { ThermalMap } from './ThermalMap';
import { UI, HoverInfo } from './UI';

class RomanBathVisualizer {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  
  private pipeSystem!: PipeSystem;
  private thermalMap!: ThermalMap;
  private ui!: UI;
  
  private raycaster!: THREE.Raycaster;
  private mouse!: THREE.Vector2;
  
  private floorMesh: THREE.Mesh | null = null;
  private wallMeshes: THREE.Mesh[] = [];
  private bathMeshes: THREE.Mesh[] = [];
  private furnaceMesh: THREE.Mesh | null = null;
  
  private autoRotateEnabled = true;
  private lastInteractionTime = 0;
  private IDLE_THRESHOLD = 5000;
  private AUTO_ROTATE_SPEED = 0.2;
  
  private readonly SCENE_WIDTH = 10;
  private readonly SCENE_DEPTH = 8;
  private readonly WALL_HEIGHT = 3;
  
  private readonly INITIAL_CAMERA_POSITION = new THREE.Vector3(0, 10, 10);
  private readonly INITIAL_TARGET = new THREE.Vector3(0, 0, 0);

  constructor() {
    this.scene = new THREE.Scene();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    this.initRenderer();
    this.initCamera();
    this.initControls();
    this.initLighting();
    this.createBathStructure();
    
    this.pipeSystem = new PipeSystem(this.scene);
    this.thermalMap = new ThermalMap(this.scene, this.pipeSystem);
    this.ui = new UI(this.pipeSystem, this.thermalMap);
    
    this.ui.setOnResetView(() => this.resetView());
    
    this.setupEventListeners();
    this.animate();
  }

  private initRenderer(): void {
    const container = document.getElementById('app')!;
    
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    
    container.appendChild(this.renderer.domElement);
  }

  private initCamera(): void {
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.copy(this.INITIAL_CAMERA_POSITION);
    this.camera.lookAt(this.INITIAL_TARGET);
  }

  private initControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    
    this.controls.minDistance = 2;
    this.controls.maxDistance = 20;
    
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.minPolarAngle = 0.1;
    
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = this.AUTO_ROTATE_SPEED;
    
    this.controls.target.copy(this.INITIAL_TARGET);
    this.controls.update();
  }

  private initLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xD4A574, 0.4);
    this.scene.add(ambientLight);
    
    const dirLight1 = new THREE.DirectionalLight(0xFFF5E6, 0.6);
    dirLight1.position.set(-10, 15, -10);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 2048;
    dirLight1.shadow.mapSize.height = 2048;
    dirLight1.shadow.camera.near = 0.5;
    dirLight1.shadow.camera.far = 50;
    dirLight1.shadow.camera.left = -15;
    dirLight1.shadow.camera.right = 15;
    dirLight1.shadow.camera.top = 15;
    dirLight1.shadow.camera.bottom = -15;
    this.scene.add(dirLight1);
    
    const dirLight2 = new THREE.DirectionalLight(0xFFE4C4, 0.4);
    dirLight2.position.set(10, 10, 10);
    this.scene.add(dirLight2);
  }

  private createTileTexture(color: THREE.Color): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d')!;
    
    const baseColor = `#${color.getHexString()}`;
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 300, 300);
    
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, 150, 150);
    ctx.strokeRect(150, 0, 150, 150);
    ctx.strokeRect(0, 150, 150, 150);
    ctx.strokeRect(150, 150, 150, 150);
    
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 300;
      const y = Math.random() * 300;
      ctx.beginPath();
      ctx.arc(x, y, Math.random() * 2 + 1, 0, Math.PI * 2);
      ctx.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    
    return texture;
  }

  private createBathStructure(): void {
    const floorTexture = this.createTileTexture(new THREE.Color(0xC4956A));
    floorTexture.repeat.set(this.SCENE_WIDTH / 2, this.SCENE_DEPTH / 2);
    
    const floorGeo = new THREE.BoxGeometry(this.SCENE_WIDTH, 0.2, this.SCENE_DEPTH);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.3,
      metalness: 0.1
    });
    this.floorMesh = new THREE.Mesh(floorGeo, floorMat);
    this.floorMesh.position.y = -0.1;
    this.floorMesh.receiveShadow = true;
    this.floorMesh.userData = { type: 'floor' };
    this.scene.add(this.floorMesh);
    
    const wallTexture = this.createTileTexture(new THREE.Color(0xD4A574));
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTexture,
      roughness: 0.3,
      metalness: 0.1
    });
    
    const wallConfigs = [
      { pos: new THREE.Vector3(0, this.WALL_HEIGHT / 2, -this.SCENE_DEPTH / 2), size: new THREE.Vector3(this.SCENE_WIDTH, this.WALL_HEIGHT, 0.2), name: 'back' },
      { pos: new THREE.Vector3(0, this.WALL_HEIGHT / 2, this.SCENE_DEPTH / 2), size: new THREE.Vector3(this.SCENE_WIDTH, this.WALL_HEIGHT, 0.2), name: 'front' },
      { pos: new THREE.Vector3(-this.SCENE_WIDTH / 2, this.WALL_HEIGHT / 2, 0), size: new THREE.Vector3(0.2, this.WALL_HEIGHT, this.SCENE_DEPTH), name: 'left' },
      { pos: new THREE.Vector3(this.SCENE_WIDTH / 2, this.WALL_HEIGHT / 2, 0), size: new THREE.Vector3(0.2, this.WALL_HEIGHT, this.SCENE_DEPTH), name: 'right' }
    ];

    wallTexture.repeat.set(5, 1.5);

    wallConfigs.forEach((config) => {
      const wallGeo = new THREE.BoxGeometry(config.size.x, config.size.y, config.size.z);
      const wall = new THREE.Mesh(wallGeo, wallMat);
      wall.position.copy(config.pos);
      wall.castShadow = true;
      wall.receiveShadow = true;
      wall.userData = { type: 'wall', name: config.name };
      this.scene.add(wall);
      this.wallMeshes.push(wall);
    });
    
    this.createFurnace();
    this.createBaths();
  }

  private createFurnace(): void {
    const furnaceGeo = new THREE.BoxGeometry(1, 1, 1);
    const furnaceMat = new THREE.MeshStandardMaterial({
      color: 0xFF4500,
      transparent: true,
      opacity: 0.7,
      emissive: 0xFF4500,
      emissiveIntensity: 0.5
    });
    this.furnaceMesh = new THREE.Mesh(furnaceGeo, furnaceMat);
    this.furnaceMesh.position.set(-4.5, 0.5, -3.5);
    this.furnaceMesh.userData = { type: 'furnace', temperature: 90 };
    this.scene.add(this.furnaceMesh);
    
    const glowGeo = new THREE.SphereGeometry(0.8, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xFF6600,
      transparent: true,
      opacity: 0.2
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.copy(this.furnaceMesh.position);
    this.scene.add(glow);
  }

  private createBaths(): void {
    const bathConfigs = [
      { pos: new THREE.Vector3(-3, 0, 1.5), color: 0x4488FF, name: '冷水池', temp: 25 },
      { pos: new THREE.Vector3(0, 0, 1.5), color: 0x44FFCC, name: '温水池', temp: 45 },
      { pos: new THREE.Vector3(3, 0, 1.5), color: 0xFF6644, name: '热水池', temp: 75 }
    ];
    
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0xD4A574,
      transparent: true,
      opacity: 0.8,
      roughness: 0.3,
      metalness: 0.1
    });

    bathConfigs.forEach((config) => {
      const bathGroup = new THREE.Group();
      
      const waterGeo = new THREE.BoxGeometry(2, 0.7, 1.5);
      const waterMat = new THREE.MeshStandardMaterial({
        color: config.color,
        transparent: true,
        opacity: 0.6,
        roughness: 0.1,
        metalness: 0.1
      });
      const water = new THREE.Mesh(waterGeo, waterMat);
      water.position.y = 0.35;
      water.userData = { type: 'bath', name: config.name, temperature: config.temp };
      bathGroup.add(water);
      
      const edgeThickness = 0.15;
      const edgeHeight = 0.8;
      
      const edgeFront = new THREE.Mesh(
        new THREE.BoxGeometry(2 + edgeThickness * 2, edgeHeight, edgeThickness),
        edgeMat
      );
      edgeFront.position.set(0, 0.4, 1.5 / 2 + edgeThickness / 2);
      bathGroup.add(edgeFront);
      
      const edgeBack = new THREE.Mesh(
        new THREE.BoxGeometry(2 + edgeThickness * 2, edgeHeight, edgeThickness),
        edgeMat
      );
      edgeBack.position.set(0, 0.4, -1.5 / 2 - edgeThickness / 2);
      bathGroup.add(edgeBack);
      
      const edgeLeft = new THREE.Mesh(
        new THREE.BoxGeometry(edgeThickness, edgeHeight, 1.5),
        edgeMat
      );
      edgeLeft.position.set(-2 / 2 - edgeThickness / 2, 0.4, 0);
      bathGroup.add(edgeLeft);
      
      const edgeRight = new THREE.Mesh(
        new THREE.BoxGeometry(edgeThickness, edgeHeight, 1.5),
        edgeMat
      );
      edgeRight.position.set(2 / 2 + edgeThickness / 2, 0.4, 0);
      bathGroup.add(edgeRight);
      
      bathGroup.position.copy(config.pos);
      bathGroup.userData = { type: 'bath', name: config.name, temperature: config.temp };
      this.scene.add(bathGroup);
      this.bathMeshes.push(water);
    });
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize());
    
    this.renderer.domElement.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.renderer.domElement.addEventListener('pointerdown', () => this.onInteractionStart());
    this.renderer.domElement.addEventListener('wheel', () => this.onInteractionStart());
    
    this.renderer.domElement.addEventListener('click', (e) => this.onClick(e));
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onInteractionStart(): void {
    this.autoRotateEnabled = false;
    this.lastInteractionTime = performance.now();
  }

  private onPointerMove(event: PointerEvent): void {
    this.onInteractionStart();
    
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.performRaycast(event);
  }

  private performRaycast(event: PointerEvent): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const targets: THREE.Object3D[] = [];
    
    if (this.pipeSystem.pipeMeshes) {
      targets.push(this.pipeSystem.pipeMeshes);
    }
    if (this.floorMesh) targets.push(this.floorMesh);
    this.wallMeshes.forEach(w => targets.push(w));
    this.bathMeshes.forEach(b => targets.push(b));
    if (this.furnaceMesh) targets.push(this.furnaceMesh);
    this.pipeSystem.group.children.forEach(child => {
      if (child.userData.type === 'elbow') targets.push(child);
    });
    
    const intersects = this.raycaster.intersectObjects(targets, true);
    
    if (intersects.length > 0) {
      const intersect = intersects[0];
      const info: HoverInfo = {
        object: intersect.object,
        point: intersect.point,
        temperature: 20,
        pipeIndex: null,
        type: null
      };
      
      if (intersect.object === this.pipeSystem.pipeMeshes && intersect.instanceId !== undefined) {
        info.type = 'pipe';
        info.pipeIndex = intersect.instanceId;
        const pipeData = this.pipeSystem.getPipeData(intersect.instanceId);
        info.temperature = pipeData ? pipeData.temperature : 20;
      } else if (intersect.object.userData.type === 'elbow') {
        info.type = 'pipe';
        info.temperature = intersect.object.userData.temperature || 60;
      } else if (intersect.object.userData.type === 'floor') {
        info.type = 'floor';
        info.temperature = this.thermalMap.getTemperatureAtWorldPosition(intersect.point);
      } else if (intersect.object.userData.type === 'wall') {
        info.type = 'wall';
        info.temperature = this.thermalMap.getTemperatureAtWorldPosition(intersect.point);
      } else if (intersect.object.userData.type === 'bath') {
        info.type = 'bath';
        info.temperature = intersect.object.userData.temperature || 40;
      } else if (intersect.object.userData.type === 'furnace') {
        info.type = 'furnace';
        info.temperature = 90;
      } else {
        const parent = intersect.object.parent;
        if (parent && parent.userData.type === 'bath') {
          info.type = 'bath';
          info.temperature = parent.userData.temperature || 40;
        }
      }
      
      this.ui.updateHover(info);
    } else {
      this.ui.updateHover({
        object: null,
        point: null,
        temperature: 20,
        pipeIndex: null,
        type: null
      });
    }
  }

  private onClick(event: MouseEvent): void {
    if (this.ui.isDetailsVisible()) return;
    
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const targets: THREE.Object3D[] = [];
    if (this.pipeSystem.pipeMeshes) {
      targets.push(this.pipeSystem.pipeMeshes);
    }
    this.pipeSystem.group.children.forEach(child => {
      if (child.userData.type === 'elbow') targets.push(child);
    });
    
    const intersects = this.raycaster.intersectObjects(targets, true);
    
    if (intersects.length > 0) {
      const intersect = intersects[0];
      
      if (intersect.object === this.pipeSystem.pipeMeshes && intersect.instanceId !== undefined) {
        const pipeData = this.pipeSystem.getPipeData(intersect.instanceId);
        if (pipeData) {
          this.ui.showPipeDetails(pipeData);
        }
      }
    }
  }

  private resetView(): void {
    this.camera.position.copy(this.INITIAL_CAMERA_POSITION);
    this.controls.target.copy(this.INITIAL_TARGET);
    this.controls.update();
    this.autoRotateEnabled = true;
    this.lastInteractionTime = 0;
  }

  private updateAutoRotate(): void {
    const now = performance.now();
    if (!this.autoRotateEnabled && now - this.lastInteractionTime > this.IDLE_THRESHOLD) {
      this.autoRotateEnabled = true;
    }
    
    if (this.autoRotateEnabled) {
      const angle = (this.AUTO_ROTATE_SPEED * Math.PI) / 180;
      const radius = this.camera.position.distanceTo(this.controls.target);
      const currentAngle = Math.atan2(
        this.camera.position.x - this.controls.target.x,
        this.camera.position.z - this.controls.target.z
      );
      
      this.camera.position.x = this.controls.target.x + radius * Math.sin(currentAngle + angle);
      this.camera.position.z = this.controls.target.z + radius * Math.cos(currentAngle + angle);
      this.camera.lookAt(this.controls.target);
    }
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());
    
    const currentTime = performance.now();
    
    this.updateAutoRotate();
    this.controls.update();
    this.pipeSystem.update();
    this.thermalMap.update(currentTime);
    
    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new RomanBathVisualizer();
});
