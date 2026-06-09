import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class GravityWell {
  public mesh: THREE.Mesh | null = null;
  public isActive: boolean = false;
  public position: THREE.Vector3 = new THREE.Vector3();
  public mass: number = 5;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private isDragging: boolean = false;
  private dragStartY: number = 0;
  private dragPlane: THREE.Plane;
  private baseY: number = 0;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, controls: OrbitControls) {
    this.scene = scene;
    this.camera = camera;
    this.controls = controls;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  }

  private createMesh(): void {
    if (this.mesh) return;

    const geometry = new THREE.SphereGeometry(1.5, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0x8B5CF6,
      transparent: true,
      opacity: 0.85,
      emissive: 0x6D28D9,
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.6
    });

    this.mesh = new THREE.Mesh(geometry, material);

    const glowGeometry = new THREE.SphereGeometry(2.2, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x8B5CF6,
      transparent: true,
      opacity: 0.25,
      side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.mesh.add(glow);

    const ringGeometry = new THREE.RingGeometry(2.5, 3.0, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x6D28D9,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    this.mesh.add(ring);

    this.updateColorByMass();
    this.scene.add(this.mesh);
  }

  private updateColorByMass(): void {
    if (!this.mesh) return;
    const mat = this.mesh.material as THREE.MeshStandardMaterial;
    const t = (this.mass - 1) / 9;
    const color = new THREE.Color().lerpColors(
      new THREE.Color(0x8B5CF6),
      new THREE.Color(0x6D28D9),
      t
    );
    mat.color.copy(color);
    mat.emissive.copy(color);
    mat.emissiveIntensity = 0.3 + t * 0.5;
  }

  public setMass(mass: number): void {
    this.mass = mass;
    this.updateColorByMass();
  }

  public onMouseDown(event: MouseEvent): void {
    if (event.button !== 2) return;
    this.isDragging = true;
    this.controls.enabled = false;

    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersectPoint = new THREE.Vector3();
    this.dragPlane.setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 0)
    );
    this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);

    this.baseY = 0;
    this.dragStartY = event.clientY;

    if (!this.mesh) {
      this.createMesh();
    }

    this.position.copy(intersectPoint);
    this.position.y = this.baseY;
    this.mesh!.position.copy(this.position);
    this.mesh!.visible = true;
    this.isActive = true;
  }

  public onMouseMove(event: MouseEvent): void {
    if (!this.isDragging || !this.mesh) return;

    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersectPoint = new THREE.Vector3();
    this.dragPlane.setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 0)
    );
    this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);

    const deltaY = (this.dragStartY - event.clientY) * 0.05;
    const newY = this.baseY + deltaY;

    this.position.set(intersectPoint.x, newY, intersectPoint.z);
    this.mesh.position.copy(this.position);
  }

  public onMouseUp(event: MouseEvent): void {
    if (event.button !== 2) return;
    this.isDragging = false;
    this.controls.enabled = true;

    if (this.mesh) {
      this.mesh.visible = false;
    }
    this.isActive = false;
  }

  public update(dt: number): void {
    if (this.mesh && this.isActive) {
      this.mesh.rotation.y += dt * 0.5;
      const ring = this.mesh.children[1];
      if (ring) {
        ring.rotation.z += dt * 1.5;
      }
    }
  }

  public getPosition(): THREE.Vector3 | null {
    return this.isActive ? this.position : null;
  }
}
