import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Universe } from "./scene/Universe";
import { GravityWaveSystem } from "./physics/GravityWave";
import { ControlPanel } from "./controls/ControlPanel";
import { CAMERA } from "./utils/constants";

class App {
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private universe: Universe;
  private gravityWave: GravityWaveSystem;
  private clock: THREE.Clock;
  private mouseDownPos: THREE.Vector2 = new THREE.Vector2();
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private clickPlane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  constructor() {
    const container = document.getElementById("app")!;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      CAMERA.FOV,
      window.innerWidth / window.innerHeight,
      CAMERA.NEAR,
      CAMERA.FAR
    );
    this.camera.position.copy(CAMERA.INITIAL_POSITION);
    this.camera.lookAt(CAMERA.LOOK_AT);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = CAMERA.MIN_DISTANCE;
    this.controls.maxDistance = CAMERA.MAX_DISTANCE;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.6;
    this.controls.zoomSpeed = CAMERA.ZOOM_SPEED;
    this.controls.target.copy(CAMERA.LOOK_AT);

    this.universe = new Universe();
    this.gravityWave = new GravityWaveSystem(this.universe.scene, this.universe);

    this.clock = new THREE.Clock();

    this.setupControls();
    this.setupPanel();
    this.setupResize();

    requestAnimationFrame(() => {
      container.classList.add("visible");
    });

    this.animate();
  }

  private setupControls(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener("pointerdown", (e: PointerEvent) => {
      this.mouseDownPos.set(e.clientX, e.clientY);
    });

    canvas.addEventListener("pointerup", (e: PointerEvent) => {
      const dx = e.clientX - this.mouseDownPos.x;
      const dy = e.clientY - this.mouseDownPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 5) {
        this.emitGravityWave(e);
      }
    });

    canvas.style.cursor = "crosshair";
  }

  private emitGravityWave(e: PointerEvent): void {
    const ndc = new THREE.Vector2(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );

    this.raycaster.setFromCamera(ndc, this.camera);

    const intersectPoint = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(this.clickPlane, intersectPoint);

    if (hit) {
      intersectPoint.y = 0;
      this.gravityWave.emit(intersectPoint);
    }
  }

  private setupPanel(): void {
    new ControlPanel({
      onIntensityChange: (val: number) => {
        this.gravityWave.setIntensity(val);
      },
      onDensityChange: (val: number) => {
        this.universe.setParticleDensity(val);
      },
      onReset: () => {
        this.universe.reset();
        this.gravityWave.reset();
      },
    });
  }

  private setupResize(): void {
    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;

    this.controls.update();
    this.universe.updatePlanets(delta);
    this.universe.updateParticles(delta);
    this.gravityWave.update(delta, elapsed);

    this.renderer.render(this.universe.scene, this.camera);
  }
}

new App();
