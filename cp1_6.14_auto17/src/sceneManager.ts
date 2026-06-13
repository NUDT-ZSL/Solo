import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DataLoader, Artifact, Stratum } from './dataLoader';

const CLIP_ANIM_DURATION = 600;
const FLY_DURATION = 1000;
const RING_PULSE_DURATION = 1000;
const RING_RADIUS = 0.15;
const RING_COLOR = 0xfbbf24;
const SITE_SIZE = 12;
const PARTICLE_COUNT = 500;

type ArtifactSelectCallback = (artifact: Artifact) => void;

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private dataLoader: DataLoader;

  private strataGroup: THREE.Group;
  private artifactGroup: THREE.Group;
  private ringGroup: THREE.Group;
  private particleSystem: THREE.Points;

  private clippingPlane: THREE.Plane;
  private clippingTarget: number = 12;
  private clippingCurrent: number = 12;
  private clippingAnimStart: number = 0;
  private clippingAnimFrom: number = 12;
  private isClippingAnimating: boolean = false;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private artifactMeshes: Map<string, THREE.Mesh> = new Map();
  private ringMeshes: Map<string, THREE.Mesh> = new Map();
  private ringPulseAnimations: Map<string, { start: number }> = new Map();

  private onArtifactSelect: ArtifactSelectCallback | null = null;
  private highlightedArtifactId: string | null = null;

  private clock: THREE.Clock;
  private lodLevels: { threshold: number; detail: number }[] = [
    { threshold: 50, detail: 16 },
    { threshold: 200, detail: 8 },
    { threshold: 400, detail: 6 },
    { threshold: Infinity, detail: 4 }
  ];

  constructor(container: HTMLElement, dataLoader: DataLoader) {
    this.dataLoader = dataLoader;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = this.createSkyGradient();

    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 500);
    this.camera.position.set(12, 10, 12);
    this.camera.lookAt(0, -3, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.localClippingEnabled = true;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, -3, 0);
    this.controls.minDistance = 5;
    this.controls.maxDistance = 50;
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    };

    this.clippingPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), this.clippingCurrent);

    this.strataGroup = new THREE.Group();
    this.artifactGroup = new THREE.Group();
    this.ringGroup = new THREE.Group();
    this.particleSystem = new THREE.Points();

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupLights();
    this.buildStrata();
    this.buildArtifacts();
    this.buildParticles();
    this.setupResize(container);
    this.setupInteraction();

    this.scene.add(this.strataGroup);
    this.scene.add(this.artifactGroup);
    this.scene.add(this.ringGroup);
    this.scene.add(this.particleSystem);

    this.animate();
  }

  private createSkyGradient(): THREE.Color {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#f5e6d3');
    grad.addColorStop(1, '#d6c0a0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 2, 512);
    const tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    const bg = new THREE.Color(0xf5e6d3);
    return bg;
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xfff5e6, 0.6);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xfff8f0, 0.9);
    dirLight.position.set(8, 15, 6);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.left = -15;
    dirLight.shadow.camera.right = 15;
    dirLight.shadow.camera.top = 15;
    dirLight.shadow.camera.bottom = -15;
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xd4c4a8, 0.3);
    fillLight.position.set(-5, 8, -3);
    this.scene.add(fillLight);
  }

  private buildStrata(): void {
    const strata = this.dataLoader.getStrata();
    const depths = this.dataLoader.getAllComputedDepths();

    strata.forEach((s: Stratum, idx: number) => {
      const depth = depths[idx];
      const thickness = depth.bottom - depth.top;
      const geometry = new THREE.BoxGeometry(SITE_SIZE, thickness, SITE_SIZE);
      const color = new THREE.Color(s.color);
      const material = new THREE.MeshPhysicalMaterial({
        color: color,
        transparent: true,
        opacity: 0.55,
        roughness: 0.85,
        metalness: 0.05,
        side: THREE.DoubleSide,
        clippingPlanes: [this.clippingPlane],
        clipShadows: true,
        depthWrite: false
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = -(depth.top + thickness / 2);
      mesh.userData = { type: 'stratum', stratumId: s.id, index: idx };
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.strataGroup.add(mesh);

      const edges = new THREE.EdgesGeometry(geometry);
      const lineMat = new THREE.LineBasicMaterial({
        color: color.clone().multiplyScalar(0.7),
        transparent: true,
        opacity: 0.4,
        clippingPlanes: [this.clippingPlane]
      });
      const line = new THREE.LineSegments(edges, lineMat);
      line.position.copy(mesh.position);
      this.strataGroup.add(line);
    });

    const groundGeo = new THREE.PlaneGeometry(SITE_SIZE * 1.5, SITE_SIZE * 1.5);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xd2b48c,
      roughness: 1.0,
      metalness: 0.0
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.01;
    ground.receiveShadow = true;
    this.strataGroup.add(ground);
  }

  private selectLODDetail(count: number): number {
    for (const lod of this.lodLevels) {
      if (count <= lod.threshold) return lod.detail;
    }
    return 4;
  }

  private buildArtifacts(): void {
    const artifacts = this.dataLoader.getArtifacts();
    const detail = this.selectLODDetail(artifacts.length);
    const artifactGeo = new THREE.SphereGeometry(0.18, detail, detail);
    const ringGeo = new THREE.TorusGeometry(RING_RADIUS, 0.02, 8, 32);

    artifacts.forEach((a: Artifact) => {
      const pos = this.dataLoader.getArtifactWorldPosition(a);
      const stratum = this.dataLoader.getStrata().find(s => s.id === a.stratumId);
      const stratumColor = stratum ? new THREE.Color(stratum.color) : new THREE.Color(0x888888);

      const mat = new THREE.MeshPhysicalMaterial({
        color: stratumColor.clone().lerp(new THREE.Color(0xffffff), 0.3),
        roughness: 0.5,
        metalness: 0.2,
        transparent: true,
        opacity: 0.9,
        clippingPlanes: [this.clippingPlane]
      });

      const mesh = new THREE.Mesh(artifactGeo, mat);
      mesh.position.set(pos.x, pos.y, pos.z);
      mesh.userData = { type: 'artifact', artifactId: a.id, artifact: a };
      mesh.castShadow = true;
      this.artifactMeshes.set(a.id, mesh);
      this.artifactGroup.add(mesh);

      const ringMat = new THREE.MeshBasicMaterial({
        color: RING_COLOR,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        clippingPlanes: [this.clippingPlane]
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(pos.x, pos.y - 0.22, pos.z);
      ring.rotation.x = Math.PI / 2;
      ring.userData = { type: 'ring', artifactId: a.id };
      this.ringMeshes.set(a.id, ring);
      this.ringGroup.add(ring);
    });
  }

  private buildParticles(): void {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const depths = this.dataLoader.getAllComputedDepths();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * SITE_SIZE;
      const depthIdx = Math.floor(Math.random() * depths.length);
      const d = depths[depthIdx];
      positions[i * 3 + 1] = -(d.top + Math.random() * (d.bottom - d.top));
      positions[i * 3 + 2] = (Math.random() - 0.5) * SITE_SIZE;

      const strata = this.dataLoader.getStrata();
      const s = strata[depthIdx];
      const c = new THREE.Color(s ? s.color : '#888888');
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.04,
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      clippingPlanes: [this.clippingPlane],
      depthWrite: false
    });

    this.particleSystem = new THREE.Points(geo, mat);
  }

  public setClippingDepth(sliderValue: number): void {
    const depth = this.dataLoader.sliderValueToDepth(sliderValue);
    this.clippingAnimFrom = this.clippingCurrent;
    this.clippingTarget = depth;
    this.clippingAnimStart = performance.now();
    this.isClippingAnimating = true;
  }

  private updateClippingAnimation(): void {
    if (!this.isClippingAnimating) return;
    const elapsed = performance.now() - this.clippingAnimStart;
    const t = Math.min(elapsed / CLIP_ANIM_DURATION, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    this.clippingCurrent = this.clippingAnimFrom + (this.clippingTarget - this.clippingAnimFrom) * eased;
    this.clippingPlane.constant = this.clippingCurrent;
    if (t >= 1) {
      this.isClippingAnimating = false;
      this.clippingCurrent = this.clippingTarget;
    }
  }

  public filterArtifactsByYearRange(minYear: number, maxYear: number): void {
    const visibleIds = new Set(
      this.dataLoader.getArtifactsByYearRange(minYear, maxYear).map(a => a.id)
    );
    this.artifactMeshes.forEach((mesh, id) => {
      const targetOpacity = visibleIds.has(id) ? 0.9 : 0.08;
      (mesh.material as THREE.MeshPhysicalMaterial).opacity = targetOpacity;
      mesh.visible = true;
    });
    this.ringMeshes.forEach((mesh, id) => {
      mesh.visible = visibleIds.has(id);
    });
  }

  public filterArtifactsByCategory(category: string): void {
    const artifacts = this.dataLoader.getArtifacts(category);
    const visibleIds = new Set(artifacts.map(a => a.id));
    this.artifactMeshes.forEach((mesh, id) => {
      mesh.visible = visibleIds.has(id);
    });
    this.ringMeshes.forEach((mesh, id) => {
      mesh.visible = visibleIds.has(id);
    });
  }

  public flyToArtifact(artifactId: string): void {
    const mesh = this.artifactMeshes.get(artifactId);
    if (!mesh) return;
    const targetPos = mesh.position.clone();
    const cameraOffset = new THREE.Vector3(3, 2, 3);
    const newCameraPos = targetPos.clone().add(cameraOffset);

    this.highlightedArtifactId = artifactId;
    this.ringPulseAnimations.set(artifactId, { start: performance.now() });

    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const startTime = performance.now();

    const animateFly = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / FLY_DURATION, 1);
      const eased = 1 - Math.pow(1 - t, 3);

      this.camera.position.lerpVectors(startPos, newCameraPos, eased);
      this.controls.target.lerpVectors(startTarget, targetPos, eased);
      this.controls.update();

      if (t < 1) requestAnimationFrame(animateFly);
    };
    animateFly();
  }

  private updateRingPulse(): void {
    const now = performance.now();
    this.ringPulseAnimations.forEach((anim, id) => {
      const ring = this.ringMeshes.get(id);
      if (!ring) return;
      const elapsed = now - anim.start;
      const t = elapsed / RING_PULSE_DURATION;
      if (t > 1) {
        this.ringPulseAnimations.delete(id);
        if (ring.material instanceof THREE.MeshBasicMaterial) {
          ring.material.opacity = 0.7;
        }
        const s = 1;
        ring.scale.set(s, s, s);
        return;
      }
      const pulse = 1 + 0.5 * Math.sin(t * Math.PI * 3) * (1 - t);
      ring.scale.set(pulse, pulse, pulse);
      if (ring.material instanceof THREE.MeshBasicMaterial) {
        ring.material.opacity = 0.7 + 0.3 * Math.sin(t * Math.PI * 2);
      }
    });
  }

  private setupInteraction(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('click', (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.artifactGroup.children, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        if (hit.userData.type === 'artifact' && hit.userData.artifact) {
          if (this.onArtifactSelect) {
            this.onArtifactSelect(hit.userData.artifact as Artifact);
          }
        }
      }
    });

    canvas.addEventListener('mousemove', (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.ringGroup.children, false);
      canvas.style.cursor = intersects.length > 0 ? 'pointer' : 'default';
    });
  }

  public setOnArtifactSelect(cb: ArtifactSelectCallback): void {
    this.onArtifactSelect = cb;
  }

  private setupResize(container: HTMLElement): void {
    window.addEventListener('resize', () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    this.controls.update();
    this.updateClippingAnimation();
    this.updateRingPulse();

    const time = this.clock.getElapsedTime();
    const positions = this.particleSystem.geometry.attributes.position;
    if (positions instanceof THREE.BufferAttribute) {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const y = positions.getY(i);
        positions.setY(i, y + Math.sin(time * 0.3 + i * 0.1) * 0.001);
      }
      positions.needsUpdate = true;
    }

    this.renderer.render(this.scene, this.camera);
  };

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public dispose(): void {
    this.renderer.dispose();
    this.controls.dispose();
    this.strataGroup.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }
}
