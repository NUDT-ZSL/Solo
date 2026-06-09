import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BubbleSystem } from './bubbleSystem';
import { ConnectionSystem } from './connectionSystem';
import { InteractionSystem } from './interaction';

const ROTATION_SPEED = 0.5;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3.0;
const PAN_SPEED = 2;
const INITIAL_CAMERA_DISTANCE = 480;
const TARGET_FPS = 60;
const MIN_RENDER_INTERVAL = 1000 / TARGET_FPS;

class GalaxyApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private clock: THREE.Clock = new THREE.Clock();
  private lastRenderTime: number = 0;
  private isRunning: boolean = true;
  private resizeObserver: ResizeObserver;
  private smoothZoom: number = 1.0;
  private targetZoom: number = 1.0;
  private animationFrameId: number | null = null;

  private bubbleSystem: BubbleSystem;
  private connectionSystem: ConnectionSystem;
  private interactionSystem: InteractionSystem;

  constructor() {
    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();

    this.bubbleSystem = new BubbleSystem();
    this.scene.add(this.bubbleSystem.group);

    this.connectionSystem = new ConnectionSystem(this.bubbleSystem);
    this.scene.add(this.connectionSystem.group);

    this.interactionSystem = new InteractionSystem(
      this.scene,
      this.camera,
      this.renderer,
      this.bubbleSystem,
      this.connectionSystem
    );
    this.scene.add(this.interactionSystem.group);

    this.setupLighting();
    this.setupStarfield();

    this.resizeObserver = this.createResizeObserver();
    this.handleResize();
    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();

    const center = new THREE.Vector3(-0.2, -0.2, 0);
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(
      canvas.width * (0.5 + center.x * 0.5),
      canvas.height * (0.5 + center.y * 0.5),
      0,
      canvas.width * 0.5,
      canvas.height * 0.5,
      canvas.width * 0.8
    );
    gradient.addColorStop(0, '#0a0e27');
    gradient.addColorStop(0.5, '#1a0a2e');
    gradient.addColorStop(1, '#05030f');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const bgTexture = new THREE.CanvasTexture(canvas);
    bgTexture.colorSpace = THREE.SRGBColorSpace;
    scene.background = bgTexture;

    scene.fog = new THREE.FogExp2(0x05030f, 0.0015);

    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    camera.position.set(
      INITIAL_CAMERA_DISTANCE * 0.7,
      INITIAL_CAMERA_DISTANCE * 0.5,
      INITIAL_CAMERA_DISTANCE * 0.7
    );
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
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    document.body.appendChild(renderer.domElement);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);

    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    controls.rotateSpeed = ROTATION_SPEED;
    controls.zoomSpeed = 0.8;
    controls.panSpeed = PAN_SPEED;

    controls.minDistance = 20;
    controls.maxDistance = 1200;

    controls.screenSpacePanning = true;
    controls.rightButton = THREE.MOUSE.PAN;
    controls.leftButton = THREE.MOUSE.ROTATE;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };

    controls.target.set(0, 0, 0);
    controls.update();

    return controls;
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0x6366f1, 0.4);
    directionalLight.position.set(100, 150, 100);
    this.scene.add(directionalLight);

    const warmLight = new THREE.PointLight(0xf97316, 0.6, 600);
    warmLight.position.set(-100, -80, -100);
    this.scene.add(warmLight);

    const coolLight = new THREE.PointLight(0x6366f1, 0.5, 500);
    coolLight.position.set(150, 100, 150);
    this.scene.add(coolLight);
  }

  private setupStarfield(): void {
    const starCount = 3000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const radius = 600 + Math.random() * 600;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const colorChoice = Math.random();
      if (colorChoice < 0.6) {
        colors[i * 3] = 0.8 + Math.random() * 0.2;
        colors[i * 3 + 1] = 0.85 + Math.random() * 0.15;
        colors[i * 3 + 2] = 1.0;
      } else if (colorChoice < 0.85) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.7 + Math.random() * 0.2;
        colors[i * 3 + 2] = 0.5 + Math.random() * 0.2;
      } else {
        colors[i * 3] = 0.6 + Math.random() * 0.3;
        colors[i * 3 + 1] = 0.5 + Math.random() * 0.3;
        colors[i * 3 + 2] = 1.0;
      }

      sizes[i] = 0.5 + Math.random() * 1.5;
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    starGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const starMat = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        attribute float size;
        uniform float uPixelRatio;
        varying vec3 vColor;

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPixelRatio * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;

        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);
          if (dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, dist) * 0.8;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true
    });

    const stars = new THREE.Points(starGeo, starMat);
    this.scene.add(stars);
  }

  private createResizeObserver(): ResizeObserver {
    const observer = new ResizeObserver(() => {
      this.handleResize();
    });
    observer.observe(document.body);
    return observer;
  }

  private handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private updateZoomSmoothing(deltaTime: number): void {
    const currentDistance = this.camera.position.distanceTo(this.controls.target);
    const baseDistance = INITIAL_CAMERA_DISTANCE;

    this.targetZoom = THREE.MathUtils.clamp(
      baseDistance / currentDistance,
      ZOOM_MIN,
      ZOOM_MAX
    );

    const lerpFactor = 1 - Math.exp(-deltaTime * 5);
    this.smoothZoom += (this.targetZoom - this.smoothZoom) * lerpFactor;
  }

  private animate = (): void => {
    if (!this.isRunning) return;

    this.animationFrameId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    if (now - this.lastRenderTime < MIN_RENDER_INTERVAL) {
      return;
    }
    this.lastRenderTime = now;

    this.controls.update();

    this.updateZoomSmoothing(delta);

    this.bubbleSystem.update(delta, elapsedTime);
    this.connectionSystem.update(delta);
    this.interactionSystem.update(delta, elapsedTime);

    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.resizeObserver.disconnect();
    this.interactionSystem.dispose();
    this.controls.dispose();
    this.renderer.dispose();

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }
}

let app: GalaxyApp | null = null;

function init(): void {
  if (app) return;
  app = new GalaxyApp();

  window.addEventListener('beforeunload', () => {
    if (app) {
      app.dispose();
      app = null;
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
