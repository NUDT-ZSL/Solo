import * as THREE from 'three';
import { BackgroundStar } from './DataModel';

export class SceneSetup {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public stars: BackgroundStar[] = [];
  public starPoints: THREE.Points | null = null;
  private starGeometry: THREE.BufferGeometry | null = null;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = this.createGradientTexture();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 8);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    this.setupLights();
    this.createBackgroundStars();

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private createGradientTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(1, '#1a0a2a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x1a1a2e, 0.4);
    this.scene.add(ambient);

    const point1 = new THREE.PointLight(0x6366f1, 0.6, 30);
    point1.position.set(5, 5, 5);
    this.scene.add(point1);

    const point2 = new THREE.PointLight(0xc084fc, 0.4, 30);
    point2.position.set(-5, -3, 3);
    this.scene.add(point2);

    const point3 = new THREE.PointLight(0xf59e0b, 0.2, 20);
    point3.position.set(0, 3, -5);
    this.scene.add(point3);
  }

  private createBackgroundStars(): void {
    this.stars = [];
    const count = 200;

    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const opacities = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 40;
      const y = (Math.random() - 0.5) * 30;
      const z = (Math.random() - 0.5) * 20 - 10;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const size = 0.5 + Math.random() * 1.0;
      sizes[i] = size;

      const opacity = 0.3 + Math.random() * 0.3;
      opacities[i] = opacity;

      this.stars.push({
        position: new THREE.Vector3(x, y, z),
        baseY: y,
        size,
        opacity,
        phase: Math.random() * Math.PI * 2,
        speed: 0.1 + Math.random() * 0.3,
      });
    }

    this.starGeometry = new THREE.BufferGeometry();
    this.starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.starGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    this.starGeometry.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1));

    const starMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute float aSize;
        attribute float aOpacity;
        varying float vOpacity;
        uniform float uTime;
        uniform float uPixelRatio;
        void main() {
          vOpacity = aOpacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (80.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vOpacity;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.1, d) * vOpacity;
          gl_FragColor = vec4(0.75, 0.75, 0.9, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.starPoints = new THREE.Points(this.starGeometry, starMaterial);
    this.scene.add(this.starPoints);
  }

  updateBackgroundStars(time: number): void {
    if (!this.starGeometry || !this.starPoints) return;

    const positions = this.starGeometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];
      const y = star.baseY + Math.sin(time * star.speed + star.phase) * 0.3;
      positions.setY(i, y);
    }

    positions.needsUpdate = true;

    const material = this.starPoints.material as THREE.ShaderMaterial;
    material.uniforms.uTime.value = time;
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize.bind(this));
    this.renderer.dispose();
    this.starGeometry?.dispose();
    if (this.starPoints) {
      (this.starPoints.material as THREE.ShaderMaterial).dispose();
    }
  }
}
