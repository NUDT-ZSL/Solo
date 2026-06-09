import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';
import { CaveGenerator } from './CaveGenerator';
import { CrystalCluster } from './CrystalCluster';
import { ParticleSystem } from './ParticleSystem';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private clock: THREE.Clock;
  private cave: CaveGenerator;
  private crystals: CrystalCluster[] = [];
  private particleSystem: ParticleSystem;
  private dustParticles: THREE.Points;
  private dustData: { velocity: THREE.Vector3; offset: number }[] = [];
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private fpsElement: HTMLElement;
  private countElement: HTMLElement;
  private frameCount: number = 0;
  private fpsTime: number = 0;
  private currentFps: number = 0;
  private targetZoom: number;
  private dampingFactor: number = 0.1;

  constructor() {
    const container = document.getElementById('app') as HTMLElement;
    this.fpsElement = document.getElementById('fps') as HTMLElement;
    this.countElement = document.getElementById('crystal-count') as HTMLElement;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111111);
    this.scene.fog = new THREE.FogExp2(0x111111, 0.018);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.camera.position.set(0, 15, 25);
    this.targetZoom = this.camera.position.length();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 0, 0);
    this.controls.minDistance = 5;
    this.controls.maxDistance = 40;
    this.controls.minPolarAngle = Math.PI / 2 - THREE.MathUtils.degToRad(60);
    this.controls.maxPolarAngle = Math.PI / 2 + THREE.MathUtils.degToRad(30);

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.cave = new CaveGenerator();
    this.scene.add(this.cave.group);

    this.particleSystem = new ParticleSystem(800);
    this.scene.add(this.particleSystem.group);

    this.generateCrystals();
    this.generateDustParticles();

    window.addEventListener('resize', this.onResize.bind(this));
    window.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    window.addEventListener('click', this.onClick.bind(this));

    this.updateCount();
    this.animate();
  }

  private generateCrystals(): void {
    const groundY = this.cave.getGroundY();
    const count = 15 + Math.floor(Math.random() * 11);
    const placed: THREE.Vector3[] = [];

    for (let i = 0; i < count; i++) {
      let attempts = 0;
      let position: THREE.Vector3 | null = null;

      while (attempts < 50) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 3 + Math.random() * 16;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const testPos = new THREE.Vector3(x, groundY, z);

        let valid = true;
        for (const p of placed) {
          if (p.distanceTo(testPos) < 3.5) {
            valid = false;
            break;
          }
        }

        if (valid) {
          position = testPos;
          break;
        }
        attempts++;
      }

      if (position) {
        placed.push(position);
        const cluster = new CrystalCluster(position);
        this.crystals.push(cluster);
        this.scene.add(cluster.group);
      }
    }
  }

  private generateDustParticles(): void {
    const count = 50;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 5 + Math.random() * 15;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.random() * 18 - 2;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      colors[i * 3] = 0.53;
      colors[i * 3 + 1] = 0.53;
      colors[i * 3 + 2] = 0.53;

      this.dustData.push({
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.05,
          (Math.random() - 0.5) * 0.1
        ),
        offset: Math.random() * 100
      });
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.3,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.dustParticles = new THREE.Points(geometry, material);
    this.scene.add(this.dustParticles);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta = event.deltaY * 0.01;
    this.targetZoom = THREE.MathUtils.clamp(
      this.targetZoom + delta,
      this.controls.minDistance,
      this.controls.maxDistance
    );
  }

  private onClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const meshes: THREE.Mesh[] = [];
    const crystalMap = new Map<THREE.Mesh, CrystalCluster>();

    for (const cluster of this.crystals) {
      if (cluster.isShattered()) continue;
      cluster.group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          meshes.push(obj);
          crystalMap.set(obj, cluster);
        }
      });
    }

    const intersects = this.raycaster.intersectObjects(meshes, false);
    if (intersects.length > 0) {
      const hit = intersects[0].object as THREE.Mesh;
      const cluster = crystalMap.get(hit);
      if (cluster) {
        cluster.shatter((pos, color) => {
          const particleCount = 100 + Math.floor(Math.random() * 101);
          this.particleSystem.burst(pos, color, particleCount);
        });
        const glow = cluster.getGlowMesh();
        if (glow) {
          this.scene.add(glow);
        }
        this.updateCount();
      }
    }
  }

  private updateCount(): void {
    const active = this.crystals.filter((c) => !c.isShattered()).length;
    this.countElement.textContent = `晶体簇: ${active}`;
  }

  private updateDust(delta: number, time: number): void {
    const positions = this.dustParticles.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < this.dustData.length; i++) {
      const data = this.dustData[i];
      positions[i * 3] += data.velocity.x * delta + Math.sin(time * 0.5 + data.offset) * 0.003;
      positions[i * 3 + 1] += data.velocity.y * delta + Math.cos(time * 0.3 + data.offset) * 0.002;
      positions[i * 3 + 2] += data.velocity.z * delta + Math.sin(time * 0.4 + data.offset) * 0.003;

      if (positions[i * 3 + 1] < -3) positions[i * 3 + 1] = 15;
      if (positions[i * 3 + 1] > 16) positions[i * 3 + 1] = -2;

      const dist = Math.sqrt(
        positions[i * 3] ** 2 +
        positions[i * 3 + 1] ** 2 +
        positions[i * 3 + 2] ** 2
      );
      if (dist > 22) {
        positions[i * 3] *= 0.8;
        positions[i * 3 + 1] *= 0.8;
        positions[i * 3 + 2] *= 0.8;
      }
    }
    this.dustParticles.geometry.attributes.position.needsUpdate = true;
  }

  private updateCameraZoom(delta: number): void {
    const currentDist = this.camera.position.length();
    const targetDir = this.camera.position.clone().normalize();
    const newDist = currentDist + (this.targetZoom - currentDist) * this.dampingFactor;
    this.camera.position.copy(targetDir.multiplyScalar(newDist));
  }

  private updateFPS(delta: number): void {
    this.frameCount++;
    this.fpsTime += delta;
    if (this.fpsTime >= 0.5) {
      this.currentFps = Math.round(this.frameCount / this.fpsTime);
      this.fpsElement.textContent = `FPS: ${this.currentFps}`;
      this.frameCount = 0;
      this.fpsTime = 0;
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.05);
    const time = this.clock.getElapsedTime();

    this.controls.update();
    this.updateCameraZoom(delta);

    for (const cluster of this.crystals) {
      cluster.update(delta);
    }

    this.particleSystem.update(delta);
    this.updateDust(delta, time);
    this.updateFPS(delta);

    this.renderer.render(this.scene, this.camera);
  };
}

new App();
