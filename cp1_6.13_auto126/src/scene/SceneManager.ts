import * as THREE from 'three';
import { SoundSource } from '../audio/AudioEngine';

const GRID_SIZE = 30;
const GRID_DIVISIONS = 15;
const RIPPLE_RES = 40;
const RIPPLE_OFFSET_Y = 0.5;

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private groundGrid: THREE.GridHelper;
  private rippleMesh: THREE.Mesh | null = null;
  private rippleWireframe: THREE.LineSegments | null = null;
  private rippleGeometry: THREE.PlaneGeometry;
  private rippleTime = 0;
  private animationId: number | null = null;
  private onSphereClick: ((id: string) => void) | null = null;
  private onGroundClick: ((point: THREE.Vector3) => void) | null = null;
  private sphereGroup: THREE.Group;
  private sphereMap: Map<string, {
    mesh: THREE.Mesh;
    glow: THREE.Mesh;
    light: THREE.PointLight;
    line: THREE.Line;
    ring: THREE.Mesh | null;
  }> = new Map();
  private selectedId: string | null = null;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private clock = new THREE.Clock();
  private isDragging = false;
  private dragSphereId: string | null = null;
  private dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private dragOffset = new THREE.Vector3();
  private intersectionPoint = new THREE.Vector3();

  constructor(
    container: HTMLElement,
    private computeAmplitude: (sources: SoundSource[], x: number, z: number, t: number) => number,
    private getSources: () => SoundSource[]
  ) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a);
    this.scene.fog = new THREE.FogExp2(0x0f172a, 0.02);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 8, 12);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    const ambient = new THREE.AmbientLight(0x4466aa, 0.6);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    this.scene.add(dirLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x1e3a5f, 0.3);
    this.scene.add(hemiLight);

    this.groundGrid = new THREE.GridHelper(GRID_SIZE, GRID_DIVISIONS, 0x94a3b8, 0x94a3b8);
    (this.groundGrid.material as THREE.Material).opacity = 0.4;
    (this.groundGrid.material as THREE.Material).transparent = true;
    this.scene.add(this.groundGrid);

    this.sphereGroup = new THREE.Group();
    this.scene.add(this.sphereGroup);

    this.rippleGeometry = new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE, RIPPLE_RES, RIPPLE_RES);
    this.rippleGeometry.rotateX(-Math.PI / 2);
    this.createRippleMesh();

    this.setupControls(container);
    this.setupEvents(container);

    window.addEventListener('resize', () => this.onResize(container));
  }

  private createRippleMesh(): void {
    const positions = this.rippleGeometry.attributes.position;

    const colors = new Float32Array(positions.count * 3);
    for (let i = 0; i < positions.count; i++) {
      colors[i * 3] = 0.22;
      colors[i * 3 + 1] = 0.74;
      colors[i * 3 + 2] = 0.97;
    }
    this.rippleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const rippleMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });

    this.rippleMesh = new THREE.Mesh(this.rippleGeometry, rippleMat);
    this.rippleMesh.position.y = RIPPLE_OFFSET_Y;
    this.scene.add(this.rippleMesh);

    const wireGeo = new THREE.WireframeGeometry(this.rippleGeometry);
    const wireMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.2,
    });
    this.rippleWireframe = new THREE.LineSegments(wireGeo, wireMat);
    this.rippleWireframe.position.y = RIPPLE_OFFSET_Y;
    this.scene.add(this.rippleWireframe);
  }

  private setupControls(container: HTMLElement): void {
    let isRightDrag = false;
    let isLeftDrag = false;
    let prevMouse = { x: 0, y: 0 };
    let spherical = new THREE.Spherical().setFromVector3(this.camera.position);
    let target = new THREE.Vector3(0, 0, 0);

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 2) {
        isRightDrag = true;
      } else if (e.button === 0) {
        isLeftDrag = true;
        this.isDragging = true;
      }
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;

      if (isRightDrag) {
        const right = new THREE.Vector3();
        const up = new THREE.Vector3();
        this.camera.getWorldDirection(new THREE.Vector3());
        right.crossVectors(this.camera.up, new THREE.Vector3().subVectors(this.camera.position, target).normalize()).normalize();
        up.copy(this.camera.up);
        target.add(right.multiplyScalar(dx * 0.02));
        target.add(up.multiplyScalar(-dy * 0.02));
      } else if (isLeftDrag && !this.dragSphereId) {
        spherical.theta -= dx * 0.005;
        spherical.phi = Math.max(0.1, Math.min(Math.PI * 0.45, spherical.phi - dy * 0.005));
      }

      if (this.dragSphereId && isLeftDrag) {
        this.mouse.set(
          (e.clientX / container.clientWidth) * 2 - 1,
          -(e.clientY / container.clientHeight) * 2 + 1
        );
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const ray = this.raycaster.ray;
        if (ray.intersectPlane(this.dragPlane, this.intersectionPoint)) {
          const entry = this.sphereMap.get(this.dragSphereId);
          if (entry) {
            const newX = Math.max(-14, Math.min(14, this.intersectionPoint.x + this.dragOffset.x));
            const newZ = Math.max(-14, Math.min(14, this.intersectionPoint.z + this.dragOffset.z));
            entry.mesh.position.x = newX;
            entry.mesh.position.z = newZ;
            entry.light.position.copy(entry.mesh.position);
            this.updateSphereLine(this.dragSphereId);
          }
        }
      }

      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 2) isRightDrag = false;
      if (e.button === 0) {
        isLeftDrag = false;
        if (this.dragSphereId) {
          this.dragSphereId = null;
        }
        this.isDragging = false;
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      spherical.radius = Math.max(3, Math.min(30, spherical.radius + e.deltaY * 0.01));
    };

    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private setupEvents(container: HTMLElement): void {
    container.addEventListener('click', (e: MouseEvent) => {
      if (this.isDragging) return;

      this.mouse.set(
        (e.clientX / container.clientWidth) * 2 - 1,
        -(e.clientY / container.clientHeight) * 2 + 1
      );
      this.raycaster.setFromCamera(this.mouse, this.camera);

      const sphereMeshes = Array.from(this.sphereMap.values()).map((s) => s.mesh);
      const sphereHits = this.raycaster.intersectObjects(sphereMeshes);
      if (sphereHits.length > 0) {
        const hitMesh = sphereHits[0].object as THREE.Mesh;
        for (const [id, entry] of this.sphereMap) {
          if (entry.mesh === hitMesh) {
            if (this.onSphereClick) this.onSphereClick(id);
            return;
          }
        }
        return;
      }

      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const point = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(groundPlane, point);
      if (point && this.onGroundClick) {
        this.onGroundClick(point);
      }
    });

    container.addEventListener('dblclick', (e: MouseEvent) => {
      this.mouse.set(
        (e.clientX / container.clientWidth) * 2 - 1,
        -(e.clientY / container.clientHeight) * 2 + 1
      );
      this.raycaster.setFromCamera(this.mouse, this.camera);

      const sphereMeshes = Array.from(this.sphereMap.values()).map((s) => s.mesh);
      const sphereHits = this.raycaster.intersectObjects(sphereMeshes);
      if (sphereHits.length > 0) {
        const hitMesh = sphereHits[0].object as THREE.Mesh;
        for (const [id, entry] of this.sphereMap) {
          if (entry.mesh === hitMesh) {
            this.dragSphereId = id;
            this.dragPlane.set(new THREE.Vector3(0, 1, 0), -entry.mesh.position.y);
            this.dragOffset.copy(entry.mesh.position).sub(
              this.raycaster.ray.intersectPlane(
                this.dragPlane,
                new THREE.Vector3()
              )!
            );
            break;
          }
        }
      }
    });
  }

  addSphere(source: SoundSource): void {
    const color = new THREE.Color(source.color);

    const geo = new THREE.SphereGeometry(0.6, 32, 32);
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.3,
      roughness: 0.3,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(source.position.x, source.position.y, source.position.z);
    mesh.scale.set(0.01, 0.01, 0.01);
    this.sphereGroup.add(mesh);

    const glowGeo = new THREE.SphereGeometry(0.9, 24, 24);
    const glowMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.15,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.copy(mesh.position);
    this.sphereGroup.add(glow);

    const light = new THREE.PointLight(color, 0.4, 5);
    light.position.copy(mesh.position);
    this.sphereGroup.add(light);

    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(source.position.x, source.position.y, source.position.z),
      new THREE.Vector3(source.position.x, 0, source.position.z),
    ]);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
    });
    const line = new THREE.Line(lineGeo, lineMat);
    this.sphereGroup.add(line);

    this.sphereMap.set(source.id, { mesh, glow, light, line, ring: null });

    const startTime = performance.now();
    const animateIn = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const t = Math.min(elapsed / 0.4, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const s = ease;
      mesh.scale.set(s, s, s);
      glow.scale.set(s, s, s);
      if (t < 1) requestAnimationFrame(animateIn);
    };
    animateIn();
  }

  removeSphere(id: string): void {
    const entry = this.sphereMap.get(id);
    if (!entry) return;
    this.sphereGroup.remove(entry.mesh);
    this.sphereGroup.remove(entry.glow);
    this.sphereGroup.remove(entry.light);
    this.sphereGroup.remove(entry.line);
    if (entry.ring) this.sphereGroup.remove(entry.ring);
    entry.mesh.geometry.dispose();
    (entry.mesh.material as THREE.Material).dispose();
    entry.glow.geometry.dispose();
    (entry.glow.material as THREE.Material).dispose();
    entry.light.dispose();
    entry.line.geometry.dispose();
    (entry.line.material as THREE.Material).dispose();
    this.sphereMap.delete(id);
    if (this.selectedId === id) this.selectedId = null;
  }

  selectSphere(id: string | null): void {
    if (this.selectedId) {
      const prev = this.sphereMap.get(this.selectedId);
      if (prev) {
        prev.light.intensity = 0.4;
        (prev.glow.material as THREE.MeshBasicMaterial).opacity = 0.15;
        if (prev.ring) {
          this.sphereGroup.remove(prev.ring);
          prev.ring.geometry.dispose();
          (prev.ring.material as THREE.Material).dispose();
          prev.ring = null;
        }
      }
    }

    this.selectedId = id;

    if (id) {
      const entry = this.sphereMap.get(id);
      if (entry) {
        entry.light.intensity = 0.8;
        (entry.glow.material as THREE.MeshBasicMaterial).opacity = 0.3;

        const ringGeo = new THREE.TorusGeometry(0.9, 0.02, 16, 64);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.4,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(entry.mesh.position);
        ring.rotation.x = Math.PI / 2;
        this.sphereGroup.add(ring);
        entry.ring = ring;
      }
    }
  }

  updateSpherePosition(id: string, x: number, y: number, z: number): void {
    const entry = this.sphereMap.get(id);
    if (!entry) return;
    entry.mesh.position.set(x, y, z);
    entry.glow.position.set(x, y, z);
    entry.light.position.set(x, y, z);
    if (entry.ring) entry.ring.position.set(x, y, z);
    this.updateSphereLine(id);
  }

  private updateSphereLine(id: string): void {
    const entry = this.sphereMap.get(id);
    if (!entry) return;
    const pos = entry.mesh.position;
    const points = [
      new THREE.Vector3(pos.x, pos.y, pos.z),
      new THREE.Vector3(pos.x, 0, pos.z),
    ];
    entry.line.geometry.dispose();
    entry.line.geometry = new THREE.BufferGeometry().setFromPoints(points);
  }

  setClickHandlers(
    onSphereClick: (id: string) => void,
    onGroundClick: (point: THREE.Vector3) => void
  ): void {
    this.onSphereClick = onSphereClick;
    this.onGroundClick = onGroundClick;
  }

  private updateRippleSurface(): void {
    const sources = this.getSources();
    const positions = this.rippleGeometry.attributes.position;
    const colors = this.rippleGeometry.attributes.color;

    const half = GRID_SIZE / 2;
    const step = GRID_SIZE / RIPPLE_RES;

    for (let i = 0; i <= RIPPLE_RES; i++) {
      for (let j = 0; j <= RIPPLE_RES; j++) {
        const idx = i * (RIPPLE_RES + 1) + j;
        const x = -half + j * step;
        const z = -half + i * step;

        const amplitude = this.computeAmplitude(sources, x, z, this.rippleTime);
        positions.setY(idx, amplitude);

        let r: number, g: number, b: number;
        if (amplitude < -0.4) {
          r = 0.12; g = 0.23; b = 0.37;
        } else if (amplitude > 0.4) {
          r = 0.20; g = 0.83; b = 0.60;
        } else {
          const t = (amplitude + 0.4) / 0.8;
          if (t < 0.5) {
            const f = t * 2;
            r = 0.12 + (0.22 - 0.12) * f;
            g = 0.23 + (0.74 - 0.23) * f;
            b = 0.37 + (0.97 - 0.37) * f;
          } else {
            const f = (t - 0.5) * 2;
            r = 0.22 + (0.20 - 0.22) * f;
            g = 0.74 + (0.83 - 0.74) * f;
            b = 0.97 + (0.60 - 0.97) * f;
          }
        }
        colors.setXYZ(idx, r, g, b);
      }
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;
    this.rippleGeometry.computeVertexNormals();

    if (this.rippleWireframe) {
      this.sphereGroup.parent?.remove(this.rippleWireframe);
      const wireGeo = new THREE.WireframeGeometry(this.rippleGeometry);
      this.rippleWireframe.geometry.dispose();
      this.rippleWireframe.geometry = wireGeo;
      this.rippleWireframe.position.y = RIPPLE_OFFSET_Y;
      this.scene.add(this.rippleWireframe);
    }
  }

  startRenderLoop(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      const delta = this.clock.getDelta();
      this.rippleTime += delta;

      const spherical = new THREE.Spherical().setFromVector3(this.camera.position);
      const radius = spherical.radius;
      const theta = spherical.theta;
      const phi = spherical.phi;
      this.camera.position.setFromSpherical(new THREE.Spherical(radius, phi, theta));
      this.camera.lookAt(0, 0, 0);

      this.updateRippleSurface();
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  stopRenderLoop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private onResize(container: HTMLElement): void {
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  getSphereWorldPosition(id: string): { x: number; y: number; z: number } | null {
    const entry = this.sphereMap.get(id);
    if (!entry) return null;
    return {
      x: entry.mesh.position.x,
      y: entry.mesh.position.y,
      z: entry.mesh.position.z,
    };
  }

  dispose(): void {
    this.stopRenderLoop();
    this.renderer.dispose();
  }
}
