import * as THREE from 'three';
import { SoilModule } from './soilModule';
import { RootSystem, GrowthParams } from './rootGrowth';
import { UIControl, UIStats } from './uiControl';

class App {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private canvas!: HTMLCanvasElement;
  private viewport!: HTMLElement;

  private soil!: SoilModule;
  private roots!: RootSystem;
  private ui!: UIControl;

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();

  private cameraTheta: number = -Math.PI / 4;
  private cameraPhi: number = Math.PI / 4;
  private cameraRadius: number = 12;
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, -4, 0);
  private targetTheta: number = -Math.PI / 4;
  private targetPhi: number = Math.PI / 4;
  private targetRadius: number = 12;
  private targetPan: THREE.Vector3 = new THREE.Vector3(0, -4, 0);

  private readonly minPhi: number = 15 * Math.PI / 180;
  private readonly maxPhi: number = 80 * Math.PI / 180;
  private readonly minRadius: number = 3;
  private readonly maxRadius: number = 25;

  private isDragging: boolean = false;
  private isPanning: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private rockDragging: boolean = false;
  private tempRockMesh: THREE.Mesh | null = null;

  private fpsSmoothing: number[] = [];
  private lastFrameTime: number = 0;

  private initDone: boolean = false;

  public start(): void {
    this.initThree();
    this.initModules();
    this.initLights();
    this.initGround();
    this.initInteraction();
    this.initDone = true;
    requestAnimationFrame(this.loop.bind(this));
  }

  private initThree(): void {
    this.canvas = document.getElementById('scene-canvas') as HTMLCanvasElement;
    this.viewport = document.getElementById('viewport') as HTMLElement;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a1a);
    this.scene.fog = new THREE.Fog(0x1a1a1a, 20, 50);

    const { clientWidth, clientHeight } = this.viewport;
    this.camera = new THREE.PerspectiveCamera(50, clientWidth / clientHeight, 0.1, 100);
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(clientWidth, clientHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private initModules(): void {
    this.soil = new SoilModule();
    this.scene.add(this.soil.soilGroup);

    this.roots = new RootSystem(this.soil);
    this.scene.add(this.roots.rootGroup);

    this.ui = new UIControl();
    this.ui.init();
    this.ui.onParamChange((params: Partial<GrowthParams>) => {
      this.roots.setParams(params);
    });
    this.roots.setParams(this.ui.getParams());
  }

  private initLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff5e6, 0.9);
    sun.position.set(6, 10, 4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 40;
    sun.shadow.camera.left = -10;
    sun.shadow.camera.right = 10;
    sun.shadow.camera.top = 10;
    sun.shadow.camera.bottom = -10;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0x88aaff, 0.25);
    fill.position.set(-5, 6, -5);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffcc88, 0.2);
    rim.position.set(0, 4, -8);
    this.scene.add(rim);
  }

  private initGround(): void {
    const groundGeo = new THREE.PlaneGeometry(30, 30);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.95,
      metalness: 0
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -8.01;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  private initInteraction(): void {
    const v = this.viewport;

    v.addEventListener('mousedown', this.onMouseDown.bind(this));
    v.addEventListener('mousemove', this.onMouseMove.bind(this));
    v.addEventListener('mouseup', this.onMouseUp.bind(this));
    v.addEventListener('mouseleave', this.onMouseUp.bind(this));
    v.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    v.addEventListener('contextmenu', (e: MouseEvent) => e.preventDefault());
  }

  private onResize(): void {
    const { clientWidth, clientHeight } = this.viewport;
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight, false);
  }

  private updateCameraPosition(): void {
    const sinPhi = Math.sin(this.cameraPhi);
    const cosPhi = Math.cos(this.cameraPhi);
    const x = this.cameraTarget.x + this.cameraRadius * sinPhi * Math.cos(this.cameraTheta);
    const y = this.cameraTarget.y + this.cameraRadius * cosPhi;
    const z = this.cameraTarget.z + this.cameraRadius * sinPhi * Math.sin(this.cameraTheta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.cameraTarget);
  }

  private smoothCamera(dt: number): void {
    const smooth = 1 - Math.exp(-dt * 8);
    this.cameraTheta += (this.targetTheta - this.cameraTheta) * smooth;
    this.cameraPhi += (this.targetPhi - this.cameraPhi) * smooth;
    this.cameraRadius += (this.targetRadius - this.cameraRadius) * smooth;
    this.cameraTarget.lerp(this.targetPan, smooth);
    this.updateCameraPosition();
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.target !== this.canvas) return;
    this.normalizeMouse(e);

    if (e.button === 0) {
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
    } else if (e.button === 2) {
      if (this.soil.rocks.length < 3 && !this.rockDragging) {
        const hit = this.raycastSoil();
        if (hit) {
          this.startRockDrag(hit);
          return;
        }
      }
      this.isPanning = true;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
    }
  }

  private onMouseMove(e: MouseEvent): void {
    this.normalizeMouse(e);

    if (this.rockDragging && this.tempRockMesh) {
      const hit = this.raycastSoil();
      if (hit) {
        const clamped = this.soil.clampToSoil(hit);
        this.tempRockMesh.position.copy(clamped);
      }
      return;
    }

    if (this.isDragging) {
      const dx = e.clientX - this.dragStartX;
      const dy = e.clientY - this.dragStartY;
      this.targetTheta -= dx * 0.005;
      this.targetPhi = THREE.MathUtils.clamp(
        this.targetPhi + dy * 0.005,
        this.minPhi,
        this.maxPhi
      );
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
    } else if (this.isPanning) {
      const dx = e.clientX - this.dragStartX;
      const dy = e.clientY - this.dragStartY;
      const panSpeed = 2 * this.cameraRadius / 12;
      const forward = new THREE.Vector3()
        .subVectors(this.cameraTarget, this.camera.position)
        .normalize();
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
      const up = new THREE.Vector3().crossVectors(right, forward).normalize();
      const delta = new THREE.Vector3()
        .addScaledVector(right, -dx * 0.01 * panSpeed)
        .addScaledVector(up, dy * 0.01 * panSpeed);
      this.targetPan.add(delta);
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (this.rockDragging && this.tempRockMesh) {
      this.finishRockDrag();
      return;
    }

    if (this.isDragging) {
      const dx = Math.abs(e.clientX - this.dragStartX);
      const dy = Math.abs(e.clientY - this.dragStartY);
      if (dx < 3 && dy < 3) {
        this.handleClick(e);
      }
    }

    this.isDragging = false;
    this.isPanning = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY * 0.0015;
    this.targetRadius = THREE.MathUtils.clamp(
      this.targetRadius * (1 + delta),
      this.minRadius,
      this.maxRadius
    );
  }

  private startRockDrag(_hit: THREE.Vector3): void {
    this.rockDragging = true;
    const radius = 0.5 + Math.random() * 0.5;
    const geo = new THREE.SphereGeometry(radius, 24, 16);
    const positions = geo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const v = new THREE.Vector3();
      v.fromBufferAttribute(positions, i);
      v.multiplyScalar(0.85 + Math.random() * 0.3);
      positions.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshPhongMaterial({
      color: 0xD3D3D3,
      flatShading: true,
      transparent: true,
      opacity: 0.75,
      shininess: 20
    });
    this.tempRockMesh = new THREE.Mesh(geo, mat);
    const hit = this.raycastSoil();
    if (hit) this.tempRockMesh.position.copy(hit);
    this.scene.add(this.tempRockMesh);
  }

  private finishRockDrag(): void {
    if (!this.tempRockMesh) return;
    const pos = this.tempRockMesh.position.clone();
    const radius = (this.tempRockMesh.geometry as THREE.SphereGeometry).parameters.radius || 0.75;
    this.scene.remove(this.tempRockMesh);
    this.tempRockMesh.geometry.dispose();
    (this.tempRockMesh.material as THREE.Material).dispose();
    this.tempRockMesh = null;
    this.rockDragging = false;
    this.soil.placeRock(pos);
    const rock = this.soil.rocks[this.soil.rocks.length - 1];
    if (rock) rock.radius = radius;
  }

  private handleClick(e: MouseEvent): void {
    this.normalizeMouse(e);
    const hit = this.raycastSoil();
    if (!hit) return;

    if (!this.soil.seed) {
      this.soil.placeSeed(hit);
      if (this.soil.seedPosition) {
        this.roots.initFromSeed(this.soil.seedPosition);
      }
    } else {
      this.soil.addWaterZone(hit);
    }
  }

  private normalizeMouse(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private raycastSoil(): THREE.Vector3 | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.soil.soilMesh, false);
    if (intersects.length > 0) {
      return intersects[0].point.clone();
    }
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const point = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, point);
    if (point && this.soil.isInsideSoil(new THREE.Vector3(point.x, -0.01, point.z), 0)) {
      point.y = 0;
      return point;
    }
    return null;
  }

  private loop(): void {
    requestAnimationFrame(this.loop.bind(this));
    const now = performance.now();
    if (this.lastFrameTime === 0) this.lastFrameTime = now;
    const rawDt = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;
    const dt = Math.min(rawDt, 0.1);
    const instantFps = rawDt > 0 ? 1 / rawDt : 60;
    this.fpsSmoothing.push(instantFps);
    if (this.fpsSmoothing.length > 30) this.fpsSmoothing.shift();
    const avgFps = this.fpsSmoothing.reduce((a, b) => a + b, 0) / this.fpsSmoothing.length;

    if (this.initDone) {
      this.smoothCamera(dt);
      this.roots.update(dt);
      const rootStats = this.roots.getStats();
      const uiStats: UIStats = {
        mainLength: rootStats.mainLength,
        sideCount: rootStats.sideCount,
        totalNodes: rootStats.totalNodes,
        fps: avgFps
      };
      this.ui.updateStats(uiStats);
      this.renderer.render(this.scene, this.camera);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.start();
});
