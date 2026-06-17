import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { GalaxyData, StarData, PlanetData } from './galaxy-generator';

interface StarMesh {
  mesh: THREE.Mesh | THREE.Sprite;
  data: StarData;
  glowMesh: THREE.Mesh;
}

interface PlanetMesh {
  mesh: THREE.Mesh;
  data: PlanetData;
  starPosition: THREE.Vector3;
}

export class SceneRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private clock: THREE.Clock;
  private animationId: number | null = null;

  private starMeshes: StarMesh[] = [];
  private planetMeshes: PlanetMesh[] = [];
  private galaxyGroup: THREE.Group;

  private fpsFrames = 0;
  private fpsTime = 0;
  private currentFps = 60;
  private lowDetailMode = false;

  private onFpsUpdate: ((fps: number) => void) | null = null;
  private onBoundaryCheck: ((distance: number) => void) | null = null;

  private transitioning = false;
  private fadeOutStart = 0;
  private fadeInStart = 0;
  private fadeOutDuration = 1.5;
  private fadeInDuration = 1.5;
  private pendingGalaxyData: GalaxyData | null = null;

  private cameraResetStart = 0;
  private cameraResetDuration = 2;
  private cameraResetFrom = new THREE.Vector3();
  private isCameraResetting = false;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0F0F23, 0.003);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 20, 50);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0F0F23, 1);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.rotateSpeed = 0.5;
    this.controls.zoomSpeed = 1.0;
    this.controls.panSpeed = 0.2;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 100;
    this.controls.enablePan = true;

    this.clock = new THREE.Clock();

    this.galaxyGroup = new THREE.Group();
    this.scene.add(this.galaxyGroup);

    this.addAmbientLight();

    window.addEventListener('resize', this.onResize);
  }

  private addAmbientLight() {
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambient);

    const pointLight1 = new THREE.PointLight(0x8B5CF6, 1, 100);
    pointLight1.position.set(20, 20, 20);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x3B82F6, 0.8, 100);
    pointLight2.position.set(-20, -10, -20);
    this.scene.add(pointLight2);
  }

  private onResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  setFpsCallback(cb: (fps: number) => void) {
    this.onFpsUpdate = cb;
  }

  setBoundaryCallback(cb: (distance: number) => void) {
    this.onBoundaryCheck = cb;
  }

  buildGalaxy(data: GalaxyData) {
    if (this.starMeshes.length > 0 || this.transitioning) {
      this.pendingGalaxyData = data;
      this.startTransition();
      return;
    }

    this.clearGalaxy();
    this.createGalaxyObjects(data);
    this.galaxyGroup.traverse((child) => {
      const mat = (child as THREE.Mesh).material;
      if (mat && 'opacity' in mat) {
        (mat as THREE.MeshBasicMaterial).opacity = 0;
        (mat as THREE.MeshBasicMaterial).transparent = true;
      }
    });
    this.fadeInStart = performance.now() / 1000;
    this.fadeInDuration = 1.5;
    this.transitioning = true;
  }

  private startTransition() {
    this.fadeOutStart = performance.now() / 1000;
    this.transitioning = true;
  }

  private clearGalaxy() {
    while (this.galaxyGroup.children.length > 0) {
      const child = this.galaxyGroup.children[0];
      this.galaxyGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    }
    this.starMeshes = [];
    this.planetMeshes = [];
  }

  private createGalaxyObjects(data: GalaxyData) {
    const spriteTexture = this.createGlowTexture();

    for (const star of data.stars) {
      let starMesh: THREE.Mesh | THREE.Sprite;
      let starMaterial: THREE.MeshBasicMaterial | THREE.SpriteMaterial;

      if (this.lowDetailMode) {
        const spriteMat = new THREE.SpriteMaterial({
          map: spriteTexture,
          color: star.color,
          transparent: true,
          opacity: 1,
          blending: THREE.AdditiveBlending,
        });
        starMesh = new THREE.Sprite(spriteMat);
        starMesh.scale.setScalar(star.size * 4);
        starMaterial = spriteMat;
      } else {
        const geo = new THREE.SphereGeometry(star.size, 16, 16);
        const mat = new THREE.MeshBasicMaterial({
          color: star.color,
          transparent: true,
          opacity: 1,
        });
        starMesh = new THREE.Mesh(geo, mat);
        starMaterial = mat;
      }

      starMesh.position.copy(star.position);
      this.galaxyGroup.add(starMesh);

      const glowGeo = new THREE.SphereGeometry(star.size * 2.5, 8, 8);
      const glowMat = new THREE.MeshBasicMaterial({
        color: star.color,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide,
      });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      glowMesh.position.copy(star.position);
      this.galaxyGroup.add(glowMesh);

      this.starMeshes.push({ mesh: starMesh, data: star, glowMesh });

      for (const planet of star.planets) {
        const pGeo = new THREE.SphereGeometry(planet.size, 8, 8);
        const pMat = new THREE.MeshStandardMaterial({
          color: planet.color,
          transparent: true,
          opacity: 1,
          roughness: 0.7,
          metalness: 0.3,
        });
        const pMesh = new THREE.Mesh(pGeo, pMat);
        pMesh.position.copy(planet.position);
        this.galaxyGroup.add(pMesh);

        this.planetMeshes.push({
          mesh: pMesh,
          data: planet,
          starPosition: star.position.clone(),
        });
      }
    }
  }

  private createGlowTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.6)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  resetCamera() {
    this.cameraResetFrom.copy(this.camera.position);
    this.cameraResetStart = performance.now() / 1000;
    this.isCameraResetting = true;
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  setLowDetailMode(enabled: boolean) {
    if (this.lowDetailMode === enabled) return;
    this.lowDetailMode = enabled;

    if (enabled) {
      const spriteTexture = this.createGlowTexture();
      for (const entry of this.starMeshes) {
        if (entry.mesh instanceof THREE.Mesh && !(entry.mesh instanceof THREE.Sprite)) {
          const spriteMat = new THREE.SpriteMaterial({
            map: spriteTexture,
            color: entry.data.color,
            transparent: true,
            opacity: (entry.mesh.material as THREE.MeshBasicMaterial).opacity,
            blending: THREE.AdditiveBlending,
          });
          const sprite = new THREE.Sprite(spriteMat);
          sprite.scale.setScalar(entry.data.size * 4);
          sprite.position.copy(entry.mesh.position);
          sprite.material.opacity = (entry.mesh.material as THREE.MeshBasicMaterial).opacity;

          this.galaxyGroup.remove(entry.mesh);
          entry.mesh.geometry.dispose();
          (entry.mesh.material as THREE.Material).dispose();
          this.galaxyGroup.add(sprite);
          entry.mesh = sprite;
        }
      }
    } else {
      for (const entry of this.starMeshes) {
        if (entry.mesh instanceof THREE.Sprite) {
          const geo = new THREE.SphereGeometry(entry.data.size, 16, 16);
          const mat = new THREE.MeshBasicMaterial({
            color: entry.data.color,
            transparent: true,
            opacity: entry.mesh.material.opacity,
          });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.copy(entry.mesh.position);

          this.galaxyGroup.remove(entry.mesh);
          entry.mesh.material.dispose();
          this.galaxyGroup.add(mesh);
          entry.mesh = mesh;
        }
      }
    }
  }

  start() {
    this.clock.start();
    this.animate();
  }

  stop() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.controls.update();

    this.updateFps(delta);
    this.updatePlanets(delta, elapsed);
    this.updateStarRotation(delta);
    this.updateTransition();
    this.updateCameraReset();
    this.checkBoundary();

    this.renderer.render(this.scene, this.camera);
  };

  private updateFps(delta: number) {
    this.fpsFrames++;
    this.fpsTime += delta;
    if (this.fpsTime >= 0.5) {
      this.currentFps = Math.round(this.fpsFrames / this.fpsTime);
      this.fpsFrames = 0;
      this.fpsTime = 0;
      if (this.onFpsUpdate) {
        this.onFpsUpdate(this.currentFps);
      }
    }
  }

  private updatePlanets(delta: number, _elapsed: number) {
    for (const entry of this.planetMeshes) {
      entry.data.orbitPhase += entry.data.orbitSpeed * delta;

      const angle = entry.data.orbitPhase;
      const r = entry.data.orbitRadius;
      const inc = entry.data.orbitInclination;

      entry.mesh.position.x = entry.starPosition.x + r * Math.cos(angle);
      entry.mesh.position.y =
        entry.starPosition.y + r * Math.sin(angle) * Math.sin(inc);
      entry.mesh.position.z =
        entry.starPosition.z + r * Math.sin(angle) * Math.cos(inc);
    }
  }

  private updateStarRotation(delta: number) {
    for (const entry of this.starMeshes) {
      if (entry.mesh instanceof THREE.Mesh) {
        entry.mesh.rotation.y += entry.data.rotationSpeed * delta;
      }
    }
  }

  private updateTransition() {
    if (!this.transitioning) return;

    const now = performance.now() / 1000;

    if (this.pendingGalaxyData === null && this.fadeInStart > 0) {
      const t = Math.min((now - this.fadeInStart) / this.fadeInDuration, 1);
      const opacity = this.easeInOut(t);
      this.galaxyGroup.traverse((child) => {
        const mat = (child as THREE.Mesh).material;
        if (mat && 'opacity' in mat) {
          (mat as THREE.MeshBasicMaterial).opacity = opacity;
        }
      });
      if (t >= 1) {
        this.transitioning = false;
        this.fadeInStart = 0;
        this.galaxyGroup.traverse((child) => {
          const mat = (child as THREE.Mesh).material;
          if (mat && 'opacity' in mat) {
            (mat as THREE.MeshBasicMaterial).transparent = false;
            (mat as THREE.MeshBasicMaterial).opacity = 1;
          }
        });
      }
      return;
    }

    if (this.pendingGalaxyData !== null && this.fadeOutStart > 0) {
      const t = Math.min((now - this.fadeOutStart) / this.fadeOutDuration, 1);
      const opacity = 1 - this.easeInOut(t);
      this.galaxyGroup.traverse((child) => {
        const mat = (child as THREE.Mesh).material;
        if (mat && 'opacity' in mat) {
          (mat as THREE.MeshBasicMaterial).transparent = true;
          (mat as THREE.MeshBasicMaterial).opacity = opacity;
        }
      });
      if (t >= 1) {
        this.clearGalaxy();
        this.createGalaxyObjects(this.pendingGalaxyData!);
        this.pendingGalaxyData = null;
        this.fadeOutStart = 0;
        this.fadeInStart = now;
      }
    }
  }

  private updateCameraReset() {
    if (!this.isCameraResetting) return;

    const now = performance.now() / 1000;
    const t = Math.min(
      (now - this.cameraResetStart) / this.cameraResetDuration,
      1
    );
    const eased = this.easeInOut(t);

    this.camera.position.lerpVectors(this.cameraResetFrom, new THREE.Vector3(0, 20, 50), eased);
    this.controls.target.lerp(new THREE.Vector3(0, 0, 0), eased * 0.1 + 0.02);

    if (t >= 1) {
      this.isCameraResetting = false;
      this.camera.position.set(0, 20, 50);
      this.controls.target.set(0, 0, 0);
    }
  }

  private checkBoundary() {
    if (this.onBoundaryCheck) {
      const dist = this.camera.position.length();
      this.onBoundaryCheck(dist);
    }
  }

  dispose() {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    this.clearGalaxy();
    this.renderer.dispose();
  }
}
