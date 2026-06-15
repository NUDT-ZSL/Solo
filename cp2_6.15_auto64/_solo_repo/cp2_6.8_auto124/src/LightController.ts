import * as THREE from 'three';

export class LightController {
  public pointLight: THREE.PointLight;
  public lightMesh: THREE.Mesh;
  public glowMesh: THREE.Mesh;
  private scene: THREE.Scene;
  private container: HTMLElement;
  private miniRenderer: THREE.WebGLRenderer;
  private miniScene: THREE.Scene;
  private miniCamera: THREE.PerspectiveCamera;
  private miniArrows: { x: THREE.ArrowHelper; y: THREE.ArrowHelper; z: THREE.ArrowHelper };
  private miniIndicator: THREE.Mesh;
  private isDragging = false;
  private dragStart = { x: 0, y: 0 };
  private startPos = new THREE.Vector3(3, 5, 4);
  private targetPos = new THREE.Vector3(3, 5, 4);
  private bounds = { min: -10, max: 10 };

  constructor(scene: THREE.Scene, containerId: string) {
    this.scene = scene;

    this.pointLight = new THREE.PointLight(0xffffff, 1.5, 50, 1.5);
    this.pointLight.position.copy(this.targetPos);
    this.pointLight.castShadow = true;
    this.pointLight.shadow.mapSize.width = 1024;
    this.pointLight.shadow.mapSize.height = 1024;
    this.pointLight.shadow.camera.near = 0.5;
    this.pointLight.shadow.camera.far = 50;
    this.scene.add(this.pointLight);

    const lightGeom = new THREE.SphereGeometry(0.3, 16, 16);
    const lightMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
    });
    this.lightMesh = new THREE.Mesh(lightGeom, lightMat);
    this.lightMesh.position.copy(this.targetPos);
    this.scene.add(this.lightMesh);

    const glowGeom = new THREE.SphereGeometry(0.6, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xfff8c0,
      transparent: true,
      opacity: 0.25,
    });
    this.glowMesh = new THREE.Mesh(glowGeom, glowMat);
    this.glowMesh.position.copy(this.targetPos);
    this.scene.add(this.glowMesh);

    this.container = document.getElementById(containerId) as HTMLElement;
    this.miniRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.miniRenderer.setPixelRatio(window.devicePixelRatio);
    this.miniRenderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.miniRenderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.miniRenderer.domElement);

    this.miniScene = new THREE.Scene();

    this.miniCamera = new THREE.PerspectiveCamera(
      45,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      100
    );
    this.miniCamera.position.set(5, 5, 5);
    this.miniCamera.lookAt(0, 0, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.miniScene.add(ambient);

    const origin = new THREE.Vector3(0, 0, 0);
    const length = 2.5;
    this.miniArrows = {
      x: new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), origin, length, 0xff4444, 0.3, 0.15),
      y: new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), origin, length, 0x44ff44, 0.3, 0.15),
      z: new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), origin, length, 0x4488ff, 0.3, 0.15),
    };
    this.miniScene.add(this.miniArrows.x);
    this.miniScene.add(this.miniArrows.y);
    this.miniScene.add(this.miniArrows.z);

    const sphereGeom = new THREE.SphereGeometry(0.15, 12, 12);
    const sphereMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });
    this.miniIndicator = new THREE.Mesh(sphereGeom, sphereMat);
    this.updateMiniIndicator();
    this.miniScene.add(this.miniIndicator);

    this.bindDrag();
    window.addEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.miniRenderer.setSize(w, h);
    this.miniCamera.aspect = w / h;
    this.miniCamera.updateProjectionMatrix();
  };

  private bindDrag(): void {
    this.container.addEventListener('pointerdown', (e) => {
      this.isDragging = true;
      this.dragStart.x = e.clientX;
      this.dragStart.y = e.clientY;
      this.startPos.copy(this.targetPos);
      this.container.setPointerCapture(e.pointerId);
    });

    this.container.addEventListener('pointermove', (e) => {
      if (!this.isDragging) return;
      const dx = (e.clientX - this.dragStart.x) / 20;
      const dy = (e.clientY - this.dragStart.y) / 20;

      if (e.shiftKey) {
        this.targetPos.z = THREE.MathUtils.clamp(
          this.startPos.z - dx,
          this.bounds.min,
          this.bounds.max
        );
        this.targetPos.y = THREE.MathUtils.clamp(
          this.startPos.y + dy,
          this.bounds.min,
          this.bounds.max
        );
      } else {
        this.targetPos.x = THREE.MathUtils.clamp(
          this.startPos.x + dx,
          this.bounds.min,
          this.bounds.max
        );
        this.targetPos.y = THREE.MathUtils.clamp(
          this.startPos.y - dy,
          this.bounds.min,
          this.bounds.max
        );
      }
    });

    this.container.addEventListener('pointerup', (e) => {
      this.isDragging = false;
      try {
        this.container.releasePointerCapture(e.pointerId);
      } catch {}
    });

    this.container.addEventListener('pointerleave', (e) => {
      this.isDragging = false;
    });
  }

  private updateMiniIndicator(): void {
    const scale = 0.4;
    this.miniIndicator.position.set(
      this.targetPos.x * scale,
      this.targetPos.y * scale,
      this.targetPos.z * scale
    );
  }

  public update(delta: number, time: number): void {
    this.pointLight.position.lerp(this.targetPos, Math.min(1, delta * 10));
    this.lightMesh.position.copy(this.pointLight.position);
    this.glowMesh.position.copy(this.pointLight.position);

    const pulse = 0.9 + Math.sin(time * 2) * 0.1;
    (this.lightMesh.material as THREE.MeshBasicMaterial).opacity = 0.9 * pulse;
    (this.glowMesh.material as THREE.MeshBasicMaterial).opacity = 0.2 * pulse;
    this.glowMesh.scale.setScalar(pulse);
    this.pointLight.intensity = 1.3 + Math.sin(time * 1.5) * 0.2;

    this.updateMiniIndicator();
    this.miniArrows.x.rotation.y += delta * 0.3;
    this.miniArrows.y.rotation.y += delta * 0.3;
    this.miniArrows.z.rotation.y += delta * 0.3;
    this.miniIndicator.rotation.y += delta * 2;
    this.miniRenderer.render(this.miniScene, this.miniCamera);
  }

  public getPosition(): THREE.Vector3 {
    return this.pointLight.position.clone();
  }
}
