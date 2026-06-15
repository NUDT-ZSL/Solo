import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RaindropSystem } from './raindrop';
import { ParticleSystem, MaterialType, MATERIAL_COLORS, CollisionEvent } from './particles';
import { UIController } from './ui';

const GROUND_TEXTURE_CONFIG: Record<MaterialType, { roughness: number; metalness: number; transparent?: boolean; opacity?: number }> = {
  water: { roughness: 0.3, metalness: 0.1 },
  metal: { roughness: 0.3, metalness: 0.9 },
  glass: { roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.85 },
  leaf: { roughness: 0.7, metalness: 0.0 }
};

class RainStoriesApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;
  private raindropSystem!: RaindropSystem;
  private particleSystem!: ParticleSystem;
  private uiController!: UIController;
  private groundMesh!: THREE.Mesh;
  private groundMaterials: Record<MaterialType, THREE.MeshStandardMaterial>;
  private clock: THREE.Clock;
  private isDragging: boolean = false;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private groundPlane: THREE.Plane;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 60;
  private adaptiveRateMultiplier: number = 1.0;
  private baseRate: number = 300;
  private currentMaterial: MaterialType = 'water';
  private sharedSpeedRef: { value: number } = { value: 1.0 };
  private textureLoader: THREE.TextureLoader;

  constructor() {
    this.scene = new THREE.Scene();
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.groundMaterials = {} as Record<MaterialType, THREE.MeshStandardMaterial>;
    this.textureLoader = new THREE.TextureLoader();

    this.camera = new THREE.PerspectiveCamera(
      50,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 3, 5);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = false;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(0, 0.5, 0);
    this.controls.minDistance = 3;
    this.controls.maxDistance = 12;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;

    this.setupLighting();
    this.createGround();
    this.initSystems();
    this.bindInteraction();
    this.onResize();

    window.addEventListener('resize', () => this.onResize());

    setTimeout(() => {
      const splash = document.getElementById('splash');
      if (splash) {
        splash.classList.add('fade-out');
        setTimeout(() => splash.remove(), 800);
      }
    }, 1200);

    this.animate();
  }

  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(3, 6, 3);
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x8899ff, 0.3);
    fillLight.position.set(-3, 4, -3);
    this.scene.add(fillLight);
  }

  private createSolidMaterial(type: MaterialType): THREE.MeshStandardMaterial {
    const color = MATERIAL_COLORS[type];
    const cfg = GROUND_TEXTURE_CONFIG[type];
    return new THREE.MeshStandardMaterial({
      color: color,
      roughness: cfg.roughness,
      metalness: cfg.metalness,
      transparent: cfg.transparent ?? false,
      opacity: cfg.opacity ?? 1.0
    });
  }

  private createGround(): void {
    const geo = new THREE.PlaneGeometry(4, 4);
    const types: MaterialType[] = ['water', 'metal', 'glass', 'leaf'];

    types.forEach((type) => {
      this.groundMaterials[type] = this.createSolidMaterial(type);
    });

    this.tryLoadTextures(types);

    this.groundMesh = new THREE.Mesh(geo, this.groundMaterials.water);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);
  }

  private tryLoadTextures(types: MaterialType[]): void {
    try {
      types.forEach((type) => {
        try {
          const assetPath = `./assets/${type}.jpg`;
          this.textureLoader.load(
            assetPath,
            (texture) => {
              try {
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.needsUpdate = true;
                const mat = this.groundMaterials[type];
                if (mat) {
                  mat.map = texture;
                  mat.color.set(0xffffff);
                  mat.needsUpdate = true;
                }
              } catch (_) { /* noop */ }
            },
            undefined,
            () => {
              // Texture not available - using solid color fallback
            }
          );
        } catch (_) {
          // Individual texture load error - fallback already active
        }
      });
    } catch (_) {
      // Global texture system error - all materials stay on solid color fallback
    }
  }

  private initSystems(): void {
    this.particleSystem = new ParticleSystem(this.scene);
    this.raindropSystem = new RaindropSystem(
      this.scene,
      (event: CollisionEvent) => {
        this.particleSystem.handleCollision(event);
      },
      this.sharedSpeedRef
    );

    this.uiController = new UIController({
      onMaterialChange: (mat: MaterialType) => this.changeMaterial(mat),
      onSpeedChange: (speed: number) => this.changeSpeed(speed),
      onRateChange: (rate: number) => this.changeRate(rate),
      onReset: () => this.resetScene()
    });
  }

  private changeMaterial(mat: MaterialType): void {
    this.currentMaterial = mat;
    this.raindropSystem.setMaterial(mat);
    this.particleSystem.setMaterial(mat);
    this.groundMesh.material = this.groundMaterials[mat];
  }

  private changeSpeed(speed: number): void {
    this.sharedSpeedRef.value = speed;
    this.raindropSystem.setSpeed(speed);
  }

  private changeRate(rate: number): void {
    this.baseRate = rate;
    this.raindropSystem.setRate(rate * this.adaptiveRateMultiplier);
  }

  private resetScene(): void {
    this.raindropSystem.clearAll();
    this.particleSystem.clearAll();
    this.uiController.resetUI();
    this.currentMaterial = 'water';
    this.sharedSpeedRef.value = 1.0;
    this.baseRate = 300;
    this.adaptiveRateMultiplier = 1.0;
    this.raindropSystem.setMaterial('water');
    this.raindropSystem.setSpeed(1.0);
    this.raindropSystem.setRate(300);
    this.particleSystem.setMaterial('water');
    this.groundMesh.material = this.groundMaterials.water;
  }

  private bindInteraction(): void {
    const dom = this.renderer.domElement;

    const getIntersection = (e: MouseEvent | PointerEvent): THREE.Vector3 | null => {
      const rect = dom.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const target = new THREE.Vector3();
      const hit = this.raycaster.ray.intersectPlane(this.groundPlane, target);
      return hit ? target : null;
    };

    dom.addEventListener('pointerdown', (e: PointerEvent) => {
      e.preventDefault();
      this.isDragging = true;
      const hit = getIntersection(e);
      if (hit) {
        const clampedX = Math.max(-1.8, Math.min(1.8, hit.x));
        const clampedZ = Math.max(-1.8, Math.min(1.8, hit.z));
        this.raindropSystem.spawnDrop(clampedX, clampedZ, true);
      }
      dom.setPointerCapture(e.pointerId);
    });

    dom.addEventListener('pointermove', (e: PointerEvent) => {
      if (this.isDragging) {
        const hit = getIntersection(e);
        if (hit && Math.random() < 0.4) {
          const clampedX = Math.max(-1.8, Math.min(1.8, hit.x));
          const clampedZ = Math.max(-1.8, Math.min(1.8, hit.z));
          this.raindropSystem.spawnDrop(clampedX, clampedZ, true);
        }
      }
    });

    dom.addEventListener('pointerup', (e: PointerEvent) => {
      this.isDragging = false;
      try { dom.releasePointerCapture(e.pointerId); } catch (_) { /* noop */ }
    });

    dom.addEventListener('pointerleave', () => {
      this.isDragging = false;
    });
  }

  private onResize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private updateFPS(dt: number): void {
    this.frameCount++;
    this.lastFrameTime += dt;
    if (this.lastFrameTime >= 0.5) {
      this.fps = this.frameCount / this.lastFrameTime;
      this.frameCount = 0;
      this.lastFrameTime = 0;

      if (this.fps < 28 && this.adaptiveRateMultiplier > 0.4) {
        this.adaptiveRateMultiplier *= 0.9;
        this.raindropSystem.setRate(this.baseRate * this.adaptiveRateMultiplier);
      } else if (this.fps > 45 && this.adaptiveRateMultiplier < 1.0) {
        this.adaptiveRateMultiplier = Math.min(1.0, this.adaptiveRateMultiplier * 1.05);
        this.raindropSystem.setRate(this.baseRate * this.adaptiveRateMultiplier);
      }
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.05);

    this.controls.update();
    this.raindropSystem.update(dt);
    this.particleSystem.update(dt);
    this.updateFPS(dt);

    this.renderer.render(this.scene, this.camera);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new RainStoriesApp();
});
