import * as THREE from 'three';
import { SoundSource } from '../audio/AudioEngine';

const GRID_SIZE = 30;
const GRID_DIVISIONS = 15;
const RIPPLE_RES = 40;
const RIPPLE_OFFSET_Y = 0.5;
const SPHERE_RADIUS = 0.6;

interface SphereEntry {
  group: THREE.Group;
  mesh: THREE.Mesh;
  glow: THREE.Mesh;
  light: THREE.PointLight;
  line: THREE.Line;
  ring: THREE.Mesh | null;
  spawnTime: number;
}

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private groundGrid: THREE.GridHelper;
  private groundPlane: THREE.Mesh;
  private rippleMesh: THREE.Mesh | null = null;
  private rippleWireframe: THREE.LineSegments | null = null;
  private rippleGeometry: THREE.PlaneGeometry;
  private rippleTime = 0;
  private lastRippleUpdate = 0;
  private rippleInterval = 1000 / 30;

  private animationId: number | null = null;
  private clock = new THREE.Clock();

  private onSphereClick: ((id: string) => void) | null = null;
  private onGroundClick: ((point: THREE.Vector3) => void) | null = null;
  private onSphereDragEnd: ((id: string, pos: THREE.Vector3) => void) | null = null;

  private sphereGroup: THREE.Group;
  private sphereMap: Map<string, SphereEntry> = new Map();
  private selectedId: string | null = null;

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  private cameraTarget = new THREE.Vector3(0, 0, 0);
  private spherical = new THREE.Spherical(15, Math.PI / 3.5, 0);
  private targetSpherical = new THREE.Spherical(15, Math.PI / 3.5, 0);
  private targetCameraTarget = new THREE.Vector3(0, 0, 0);

  private draggingCamera = false;
  private panningCamera = false;
  private prevMouse = { x: 0, y: 0 };
  private mouseDownPos = { x: 0, y: 0 };
  private clickMoved = false;

  private draggingSphere: string | null = null;
  private dragStartX = 0;
  private dragStartZ = 0;
  private dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private dragIntersect = new THREE.Vector3();
  private dragStartIntersect = new THREE.Vector3();
  private dragStartSpherePos = new THREE.Vector3();

  private getSourcesCallback: () => SoundSource[];
  private computeAmplitudeCallback: (
    sources: SoundSource[],
    x: number,
    z: number,
    t: number
  ) => number;

  constructor(
    container: HTMLElement,
    computeAmplitude: (sources: SoundSource[], x: number, z: number, t: number) => number,
    getSources: () => SoundSource[]
  ) {
    this.getSourcesCallback = getSources;
    this.computeAmplitudeCallback = computeAmplitude;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a);
    this.scene.fog = new THREE.Fog(0x0f172a, 25, 60);

    this.camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      200
    );
    this.updateCameraFromSpherical();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.setupLights();
    this.setupGround();

    this.sphereGroup = new THREE.Group();
    this.scene.add(this.sphereGroup);

    this.rippleGeometry = new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE, RIPPLE_RES, RIPPLE_RES);
    this.rippleGeometry.rotateX(-Math.PI / 2);
    this.createRippleMesh();

    this.setupInputs(container);
    window.addEventListener('resize', () => this.onResize(container));
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x6b84a8, 0.7);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(8, 15, 6);
    dirLight.castShadow = false;
    this.scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.25);
    rimLight.position.set(-10, 5, -10);
    this.scene.add(rimLight);
  }

  private setupGround(): void {
    const groundGeo = new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE, 1, 1);
    const groundMat = new THREE.MeshBasicMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.6,
    });
    this.groundPlane = new THREE.Mesh(groundGeo, groundMat);
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.groundPlane.name = 'groundPlane';
    this.scene.add(this.groundPlane);

    this.groundGrid = new THREE.GridHelper(GRID_SIZE, GRID_DIVISIONS, 0x94a3b8, 0x94a3b8);
    const gridMat = this.groundGrid.material as THREE.Material;
    gridMat.transparent = true;
    gridMat.opacity = 0.35;
    this.scene.add(this.groundGrid);

    const borderGeo = new THREE.EdgesGeometry(
      new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE)
    );
    const borderMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.4,
    });
    const border = new THREE.LineSegments(borderGeo, borderMat);
    border.rotation.x = -Math.PI / 2;
    this.scene.add(border);
  }

  private createRippleMesh(): void {
    const pos = this.rippleGeometry.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      colors[i * 3] = 0.22;
      colors[i * 3 + 1] = 0.74;
      colors[i * 3 + 2] = 0.97;
    }
    this.rippleGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(colors, 3)
    );

    const rippleMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.rippleMesh = new THREE.Mesh(this.rippleGeometry, rippleMat);
    this.rippleMesh.position.y = RIPPLE_OFFSET_Y;
    this.rippleMesh.renderOrder = 1;
    this.scene.add(this.rippleMesh);

    const wireGeo = new THREE.WireframeGeometry(this.rippleGeometry);
    const wireMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.12,
    });
    this.rippleWireframe = new THREE.LineSegments(wireGeo, wireMat);
    this.rippleWireframe.position.y = RIPPLE_OFFSET_Y;
    this.rippleWireframe.renderOrder = 2;
    this.scene.add(this.rippleWireframe);
  }

  private updateCameraFromSpherical(): void {
    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.cameraTarget).add(offset);
    this.camera.lookAt(this.cameraTarget);
  }

  private setupInputs(container: HTMLElement): void {
    const dom = this.renderer.domElement;

    const getMouse = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      this.mouse.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
    };

    dom.addEventListener('mousedown', (e: MouseEvent) => {
      this.prevMouse = { x: e.clientX, y: e.clientY };
      this.mouseDownPos = { x: e.clientX, y: e.clientY };
      this.clickMoved = false;
      getMouse(e);

      if (e.button === 0) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const sphereMeshes: THREE.Object3D[] = [];
        this.sphereMap.forEach((entry) => sphereMeshes.push(entry.mesh));
        const hits = this.raycaster.intersectObjects(sphereMeshes, false);
        if (hits.length > 0) {
          const hitMesh = hits[0].object as THREE.Mesh;
          let foundId: string | null = null;
          for (const [id, entry] of this.sphereMap) {
            if (entry.mesh === hitMesh) {
              foundId = id;
              break;
            }
          }
          if (foundId) {
            const entry = this.sphereMap.get(foundId);
            if (entry) {
              this.draggingSphere = foundId;
              this.dragPlane.set(
                new THREE.Vector3(0, 1, 0),
                -entry.mesh.getWorldPosition(new THREE.Vector3()).y
              );
              this.raycaster.ray.intersectPlane(
                this.dragPlane,
                this.dragStartIntersect
              );
              this.dragStartSpherePos.copy(entry.group.position);
            }
            return;
          }
        }
        this.draggingCamera = true;
      } else if (e.button === 2) {
        this.panningCamera = true;
      }
    });

    window.addEventListener('mousemove', (e: MouseEvent) => {
      const dx = e.clientX - this.prevMouse.x;
      const dy = e.clientY - this.prevMouse.y;
      const moveDist = Math.sqrt(
        Math.pow(e.clientX - this.mouseDownPos.x, 2) +
          Math.pow(e.clientY - this.mouseDownPos.y, 2)
      );
      if (moveDist > 4) this.clickMoved = true;

      if (this.draggingSphere) {
        const rect = container.getBoundingClientRect();
        this.mouse.set(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        this.raycaster.setFromCamera(this.mouse, this.camera);

        if (this.raycaster.ray.intersectPlane(this.dragPlane, this.dragIntersect)) {
          const delta = new THREE.Vector3().subVectors(
            this.dragIntersect,
            this.dragStartIntersect
          );
          const entry = this.sphereMap.get(this.draggingSphere);
          if (entry) {
            const newX = Math.max(-14.5, Math.min(14.5, this.dragStartSpherePos.x + delta.x));
            const newZ = Math.max(-14.5, Math.min(14.5, this.dragStartSpherePos.z + delta.z));
            entry.group.position.x = newX;
            entry.group.position.z = newZ;
            this.updateSphereLine(this.draggingSphere);
          }
        }
      } else if (this.draggingCamera) {
        this.targetSpherical.theta -= dx * 0.005;
        this.targetSpherical.phi = Math.max(
          0.15,
          Math.min(Math.PI * 0.48, this.targetSpherical.phi + dy * 0.005)
        );
      } else if (this.panningCamera) {
        const right = new THREE.Vector3();
        const up = new THREE.Vector3();
        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        right.crossVectors(forward, this.camera.up).normalize();
        up.copy(this.camera.up);

        const panFactor = this.targetSpherical.radius * 0.002;
        this.targetCameraTarget.addScaledVector(right, -dx * panFactor);
        this.targetCameraTarget.addScaledVector(up, dy * panFactor);
      }

      this.prevMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', (e: MouseEvent) => {
      if (this.draggingSphere) {
        const entry = this.sphereMap.get(this.draggingSphere);
        if (entry && this.onSphereDragEnd) {
          this.onSphereDragEnd(this.draggingSphere, entry.group.position.clone());
        }
        this.draggingSphere = null;
      }

      if (e.button === 0 && !this.clickMoved && !this.draggingSphere) {
        const rect = container.getBoundingClientRect();
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          getMouse(e);
          this.raycaster.setFromCamera(this.mouse, this.camera);

          const sphereMeshes: THREE.Object3D[] = [];
          this.sphereMap.forEach((entry) => sphereMeshes.push(entry.mesh));
          const sphereHits = this.raycaster.intersectObjects(sphereMeshes, false);
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
          if (
            this.raycaster.ray.intersectPlane(groundPlane, point) &&
            Math.abs(point.x) <= GRID_SIZE / 2 &&
            Math.abs(point.z) <= GRID_SIZE / 2
          ) {
            if (this.onGroundClick) this.onGroundClick(point);
          }
        }
      }

      this.draggingCamera = false;
      this.panningCamera = false;
    });

    dom.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const factor = 1 + e.deltaY * 0.001;
      this.targetSpherical.radius = Math.max(
        4,
        Math.min(40, this.targetSpherical.radius * factor)
      );
    }, { passive: false });

    dom.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault();
    });
  }

  public addSphere(source: SoundSource): void {
    const color = new THREE.Color(source.color);

    const group = new THREE.Group();
    group.position.set(source.position.x, source.position.y, source.position.z);

    const geo = new THREE.SphereGeometry(SPHERE_RADIUS, 32, 32);
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.35,
      roughness: 0.25,
      metalness: 0.15,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = source.id;
    group.add(mesh);

    const glowGeo = new THREE.SphereGeometry(SPHERE_RADIUS * 1.5, 24, 24);
    const glowMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    group.add(glow);

    const light = new THREE.PointLight(color, 0.4, 6, 2);
    light.position.set(0, 0, 0);
    group.add(light);

    const linePoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -source.position.y, 0),
    ];
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
    const lineMat = new THREE.LineBasicMaterial({
      color: color.clone().lerp(new THREE.Color(0xffffff), 0.5),
      transparent: true,
      opacity: 0.3,
    });
    const line = new THREE.Line(lineGeo, lineMat);
    group.add(line);

    group.scale.set(0.01, 0.01, 0.01);
    this.sphereGroup.add(group);

    this.sphereMap.set(source.id, {
      group,
      mesh,
      glow,
      light,
      line,
      ring: null,
      spawnTime: performance.now(),
    });
  }

  public removeSphere(id: string): void {
    const entry = this.sphereMap.get(id);
    if (!entry) return;

    this.sphereGroup.remove(entry.group);
    entry.mesh.geometry.dispose();
    (entry.mesh.material as THREE.Material).dispose();
    entry.glow.geometry.dispose();
    (entry.glow.material as THREE.Material).dispose();
    entry.light.dispose();
    entry.line.geometry.dispose();
    (entry.line.material as THREE.Material).dispose();
    if (entry.ring) {
      entry.ring.geometry.dispose();
      (entry.ring.material as THREE.Material).dispose();
    }

    this.sphereMap.delete(id);
    if (this.selectedId === id) this.selectedId = null;
  }

  public selectSphere(id: string | null): void {
    if (this.selectedId && this.selectedId !== id) {
      const prev = this.sphereMap.get(this.selectedId);
      if (prev) {
        prev.light.intensity = 0.4;
        (prev.glow.material as THREE.MeshBasicMaterial).opacity = 0.15;
        if (prev.ring) {
          prev.group.remove(prev.ring);
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

        if (!entry.ring) {
          const ringColor = (entry.mesh.material as THREE.MeshStandardMaterial).color;
          const ringGeo = new THREE.TorusGeometry(SPHERE_RADIUS * 1.4, 0.035, 16, 64);
          const ringMat = new THREE.MeshBasicMaterial({
            color: ringColor.clone().lerp(new THREE.Color(0xffffff), 0.3),
            transparent: true,
            opacity: 0.7,
          });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.rotation.x = Math.PI / 2;
          entry.group.add(ring);
          entry.ring = ring;
        }
      }
    }
  }

  public updateSpherePosition(id: string, x: number, y: number, z: number): void {
    const entry = this.sphereMap.get(id);
    if (!entry) return;
    entry.group.position.set(x, y, z);
    this.updateSphereLine(id);
  }

  private updateSphereLine(id: string): void {
    const entry = this.sphereMap.get(id);
    if (!entry) return;
    const y = entry.group.position.y;
    const pts = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -y, 0),
    ];
    entry.line.geometry.dispose();
    entry.line.geometry = new THREE.BufferGeometry().setFromPoints(pts);
  }

  public setClickHandlers(
    onSphereClick: (id: string) => void,
    onGroundClick: (point: THREE.Vector3) => void,
    onSphereDragEnd?: (id: string, pos: THREE.Vector3) => void
  ): void {
    this.onSphereClick = onSphereClick;
    this.onGroundClick = onGroundClick;
    if (onSphereDragEnd) this.onSphereDragEnd = onSphereDragEnd;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private updateRippleSurface(): void {
    const sources = this.getSourcesCallback();
    const pos = this.rippleGeometry.attributes.position;
    const colors = this.rippleGeometry.attributes.color as THREE.BufferAttribute;

    const half = GRID_SIZE / 2;
    const step = GRID_SIZE / RIPPLE_RES;
    const index = 0;

    const c1 = new THREE.Color(0x1e3a5f);
    const c2 = new THREE.Color(0x38bdf8);
    const c3 = new THREE.Color(0x34d399);

    for (let i = 0; i <= RIPPLE_RES; i++) {
      for (let j = 0; j <= RIPPLE_RES; j++) {
        const idx = i * (RIPPLE_RES + 1) + j;
        const x = -half + j * step;
        const z = -half + i * step;

        const amplitude = this.computeAmplitudeCallback(sources, x, z, this.rippleTime);
        pos.setY(idx, amplitude);

        let finalColor: THREE.Color;
        if (amplitude < -0.4) {
          const t = (amplitude + 0.8) / 0.4;
          finalColor = c2.clone().lerp(c1, Math.max(0, Math.min(1, t)));
        } else if (amplitude > 0.4) {
          const t = (amplitude - 0.4) / 0.4;
          finalColor = c2.clone().lerp(c3, Math.max(0, Math.min(1, t)));
        } else {
          const t = (amplitude + 0.4) / 0.8;
          finalColor = c1.clone().lerp(c2, Math.max(0, Math.min(1, t)));
          if (t > 0.5) {
            finalColor = c2.clone().lerp(c3, Math.max(0, Math.min(1, (t - 0.5) * 2)));
          }
        }

        colors.setXYZ(idx, finalColor.r, finalColor.g, finalColor.b);
      }
    }

    pos.needsUpdate = true;
    colors.needsUpdate = true;
    this.rippleGeometry.computeVertexNormals();

    if (this.rippleWireframe) {
      this.scene.remove(this.rippleWireframe);
      const wireGeo = new THREE.WireframeGeometry(this.rippleGeometry);
      this.rippleWireframe.geometry.dispose();
      this.rippleWireframe.geometry = wireGeo;
      this.rippleWireframe.position.y = RIPPLE_OFFSET_Y;
      this.scene.add(this.rippleWireframe);
    }
  }

  private updateSpheres(delta: number, now: number): void {
    this.sphereMap.forEach((entry) => {
      const elapsed = (now - entry.spawnTime) / 1000;
      if (elapsed < 0.4) {
        const t = elapsed / 0.4;
        const easeOut = 1 - Math.pow(1 - t, 3);
        const overshoot = easeOut + Math.sin(t * Math.PI) * 0.1;
        const s = Math.max(0.01, overshoot);
        entry.group.scale.set(s, s, s);
      } else if (entry.group.scale.x !== 1) {
        entry.group.scale.set(1, 1, 1);
      }

      if (entry.ring) {
        entry.ring.rotation.z += delta * 1.5;
        const pulse = 1 + Math.sin(now * 0.004) * 0.05;
        entry.ring.scale.set(pulse, pulse, pulse);
      }

      const breathe = 1 + Math.sin(now * 0.002 + entry.group.position.x) * 0.03;
      entry.glow.scale.set(breathe, breathe, breathe);
    });
  }

  public startRenderLoop(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      const delta = this.clock.getDelta();
      const now = performance.now();
      this.rippleTime += delta;

      const lerpFactor = Math.min(1, delta * 6);
      this.spherical.theta = this.lerp(this.spherical.theta, this.targetSpherical.theta, lerpFactor);
      this.spherical.phi = this.lerp(this.spherical.phi, this.targetSpherical.phi, lerpFactor);
      this.spherical.radius = this.lerp(this.spherical.radius, this.targetSpherical.radius, lerpFactor);
      this.cameraTarget.lerp(this.targetCameraTarget, lerpFactor);
      this.updateCameraFromSpherical();

      this.updateSpheres(delta, now);

      if (now - this.lastRippleUpdate > this.rippleInterval) {
        this.updateRippleSurface();
        this.lastRippleUpdate = now;
      }

      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  public stopRenderLoop(): void {
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

  public getSpherePosition(id: string): { x: number; y: number; z: number } | null {
    const entry = this.sphereMap.get(id);
    if (!entry) return null;
    return {
      x: entry.group.position.x,
      y: entry.group.position.y,
      z: entry.group.position.z,
    };
  }

  public dispose(): void {
    this.stopRenderLoop();
    this.sphereMap.forEach((_, id) => this.removeSphere(id));
    this.renderer.dispose();
  }
}
