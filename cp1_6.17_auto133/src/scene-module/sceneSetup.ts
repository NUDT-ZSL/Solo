import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import EventBus from '../EventBus';

export class SceneSetup {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;
  private eventBus: EventBus;
  private container: HTMLElement;

  constructor(containerId: string, eventBus: EventBus) {
    this.eventBus = eventBus;
    this.container = document.getElementById(containerId) || document.body;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 1.6, 4.5);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.rotateSpeed = 0.5;
    this.controls.minDistance = 1.0;
    this.controls.maxDistance = 6.0;
    this.controls.target.set(0, 1, 0);
    this.controls.update();

    window.addEventListener('resize', this.onWindowResize.bind(this));

    this.eventBus.on('GET_STATS_REQUEST', this.handleStatsRequest.bind(this));
  }

  private onWindowResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private handleStatsRequest(): void {
    let triangleCount = 0;
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const geom = obj.geometry;
        if (geom.index) {
          triangleCount += geom.index.count / 3;
        } else {
          const pos = geom.getAttribute('position');
          if (pos) triangleCount += pos.count / 3;
        }
      }
    });

    this.eventBus.emit('GET_STATS_RESPONSE', {
      lightCount: 0,
      triangleCount: Math.floor(triangleCount),
    });
  }

  public render(): void {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  public getLightCount(): number {
    let count = 0;
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Light) count++;
    });
    return count;
  }

  public getTriangleCount(): number {
    let triangleCount = 0;
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const geom = obj.geometry;
        if (geom.index) {
          triangleCount += geom.index.count / 3;
        } else {
          const pos = geom.getAttribute('position');
          if (pos) triangleCount += pos.count / 3;
        }
      }
    });
    return Math.floor(triangleCount);
  }

  public dispose(): void {
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.controls.dispose();
    this.renderer.dispose();
  }
}

export default SceneSetup;
