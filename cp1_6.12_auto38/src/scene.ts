import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createGrassTexture } from '../core/terrain';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;

  private terrainMesh: THREE.Mesh | null = null;
  private trunkMesh: THREE.InstancedMesh | null = null;
  private canopyMesh: THREE.InstancedMesh | null = null;
  private grassTexture: THREE.Texture;
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private gridHelper: THREE.GridHelper;
  private container: HTMLElement;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId)!;

    this.scene = new THREE.Scene();
    this.scene.background = this.createGradientBackground();
    this.scene.fog = new THREE.Fog(0x1a1a2e, 25, 60);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.camera.position.set(10, 8, 10);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 20;
    this.controls.maxPolarAngle = Math.PI / 2.05;
    this.controls.target.set(0, 1, 0);
    this.controls.enablePan = true;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.directionalLight.position.set(10, 15, 8);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 50;
    this.directionalLight.shadow.camera.left = -15;
    this.directionalLight.shadow.camera.right = 15;
    this.directionalLight.shadow.camera.top = 15;
    this.directionalLight.shadow.camera.bottom = -15;
    this.directionalLight.shadow.bias = -0.0005;
    this.scene.add(this.directionalLight);

    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x3a5f3a, 0.3);
    this.scene.add(hemiLight);

    this.gridHelper = new THREE.GridHelper(30, 30, 0x2a2a4e, 0x222242);
    (this.gridHelper.material as THREE.Material).opacity = 0.3;
    (this.gridHelper.material as THREE.Material).transparent = true;
    this.gridHelper.position.y = -0.01;
    this.scene.add(this.gridHelper);

    this.grassTexture = createGrassTexture();

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private createGradientBackground(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public clearTerrain(): void {
    if (this.terrainMesh) {
      this.scene.remove(this.terrainMesh);
      this.terrainMesh.geometry.dispose();
      (this.terrainMesh.material as THREE.Material).dispose();
      this.terrainMesh = null;
    }
    this.clearTrees();
  }

  public clearTrees(): void {
    if (this.trunkMesh) {
      this.scene.remove(this.trunkMesh);
      this.trunkMesh.geometry.dispose();
      this.trunkMesh = null;
    }
    if (this.canopyMesh) {
      this.scene.remove(this.canopyMesh);
      this.canopyMesh.geometry.dispose();
      this.canopyMesh = null;
    }
  }

  public addTerrain(geometry: THREE.BufferGeometry): void {
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: this.grassTexture,
      roughness: 0.9,
      metalness: 0.0,
      bumpMap: this.grassTexture,
      bumpScale: 0.02
    });

    this.terrainMesh = new THREE.Mesh(geometry, material);
    this.terrainMesh.castShadow = true;
    this.terrainMesh.receiveShadow = true;
    this.scene.add(this.terrainMesh);
  }

  public addTrees(
    trunkMesh: THREE.InstancedMesh,
    canopyMesh: THREE.InstancedMesh
  ): void {
    this.clearTrees();
    this.trunkMesh = trunkMesh;
    this.canopyMesh = canopyMesh;
    this.scene.add(this.trunkMesh);
    this.scene.add(this.canopyMesh);
  }

  public render(): void {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    window.removeEventListener('resize', this.onResize.bind(this));
    this.clearTerrain();
    this.grassTexture.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
