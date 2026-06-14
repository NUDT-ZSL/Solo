import * as THREE from 'three';
import { eventBus } from './eventBus';
import { SimulationModule } from './simulationModule';
import { VisualizationModule } from './visualizationModule';
import { InteractionModule } from './interactionModule';
import { UIModule } from './uiModule';

import './style.css';

class HeatVortexApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;

  private simulationModule: SimulationModule;
  private visualizationModule: VisualizationModule;
  private interactionModule: InteractionModule;
  private uiModule: UIModule;

  private animationFrameId: number = 0;
  private lastTime: number = 0;

  constructor() {
    this.canvas = document.getElementById('scene-canvas') as HTMLCanvasElement;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);
    this.scene.fog = new THREE.Fog(0x0a0a1a, 60, 120);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 50, 50);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.simulationModule = new SimulationModule(eventBus);
    this.visualizationModule = new VisualizationModule(this.scene, eventBus);
    this.interactionModule = new InteractionModule(
      this.camera,
      this.renderer.domElement,
      eventBus
    );
    this.uiModule = new UIModule(eventBus);

    this.setupEventListeners();
    this.initScene();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    eventBus.on('reset:camera', this.resetCamera.bind(this));
    eventBus.on('params:changed', this.onParamsChanged.bind(this));
  }

  private initScene(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(30, 60, 30);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 200;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    this.scene.add(directionalLight);

    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x444466, 0.3);
    this.scene.add(hemiLight);

    this.visualizationModule.initialize();
    this.interactionModule.initialize();
    this.uiModule.initialize();
    this.simulationModule.initialize();

    const heatMapMesh = this.visualizationModule.getHeatMapMesh();
    const groundMesh = this.visualizationModule.getGroundMesh();
    if (heatMapMesh) {
      this.interactionModule.setHeatMapMesh(heatMapMesh);
    }
    if (groundMesh) {
      this.interactionModule.setGroundMesh(groundMesh);
    }

    this.setupInteractionListeners();
  }

  private setupInteractionListeners(): void {
    eventBus.on('interaction:groundClicked', (point: THREE.Vector3) => {
      const temperature = this.simulationModule.getTemperatureAtPosition(point.x, point.z);
      eventBus.emit('interaction:temperatureRead', { point, temperature });
    });
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.interactionModule.handleResize();
  }

  private onParamsChanged(params: any): void {
    this.simulationModule.updateParams(params);
  }

  private resetCamera(): void {
    this.interactionModule.resetCamera();
  }

  private animate(currentTime: number = 0): void {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    this.simulationModule.update(deltaTime);
    this.visualizationModule.update(deltaTime);
    this.interactionModule.update(deltaTime);

    this.renderer.render(this.scene, this.camera);
  }

  public start(): void {
    this.animate();
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.dispose();
    eventBus.clear();
  }
}

const app = new HeatVortexApp();
app.start();
