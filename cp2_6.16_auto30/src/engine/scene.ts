import * as THREE from 'three';

export interface ISceneManager {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  clock: THREE.Clock;
  addObject(obj: THREE.Object3D): void;
  removeObject(obj: THREE.Object3D): void;
  onResize(callback: () => void): void;
  getAspect(): number;
}

export class SceneManager implements ISceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public clock: THREE.Clock;
  private canvas: HTMLCanvasElement;
  private resizeCallbacks: (() => void)[] = [];

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error(`Canvas with id ${canvasId} not found`);
    }

    this.scene = new THREE.Scene();
    this.setupBackground();
    this.setupCamera();
    this.setupRenderer();
    this.setupLights();
    this.clock = new THREE.Clock();

    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0d1b2a');
    gradient.addColorStop(1, '#1b263b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    
    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
  }

  private setupCamera(): void {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 2000);
    this.camera.position.set(0, 5, 15);
    this.camera.lookAt(0, 0, 0);
  }

  private setupRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404050, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffaa66, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 200;
    directionalLight.shadow.camera.left = -30;
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.bottom = -30;
    this.scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xff6600, 0.5, 100);
    pointLight.position.set(0, 10, -20);
    this.scene.add(pointLight);
  }

  private handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    for (const callback of this.resizeCallbacks) {
      callback();
    }
  }

  public addObject(obj: THREE.Object3D): void {
    this.scene.add(obj);
  }

  public removeObject(obj: THREE.Object3D): void {
    this.scene.remove(obj);
  }

  public onResize(callback: () => void): void {
    this.resizeCallbacks.push(callback);
  }

  public getAspect(): number {
    return window.innerWidth / window.innerHeight;
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public getDelta(): number {
    return this.clock.getDelta();
  }

  public dispose(): void {
    this.renderer.dispose();
    window.removeEventListener('resize', this.handleResize.bind(this));
  }
}
