import * as THREE from 'three';
import { DustParticle, BurstParticle } from './DustParticle';

export interface ClusterInfo {
  id: number;
  center: THREE.Vector3;
  brightness: number;
  density: number;
  temperature: number;
}

export interface EngineParams {
  flowSpeed: number;
  density: number;
  glowIntensity: number;
}

export class StarDustEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particles: DustParticle[] = [];
  private burstParticles: BurstParticle[] = [];
  private clusters: ClusterInfo[] = [];
  private particleGeometry: THREE.BufferGeometry;
  private particleMaterial: THREE.ShaderMaterial;
  private particlePoints: THREE.Points;
  private burstGeometry: THREE.BufferGeometry;
  private burstMaterial: THREE.ShaderMaterial;
  private burstPoints: THREE.Points;
  private backgroundStars: THREE.Points;
  private auroraMesh: THREE.Mesh;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private clock: THREE.Clock;
  private animationId: number = 0;
  private onClusterClick: ((info: ClusterInfo) => void) | null = null;
  private params: EngineParams = { flowSpeed: 1.0, density: 1.0, glowIntensity: 1.0 };
  private defaultCameraPos = new THREE.Vector3(0, 5, 30);
  private defaultCameraTarget = new THREE.Vector3(0, 0, 0);
  private orbitAngles = { theta: 0, phi: Math.PI / 6 };
  private orbitDistance = 30;
  private isDragging = false;
  private previousMouse = { x: 0, y: 0 };
  private container: HTMLElement;
  private clusterGroupMap: Map<number, number> = new Map();

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.copy(this.defaultCameraPos);
    this.camera.lookAt(this.defaultCameraTarget);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 1);
    container.appendChild(this.renderer.domElement);

    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points.threshold = 0.8;
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();

    this.particleGeometry = new THREE.BufferGeometry();
    this.particleMaterial = this.createParticleMaterial();
    this.particlePoints = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.scene.add(this.particlePoints);

    this.burstGeometry = new THREE.BufferGeometry();
    this.burstMaterial = this.createBurstMaterial();
    this.burstPoints = new THREE.Points(this.burstGeometry, this.burstMaterial);
    this.scene.add(this.burstPoints);

    this.backgroundStars = this.createBackgroundStars();
    this.scene.add(this.backgroundStars);

    this.auroraMesh = this.createAurora();
    this.scene.add(this.auroraMesh);

    this.initParticles();
    this.initClusters();
    this.setupEventListeners();

    this.animate();
  }

  private createParticleMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uGlowIntensity: { value: 1.0 },
        uTime: { value: 0.0 },
      },
      vertexShader: `
        attribute float aSize;
        attribute float aAlpha;
        attribute vec3 aColor;
        varying float vAlpha;
        varying vec3 vColor;
        uniform float uGlowIntensity;
        uniform float uTime;
        void main() {
          vAlpha = aAlpha;
          vColor = aColor;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float pulse = 1.0 + 0.15 * sin(uTime * 2.0 + position.x * 0.5 + position.y * 0.3);
          gl_PointSize = aSize * uGlowIntensity * pulse * (300.0 / -mvPosition.z);
          gl_PointSize = clamp(gl_PointSize, 1.0, 64.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float glow = 1.0 - smoothstep(0.0, 0.5, dist);
          glow = pow(glow, 1.5);
          gl_FragColor = vec4(vColor, vAlpha * glow);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  private createBurstMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
      },
      vertexShader: `
        attribute float aSize;
        attribute float aAlpha;
        attribute vec3 aColor;
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          vAlpha = aAlpha;
          vColor = aColor;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (350.0 / -mvPosition.z);
          gl_PointSize = clamp(gl_PointSize, 1.0, 64.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float glow = 1.0 - smoothstep(0.0, 0.5, dist);
          glow = pow(glow, 1.2);
          gl_FragColor = vec4(vColor, vAlpha * glow);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  private createBackgroundStars(): THREE.Points {
    const count = 1500;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const r = 80 + Math.random() * 120;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      sizes[i] = 0.5 + Math.random() * 1.5;
      alphas[i] = 0.3 + Math.random() * 0.7;
      const warmth = Math.random();
      colors[i * 3] = 0.7 + warmth * 0.3;
      colors[i * 3 + 1] = 0.8 + warmth * 0.15;
      colors[i * 3 + 2] = 1.0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0.0 } },
      vertexShader: `
        attribute float aSize;
        attribute float aAlpha;
        attribute vec3 aColor;
        varying float vAlpha;
        varying vec3 vColor;
        uniform float uTime;
        void main() {
          vAlpha = aAlpha * (0.6 + 0.4 * sin(uTime * 0.5 + position.x * 0.1));
          vColor = aColor;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (200.0 / -mvPosition.z);
          gl_PointSize = clamp(gl_PointSize, 0.5, 4.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float glow = 1.0 - smoothstep(0.0, 0.5, dist);
          gl_FragColor = vec4(vColor, vAlpha * glow);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return new THREE.Points(geometry, material);
  }

  private createAurora(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(120, 40, 64, 32);
    const material = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0.0 } },
      vertexShader: `
        varying vec2 vUv;
        uniform float uTime;
        void main() {
          vUv = uv;
          vec3 pos = position;
          pos.z += sin(pos.x * 0.05 + uTime * 0.3) * 2.0;
          pos.y += sin(pos.x * 0.08 + uTime * 0.2) * 1.5;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        void main() {
          float wave1 = sin(vUv.x * 6.0 + uTime * 0.4) * 0.5 + 0.5;
          float wave2 = sin(vUv.x * 8.0 - uTime * 0.3 + 1.0) * 0.5 + 0.5;
          float band = smoothstep(0.3, 0.5, vUv.y) * smoothstep(0.8, 0.6, vUv.y);
          float alpha = band * (wave1 * 0.4 + wave2 * 0.3) * 0.15;
          vec3 col1 = vec3(0.1, 0.6, 0.9);
          vec3 col2 = vec3(0.5, 0.1, 0.7);
          vec3 color = mix(col1, col2, wave1 * 0.5 + 0.3);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 20, -40);
    mesh.rotation.x = -0.2;
    return mesh;
  }

  private initParticles(): void {
    const PARTICLE_COUNT = 5000;
    const clusterCenters = this.generateClusterCenters(8);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const clusterIdx = Math.floor(Math.random() * clusterCenters.length);
      const center = clusterCenters[clusterIdx];
      const spread = 3 + Math.random() * 5;

      const pos = new THREE.Vector3(
        center.x + (Math.random() - 0.5) * spread,
        center.y + (Math.random() - 0.5) * spread * 0.6,
        center.z + (Math.random() - 0.5) * spread
      );

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.05,
        (Math.random() - 0.5) * 0.1
      );

      const t = Math.random();
      const color = new THREE.Color().setHSL(
        0.55 + t * 0.25,
        0.7 + Math.random() * 0.3,
        0.4 + Math.random() * 0.3
      );

      const size = 1.0 + Math.random() * 2.5;
      const life = 8 + Math.random() * 12;

      const particle = new DustParticle(pos, vel, color, size, life, clusterIdx);
      this.particles.push(particle);
    }

    this.updateParticleGeometry();
  }

  private generateClusterCenters(count: number): THREE.Vector3[] {
    const centers: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const radius = 6 + Math.random() * 10;
      centers.push(
        new THREE.Vector3(
          Math.cos(angle) * radius,
          (Math.random() - 0.5) * 6,
          Math.sin(angle) * radius
        )
      );
    }
    return centers;
  }

  private initClusters(): void {
    const clusterCenters = this.generateClusterCenters(8);
    this.clusters = clusterCenters.map((center, i) => ({
      id: i,
      center,
      brightness: +(0.3 + Math.random() * 0.7).toFixed(2),
      density: +(0.5 + Math.random() * 1.5).toFixed(2),
      temperature: +(2000 + Math.random() * 8000).toFixed(0),
    }));
  }

  private updateParticleGeometry(): void {
    const count = this.particles.length;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;
      colors[i * 3] = p.color.r;
      colors[i * 3 + 1] = p.color.g;
      colors[i * 3 + 2] = p.color.b;
      sizes[i] = p.size;
      alphas[i] = p.alpha;
    }

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    this.particleGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    this.particleGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
  }

  private updateBurstGeometry(): void {
    const count = this.burstParticles.length;
    if (count === 0) {
      this.burstGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
      this.burstGeometry.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(0), 3));
      this.burstGeometry.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(0), 1));
      this.burstGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(0), 1));
      return;
    }

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const p = this.burstParticles[i];
      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;
      colors[i * 3] = p.color.r;
      colors[i * 3 + 1] = p.color.g;
      colors[i * 3 + 2] = p.color.b;
      sizes[i] = p.size;
      alphas[i] = p.alpha;
    }

    this.burstGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.burstGeometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    this.burstGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    this.burstGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMouse.x = e.clientX;
      this.previousMouse.y = e.clientY;
    });

    canvas.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const dx = e.clientX - this.previousMouse.x;
        const dy = e.clientY - this.previousMouse.y;
        this.orbitAngles.theta -= dx * 0.005;
        this.orbitAngles.phi = Math.max(
          -Math.PI / 2 + 0.1,
          Math.min(Math.PI / 2 - 0.1, this.orbitAngles.phi + dy * 0.005)
        );
        this.updateCameraFromOrbit();
        this.previousMouse.x = e.clientX;
        this.previousMouse.y = e.clientY;
      }

      this.mouse.x = (e.clientX / this.container.clientWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / this.container.clientHeight) * 2 + 1;
    });

    canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.orbitDistance = Math.max(10, Math.min(60, this.orbitDistance + e.deltaY * 0.03));
      this.updateCameraFromOrbit();
    }, { passive: false });

    canvas.addEventListener('click', (e) => {
      this.mouse.x = (e.clientX / this.container.clientWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / this.container.clientHeight) * 2 + 1;
      this.handleClick();
    });

    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.previousMouse.x = e.touches[0].clientX;
        this.previousMouse.y = e.touches[0].clientY;
      }
    });

    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && this.isDragging) {
        e.preventDefault();
        const dx = e.touches[0].clientX - this.previousMouse.x;
        const dy = e.touches[0].clientY - this.previousMouse.y;
        this.orbitAngles.theta -= dx * 0.005;
        this.orbitAngles.phi = Math.max(
          -Math.PI / 2 + 0.1,
          Math.min(Math.PI / 2 - 0.1, this.orbitAngles.phi + dy * 0.005)
        );
        this.updateCameraFromOrbit();
        this.previousMouse.x = e.touches[0].clientX;
        this.previousMouse.y = e.touches[0].clientY;
      }
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    window.addEventListener('resize', () => {
      this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    });
  }

  private updateCameraFromOrbit(): void {
    this.camera.position.x = this.orbitDistance * Math.cos(this.orbitAngles.phi) * Math.sin(this.orbitAngles.theta);
    this.camera.position.y = this.orbitDistance * Math.sin(this.orbitAngles.phi);
    this.camera.position.z = this.orbitDistance * Math.cos(this.orbitAngles.phi) * Math.cos(this.orbitAngles.theta);
    this.camera.lookAt(this.defaultCameraTarget);
  }

  private handleClick(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.particlePoints);

    if (intersects.length > 0) {
      const idx = intersects[0].index;
      if (idx !== undefined && idx < this.particles.length) {
        const hitParticle = this.particles[idx];
        const clusterId = hitParticle.clusterId;
        const cluster = this.clusters.find((c) => c.id === clusterId);
        if (cluster) {
          this.triggerBurst(hitParticle.position.clone(), hitParticle.color.clone());
          if (this.onClusterClick) {
            this.onClusterClick(cluster);
          }
        }
      }
    }
  }

  private triggerBurst(origin: THREE.Vector3, baseColor: THREE.Color): void {
    for (let i = 0; i < 200; i++) {
      this.burstParticles.push(new BurstParticle(origin, baseColor));
    }
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.getElapsedTime();

    for (const p of this.particles) {
      p.update(delta, this.params.flowSpeed, this.params.density);
      if (p.isDead()) {
        const clusterIdx = Math.floor(Math.random() * this.clusters.length);
        const cluster = this.clusters[clusterIdx];
        const spread = 3 + Math.random() * 5;
        const newPos = new THREE.Vector3(
          cluster.center.x + (Math.random() - 0.5) * spread,
          cluster.center.y + (Math.random() - 0.5) * spread * 0.6,
          cluster.center.z + (Math.random() - 0.5) * spread
        );
        const newVel = new THREE.Vector3(
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.05,
          (Math.random() - 0.5) * 0.1
        );
        const t = Math.random();
        const newColor = new THREE.Color().setHSL(
          0.55 + t * 0.25,
          0.7 + Math.random() * 0.3,
          0.4 + Math.random() * 0.3
        );
        p.reset(newPos, newVel, newColor, 1.0 + Math.random() * 2.5, 8 + Math.random() * 12);
        p.clusterId = clusterIdx;
      }
    }

    for (let i = this.burstParticles.length - 1; i >= 0; i--) {
      this.burstParticles[i].update(delta);
      if (this.burstParticles[i].isDead()) {
        this.burstParticles.splice(i, 1);
      }
    }

    this.particleMaterial.uniforms.uGlowIntensity.value = this.params.glowIntensity;
    this.particleMaterial.uniforms.uTime.value = elapsed;
    (this.backgroundStars.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed;
    (this.auroraMesh.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed;
    this.burstMaterial.uniforms.uTime.value = elapsed;

    this.updateParticleGeometry();
    this.updateBurstGeometry();

    this.renderer.render(this.scene, this.camera);
  };

  setOnClusterClick(callback: (info: ClusterInfo) => void): void {
    this.onClusterClick = callback;
  }

  setParams(params: EngineParams): void {
    this.params = { ...params };
  }

  resetCamera(): void {
    this.orbitAngles.theta = 0;
    this.orbitAngles.phi = Math.PI / 6;
    this.orbitDistance = 30;
    this.updateCameraFromOrbit();
  }

  getClusters(): ClusterInfo[] {
    return this.clusters;
  }

  dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
    this.burstGeometry.dispose();
    this.burstMaterial.dispose();
    this.backgroundStars.geometry.dispose();
    (this.backgroundStars.material as THREE.ShaderMaterial).dispose();
    this.auroraMesh.geometry.dispose();
    (this.auroraMesh.material as THREE.ShaderMaterial).dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
