import './style.css';
import * as THREE from 'three';
import { ParticleCloth, DensityLevel, ThemeName } from './particleCloth';
import { InteractionSystem } from './interaction';
import { UIPanel } from './ui';

class App {
  canvas: HTMLCanvasElement;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  cloth: ParticleCloth;
  interaction: InteractionSystem;
  ui: UIPanel;
  trailPoints: THREE.Points;
  trailGeometry: THREE.BufferGeometry;
  trailMaterial: THREE.PointsMaterial;
  clock: THREE.Clock;
  lastTime = 0;
  frameCount = 0;
  fpsAccum = 0;

  constructor() {
    this.canvas = document.getElementById('scene') as HTMLCanvasElement;
    const panel = document.getElementById('panel') as HTMLElement;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0f);
    this.scene.fog = new THREE.FogExp2(0x0a0a0f, 0.02);

    const container = document.getElementById('app') as HTMLElement;
    const w = container.clientWidth - 260;
    const h = container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 200);
    this.camera.position.set(0, 1.5, 15);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    this.renderer.setClearColor(0x0a0a0f, 1);

    this.addLights();

    this.cloth = new ParticleCloth(this.scene);

    this.trailGeometry = new THREE.BufferGeometry();
    this.trailMaterial = new THREE.PointsMaterial({
      size: 0.14,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      map: this.cloth.createSpriteTexture(),
      sizeAttenuation: true,
    });
    this.trailPoints = new THREE.Points(this.trailGeometry, this.trailMaterial);
    this.scene.add(this.trailPoints);

    this.interaction = new InteractionSystem(this.cloth, this.camera, this.canvas);

    this.ui = new UIPanel(this.cloth, panel, {
      onElasticityChange: (v: number) => this.cloth.setElasticity(v),
      onDampingChange: (v: number) => this.cloth.setDamping(v),
      onDensityChange: (v: DensityLevel) => this.cloth.setDensity(v),
      onThemeChange: (v: ThemeName) => this.cloth.setTheme(v, performance.now()),
    });

    this.clock = new THREE.Clock();
    window.addEventListener('resize', this.onResize);
    this.onResize();

    this.animate();
  }

  addLights() {
    const amb = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(amb);
    const dir = new THREE.DirectionalLight(0xffccaa, 0.5);
    dir.position.set(5, 10, 7);
    this.scene.add(dir);
    const p1 = new THREE.PointLight(0xff6644, 1.2, 30);
    p1.position.set(-6, 4, 6);
    this.scene.add(p1);
    const p2 = new THREE.PointLight(0x4488ff, 1.0, 30);
    p2.position.set(6, -2, -6);
    this.scene.add(p2);
  }

  onResize = () => {
    const container = document.getElementById('app') as HTMLElement;
    const w = Math.max(1, container.clientWidth - 260);
    const h = Math.max(1, container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  };

  animate = () => {
    requestAnimationFrame(this.animate);
    const now = performance.now();
    const dt = Math.min(0.033, this.clock.getDelta());

    this.frameCount++;
    this.fpsAccum += dt;
    if (this.fpsAccum >= 0.5) {
      const fps = this.frameCount / this.fpsAccum;
      this.ui.updateFPS(fps);
      this.frameCount = 0;
      this.fpsAccum = 0;
    }

    const t = now * 0.0008;
    this.camera.position.x = Math.sin(t) * 0.8;
    this.camera.position.z = 15 + Math.cos(t) * 0.6;
    this.camera.lookAt(0, 0, 0);

    this.interaction.update(now, dt);
    this.cloth.update(now, dt);

    const { positions, colors } = this.cloth.getTrailGeometry();
    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.trailGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    (this.trailGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    if (this.trailGeometry.attributes.color) {
      (this.trailGeometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    }

    this.renderer.render(this.scene, this.camera);
    this.lastTime = now;
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
