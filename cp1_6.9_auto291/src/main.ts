import * as THREE from 'three';
import { StarField, StarData } from './starField';
import { InteractionSystem } from './interaction';
import { EffectSystem } from './effect';

class StarDiskApp {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private container!: HTMLElement;
  private starField!: StarField;
  private interaction!: InteractionSystem;
  private effectSystem!: EffectSystem;
  private backgroundCloud!: THREE.Points;
  private bgGeometry!: THREE.BufferGeometry;
  private bgMaterial!: THREE.ShaderMaterial;

  private clock: THREE.Clock = new THREE.Clock();
  private lastTime: number = 0;
  private animationId: number = 0;
  private frameCount: number = 0;
  private fps: number = 60;
  private frameTime: number = 0;

  private BG_CLOUD_COUNT = 200;
  private bgPositions: Float32Array;
  private bgColors: Float32Array;
  private bgSizes: Float32Array;
  private bgAlphas: Float32Array;
  private bgVelocities: Array<{ vx: number; vy: number; vz: number }> = [];

  constructor() {
    this.bgPositions = new Float32Array(this.BG_CLOUD_COUNT * 3);
    this.bgColors = new Float32Array(this.BG_CLOUD_COUNT * 3);
    this.bgSizes = new Float32Array(this.BG_CLOUD_COUNT);
    this.bgAlphas = new Float32Array(this.BG_CLOUD_COUNT);

    this.init();
    this.hideLoading();
    this.animate();
  }

  private init(): void {
    this.container = document.getElementById('canvas-container')!;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0015, 0.0008);

    const fov = 60;
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, 1, 5000);
    this.camera.position.set(0, 0, 700);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.createBackgroundCloud();

    this.starField = new StarField(this.scene);
    this.effectSystem = new EffectSystem(this.scene, this.starField.starGroup);

    this.interaction = new InteractionSystem(
      this.camera,
      this.renderer,
      this.starField,
      {
        onStarSelect: (_index: number, _star: StarData) => {},
        onStarDoubleClick: (_index: number, star: StarData) => {
          this.effectSystem.createBurst(star);
        },
        onHoverChange: (_hovering: boolean) => {},
        onFusion: () => {}
      }
    );

    window.addEventListener('resize', this.onResize.bind(this));
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.lastTime = performance.now();
      }
    });
  }

  private createBackgroundCloud(): void {
    for (let i = 0; i < this.BG_CLOUD_COUNT; i++) {
      const radius = 900 + Math.random() * 1400;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta) * 0.6;
      const z = radius * Math.cos(phi);

      this.bgPositions[i * 3] = x;
      this.bgPositions[i * 3 + 1] = y;
      this.bgPositions[i * 3 + 2] = z;

      const hue = 240 + Math.random() * 60;
      const sat = 0.5 + Math.random() * 0.3;
      const light = 0.15 + Math.random() * 0.25;
      const color = new THREE.Color().setHSL(hue / 360, sat, light);

      this.bgColors[i * 3] = color.r;
      this.bgColors[i * 3 + 1] = color.g;
      this.bgColors[i * 3 + 2] = color.b;

      this.bgSizes[i] = 20 + Math.random() * 30;
      this.bgAlphas[i] = 0.1 + Math.random() * 0.2;

      this.bgVelocities.push({
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.5,
        vz: (Math.random() - 0.5) * 0.8
      });
    }

    const bgVS = `
      attribute float size;
      attribute float alpha;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vColor = color;
        vAlpha = alpha;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (500.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const bgFS = `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec2 cxy = 2.0 * gl_PointCoord - 1.0;
        float d = length(cxy);
        if (d > 1.0) discard;
        float grad = exp(-d * d * 2.5);
        float a = grad * vAlpha;
        gl_FragColor = vec4(vColor, a);
      }
    `;

    this.bgMaterial = new THREE.ShaderMaterial({
      vertexShader: bgVS,
      fragmentShader: bgFS,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false
    });

    this.bgGeometry = new THREE.BufferGeometry();
    this.bgGeometry.setAttribute('position', new THREE.BufferAttribute(this.bgPositions, 3));
    this.bgGeometry.setAttribute('color', new THREE.BufferAttribute(this.bgColors, 3));
    this.bgGeometry.setAttribute('size', new THREE.BufferAttribute(this.bgSizes, 1));
    this.bgGeometry.setAttribute('alpha', new THREE.BufferAttribute(this.bgAlphas, 1));

    this.backgroundCloud = new THREE.Points(this.bgGeometry, this.bgMaterial);
    this.scene.add(this.backgroundCloud);
  }

  private updateBackgroundCloud(dt: number): void {
    const time = this.clock.getElapsedTime();

    for (let i = 0; i < this.BG_CLOUD_COUNT; i++) {
      this.bgPositions[i * 3] += this.bgVelocities[i].vx * dt;
      this.bgPositions[i * 3 + 1] += this.bgVelocities[i].vy * dt;
      this.bgPositions[i * 3 + 2] += this.bgVelocities[i].vz * dt;

      const dist = Math.sqrt(
        this.bgPositions[i * 3] * this.bgPositions[i * 3] +
        this.bgPositions[i * 3 + 1] * this.bgPositions[i * 3 + 1] +
        this.bgPositions[i * 3 + 2] * this.bgPositions[i * 3 + 2]
      );

      if (dist > 2500) {
        const scale = 900 / dist;
        this.bgPositions[i * 3] *= scale;
        this.bgPositions[i * 3 + 1] *= scale;
        this.bgPositions[i * 3 + 2] *= scale;
      }

      this.bgAlphas[i] = (0.1 + 0.08 * Math.sin(time * 0.3 + i * 0.5)) * (1 + Math.sin(time * 0.7 + i) * 0.2);
    }

    this.backgroundCloud.rotation.y += 0.005 * dt;
    this.backgroundCloud.rotation.x += 0.002 * dt;

    if (this.bgGeometry.attributes.position) this.bgGeometry.attributes.position.needsUpdate = true;
    if (this.bgGeometry.attributes.alpha) this.bgGeometry.attributes.alpha.needsUpdate = true;
  }

  private hideLoading(): void {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.transition = 'opacity 0.8s ease-out';
      loading.style.opacity = '0';
      setTimeout(() => {
        if (loading.parentNode) {
          loading.parentNode.removeChild(loading);
        }
      }, 800);
    }
  }

  private onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    if (dt > 0.1) dt = 0.1;

    this.frameCount++;
    this.frameTime += dt;
    if (this.frameTime >= 1.0) {
      this.fps = this.frameCount / this.frameTime;
      this.frameCount = 0;
      this.frameTime = 0;
    }

    const _fps = this.fps;
    void _fps;

    this.updateBackgroundCloud(dt);
    this.interaction.update(dt);

    const fusions = this.starField.update(dt);

    for (const fusion of fusions) {
      this.effectSystem.createFusionRipple(fusion.center, fusion.avgColor);
      this.starField.triggerNearbyFlicker(fusion.center);
    }

    this.effectSystem.update(dt);

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onResize.bind(this));

    this.interaction.dispose();
    this.effectSystem.dispose();

    this.starField.geometry.dispose();
    this.starField.haloGeometry.dispose();
    this.starField.material.dispose();
    this.starField.haloMaterial.dispose();

    this.bgGeometry.dispose();
    this.bgMaterial.dispose();

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

function bootstrap(): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new StarDiskApp();
    });
  } else {
    new StarDiskApp();
  }
}

bootstrap();

export { StarDiskApp };
export default StarDiskApp;
