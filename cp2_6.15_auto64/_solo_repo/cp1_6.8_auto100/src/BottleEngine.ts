import * as THREE from 'three';
import { StoryData } from './StoryStorage';

type BottleStyle = 'classic' | 'glaze' | 'conch' | 'shell' | 'raft';

interface BottleObject {
  group: THREE.Group;
  storyId: string;
  style: BottleStyle;
  title: string | null;
  floatOffset: number;
  floatSpeed: number;
  driftX: number;
  driftY: number;
  rotateSpeed: number;
  rotationAxis: THREE.Vector3;
  hoverScale: number;
  targetHoverScale: number;
  glowMesh: THREE.Mesh;
  glowIntensity: number;
  targetGlowIntensity: number;
}

const STYLE_COLORS: Record<BottleStyle, { main: number; glow: number }> = {
  classic: { main: 0x4488cc, glow: 0x66bbff },
  glaze: { main: 0xcc44aa, glow: 0xff66cc },
  conch: { main: 0xaa66dd, glow: 0xcc88ff },
  shell: { main: 0x44ccaa, glow: 0x66ffcc },
  raft: { main: 0xddaa44, glow: 0xffcc66 },
};

export type BottleClickCallback = (storyId: string) => void;

export class BottleEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private bottles: BottleObject[] = [];
  private particles: THREE.Points[] = [];
  private clock: THREE.Clock;
  private onBottleClick: BottleClickCallback | null = null;
  private hoveredBottle: BottleObject | null = null;
  private container: HTMLElement;
  private animationId: number = 0;
  private disposed = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();

    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 100);
    this.camera.position.set(0, 0, 18);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    container.appendChild(this.renderer.domElement);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-10, -10);

    const ambientLight = new THREE.AmbientLight(0x6688aa, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xaabbff, 0.8);
    dirLight.position.set(5, 10, 8);
    this.scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x6644aa, 0.5, 30);
    pointLight.position.set(-5, -3, 5);
    this.scene.add(pointLight);

    this.bindEvents();
    this.animate();
  }

  setBottleClickCallback(cb: BottleClickCallback): void {
    this.onBottleClick = cb;
  }

  private bindEvents(): void {
    this.container.addEventListener('mousemove', this.onMouseMove);
    this.container.addEventListener('click', this.onClick);
    this.container.addEventListener('touchstart', this.onTouchStart, { passive: true });
    window.addEventListener('resize', this.onResize);
  }

  private onMouseMove = (e: MouseEvent): void => {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  };

  private onClick = (_e: MouseEvent): void => {
    if (this.hoveredBottle) {
      this.spawnParticles(this.hoveredBottle.group.position.clone(), this.hoveredBottle.style);
      if (this.onBottleClick) {
        this.onBottleClick(this.hoveredBottle.storyId);
      }
    }
  };

  private onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.getAllBottleMeshes(), true);
    if (intersects.length > 0) {
      const bottle = this.findBottleByObject(intersects[0].object);
      if (bottle) {
        this.spawnParticles(bottle.group.position.clone(), bottle.style);
        if (this.onBottleClick) {
          this.onBottleClick(bottle.storyId);
        }
      }
    }
  };

  private onResize = (): void => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private getAllBottleMeshes(): THREE.Object3D[] {
    const meshes: THREE.Object3D[] = [];
    this.bottles.forEach((b) => b.group.traverse((child) => meshes.push(child)));
    return meshes;
  }

  private findBottleByObject(obj: THREE.Object3D): BottleObject | null {
    for (const bottle of this.bottles) {
      let found = false;
      bottle.group.traverse((child) => {
        if (child === obj) found = true;
      });
      if (found) return bottle;
    }
    return null;
  }

  addBottle(story: StoryData): void {
    const style = story.style as BottleStyle;
    const colors = STYLE_COLORS[style] || STYLE_COLORS.classic;

    const group = new THREE.Group();

    const bottleGeometry = this.createBottleGeometry(style);
    const bottleMaterial = new THREE.MeshPhysicalMaterial({
      color: colors.main,
      transparent: true,
      opacity: 0.55,
      roughness: 0.1,
      metalness: 0.0,
      transmission: 0.6,
      thickness: 0.5,
      side: THREE.DoubleSide,
    });
    const bottleMesh = new THREE.Mesh(bottleGeometry, bottleMaterial);
    group.add(bottleMesh);

    const glowGeom = new THREE.SphereGeometry(0.7, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: colors.glow,
      transparent: true,
      opacity: 0.12,
    });
    const glowMesh = new THREE.Mesh(glowGeom, glowMat);
    glowMesh.scale.set(1.5, 1.5, 1.5);
    group.add(glowMesh);

    const x = (Math.random() - 0.5) * 24;
    const y = (Math.random() - 0.5) * 12;
    group.position.set(x, y, Math.random() * 4 - 2);

    const scale = 0.6 + Math.random() * 0.4;
    group.scale.set(scale, scale, scale);

    this.scene.add(group);

    this.bottles.push({
      group,
      storyId: story.id,
      style,
      title: story.title,
      floatOffset: Math.random() * Math.PI * 2,
      floatSpeed: 0.3 + Math.random() * 0.4,
      driftX: (Math.random() - 0.5) * 0.003,
      driftY: (Math.random() - 0.5) * 0.002,
      rotateSpeed: (Math.random() - 0.5) * 0.005,
      rotationAxis: new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize(),
      hoverScale: 1.0,
      targetHoverScale: 1.0,
      glowMesh,
      glowIntensity: 0.12,
      targetGlowIntensity: 0.12,
    });
  }

  private createBottleGeometry(style: BottleStyle): THREE.BufferGeometry {
    switch (style) {
      case 'classic':
        return this.createClassicsBottle();
      case 'glaze':
        return this.createGlazeBottle();
      case 'conch':
        return this.createConchBottle();
      case 'shell':
        return this.createShellBottle();
      case 'raft':
        return this.createRaftBottle();
      default:
        return this.createClassicsBottle();
    }
  }

  private createClassicsBottle(): THREE.BufferGeometry {
    const points: THREE.Vector2[] = [];
    points.push(new THREE.Vector2(0, -0.8));
    points.push(new THREE.Vector2(0.35, -0.7));
    points.push(new THREE.Vector2(0.4, -0.3));
    points.push(new THREE.Vector2(0.4, 0.2));
    points.push(new THREE.Vector2(0.3, 0.45));
    points.push(new THREE.Vector2(0.12, 0.6));
    points.push(new THREE.Vector2(0.12, 0.85));
    points.push(new THREE.Vector2(0.15, 0.9));
    points.push(new THREE.Vector2(0.15, 0.95));
    points.push(new THREE.Vector2(0, 0.95));
    return new THREE.LatheGeometry(points, 16);
  }

  private createGlazeBottle(): THREE.BufferGeometry {
    const points: THREE.Vector2[] = [];
    points.push(new THREE.Vector2(0, -0.7));
    points.push(new THREE.Vector2(0.5, -0.5));
    points.push(new THREE.Vector2(0.55, 0));
    points.push(new THREE.Vector2(0.45, 0.35));
    points.push(new THREE.Vector2(0.15, 0.55));
    points.push(new THREE.Vector2(0.1, 0.75));
    points.push(new THREE.Vector2(0.13, 0.8));
    points.push(new THREE.Vector2(0, 0.8));
    return new THREE.LatheGeometry(points, 20);
  }

  private createConchBottle(): THREE.BufferGeometry {
    const geom = new THREE.TorusGeometry(0.35, 0.15, 12, 24, Math.PI * 1.5);
    return geom;
  }

  private createShellBottle(): THREE.BufferGeometry {
    const geom = new THREE.SphereGeometry(0.4, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6);
    return geom;
  }

  private createRaftBottle(): THREE.BufferGeometry {
    const geom = new THREE.BoxGeometry(0.7, 0.15, 0.4);
    return geom;
  }

  highlightBottle(storyId: string): void {
    for (const bottle of this.bottles) {
      if (bottle.storyId === storyId) {
        bottle.targetGlowIntensity = 0.45;
      }
    }
  }

  private spawnParticles(position: THREE.Vector3, style: BottleStyle): void {
    const colors = STYLE_COLORS[style] || STYLE_COLORS.classic;
    const count = 60;
    const positions = new Float32Array(count * 3);
    const velocities: THREE.Vector3[] = [];
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      velocities.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.15,
          (Math.random() - 0.5) * 0.15,
          Math.random() * 0.08
        )
      );
      sizes[i] = Math.random() * 4 + 2;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      color: colors.glow,
      size: 0.12,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geom, mat);
    this.scene.add(points);

    this.particles.push({
      position,
      velocities,
      points,
      life: 1.0,
      geom,
      mat,
    } as any);
  }

  private updateParticles(delta: number): void {
    const toRemove: number[] = [];

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i] as any;
      p.life -= delta * 1.2;

      if (p.life <= 0) {
        this.scene.remove(p.points);
        p.geom.dispose();
        p.mat.dispose();
        toRemove.push(i);
        continue;
      }

      p.mat.opacity = p.life;
      const posAttr = p.geom.getAttribute('position') as THREE.BufferAttribute;

      for (let j = 0; j < p.velocities.length; j++) {
        const v = p.velocities[j];
        posAttr.array[j * 3] += v.x * delta * 30;
        posAttr.array[j * 3 + 1] += v.y * delta * 30 + delta * 2;
        posAttr.array[j * 3 + 2] += v.z * delta * 30;
        v.y -= delta * 0.3;
      }
      posAttr.needsUpdate = true;
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.particles.splice(toRemove[i], 1);
    }
  }

  private animate = (): void => {
    if (this.disposed) return;
    this.animationId = requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.getAllBottleMeshes(), true);

    let newHovered: BottleObject | null = null;
    if (intersects.length > 0) {
      newHovered = this.findBottleByObject(intersects[0].object);
    }

    this.hoveredBottle = newHovered;

    for (const bottle of this.bottles) {
      bottle.group.position.x += bottle.driftX;
      bottle.group.position.y +=
        Math.sin(elapsed * bottle.floatSpeed + bottle.floatOffset) * 0.003;

      if (bottle.group.position.x > 14) bottle.group.position.x = -14;
      if (bottle.group.position.x < -14) bottle.group.position.x = 14;
      if (bottle.group.position.y > 8) bottle.group.position.y = -8;
      if (bottle.group.position.y < -8) bottle.group.position.y = 8;

      bottle.group.rotateOnAxis(bottle.rotationAxis, bottle.rotateSpeed);

      bottle.targetHoverScale = bottle === this.hoveredBottle ? 1.5 : 1.0;
      bottle.hoverScale += (bottle.targetHoverScale - bottle.hoverScale) * 0.1;
      bottle.group.scale.setScalar(bottle.hoverScale * 0.8);

      bottle.glowIntensity += (bottle.targetGlowIntensity - bottle.glowIntensity) * 0.05;
      (bottle.glowMesh.material as THREE.MeshBasicMaterial).opacity =
        bottle.glowIntensity + Math.sin(elapsed * 2 + bottle.floatOffset) * 0.04;
      bottle.targetGlowIntensity = bottle === this.hoveredBottle ? 0.3 : 0.12;
    }

    this.updateParticles(delta);
    this.renderer.render(this.scene, this.camera);
  };

  clearBottles(): void {
    for (const bottle of this.bottles) {
      this.scene.remove(bottle.group);
      bottle.group.traverse((child) => {
        if ((child as THREE.Mesh).geometry) {
          (child as THREE.Mesh).geometry.dispose();
        }
        if ((child as THREE.Mesh).material) {
          const mat = (child as THREE.Mesh).material as THREE.Material;
          mat.dispose();
        }
      });
    }
    this.bottles = [];
  }

  getHoveredTitle(): string | null {
    return this.hoveredBottle?.title ?? null;
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.animationId);
    this.container.removeEventListener('mousemove', this.onMouseMove);
    this.container.removeEventListener('click', this.onClick);
    this.container.removeEventListener('touchstart', this.onTouchStart);
    window.removeEventListener('resize', this.onResize);
    this.clearBottles();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
