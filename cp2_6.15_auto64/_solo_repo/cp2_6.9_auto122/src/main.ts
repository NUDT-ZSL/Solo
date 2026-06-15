import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SolarSystem } from './solarSystem';
import { GravityWell } from './gravityWell';
import { UI } from './ui';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private solarSystem: SolarSystem;
  private gravityWell: GravityWell;
  private ui: UI;
  private clock: THREE.Clock;
  private lastTime: number = 0;
  private frameCount: number = 0;
  private fpsTime: number = 0;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000008);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 10, 20);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    document.body.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 80;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: null as any
    };

    this.setupLights();

    this.solarSystem = new SolarSystem(this.scene);
    this.gravityWell = new GravityWell(this.scene, this.camera, this.controls);
    this.ui = new UI();

    this.clock = new THREE.Clock();

    this.setupEventListeners();
    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x222233, 0.5);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xFFFFAA, 3, 100);
    pointLight.position.set(0, 0, 0);
    this.scene.add(pointLight);

    const hemiLight = new THREE.HemisphereLight(0x4466AA, 0x111122, 0.3);
    this.scene.add(hemiLight);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize());

    window.addEventListener('contextmenu', (e) => e.preventDefault());

    this.renderer.domElement.addEventListener('mousedown', (e) => {
      this.gravityWell.onMouseDown(e);
    });

    window.addEventListener('mousemove', (e) => {
      this.gravityWell.onMouseMove(e);
    });

    window.addEventListener('mouseup', (e) => {
      this.gravityWell.onMouseUp(e);
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.solarSystem.clearAllTrails();
      }
    });

    this.ui.onMassChange = (mass) => {
      this.gravityWell.setMass(mass);
    };

    this.ui.onSpeedChange = (speed) => {
      this.solarSystem.speedMultiplier = speed;
    };

    this.ui.onReset = () => {
      this.solarSystem.resetAllOrbits();
    };
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.05);

    this.frameCount++;
    this.fpsTime += dt;
    if (this.fpsTime >= 0.5) {
      const fps = this.frameCount / this.fpsTime;
      this.ui.updateFPS(fps);
      this.frameCount = 0;
      this.fpsTime = 0;
    }

    this.controls.update();
    this.gravityWell.update(dt);
    this.solarSystem.update(
      dt,
      this.gravityWell.getPosition(),
      this.gravityWell.mass
    );

    this.ui.updateSimTime(this.solarSystem.simTime);
    this.ui.showGravityWarning(this.solarSystem.isAnyPerturbed());
    this.ui.updateOrbitParams(this.solarSystem.planets);

    this.renderer.render(this.scene, this.camera);
  };
}

new App();
