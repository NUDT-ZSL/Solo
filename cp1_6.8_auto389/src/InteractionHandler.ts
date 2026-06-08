import * as THREE from 'three';

export class InteractionHandler {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private groundPlane: THREE.Mesh;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private onCreateSource: (position: THREE.Vector3) => void;
  private isDragging: boolean;
  private lastDragPosition: THREE.Vector3 | null;
  private dragThrottleDistance: number;
  private hoverIndicator: THREE.Mesh;
  private scene: THREE.Scene;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    groundPlane: THREE.Mesh,
    scene: THREE.Scene,
    onCreateSource: (position: THREE.Vector3) => void
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.groundPlane = groundPlane;
    this.scene = scene;
    this.onCreateSource = onCreateSource;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.isDragging = false;
    this.lastDragPosition = null;
    this.dragThrottleDistance = 2.0;

    const indicatorGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const indicatorMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
    });
    this.hoverIndicator = new THREE.Mesh(indicatorGeo, indicatorMat);
    this.hoverIndicator.visible = false;
    this.scene.add(this.hoverIndicator);

    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.domElement.addEventListener('pointermove', this.onPointerMove);
    this.domElement.addEventListener('pointerup', this.onPointerUp);
    this.domElement.style.cursor = 'crosshair';
  }

  private getIntersection(clientX: number, clientY: number): THREE.Vector3 | null {
    this.mouse.x = (clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.groundPlane);

    if (intersects.length > 0) {
      return intersects[0].point;
    }
    return null;
  }

  private onPointerDown = (event: PointerEvent): void => {
    const point = this.getIntersection(event.clientX, event.clientY);
    if (point) {
      this.isDragging = true;
      this.lastDragPosition = point.clone();
      this.onCreateSource(point);
      this.showFeedback(point);
    }
  };

  private onPointerMove = (event: PointerEvent): void => {
    const point = this.getIntersection(event.clientX, event.clientY);

    if (point) {
      this.hoverIndicator.position.copy(point);
      this.hoverIndicator.position.y = 0.2;
      this.hoverIndicator.visible = true;

      const mat = this.hoverIndicator.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.3;
    } else {
      this.hoverIndicator.visible = false;
    }

    if (this.isDragging && point) {
      const dist = this.lastDragPosition
        ? point.distanceTo(this.lastDragPosition)
        : Infinity;

      if (dist >= this.dragThrottleDistance) {
        this.onCreateSource(point);
        this.lastDragPosition = point.clone();
        this.showFeedback(point);
      }
    }
  };

  private onPointerUp = (): void => {
    this.isDragging = false;
    this.lastDragPosition = null;
  };

  private showFeedback(position: THREE.Vector3): void {
    const indicator = this.hoverIndicator;
    indicator.position.copy(position);
    indicator.position.y = 0.2;
    indicator.visible = true;

    const mat = indicator.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.9;
    mat.color.setHex(0xffffcc);

    const startTime = performance.now();
    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      if (elapsed > 0.6) {
        indicator.visible = false;
        mat.opacity = 0;
        mat.color.setHex(0xffffff);
        return;
      }
      const t = elapsed / 0.6;
      mat.opacity = 0.9 * (1 - t);
      indicator.scale.setScalar(1 + t * 3);
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  dispose(): void {
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.scene.remove(this.hoverIndicator);
  }
}
