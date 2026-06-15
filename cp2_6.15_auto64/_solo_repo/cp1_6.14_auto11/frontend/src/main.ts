import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as CANNON from 'cannon-es';
import { OrigamiEngine } from './origamiEngine.js';
import { UIControls } from './uiControls.js';

class UnfoldOrigamiApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private world: CANNON.World;
  private engine: OrigamiEngine;
  private uiControls: UIControls;
  private container: HTMLElement;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private clock: THREE.Clock;
  private isDragging: boolean = false;
  private animationId: number = 0;

  constructor() {
    this.container = document.getElementById('scene-container')!;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();
    this.world = this.createPhysicsWorld();
    this.engine = new OrigamiEngine(this.scene, this.world);
    this.uiControls = new UIControls(this.engine);

    this.init();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      45,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      100
    );
    camera.position.set(3, 2.5, 4);
    camera.lookAt(0, 0, 0);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.enableRotate = true;
    controls.minDistance = 1;
    controls.maxDistance = 20;
    controls.maxPolarAngle = Math.PI / 2 + 0.1;
    controls.target.set(0, 0.5, 0);
    return controls;
  }

  private createPhysicsWorld(): CANNON.World {
    const world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0)
    });
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.allowSleep = true;
    return world;
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 8, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -5;
    directionalLight.shadow.camera.right = 5;
    directionalLight.shadow.camera.top = 5;
    directionalLight.shadow.camera.bottom = -5;
    directionalLight.shadow.bias = -0.0001;
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x88aaff, 0.3);
    fillLight.position.set(-3, 2, -3);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffddaa, 0.2);
    rimLight.position.set(0, 3, -5);
    this.scene.add(rimLight);
  }

  private setupGround(): void {
    const gridHelper = new THREE.GridHelper(10, 20, 0xffffff, 0xffffff);
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.1;
    gridHelper.position.y = -0.01;
    this.scene.add(gridHelper);

    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.1 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const groundBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane(),
      position: new CANNON.Vec3(0, -0.02, 0)
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(groundBody);
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#2c3e50');
    gradient.addColorStop(1, '#1a252f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    
    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
  }

  private init(): void {
    this.setupBackground();
    this.setupLighting();
    this.setupGround();

    this.engine.createPaper(2, 32);
    this.engine.applyPresetMode('horizontal');
    
    this.uiControls.init(() => this.resetCamera());

    this.setupEventListeners();
    this.animate();

    setTimeout(() => {
      this.uiControls.onModeSelect('horizontal');
    }, 500);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize());
    
    this.renderer.domElement.addEventListener('pointerdown', (e) => {
      if (e.button === 0) {
        this.isDragging = false;
      }
    });

    this.renderer.domElement.addEventListener('pointermove', (e) => {
      if (e.buttons === 1) {
        this.isDragging = true;
      }
    });

    this.renderer.domElement.addEventListener('pointerup', (e) => {
      if (e.button === 0 && !this.isDragging) {
        this.onClick(e);
      }
      this.isDragging = false;
    });

    this.controls.addEventListener('start', () => {
      this.isDragging = true;
    });

    this.controls.addEventListener('end', () => {
      setTimeout(() => {
        this.isDragging = false;
      }, 100);
    });
  }

  private onClick(event: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const paperMesh = this.engine.getPaperMesh();
    const intersects = this.raycaster.intersectObject(paperMesh);

    if (intersects.length > 0) {
      const intersection = intersects[0]!;
      if (intersection.face && intersection.faceIndex !== undefined) {
        const vertexIndex = intersection.face.a;
        this.engine.selectVertex(vertexIndex);
      }
    } else {
      this.engine.clearSelection();
    }
  }

  private resetCamera(): void {
    this.camera.position.set(3, 2.5, 4);
    this.controls.target.set(0, 0.5, 0);
    this.controls.update();
  }

  private onWindowResize(): void {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    this.world.step(1 / 60, deltaTime, 3);

    this.engine.update(deltaTime);

    this.controls.update();

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    this.controls.dispose();
    this.engine.dispose();
    this.renderer.dispose();
    
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

let app: UnfoldOrigamiApp | null = null;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    app = new UnfoldOrigamiApp();
  });
} else {
  app = new UnfoldOrigamiApp();
}

export { UnfoldOrigamiApp, app };
