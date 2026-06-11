import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RaindropSystem } from './raindrop';
import { ParticleSystem, MaterialType, MATERIAL_COLORS, CollisionEvent } from './particles';
import { UIController } from './ui';

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

  private createGround(): void {
    const geo = new THREE.PlaneGeometry(4, 4);

    const types: MaterialType[] = ['water', 'metal', 'glass', 'leaf'];
    types.forEach((type) => {
      this.groundMaterials[type] = this.createFallbackMaterial(type);
    });

    this.loadAllTextures(types);

    this.groundMesh = new THREE.Mesh(geo, this.groundMaterials.water);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);
  }

  private createFallbackMaterial(type: MaterialType): THREE.MeshStandardMaterial {
    const color = MATERIAL_COLORS[type];
    const fallbackTex = this.createProgrammaticTexture(type);
    const params: THREE.MeshStandardMaterialParameters = {
      map: fallbackTex,
      color: color,
      roughness: type === 'metal' ? 0.3 : type === 'glass' ? 0.1 : 0.7,
      metalness: type === 'metal' ? 0.9 : type === 'glass' ? 0.1 : 0.0
    };
    if (type === 'glass') {
      params.transparent = true;
      params.opacity = 0.85;
    }
    return new THREE.MeshStandardMaterial(params);
  }

  private loadAllTextures(types: MaterialType[]): void {
    types.forEach((type) => {
      const assetPath = `/assets/${type}.jpg`;
      this.textureLoader.load(
        assetPath,
        (texture) => {
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          texture.needsUpdate = true;
          const mat = this.groundMaterials[type];
          if (mat) {
            mat.map = texture;
            mat.color.set(0xffffff);
            mat.needsUpdate = true;
          }
        },
        undefined,
        () => {
          // Texture load failed - fallback already set, do nothing
          console.log(`[Texture] Fallback used for ${type}`);
        }
      );
    });
  }

  private createProgrammaticTexture(type: MaterialType): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    switch (type) {
      case 'water': {
        const waterGrad = ctx.createLinearGradient(0, 0, 512, 512);
        waterGrad.addColorStop(0, '#2e6fa8');
        waterGrad.addColorStop(0.5, '#4A90D9');
        waterGrad.addColorStop(1, '#2e6fa8');
        ctx.fillStyle = waterGrad;
        ctx.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 80; i++) {
          ctx.strokeStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.1})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          const wy = Math.random() * 512;
          ctx.moveTo(0, wy);
          for (let x = 0; x < 512; x += 20) {
            ctx.lineTo(x, wy + Math.sin(x * 0.02 + i) * 4);
          }
          ctx.stroke();
        }
        break;
      }
      case 'metal': {
        const metalGrad = ctx.createLinearGradient(0, 0, 512, 512);
        metalGrad.addColorStop(0, '#8a8a8a');
        metalGrad.addColorStop(0.3, '#e0e0e0');
        metalGrad.addColorStop(0.5, '#ffffff');
        metalGrad.addColorStop(0.7, '#d0d0d0');
        metalGrad.addColorStop(1, '#707070');
        ctx.fillStyle = metalGrad;
        ctx.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 200; i++) {
          ctx.strokeStyle = `rgba(100,100,100,${0.05 + Math.random() * 0.08})`;
          ctx.lineWidth = 0.5;
          const sx = Math.random() * 512;
          const sy = Math.random() * 512;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + 30 + Math.random() * 50, sy + Math.random() * 10 - 5);
          ctx.stroke();
        }
        break;
      }
      case 'glass': {
        const glassGrad = ctx.createLinearGradient(0, 0, 0, 512);
        glassGrad.addColorStop(0, 'rgba(200, 240, 255, 0.6)');
        glassGrad.addColorStop(0.5, 'rgba(176, 224, 230, 0.8)');
        glassGrad.addColorStop(1, 'rgba(150, 210, 230, 0.6)');
        ctx.fillStyle = glassGrad;
        ctx.fillRect(0, 0, 512, 512);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(50, 80);
        ctx.lineTo(150, 40);
        ctx.lineTo(300, 120);
        ctx.lineTo(450, 60);
        ctx.stroke();
        for (let i = 0; i < 15; i++) {
          ctx.fillStyle = `rgba(255,255,255,${0.08 + Math.random() * 0.12})`;
          ctx.fillRect(Math.random() * 400 + 50, Math.random() * 400 + 50, Math.random() * 40 + 20, 2);
        }
        break;
      }
      case 'leaf': {
        const leafGrad = ctx.createLinearGradient(0, 0, 512, 512);
        leafGrad.addColorStop(0, '#1a6b1a');
        leafGrad.addColorStop(0.5, '#228B22');
        leafGrad.addColorStop(1, '#0f5f0f');
        ctx.fillStyle = leafGrad;
        ctx.fillRect(0, 0, 512, 512);
        ctx.strokeStyle = 'rgba(10,80,10,0.5)';
        ctx.lineWidth = 3;
        for (let i = 0; i < 8; i++) {
          const ly = 60 + i * 60;
          ctx.beginPath();
          ctx.moveTo(0, ly);
          for (let x = 0; x <= 512; x += 10) {
            ctx.lineTo(x, ly + Math.sin(x * 0.015 + i * 0.7) * 8);
          }
          ctx.stroke();
        }
        ctx.lineWidth = 1;
        for (let i = 0; i < 30; i++) {
          const vx = Math.random() * 512;
          ctx.beginPath();
          ctx.moveTo(vx, 0);
          ctx.lineTo(vx + Math.random() * 20 - 10, 512);
          ctx.stroke();
        }
        break;
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    return texture;
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
