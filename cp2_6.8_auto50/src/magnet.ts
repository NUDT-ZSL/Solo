import * as THREE from 'three';

export class Magnet {
  public group: THREE.Group;
  public sphere: THREE.Mesh;
  public fieldLinesGroup: THREE.Group;
  public position: THREE.Vector3;
  public targetPosition: THREE.Vector3;
  public isDragging: boolean = false;
  public damping: number = 0.9;
  private fieldLines: THREE.Line[] = [];
  private lineCount: number = 24;
  private lineLength: number = 2.8;
  private raycaster: THREE.Raycaster;
  private plane: THREE.Plane;
  private dragOffset: THREE.Vector3;
  private camera: THREE.Camera;
  private domElement: HTMLElement;
  private time: number = 0;
  public glowMesh: THREE.Mesh;

  constructor(camera: THREE.Camera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.group = new THREE.Group();
    this.fieldLinesGroup = new THREE.Group();
    this.position = new THREE.Vector3(3.5, 0, 2);
    this.targetPosition = new THREE.Vector3(3.5, 0, 2);
    this.raycaster = new THREE.Raycaster();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    this.dragOffset = new THREE.Vector3();

    const sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const sphereMaterial = new THREE.MeshStandardMaterial({
      color: 0xFF3366,
      emissive: 0xFF3366,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.75,
      roughness: 0.2,
      metalness: 0.8
    });
    this.sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    this.group.add(this.sphere);

    const glowGeometry = new THREE.SphereGeometry(0.7, 32, 32);
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0xFF3366) },
        intensity: { value: 0.4 }
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform float intensity;
        varying vec3 vNormal;
        void main() {
          float intensityFactor = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(glowColor, intensityFactor * intensity);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true
    });
    this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    this.group.add(this.glowMesh);

    this.createFieldLines();
    this.group.add(this.fieldLinesGroup);
    this.group.position.copy(this.position);

    this.setupEventListeners();
  }

  private createFieldLines(): void {
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x00D4FF,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });

    for (let i = 0; i < this.lineCount; i++) {
      const points: THREE.Vector3[] = [];
      const segments = 24;

      const phi = Math.acos(2 * (i / this.lineCount) - 1);
      const theta = Math.sqrt(this.lineCount * Math.PI) * phi;

      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        const turbulence = Math.sin(t * Math.PI * 3) * 0.08;
        const radius = 0.5 + t * this.lineLength * (0.9 + turbulence);

        const r = radius * (1 + Math.sin(t * 4) * 0.05);
        const perturbPhi = phi + Math.sin(t * 6 + i) * 0.08;
        const perturbTheta = theta + Math.cos(t * 5 + i * 0.7) * 0.08;

        const x = r * Math.sin(perturbPhi) * Math.cos(perturbTheta);
        const y = r * Math.sin(perturbPhi) * Math.sin(perturbTheta);
        const z = r * Math.cos(perturbPhi);

        points.push(new THREE.Vector3(x, y, z));
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, lineMaterial.clone());
      this.fieldLines.push(line);
      this.fieldLinesGroup.add(line);
    }
  }

  private setupEventListeners(): void {
    const dom = this.domElement;

    dom.addEventListener('pointerdown', this.onPointerDown.bind(this));
    dom.addEventListener('pointermove', this.onPointerMove.bind(this));
    dom.addEventListener('pointerup', this.onPointerUp.bind(this));
    dom.addEventListener('pointerleave', this.onPointerUp.bind(this));
  }

  private onPointerDown(event: PointerEvent): void {
    const mouse = this.getNormalizedMouse(event);
    this.raycaster.setFromCamera(mouse, this.camera);

    const intersects = this.raycaster.intersectObject(this.sphere, false);
    if (intersects.length > 0) {
      this.isDragging = true;
      this.domElement.style.cursor = 'grabbing';

      const hitPoint = intersects[0].point;
      const cameraDirection = new THREE.Vector3();
      this.camera.getWorldDirection(cameraDirection);
      this.plane.setFromNormalAndCoplanarPoint(
        cameraDirection,
        hitPoint
      );

      const intersection = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(this.plane, intersection);
      this.dragOffset.copy(intersection).sub(this.targetPosition);
      (event.target as Element).setPointerCapture?.(event.pointerId);
    }
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.isDragging) {
      const mouse = this.getNormalizedMouse(event);
      this.raycaster.setFromCamera(mouse, this.camera);
      const intersects = this.raycaster.intersectObject(this.sphere, false);
      this.domElement.style.cursor = intersects.length > 0 ? 'grab' : 'default';
      return;
    }

    const mouse = this.getNormalizedMouse(event);
    this.raycaster.setFromCamera(mouse, this.camera);

    const intersection = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.plane, intersection)) {
      this.targetPosition.copy(intersection).sub(this.dragOffset);

      const maxDist = 8;
      if (this.targetPosition.length() > maxDist) {
        this.targetPosition.normalize().multiplyScalar(maxDist);
      }
    }
  }

  private onPointerUp(event: PointerEvent): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.domElement.style.cursor = 'default';
    }
  }

  private getNormalizedMouse(event: PointerEvent): THREE.Vector2 {
    const rect = this.domElement.getBoundingClientRect();
    return new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
  }

  public update(delta: number): void {
    this.time += delta;

    this.position.lerp(this.targetPosition, 1 - this.damping);
    this.group.position.copy(this.position);

    const pulse = Math.sin(this.time * Math.PI * 2) * 0.2 + 0.7;

    for (let i = 0; i < this.fieldLines.length; i++) {
      const line = this.fieldLines[i];
      const material = line.material as THREE.LineBasicMaterial;
      const phaseOffset = (i / this.fieldLines.length) * Math.PI * 2;
      material.opacity = 0.4 + Math.sin(this.time * Math.PI * 2 + phaseOffset) * 0.2;

      const positions = line.geometry.attributes.position;
      const arr = positions.array as Float32Array;
      const phi = Math.acos(2 * (i / this.lineCount) - 1);
      const theta = Math.sqrt(this.lineCount * Math.PI) * phi;
      const segments = 24;

      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        const turbulence = Math.sin(t * Math.PI * 3 + this.time * 2) * 0.08;
        const radius = 0.5 + t * this.lineLength * (0.9 + turbulence);

        const r = radius * (1 + Math.sin(t * 4 + this.time * 1.5) * 0.05);
        const perturbPhi = phi + Math.sin(t * 6 + i + this.time) * 0.08;
        const perturbTheta = theta + Math.cos(t * 5 + i * 0.7 + this.time * 0.8) * 0.08;

        arr[j * 3] = r * Math.sin(perturbPhi) * Math.cos(perturbTheta);
        arr[j * 3 + 1] = r * Math.sin(perturbPhi) * Math.sin(perturbTheta);
        arr[j * 3 + 2] = r * Math.cos(perturbPhi);
      }
      positions.needsUpdate = true;
    }

    const sphereMat = this.sphere.material as THREE.MeshStandardMaterial;
    sphereMat.emissiveIntensity = 0.4 + pulse * 0.15;

    this.group.rotation.y += delta * 0.15;
    this.group.rotation.x += delta * 0.08;
  }

  public getWorldPosition(): THREE.Vector3 {
    return this.group.position.clone();
  }

  public isActive(): boolean {
    return true;
  }
}
