import * as THREE from 'three';

export class SceneManager {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  boundarySphere: THREE.Mesh;
  particleGroup: THREE.Group;
  starField: THREE.Points;
  canvas: HTMLCanvasElement;
  backgroundTexture: THREE.CanvasTexture;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 512;
    this.backgroundTexture = this.createRadialGradientTexture();

    this.scene = new THREE.Scene();
    this.scene.background = this.backgroundTexture;

    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 200);
    this.camera.position.set(0, 0, 35);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0x0a0a2e, 1);
    container.appendChild(this.renderer.domElement);

    this.particleGroup = new THREE.Group();
    this.scene.add(this.particleGroup);

    this.boundarySphere = this.createBoundarySphere();
    this.particleGroup.add(this.boundarySphere);

    this.starField = this.createStarField();
    this.scene.add(this.starField);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    window.addEventListener('resize', () => this.onResize(container));
  }

  createRadialGradientTexture(): THREE.CanvasTexture {
    const ctx = this.canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(
      this.canvas.width / 2, this.canvas.height / 2, 0,
      this.canvas.width / 2, this.canvas.height / 2, this.canvas.width / 2
    );
    gradient.addColorStop(0, '#1a1a3e');
    gradient.addColorStop(1, '#0a0a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const texture = new THREE.CanvasTexture(this.canvas);
    texture.needsUpdate = true;
    return texture;
  }

  createBoundarySphere(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(30, 64, 64);
    const material = new THREE.MeshBasicMaterial({
      color: 0x3344aa,
      wireframe: true,
      transparent: true,
      opacity: 0.06,
      side: THREE.BackSide
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.name = 'boundarySphere';
    return sphere;
  }

  createStarField(): THREE.Points {
    const starCount = 1500;
    const positions = new Float32Array(starCount * 3);
    const alphas = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const radius = 60 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      alphas[i] = 0.1 + Math.random() * 0.2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1,
      sizeAttenuation: true,
      transparent: true,
      opacity: 1,
      vertexColors: false,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const stars = new THREE.Points(geometry, material);
    stars.name = 'starField';
    return stars;
  }

  setBackgroundFlash(flash: boolean): void {
    if (flash) {
      this.scene.background = new THREE.Color(0xdddddd);
    } else {
      this.scene.background = this.backgroundTexture;
    }
  }

  onResize(container: HTMLElement): void {
    const width = container.clientWidth;
    const height = container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}
