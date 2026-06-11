import * as THREE from 'three';

export interface CubeFaceData {
  mesh: THREE.Mesh;
  normal: THREE.Vector3;
  center: THREE.Vector3;
  rotation: number;
  faceIndex: number;
  triangles: { vertices: THREE.Vector3[]; normal: THREE.Vector3 }[];
}

export interface FaceDragState {
  isDragging: boolean;
  faceIndex: number;
  startMouse: { x: number; y: number };
  startRotation: number;
}

export class InteractiveCube {
  public group: THREE.Group;
  public faces: CubeFaceData[] = [];
  public autoRotationSpeed: number = 0.5;
  public isAutoRotating: boolean = true;

  private readonly CUBE_SIZE = 2;
  private readonly FACE_SEGMENTS = 4;
  private readonly MAX_ROTATION = 45 * Math.PI / 180;
  private readonly ROTATION_STEP = 0.5 * Math.PI / 180;

  private faceRotations: number[] = [0, 0, 0, 0, 0, 0];
  private targetFaceRotations: number[] = [0, 0, 0, 0, 0, 0];

  public faceDragState: FaceDragState = {
    isDragging: false,
    faceIndex: -1,
    startMouse: { x: 0, y: 0 },
    startRotation: 0,
  };

  constructor() {
    this.group = new THREE.Group();
    this.createCube();
  }

