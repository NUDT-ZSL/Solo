import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ParticleSystem, type MeteorConfig } from './particleSystem';
import { initControls, type AppController } from './uiControls';

class App implements AppController {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private particleSystem: ParticleSystem;
  private clock: THREE.Clock;
  private animationId = 0;

  constructor() {
    const container = document.getElementById('canvas-container')!;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    this.scene.fog = new THREE.FogExp2(0x0a0a2e, 0.008);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.camera.position.set(0, 8, 35);
    this.camera.lookAt(0, 0, 0);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 80;
    this.controls.update();

    this.setupBackground();
    this.setupStarfield();
    this.setupLighting();

    this.particleSystem = new ParticleSystem(this.scene);
    this.clock = new THREE.Clock();

    window.addEventListener('resize', this.onResize.bind(this));

    initControls(this);

    this.hideLoadingScreen();
    this.animate();
  }

  private setupBackground(): void {
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 2;
    bgCanvas.height = 512;
    const ctx = bgCanvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0B0B2A');
    gradient.addColorStop(0.5, '#111845');
    gradient.addColorStop(1, '#1B2A5A');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const texture = new THREE.CanvasTexture(bgCanvas);
    this.scene.background = texture;
  }

  private setupStarfield(): void {
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const r = 60 + Math.random() * 80;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const brightness = 0.3 + Math.random() * 0.7;
      const tint = Math.random();
      if (tint < 0.3) {
        colors[i * 3] = brightness;
        colors[i * 3 + 1] = brightness * 0.9;
        colors[i * 3 + 2] = brightness * 0.7;
      } else if (tint < 0.6) {
        colors[i * 3] = brightness * 0.7;
        colors[i * 3 + 1] = brightness * 0.8;
        colors[i * 3 + 2] = brightness;
      } else {
        colors[i * 3] = brightness;
        colors[i * 3 + 1] = brightness;
        colors[i * 3 + 2] = brightness;
      }

      sizes[i] = 0.5 + Math.random() * 1.5;
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    starGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const starMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        varying float vSize;
        void main() {
          vColor = color;
          vSize = size;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (150.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vSize;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          alpha *= 0.6 + 0.4 * alpha;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
    });

    const stars = new THREE.Points(starGeo, starMat);
    this.scene.add(stars);
  }

  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(0x1a1a3e, 0.5);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0x4466aa, 0.3);
    dirLight.position.set(5, 10, 7);
    this.scene.add(dirLight);
  }

  private hideLoadingScreen(): void {
    setTimeout(() => {
      const loading = document.getElementById('loading-screen');
      if (loading) {
        loading.classList.add('fade-out');
        setTimeout(() => {
          loading.style.display = 'none';
        }, 800);
      }
    }, 500);
  }

  updateConfig(config: Partial<MeteorConfig>): void {
    this.particleSystem.updateConfig(config);
  }

  triggerBurst(): void {
    this.particleSystem.triggerBurst();
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    const delta = Math.min(this.clock.getDelta(), 0.05);

    this.controls.update();
    this.particleSystem.update(delta);

    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.particleSystem.dispose();
    this.renderer.dispose();
  }
}

const _app = new App();
window.addEventListener('beforeunload', () => {
  _app.dispose();
});
