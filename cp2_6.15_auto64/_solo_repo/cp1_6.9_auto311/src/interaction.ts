import * as THREE from 'three';
import { Sandglass, HOULGLASS_CONFIG } from './sandglass';
import { ParticleSystem } from './particles';

export class InteractionController {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private sandglass: Sandglass;
  private particles: ParticleSystem;
  private scene: THREE.Scene;

  private raycaster: THREE.Raycaster;
  private mouseNDC: THREE.Vector2;
  private mouseScreen: { x: number; y: number };

  private isDragging: boolean = false;
  private dragStart: { x: number; y: number };
  private targetYaw: number = 0;
  private targetPitch: number = 0.3;
  private currentYaw: number = 0;
  private currentPitch: number = 0.3;
  private autoYawOffset: number = 0;
  private targetZoom: number = 35;
  private currentZoom: number = 35;

  private lastHoverLocal: { x: number; z: number } | null = null;
  private haloMesh!: THREE.Mesh;

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    sandglass: Sandglass,
    particles: ParticleSystem,
    scene: THREE.Scene
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.sandglass = sandglass;
    this.particles = particles;
    this.scene = scene;
    this.raycaster = new THREE.Raycaster();
    this.mouseNDC = new THREE.Vector2();
    this.mouseScreen = { x: 0, y: 0 };
    this.dragStart = { x: 0, y: 0 };