  private createCube(): void {
    const faceConfigs = [
      { pos: new THREE.Vector3(0, 0, this.CUBE_SIZE / 2), normal: new THREE.Vector3(0, 0, 1) },
      { pos: new THREE.Vector3(0, 0, -this.CUBE_SIZE / 2), normal: new THREE.Vector3(0, 0, -1) },
      { pos: new THREE.Vector3(this.CUBE_SIZE / 2, 0, 0), normal: new THREE.Vector3(1, 0, 0) },
      { pos: new THREE.Vector3(-this.CUBE_SIZE / 2, 0, 0), normal: new THREE.Vector3(-1, 0, 0) },
      { pos: new THREE.Vector3(0, this.CUBE_SIZE / 2, 0), normal: new THREE.Vector3(0, 1, 0) },
      { pos: new THREE.Vector3(0, -this.CUBE_SIZE / 2, 0), normal: new THREE.Vector3(0, -1, 0) },
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
      mesh.position.copy(faceConfigs[i].pos);
      
      const n = faceConfigs[i].normal;
      if (Math.abs(n.x) > 0.5) {
        mesh.rotation.y = n.x > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else if (Math.abs(n.y) > 0.5) {
        mesh.rotation.x = n.y > 0 ? -Math.PI / 2 : Math.PI / 2;
      }

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

      const triangles = this.extractTriangles(geometry, faceConfigs[i].pos, faceConfigs[i].normal);

      this.faces.push({
        mesh,
        normal: faceConfigs[i].normal.clone(),
        center: faceConfigs[i].pos.clone(),
        rotation: 0,
        faceIndex: i,
        triangles,
      });
    }
  }

  private extractTriangles(
    geometry: THREE.PlaneGeometry,
    facePos: THREE.Vector3,
    faceNormal: THREE.Vector3
  ): { vertices: THREE.Vector3[]; normal: THREE.Vector3 }[] {
    const triangles: { vertices: THREE.Vector3[]; normal: THREE.Vector3 }[] = [];
    const positions = geometry.attributes.position;
    const index = geometry.index;

    if (!index) return triangles;

    for (let i = 0; i < index.count; i += 3) {
      const verts: THREE.Vector3[] = [];
      for (let j = 0; j < 3; j++) {
        const idx = index.getX(i + j);
        const localV = new THREE.Vector3(
          positions.getX(idx),
          positions.getY(idx),
          positions.getZ(idx)
        );

        const worldV = localV.clone();
        if (Math.abs(faceNormal.x) > 0.5) {
          worldV.applyEuler(new THREE.Euler(0, faceNormal.x > 0 ? Math.PI / 2 : -Math.PI / 2, 0));
        } else if (Math.abs(faceNormal.y) > 0.5) {
          worldV.applyEuler(new THREE.Euler(faceNormal.y > 0 ? -Math.PI / 2 : Math.PI / 2, 0, 0));
        }
        worldV.add(facePos);
        verts.push(worldV);
      }

      const edge1 = new THREE.Vector3().subVectors(verts[1], verts[0]);
      const edge2 = new THREE.Vector3().subVectors(verts[2], verts[0]);
      const triNormal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

      triangles.push({ vertices: verts, normal: triNormal });
    }

    return triangles;
  }

  public update(deltaTime: number): void {
    if (this.isAutoRotating && !this.faceDragState.isDragging) {
      const angle = (this.autoRotationSpeed * Math.PI / 180) * deltaTime;
      this.group.rotation.y += angle;
      this.group.rotation.x += angle * 0.5;
    }

    for (let i = 0; i < 6; i++) {
      const face = this.faces[i];
      const targetRotation = this.targetFaceRotations[i];
      const currentRotation = face.rotation;
      const diff = targetRotation - currentRotation;
      
      if (Math.abs(diff) > 0.0001) {
        const smoothDiff = diff * 0.15;
        face.rotation += smoothDiff;
        this.faceRotations[i] = face.rotation;
        this.applyFaceRotation(i);
      }
    }
  }

  public startFaceDrag(faceIndex: number, mouseX: number, mouseY: number): void {
    if (faceIndex < 0 || faceIndex >= 6) return;
    this.faceDragState.isDragging = true;
    this.faceDragState.faceIndex = faceIndex;
    this.faceDragState.startMouse = { x: mouseX, y: mouseY };
    this.faceDragState.startRotation = this.targetFaceRotations[faceIndex];
    this.isAutoRotating = false;
  }

  public updateFaceDrag(mouseX: number, mouseY: number): void {
    if (!this.faceDragState.isDragging) return;

    const dx = mouseX - this.faceDragState.startMouse.x;
    const dy = mouseY - this.faceDragState.startMouse.y;
    const delta = (dx + dy) * 0.01;

    const steps = Math.round(delta / this.ROTATION_STEP);
    let newRotation = this.faceDragState.startRotation + steps * this.ROTATION_STEP;
    newRotation = Math.max(-this.MAX_ROTATION, Math.min(this.MAX_ROTATION, newRotation));

    this.setFaceRotation(this.faceDragState.faceIndex, newRotation);
  }

  public endFaceDrag(): void {
    this.faceDragState.isDragging = false;
    this.faceDragState.faceIndex = -1;
  }

  public setFaceRotation(faceIndex: number, rotation: number): void {
    if (faceIndex < 0 || faceIndex >= 6) return;
    this.targetFaceRotations[faceIndex] = Math.max(
      -this.MAX_ROTATION,
      Math.min(this.MAX_ROTATION, rotation)
    );
  }

  private applyFaceRotation(faceIndex: number): void {
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

    this.updateTriangleNormals(faceIndex);
  }

  private updateTriangleNormals(faceIndex: number): void {
    const face = this.faces[faceIndex];
    const quaternion = new THREE.Quaternion();
    face.mesh.getWorldQuaternion(quaternion);

    for (const tri of face.triangles) {
      const originalNormal = tri.normal.clone();
      
      const baseNormal = face.normal.clone();
      if (Math.abs(baseNormal.z) > 0.5) {
        originalNormal.applyAxisAngle(new THREE.Vector3(0, 0, 1), face.rotation);
      } else if (Math.abs(baseNormal.x) > 0.5) {
        originalNormal.applyAxisAngle(new THREE.Vector3(1, 0, 0), face.rotation);
      } else {
        originalNormal.applyAxisAngle(new THREE.Vector3(0, 1, 0), face.rotation);
      }
      
      tri.normal.copy(originalNormal).applyQuaternion(quaternion).normalize();

      for (let i = 0; i < 3; i++) {
        const worldPos = tri.vertices[i].clone();
        worldPos.applyQuaternion(this.group.quaternion);
        worldPos.add(this.group.position);
        tri.vertices[i] = worldPos;
      }
    }
  }

  public getWorldTriangleNormal(faceIndex: number, triIndex: number): THREE.Vector3 {
    if (faceIndex < 0 || faceIndex >= 6) {
      return new THREE.Vector3(0, 0, 1);
    }
    const face = this.faces[faceIndex];
    if (triIndex < 0 || triIndex >= face.triangles.length) {
      return this.getWorldFaceNormal(faceIndex);
    }
    return face.triangles[triIndex].normal.clone();
  }

  public getWorldFaceNormal(faceIndex: number): THREE.Vector3 {
    if (faceIndex < 0 || faceIndex >= 6) {
      return new THREE.Vector3(0, 0, 1);
    }
    
    const face = this.faces[faceIndex];
    const normal = face.normal.clone();
    
    if (Math.abs(normal.z) > 0.5) {
      normal.applyAxisAngle(new THREE.Vector3(0, 0, 1), face.rotation);
    } else if (Math.abs(normal.x) > 0.5) {
      normal.applyAxisAngle(new THREE.Vector3(1, 0, 0), face.rotation);
    } else {
      normal.applyAxisAngle(new THREE.Vector3(0, 1, 0), face.rotation);
    }

    normal.applyQuaternion(this.group.quaternion);
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

  public intersectRayTriangles(
    origin: THREE.Vector3,
    direction: THREE.Vector3
  ): { point: THREE.Vector3; normal: THREE.Vector3; faceIndex: number; distance: number } | null {
    const ray = new THREE.Ray(origin.clone(), direction.clone().normalize());
    let nearest: {
      point: THREE.Vector3;
      normal: THREE.Vector3;
      faceIndex: number;
      distance: number;
    } | null = null;

    for (let faceIdx = 0; faceIdx < 6; faceIdx++) {
      const face = this.faces[faceIdx];
      
      for (let triIdx = 0; triIdx < face.triangles.length; triIdx++) {
        const tri = face.triangles[triIdx];
        const worldVerts = tri.vertices.map(v => {
          const wv = v.clone();
          wv.applyQuaternion(this.group.quaternion);
          wv.add(this.group.position);
          return wv;
        });

        const intersectPoint = new THREE.Vector3();
        const triNormal = this.getWorldTriangleNormal(faceIdx, triIdx);
        
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
          triNormal,
          worldVerts[0]
        );

        if (ray.intersectPlane(plane, intersectPoint)) {
          const v0 = worldVerts[0];
          const v1 = worldVerts[1];
          const v2 = worldVerts[2];

          const d1 = new THREE.Vector3().subVectors(intersectPoint, v0);
          const d2 = new THREE.Vector3().subVectors(intersectPoint, v1);
          const d3 = new THREE.Vector3().subVectors(intersectPoint, v2);

          const edge1 = new THREE.Vector3().subVectors(v1, v0);
          const edge2 = new THREE.Vector3().subVectors(v2, v1);
          const edge3 = new THREE.Vector3().subVectors(v0, v2);

          const c1 = new THREE.Vector3().crossVectors(edge1, d1);
          const c2 = new THREE.Vector3().crossVectors(edge2, d2);
          const c3 = new THREE.Vector3().crossVectors(edge3, d3);

          const dot1 = c1.dot(triNormal);
          const dot2 = c2.dot(triNormal);
          const dot3 = c3.dot(triNormal);

          if (dot1 >= 0 && dot2 >= 0 && dot3 >= 0) {
            const distance = origin.distanceTo(intersectPoint);
            if (distance > 0.001 && (!nearest || distance < nearest.distance)) {
              nearest = {
                point: intersectPoint.clone(),
                normal: triNormal.clone(),
                faceIndex: faceIdx,
                distance,
              };
            }
          }
        }
      }
    }

    return nearest;
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
  }

  public getFaceMeshes(): THREE.Mesh[] {
    return this.faces.map(f => f.mesh);
  }

  public getFaceRotation(faceIndex: number): number {
    if (faceIndex < 0 || faceIndex >= 6) return 0;
    return this.targetFaceRotations[faceIndex];
  }

  public setAutoRotation(enabled: boolean): void {
    this.isAutoRotating = enabled;
  }
}
