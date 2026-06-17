import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AudioAnalyzer } from './audio/AudioAnalyzer';
import { ParticleSystem } from './particle/ParticleSystem';
import { UIPanel } from './ui/UIPanel';

class App {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private audioAnalyzer: AudioAnalyzer;
  private particleSystem: ParticleSystem;
  private _uiPanel: UIPanel;
  private animationId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = container;

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();

    this.createBackground();

    this.audioAnalyzer = new AudioAnalyzer();
    this.particleSystem = new ParticleSystem(this.scene);
    this._uiPanel = new UIPanel(this.container);

    this.setupResizeHandling();

    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 25);
    camera.lookAt(0, 0, 0);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    renderer.setClearColor(0x000000, 1);
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 0.8;
    controls.minDistance = 0.5 * 25;
    controls.maxDistance = 5 * 25;
    controls.enablePan = false;
    controls.target.set(0, 0, 0);
    return controls;
  }

  private createBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0B0B1A');
    gradient.addColorStop(1, '#1A1A3E');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const geo = new THREE.SphereGeometry(500, 32, 32);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      depthWrite: false
    });
    const skybox = new THREE.Mesh(geo, mat);
    this.scene.add(skybox);

    this.addStars();
  }

  private addStars(): void {
    const starCount = 1000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const radius = 200 + Math.random() * 200;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      const brightness = 0.4 + Math.random() * 0.6;
      colors[i3] = brightness;
      colors[i3 + 1] = brightness;
      colors[i3 + 2] = brightness;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const size = 128;
    const starCanvas = document.createElement('canvas');
    starCanvas.width = size;
    starCanvas.height = size;
    const starCtx = starCanvas.getContext('2d')!;
    const starGradient = starCtx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    starGradient.addColorStop(0, 'rgba(255,255,255,1)');
    starGradient.addColorStop(0.3, 'rgba(255,255,255,0.6)');
    starGradient.addColorStop(1, 'rgba(255,255,255,0)');
    starCtx.fillStyle = starGradient;
    starCtx.fillRect(0, 0, size, size);
    const starTexture = new THREE.CanvasTexture(starCanvas);

    const material = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      map: starTexture,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: false
    });

    const stars = new THREE.Points(geometry, material);
    stars.frustumCulled = false;
    this.scene.add(stars);
  }

  private setupResizeHandling(): void {
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
      }
    });
    this.resizeObserver.observe(this.container);
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    this.particleSystem.update();

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.audioAnalyzer.destroy();
    this.particleSystem.dispose();
    void this._uiPanel;
    this.controls.dispose();
    this.renderer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new App('app');
  (window as any).__app = app;
});