    this.createHalo();
    this.attachEvents();
  }

  private createHalo() {
    const haloGeo = new THREE.RingGeometry(0.02, 0.35, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xffd27f,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.haloMesh = new THREE.Mesh(haloGeo, haloMat);
    this.haloMesh.visible = false;
    this.haloMesh.rotation.x = -Math.PI / 2;
    this.particles.terrainMesh.add(this.haloMesh);
  }

  private updateHalo(localX: number, localZ: number, height: number) {
    this.haloMesh.position.set(localX, height + 0.02, localZ);
    this.haloMesh.visible = true;
    const scale = 3.5;
    this.haloMesh.scale.set(scale, scale, scale);
    const mat = this.haloMesh.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.65;
  }

  private hideHalo() {
    this.haloMesh.visible = false;
    this.lastHoverLocal = null;
  }

  private attachEvents() {
    const el = this.renderer.domElement;

    el.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.dragStart = { x: e.clientX, y: e.clientY };
      el.style.cursor = 'grabbing';
    });

    window.addEventListener('mouseup', (e) => {
      if (this.isDragging) {
        const dx = Math.abs(e.clientX - this.dragStart.x);
        const dy = Math.abs(e.clientY - this.dragStart.y);
        const wasDrag = dx > 4 || dy > 4;
        if (!wasDrag) {
          this.handleClick(e);
        }
        this.isDragging = false;
        el.style.cursor = 'grab';
      }
    });

    window.addEventListener('mousemove', (e) => {
      this.mouseScreen.x = e.clientX;
      this.mouseScreen.y = e.clientY;
      const rect = el.getBoundingClientRect();
      this.mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (this.isDragging) {
        const dx = e.clientX - this.dragStart.x;
        const dy = e.clientY - this.dragStart.y;
        this.targetYaw -= dx * 0.008;
        this.targetPitch += dy * 0.006;
        this.targetPitch = THREE.MathUtils.clamp(this.targetPitch, -0.9, 1.2);
        this.dragStart = { x: e.clientX, y: e.clientY };
      } else {
        this.handleHover();
      }
    });

    el.addEventListener('mouseleave', () => {
      this.hideHalo();
    });

    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.targetZoom += e.deltaY * 0.015;
      this.targetZoom = THREE.MathUtils.clamp(this.targetZoom, 18, 55);
    }, { passive: false });

    el.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        this.isDragging = true;
        this.dragStart = { x: t.clientX, y: t.clientY };
      }
    }, { passive: true });

    el.addEventListener('touchmove', (e) => {
      if (this.isDragging && e.touches.length === 1) {
        const t = e.touches[0];
        const dx = t.clientX - this.dragStart.x;
        const dy = t.clientY - this.dragStart.y;
        this.targetYaw -= dx * 0.008;
        this.targetPitch += dy * 0.006;
        this.targetPitch = THREE.MathUtils.clamp(this.targetPitch, -0.9, 1.2);
        this.dragStart = { x: t.clientX, y: t.clientY };
      }
    }, { passive: true });

    el.addEventListener('touchend', (e) => {
      if (this.isDragging) {
        this.isDragging = false;
      }
    }, { passive: true });
  }

  private screenToContainerLocal(): THREE.Vector3 | null {
    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    const intersects = this.raycaster.intersectObject(this.particles.terrainMesh, false);
    if (intersects.length > 0) {
      const hit = intersects[0];
      const local = this.sandglass.container.worldToLocal(hit.point.clone());
      return local;
    }

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const dummy = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(plane, dummy)) {
      const local = this.sandglass.container.worldToLocal(dummy.clone());
      const d2 = local.x * local.x + local.z * local.z;
      if (d2 < 6 * 6) return local;
    }
    return null;
  }

  private handleHover() {
    const local = this.screenToContainerLocal();
    if (!local) {
      this.hideHalo();
      return;
    }

    const d2 = local.x * local.x + local.z * local.z;
    const r = 6;
    if (d2 > r * r) {
      this.hideHalo();
      return;
    }

    if (this.sandglass.gravityDirection < 0) {
      const terrainBaseY = -HOULGLASS_CONFIG.height / 2 + 0.12;
      const terrainY = terrainBaseY + this.particles.getTerrainHeightAt(local.x, local.z);
      if (local.y < terrainY + 2.5 && local.y > terrainY - 1) {
        this.updateHalo(local.x, local.z, terrainY - terrainBaseY);
        const dx = this.lastHoverLocal ? local.x - this.lastHoverLocal.x : 0;
        const dz = this.lastHoverLocal ? local.z - this.lastHoverLocal.z : 0;
        const moved = Math.sqrt(dx * dx + dz * dz);
        if (moved > 0.15 || !this.lastHoverLocal) {
          this.particles.raiseTerrain(local.x, local.z, 2, 0.2, 500);
          this.lastHoverLocal = { x: local.x, z: local.z };
        }
      } else {
        this.hideHalo();
      }
    } else {
      this.hideHalo();
    }
  }

  private handleClick(e: MouseEvent) {
    const local = this.screenToContainerLocal();
    if (!local) return;

    if (this.sandglass.gravityDirection < 0) {
      const terrainH = this.particles.getTerrainHeightAt(local.x, local.z);
      const terrainLocalY = -HOULGLASS_CONFIG.height / 2 + 0.12 + terrainH;
      if (local.y < terrainLocalY + 3.5) {
        const count = Math.floor(THREE.MathUtils.randFloat(10, 16));
        this.particles.erupt(local.x, local.z, terrainLocalY, count);
        this.particles.raiseTerrain(local.x, local.z, 2.2, 0.25, 400);
        this.burstHalo();
      }
    }
  }

  private burstHalo() {
    const mat = this.haloMesh.material as THREE.MeshBasicMaterial;
    const halo = this.haloMesh;
    const startS = halo.scale.x;
    const oldOpacity = mat.opacity;
    const startTime = performance.now();
    const duration = 450;
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const tt = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - tt, 3);
      const scale = THREE.MathUtils.lerp(startS, startS * 3.5, eased);
      halo.scale.set(scale, scale, scale);
      mat.opacity = oldOpacity * (1 - tt);
      if (tt < 1) {
        requestAnimationFrame(animate);
      } else {
        mat.opacity = 0.7;
        halo.scale.set(3.5, 3.5, 3.5);
      }
    };
    animate();
  }

  public update(dt: number) {
    this.currentYaw = THREE.MathUtils.lerp(this.currentYaw, this.targetYaw, Math.min(1, dt * 8));
    this.currentPitch = THREE.MathUtils.lerp(this.currentPitch, this.targetPitch, Math.min(1, dt * 8));
    this.currentZoom = THREE.MathUtils.lerp(this.currentZoom, this.targetZoom, Math.min(1, dt * 6));

    const cy = Math.cos(this.currentYaw);
    const sy = Math.sin(this.currentYaw);
    const cp = Math.cos(this.currentPitch);
    const sp = Math.sin(this.currentPitch);

    const dist = this.currentZoom;
    const cx = dist * cp * sy;
    const cy_ = dist * sp;
    const cz = dist * cp * cy;

    this.camera.position.set(cx, cy_ + 2, cz);
    this.camera.lookAt(0, 0, 0);

    if (this.haloMesh.visible) {
      const rotSpeed = 2 * dt;
      this.haloMesh.rotation.z += rotSpeed;
    }
  }
}
