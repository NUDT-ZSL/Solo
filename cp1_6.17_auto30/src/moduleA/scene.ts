import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';

export const SOIL_LAYERS = [
  { name: '表土层', top: 0, bottom: -0.3, color: 0xBCAAA4, sideColor: 0xD7CCC8 },
  { name: '文化上层', top: -0.3, bottom: -0.6, color: 0xA1887F, sideColor: 0xBCAAA4 },
  { name: '文化下层', top: -0.6, bottom: -0.9, color: 0x8D6E63, sideColor: 0xA1887F },
  { name: '生土层', top: -0.9, bottom: -1.2, color: 0x6D4C41, sideColor: 0x8D6E63 }
];

export const PIT_SIZE = 3;
export const PIT_DEPTH = 1.2;

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;
  public container: HTMLElement;
  public pitGroup: THREE.Group;
  public soilTopMesh: THREE.Mesh;
  public sideWalls: THREE.Mesh[] = [];
  public raycaster: THREE.Raycaster;
  public mouse: THREE.Vector2;
  
  private clock: THREE.Clock;
  private animationCallbacks: Array<(delta: number) => void> = [];
  private lastTime: number = 0;
  private throttleTime: number = 0.02;
  private gui: GUI | null = null;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error(`Container ${containerId} not found`);
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xFFF8E1);
    this.scene.fog = new THREE.Fog(0xFFF8E1, 5, 15);

    this.camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    this.camera.position.set(2.5, 2.2, 2.5);
    this.camera.lookAt(0, -0.3, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2.2;
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 8;
    this.controls.target.set(0, -0.3, 0);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();

    this.pitGroup = new THREE.Group();
    this.scene.add(this.pitGroup);

    this.soilTopMesh = this.createSoilTop();
    this.pitGroup.add(this.soilTopMesh);
    this.createSideWalls();
    this.createGround();
    this.setupLighting();
    this.setupGUI();

    window.addEventListener('resize', this.onResize.bind(this));
    this.animate();
  }

  private createSoilTop(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(PIT_SIZE, PIT_SIZE, 128, 128);
    geometry.rotateX(-Math.PI / 2);
    
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const noise = this.noise(x * 8, z * 8) * 0.005;
      positions.setY(i, noise);
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: SOIL_LAYERS[0].color,
      roughness: 0.9,
      metalness: 0.05
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.name = 'soilTop';
    return mesh;
  }

  private noise(x: number, y: number): number {
    return (
      Math.sin(x * 12.9898 + y * 78.233) * 43758.5453 % 1 +
      Math.sin(x * 23.456 + y * 67.89) * 0.5 +
      Math.sin(x * 45.123 + y * 32.456) * 0.25
    ) / 1.75;
  }

  private createSideWalls(): void {
    const wallHeight = PIT_DEPTH;
    const wallWidth = PIT_SIZE;
    const half = PIT_SIZE / 2;

    const wallConfigs = [
      { pos: [0, -wallHeight / 2, -half], rot: [0, 0, 0], name: 'north' },
      { pos: [0, -wallHeight / 2, half], rot: [0, Math.PI, 0], name: 'south' },
      { pos: [-half, -wallHeight / 2, 0], rot: [0, Math.PI / 2, 0], name: 'west' },
      { pos: [half, -wallHeight / 2, 0], rot: [0, -Math.PI / 2, 0], name: 'east' }
    ];

    for (const config of wallConfigs) {
      const geometry = new THREE.PlaneGeometry(wallWidth, wallHeight, 1, SOIL_LAYERS.length);
      
      const colors: number[] = [];
      const color = new THREE.Color();
      const layerHeight = wallHeight / SOIL_LAYERS.length;
      
      for (let row = 0; row <= SOIL_LAYERS.length; row++) {
        const t = row / SOIL_LAYERS.length;
        const layerIdx = Math.min(Math.floor(t * SOIL_LAYERS.length), SOIL_LAYERS.length - 1);
        const nextIdx = Math.min(layerIdx + 1, SOIL_LAYERS.length - 1);
        const layerT = (t * SOIL_LAYERS.length) % 1;
        
        const c1 = new THREE.Color(SOIL_LAYERS[layerIdx].sideColor);
        const c2 = new THREE.Color(SOIL_LAYERS[nextIdx].sideColor);
        color.copy(c1).lerp(c2, layerT * 0.3);
        
        for (let col = 0; col <= 1; col++) {
          colors.push(color.r, color.g, color.b);
        }
      }
      
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

      const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.95,
        metalness: 0.02,
        side: THREE.DoubleSide
      });

      const wall = new THREE.Mesh(geometry, material);
      wall.position.set(config.pos[0], config.pos[1], config.pos[2]);
      wall.rotation.set(config.rot[0], config.rot[1], config.rot[2]);
      wall.receiveShadow = true;
      wall.name = `wall_${config.name}`;
      this.pitGroup.add(wall);
      this.sideWalls.push(wall);
    }
  }

  private createGround(): void {
    const groundGeo = new THREE.PlaneGeometry(20, 20);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xEFEBE9,
      roughness: 1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -PIT_DEPTH - 0.01;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xFFF8E1, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xFFF8E1, 0.9);
    dirLight.position.set(3, 5, 2);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 15;
    dirLight.shadow.camera.left = -4;
    dirLight.shadow.camera.right = 4;
    dirLight.shadow.camera.top = 4;
    dirLight.shadow.camera.bottom = -4;
    dirLight.shadow.bias = -0.0001;
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xD7CCC8, 0.3);
    fillLight.position.set(-2, 3, -2);
    this.scene.add(fillLight);
  }

  private setupGUI(): void {
    if (typeof window !== 'undefined') {
      this.gui = new GUI({ title: '调试面板', width: 280 });
      this.gui.add(this.controls, 'enabled').name('相机控制');
      
      const lightFolder = this.gui.addFolder('光照');
      lightFolder.addColor({ color: '#FFF8E1' }, 'color').name('环境光色').onChange((c: string) => {
        (this.scene.children.find(c => c instanceof THREE.AmbientLight) as THREE.AmbientLight)?.color.set(c);
      });
    }
  }

  public addAnimationCallback(callback: (delta: number) => void): void {
    this.animationCallbacks.push(callback);
  }

  public removeAnimationCallback(callback: (delta: number) => void): void {
    this.animationCallbacks = this.animationCallbacks.filter(cb => cb !== callback);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));
    
    const delta = this.clock.getDelta();
    this.lastTime += delta;
    
    if (this.lastTime >= this.throttleTime) {
      const dt = this.lastTime;
      this.lastTime = 0;
      
      for (const callback of this.animationCallbacks) {
        callback(dt);
      }
      
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    }
  }

  private onResize(): void {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  public getIntersectPoint(event: MouseEvent, mesh: THREE.Mesh): THREE.Vector3 | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(mesh);
    
    if (intersects.length > 0) {
      return intersects[0].point.clone();
    }
    return null;
  }

  public getGUI(): GUI | null {
    return this.gui;
  }

  public dispose(): void {
    window.removeEventListener('resize', this.onResize.bind(this));
    this.renderer.dispose();
    if (this.gui) this.gui.destroy();
  }
}
