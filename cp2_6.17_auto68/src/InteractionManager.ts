import * as THREE from 'three';
import { SceneBuilder } from './SceneBuilder';

type PlanetSelectCallback = (planetName: string | null) => void;

export class InteractionManager {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private sceneBuilder: SceneBuilder;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private onPlanetSelect: PlanetSelectCallback | null = null;

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    sceneBuilder: SceneBuilder
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.sceneBuilder = sceneBuilder;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.bindEvents();
  }

  setOnPlanetSelect(cb: PlanetSelectCallback): void {
    this.onPlanetSelect = cb;
  }

  private bindEvents(): void {
    this.renderer.domElement.addEventListener('click', (e) => this.onClick(e));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.sceneBuilder.clearHighlight();
        this.onPlanetSelect?.(null);
      }
    });
  }

  private onClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const meshes = this.sceneBuilder.getPlanetMeshes();
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const data = this.sceneBuilder.getPlanetDataByMesh(hitMesh);
      if (data) {
        this.sceneBuilder.highlightPlanet(data.name);
        this.onPlanetSelect?.(data.name);
      }
    } else {
      this.sceneBuilder.clearHighlight();
      this.onPlanetSelect?.(null);
    }
  }
}
