import * as THREE from 'three';
import { Sandglass } from './sandglass';
import { ParticleSystem } from './particleSystem';
import { Interaction } from './interaction';

class App {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private sandglass: Sandglass;
  private particleSystem: ParticleSystem;
  private interaction: Interaction;
  private rafId: number = 0;
  private stars: THREE.Points;

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0a2a, 0.02);

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.sandglass = new Sandglass(this.camera);
    this.scene.add(this.sandglass.group);

    this.particleSystem = new ParticleSystem(
      this.scene,
      this.sandglass.getSandglassParams(),
      this.camera
    );

    this.interaction = new Interaction(this.renderer.domElement, this.camera, {
      onDisturb: () => {
        this.particleSystem.disturb();
      },
      onReset: () => {
        this.particleSystem.reset();
      },
    });

    this.setupLights();
    this.setupStars();
    this.setupResize();
    this.animate = this.animate.bind(this);
    this.animate();
  }

  private setupLights() {
    const ambient = new THREE.AmbientLight(0x404080, 0.6);
    this.scene.add(ambient);

    const topLight = new THREE.DirectionalLight(0x6688ff, 0.8);
    topLight.position.set(3, 10, 3);
    this.scene.add(topLight);

    const bottomLight = new THREE.DirectionalLight(0xff6688, 0.6);
    bottomLight.position.set(-3, -8, 3);
    this.scene.add(bottomLight);

    const pointLight = new THREE.PointLight(0x88aaff, 1.2, 30, 1.5);
    pointLight.position.set(0, 0, 4);
    this.scene.add(pointLight);
  }

  private setupStars() {
    const count = 400;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 40 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      const c = new THREE.Color().setHSL(220 / 360 + Math.random() * 0.1, 0.5 + Math.random() * 0.5, 0.6 + Math.random() * 0.3);
      colors[i * 3 + 0] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      sizes[i] = 0.3 + Math.random() * 0.7;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = color;
          vAlpha = 0.4 + size * 0.6;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * 2.0 * (120.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 c = gl_PointCoord - vec2(0.5);
          float d = length(c);
          if (d > 0.5) discard;
          float core = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vColor, core * vAlpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.stars = new THREE.Points(geo, mat);
    this.scene.add(this.stars);
  }

  private setupResize() {
    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    });
  }

  private animate() {
    this.rafId = requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.interaction.update();
    this.sandglass.update(delta, this.interaction.normalizedMouse);
    this.particleSystem.setMouse(this.interaction.normalizedMouse);
    this.particleSystem.update(delta);

    if (this.stars) {
      this.stars.rotation.y = elapsed * 0.02;
      this.stars.rotation.x = Math.sin(elapsed * 0.01) * 0.05;
      (this.stars.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed;
    }

    this.renderer.render(this.scene, this.camera);
  }

  public dispose() {
    cancelAnimationFrame(this.rafId);
    this.interaction.dispose();
    this.particleSystem.dispose();
    this.scene.remove(this.sandglass.group);
    this.scene.remove(this.stars);
    this.stars.geometry.dispose();
    (this.stars.material as THREE.Material).dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

const container = document.getElementById('app') as HTMLElement;
if (container) {
  new App(container);
}
