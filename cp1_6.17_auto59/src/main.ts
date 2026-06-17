import * as THREE from 'three';
import { AuroraController } from './aurora';
import { UIController } from './controls';

class App {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private aurora: AuroraController;
  private ui: UIController;
  private clock: THREE.Clock;
  private fpsFrames = 0;
  private fpsTime = 0;

  constructor() {
    this.container = document.getElementById('canvas-container') || document.body;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0B0E14);
    this.scene.fog = new THREE.FogExp2(0x0B0E14, 0.015);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 8, 25);
    this.camera.lookAt(0, 8, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      alpha: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.createStars();
    this.createMountains();
    this.createGroundGlow();

    this.aurora = new AuroraController(this.scene);
    this.ui = new UIController(
      document.getElementById('app') || document.body,
      this.aurora,
      this.renderer,
      () => this.clock.getElapsedTime()
    );

    window.addEventListener('resize', this.onResize.bind(this));
    this.animate();
  }

  private createStars() {
    const starCount = 500;
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const r = 80 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = 10 + r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) - 20;

      sizes[i] = 0.2 + Math.random() * 0.6;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 0.5,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    });

    const stars = new THREE.Points(geometry, material);
    this.scene.add(stars);
  }

  private createMountains() {
    const group = new THREE.Group();

    const layers = [
      { z: -5, segments: 18, heightScale: 9, baseY: 0, color1: 0xE0E0E0, color2: 0x9E9E9E },
      { z: -12, segments: 22, heightScale: 12, baseY: -1, color1: 0xBDBDBD, color2: 0x757575 },
      { z: -22, segments: 26, heightScale: 15, baseY: -2, color1: 0x9E9E9E, color2: 0x616161 }
    ];

    for (const layer of layers) {
      const geometry = new THREE.PlaneGeometry(80, 30, layer.segments, 1);
      const posAttr = geometry.attributes.position as THREE.BufferAttribute;
      const colors: number[] = [];

      for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const y = posAttr.getY(i);

        if (y > 0) {
          const noise =
            Math.sin(x * 0.15) * 0.6 +
            Math.sin(x * 0.3 + 1.3) * 0.3 +
            Math.sin(x * 0.08 + 2.1) * 0.8 +
            (Math.random() - 0.5) * 0.3;

          const newY = layer.baseY + Math.max(0, y / 15 + noise) * layer.heightScale;
          posAttr.setY(i, newY);

          const t = Math.min(1, newY / (layer.heightScale * 1.2));
          const color = new THREE.Color(layer.color1).lerp(new THREE.Color(layer.color2), t);
          colors.push(color.r, color.g, color.b);
        } else {
          posAttr.setY(i, layer.baseY);
          const color = new THREE.Color(layer.color2);
          colors.push(color.r, color.g, color.b);
        }
      }

      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.computeVertexNormals();

      const material = new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.z = layer.z;
      mesh.position.x = 0;
      group.add(mesh);
    }

    group.position.y = -5;
    this.scene.add(group);
  }

  private createGroundGlow() {
    const geometry = new THREE.PlaneGeometry(100, 30);
    const material = new THREE.MeshBasicMaterial({
      color: 0x1a1a2e,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    const glow = new THREE.Mesh(geometry, material);
    glow.position.set(0, -8, -2);
    glow.rotation.x = -0.1;
    this.scene.add(glow);
  }

  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate() {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    this.aurora.update(time, delta);

    this.fpsFrames++;
    this.fpsTime += delta;
    if (this.fpsTime >= 0.5) {
      const fps = this.fpsFrames / this.fpsTime;
      this.ui.updateFPS(fps);
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }
    this.ui.updateStatus();

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
