import * as THREE from 'three';

export class GridPlane {
  public mesh: THREE.Group;
  private gridHelper: THREE.GridHelper;
  private hoverLine: THREE.Line;
  private raycaster: THREE.Raycaster;
  private plane: THREE.Plane;
  private mouse: THREE.Vector2;
  private gridSize: number = 10;
  private divisions: number = 50;

  constructor() {
    this.mesh = new THREE.Group();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.gridHelper = new THREE.GridHelper(
      this.gridSize,
      this.divisions,
      0x3A6EA5,
      0x3A6EA5
    );

    const gridMaterial = this.gridHelper.material as THREE.Material;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.25;
    gridMaterial.depthWrite = false;

    this.mesh.add(this.gridHelper);

    const hoverGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.01, 0),
      new THREE.Vector3(0, 0.01, 0)
    ]);
    const hoverMaterial = new THREE.LineBasicMaterial({
      color: 0x66ccff,
      transparent: true,
      opacity: 0.8
    });
    this.hoverLine = new THREE.Line(hoverGeometry, hoverMaterial);
    this.hoverLine.visible = false;
    this.mesh.add(this.hoverLine);
  }

  public updateOpacity(camera: THREE.Camera): void {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    const pitch = Math.abs(direction.y);
    const opacity = 0.15 + pitch * 0.4;
    const mat = this.gridHelper.material as THREE.Material;
    mat.opacity = Math.min(0.6, Math.max(0.15, opacity));
  }

  public getIntersection(
    clientX: number,
    clientY: number,
    camera: THREE.Camera,
    domElement: HTMLElement
  ): THREE.Vector3 | null {
    const rect = domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, camera);
    const point = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(this.plane, point);

    if (hit) {
      const half = this.gridSize / 2;
      point.x = Math.max(-half, Math.min(half, point.x));
      point.z = Math.max(-half, Math.min(half, point.z));
      point.y = 0.02;
      return point;
    }
    return null;
  }

  public getBounds(): { minX: number; maxX: number; minZ: number; maxZ: number } {
    const half = this.gridSize / 2;
    return { minX: -half, maxX: half, minZ: -half, maxZ: half };
  }
}
