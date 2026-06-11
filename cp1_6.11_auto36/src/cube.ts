import * as THREE from 'three';

export interface CubeFaceData {
  mesh: THREE.Mesh;
  normal: THREE.Vector3;
  center: THREE.Vector3;
  rotation: number;
  faceIndex: number;
}

export class InteractiveCube {
  public group: THREE.Group;
  public faces: CubeFaceData[] = [];
  public autoRotationSpeed: number = 0.5;
  public isAutoRotating: boolean = true;

  private readonly CUBE_SIZE = 2;
  private readonly FACE_SEGMENTS = 4;
  private readonly MAX_ROTATION = Math.PI / 4;
  private readonly ROTATION_STEP = 0.5 * Math.PI / 180;

  private faceRotations: number[] = [0, 0, 0, 0, 0, 0];

  constructor() {
    this.group = new THREE.Group();
    this.createCube();
  }

  private createCube(): void {
    const facePositions = [
      { pos: new THREE.Vector3(0, 0, this.CUBE_SIZE / 2), rot: new THREE.Euler(0, 0, 0) },
      { pos: new THREE.Vector3(0, 0, -this.CUBE_SIZE / 2), rot: new THREE.Euler(0, Math.PI, 0) },
      { pos: new THREE.Vector3(this.CUBE_SIZE / 2, 0, 0), rot: new THREE.Euler(0, Math.PI / 2, 0) },
      { pos: new THREE.Vector3(-this.CUBE_SIZE / 2, 0, 0), rot: new THREE.Euler(0, -Math.PI / 2, 0) },
      { pos: new THREE.Vector3(0, this.CUBE_SIZE / 2, 0), rot: new THREE.Euler(-Math.PI / 2, 0, 0) },
      { pos: new THREE.Vector3(0, -this.CUBE_SIZE / 2, 0), rot: new THREE.Euler(Math.PI / 2, 0, 0) },
    ];

    const faceNormals = [
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, -1, 0),
    ];

    for (let i = 0; i < 6; i++) {
      const geometry = new THREE.PlaneGeometry(
        this.CUBE_SIZE,
        this.CUBE_SIZE,
        this.FACE_SEGMENTS,
        this.FACE_SEGMENTS
      );

      const material = new THREE.MeshPhongMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
        shininess: 100,
        specular: 0x88ccff,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(facePositions[i].pos);
      mesh.rotation.copy(facePositions[i].rot);
      mesh.userData.faceIndex = i;

      const edges = new THREE.EdgesGeometry(geometry);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x66aaff,
        transparent: true,
        opacity: 0.6,
      });
      const wireframe = new THREE.LineSegments(edges, lineMaterial);
      mesh.add(wireframe);

      this.group.add(mesh);

      this.faces.push({
        mesh,
        normal: faceNormals[i].clone(),
        center: facePositions[i].pos.clone(),
        rotation: 0,
        faceIndex: i,
      });
    }
  }

  public update(deltaTime: number): void {
    if (this.isAutoRotating) {
      const angle = (this.autoRotationSpeed * Math.PI / 180) * deltaTime;
      this.group.rotation.y += angle;
      this.group.rotation.x += angle * 0.5;
    }

    for (let i = 0; i < 6; i++) {
      const face = this.faces[i];
      const targetRotation = this.faceRotations[i];
      const currentRotation = face.rotation;
      const diff = targetRotation - currentRotation;
      
      if (Math.abs(diff) > 0.001) {
        const smoothDiff = diff * 0.1;
        face.rotation += smoothDiff;
        this.updateFaceRotation(i);
      }
    }
  }

  public rotateFace(faceIndex: number, delta: number): void {
    if (faceIndex < 0 || faceIndex >= 6) return;

    const newRotation = this.faceRotations[faceIndex] + delta * this.ROTATION_STEP;
    this.faceRotations[faceIndex] = Math.max(
      -this.MAX_ROTATION,
      Math.min(this.MAX_ROTATION, newRotation)
    );
  }

  public setFaceRotation(faceIndex: number, rotation: number): void {
    if (faceIndex < 0 || faceIndex >= 6) return;
    this.faceRotations[faceIndex] = Math.max(
      -this.MAX_ROTATION,
      Math.min(this.MAX_ROTATION, rotation)
    );
  }

  private updateFaceRotation(faceIndex: number): void {
    const face = this.faces[faceIndex];
    const rotation = face.rotation;
    const normal = face.normal;

    if (Math.abs(normal.z) > 0.5) {
      face.mesh.rotation.z = rotation;
    } else if (Math.abs(normal.x) > 0.5) {
      face.mesh.rotation.x = rotation;
    } else {
      face.mesh.rotation.y = rotation;
    }
  }

  public getWorldFaceNormal(faceIndex: number): THREE.Vector3 {
    if (faceIndex < 0 || faceIndex >= 6) {
      return new THREE.Vector3(0, 0, 1);
    }
    
    const face = this.faces[faceIndex];
    const normal = face.normal.clone();
    normal.applyQuaternion(this.group.quaternion);
    normal.applyQuaternion(face.mesh.quaternion);
    return normal.normalize();
  }

  public getWorldFaceCenter(faceIndex: number): THREE.Vector3 {
    if (faceIndex < 0 || faceIndex >= 6) {
      return new THREE.Vector3();
    }
    
    const face = this.faces[faceIndex];
    const center = face.center.clone();
    center.applyQuaternion(this.group.quaternion);
    center.add(this.group.position);
    return center;
  }

  public getFacePlane(faceIndex: number): THREE.Plane {
    const normal = this.getWorldFaceNormal(faceIndex);
    const center = this.getWorldFaceCenter(faceIndex);
    return new THREE.Plane().setFromNormalAndCoplanarPoint(normal, center);
  }

  public rotate(deltaX: number, deltaY: number): void {
    this.group.rotation.y += deltaX;
    this.group.rotation.x += deltaY;
    this.group.rotation.x = Math.max(
      -Math.PI / 2,
      Math.min(Math.PI / 2, this.group.rotation.x)
    );
  }

  public setLightSource(_lightPos: THREE.Vector3, _lightColor: THREE.Color, _intensity: number): void {
    // 预留接口，可用于动态调整材质光照
  }

  public getFaceMeshes(): THREE.Mesh[] {
    return this.faces.map(f => f.mesh);
  }

  public getFaceRotation(faceIndex: number): number {
    if (faceIndex < 0 || faceIndex >= 6) return 0;
    return this.faceRotations[faceIndex];
  }

  public setAutoRotation(enabled: boolean): void {
    this.isAutoRotating = enabled;
  }
}
