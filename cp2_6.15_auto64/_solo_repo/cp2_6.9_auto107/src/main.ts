import * as THREE from 'three';
import { GalaxySystem, type GalaxyParams } from './GalaxySystem';
import { ControlPanel } from './ControlPanel';

class GalaxyApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private galaxy: GalaxySystem;
  private controlPanel: ControlPanel;

  private clock: THREE.Clock;
  private animationId: number = 0;

  private readonly AUTO_ROTATE_SPEED = 0.1;
  private readonly MIN_CAM_DIST = 30;
  private readonly MAX_CAM_DIST = 300;

  private cameraTheta = 0;
  private cameraPhi = Math.PI / 3;
  private cameraDistance = 120;
  private targetCameraTheta = 0;
  private targetCameraPhi = Math.PI / 3;
  private targetCameraDistance = 120;

  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private lastInteractionTime = 0;
  private autoRotate = true;

  private frameCount = 0;
  private lastFpsUpdate = 0;
  private fpsCounter: HTMLElement | null;

  private readonly defaultParams: GalaxyParams = {
    arms: 4,
    tightness: 0.5,
    count: 5000,
    rotationSpeed: 0.5,
    particleSize: 1.5,
    offsetAmount: 0.2,
    colorCenterStart: '#FF4500',
    colorCenterEnd: '#FFD700',
    colorOuterStart: '#8A2BE2',
    colorOuterEnd: '#00BFFF',
  };

  constructor() {
    this.clock = new THREE.Clock();
    this.fpsCounter = document.getElementById('fps-counter');

    this.scene = this.initScene();
    this.camera = this.initCamera();
    this.renderer = this.initRenderer();

    this.galaxy = new GalaxySystem(this.defaultParams);
    this.scene.add(this.galaxy.points);

    this.addAmbientStars();

    this.controlPanel = new ControlPanel();
    this.controlPanel.onChange((key, value) => {
      this.galaxy.updateParam(key, value);
    });

    this.initInteraction();
    this.onWindowResize();
    window.addEventListener('resize', () => this.onWindowResize());

    this.animate = this.animate.bind(this);
    this.animate();
  }

  private initScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0A0A0A);
    scene.fog = new THREE.FogExp2(0x0A0A0A, 0.003);
    return scene;
  }

  private initCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera = camera;
    this.updateCameraPosition();
    camera.lookAt(0, 0, 0);
    return camera;
  }

  private initRenderer(): THREE.WebGLRenderer {
    const container = document.getElementById('canvas-container');
    if (!container) throw new Error('Canvas container not found');

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);
    return renderer;
  }

  private addAmbientStars(): void {
    const count = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const r = 200 + Math.random() * 300;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const b = 0.5 + Math.random() * 0.5;
      colors[i * 3] = b;
      colors[i * 3 + 1] = b;
      colors[i * 3 + 2] = b * (0.9 + Math.random() * 0.2);

      sizes[i] = 0.3 + Math.random() * 0.7;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: { uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) } },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        uniform float uPixelRatio;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = size * (200.0 / -mvPosition.z) * uPixelRatio;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vColor, a * 0.8);
        }
      `,
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const stars = new THREE.Points(geometry, material);
    this.scene.add(stars);
  }

  private initInteraction(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.autoRotate = false;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.lastInteractionTime = performance.now();
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.lastInteractionTime = performance.now();
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      this.targetCameraTheta -= dx * 0.005;
      this.targetCameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.targetCameraPhi - dy * 0.005));
      this.lastInteractionTime = performance.now();
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const scale = e.deltaY > 0 ? 1.1 : 0.9;
      this.targetCameraDistance = Math.max(
        this.MIN_CAM_DIST,
        Math.min(this.MAX_CAM_DIST, this.targetCameraDistance * scale)
      );
      this.lastInteractionTime = performance.now();
      this.autoRotate = false;
    }, { passive: false });

    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.autoRotate = false;
        this.lastMouseX = e.touches[0].clientX;
        this.lastMouseY = e.touches[0].clientY;
        this.lastInteractionTime = performance.now();
      }
    });

    canvas.addEventListener('touchmove', (e) => {
      if (!this.isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - this.lastMouseX;
      const dy = e.touches[0].clientY - this.lastMouseY;
      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;

      this.targetCameraTheta -= dx * 0.005;
      this.targetCameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.targetCameraPhi - dy * 0.005));
      this.lastInteractionTime = performance.now();
    });

    canvas.addEventListener('touchend', () => {
      this.isDragging = false;
      this.lastInteractionTime = performance.now();
    });
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
    const y = this.cameraDistance * Math.cos(this.cameraPhi);
    const z = this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private updateFPS(time: number): void {
    this.frameCount++;
    if (time - this.lastFpsUpdate >= 500) {
      const fps = Math.round((this.frameCount * 1000) / (time - this.lastFpsUpdate));
      if (this.fpsCounter) {
        this.fpsCounter.textContent = `FPS: ${fps}`;
      }
      this.frameCount = 0;
      this.lastFpsUpdate = time;
    }
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate);

    const now = performance.now();
    this.updateFPS(now);

    if (!this.autoRotate && !this.isDragging && now - this.lastInteractionTime > 2000) {
      this.autoRotate = true;
    }

    if (this.autoRotate && !this.isDragging) {
      this.targetCameraTheta += this.AUTO_ROTATE_SPEED * 0.016;
    }

    this.cameraTheta += (this.targetCameraTheta - this.cameraTheta) * 0.08;
    this.cameraPhi += (this.targetCameraPhi - this.cameraPhi) * 0.08;
    this.cameraDistance += (this.targetCameraDistance - this.cameraDistance) * 0.08;
    this.updateCameraPosition();

    const elapsedTime = this.clock.getElapsedTime();
    const delta = this.clock.getDelta();

    this.galaxy.update(elapsedTime, delta);
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.galaxy.dispose();
    this.renderer.dispose();
    window.removeEventListener('resize', () => this.onWindowResize());
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new GalaxyApp();
});
