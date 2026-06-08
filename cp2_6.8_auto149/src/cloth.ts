import * as THREE from 'three';

export class ClothVertex {
  position: THREE.Vector3;
  previous: THREE.Vector3;
  acceleration: THREE.Vector3;
  pinned: boolean;
  originalPosition: THREE.Vector3;

  constructor(x: number, y: number, z: number) {
    this.position = new THREE.Vector3(x, y, z);
    this.previous = new THREE.Vector3(x, y, z);
    this.acceleration = new THREE.Vector3(0, 0, 0);
    this.pinned = false;
    this.originalPosition = new THREE.Vector3(x, y, z);
  }

  addForce(force: THREE.Vector3) {
    this.acceleration.add(force);
  }

  integrate(damping: number = 0.98) {
    if (this.pinned) return;

    const velocity = this.position.clone().sub(this.previous).multiplyScalar(damping);
    const newPos = this.position.clone().add(velocity).add(this.acceleration);

    this.previous.copy(this.position);
    this.position.copy(newPos);
    this.acceleration.set(0, 0, 0);
  }

  reset() {
    this.position.copy(this.originalPosition);
    this.previous.copy(this.originalPosition);
    this.acceleration.set(0, 0, 0);
  }
}

interface ClothConstraint {
  v1: ClothVertex;
  v2: ClothVertex;
  restLength: number;
}

export class Cloth {
  segments: number;
  size: number;
  vertices: ClothVertex[][];
  constraints: ClothConstraint[];
  mesh: THREE.Mesh;
  wireframe: THREE.LineSegments;
  iterations: number = 3;
  gravity: number = 9.8;
  windStrength: number = 5;
  windDirection: number = 90;
  targetWindDirection: number = 90;
  sphere: THREE.Mesh | null = null;
  private resetProgress: number = 1;
  private isResetting: boolean = false;
  private tmpVec1: THREE.Vector3 = new THREE.Vector3();
  private tmpVec2: THREE.Vector3 = new THREE.Vector3();
  private tmpVec3: THREE.Vector3 = new THREE.Vector3();

  constructor(segments: number = 20, size: number = 4) {
    this.segments = segments;
    this.size = size;
    this.vertices = [];
    this.constraints = [];

    this.createVertices();
    this.createConstraints();

    const geometry = this.createGeometry();
    const material = new THREE.MeshPhongMaterial({
      color: 0xA0C4FF,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      shininess: 16,
      flatShading: false
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    const wireGeometry = new THREE.WireframeGeometry(geometry);
    const wireMaterial = new THREE.LineBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.3
    });
    this.wireframe = new THREE.LineSegments(wireGeometry, wireMaterial);
  }

  private createVertices() {
    const halfSize = this.size / 2;
    const step = this.size / this.segments;

    for (let i = 0; i <= this.segments; i++) {
      this.vertices[i] = [];
      for (let j = 0; j <= this.segments; j++) {
        const x = -halfSize + j * step;
        const y = halfSize;
        const z = -halfSize + i * step;

        const vertex = new ClothVertex(x, y, z);
        if (i === 0 && j === 0) {
          vertex.pinned = true;
        }
        this.vertices[i][j] = vertex;
      }
    }
  }

  private createConstraints() {
    for (let i = 0; i <= this.segments; i++) {
      for (let j = 0; j <= this.segments; j++) {
        if (j < this.segments) {
          this.addConstraint(this.vertices[i][j], this.vertices[i][j + 1]);
        }
        if (i < this.segments) {
          this.addConstraint(this.vertices[i][j], this.vertices[i + 1][j]);
        }
        if (j < this.segments && i < this.segments) {
          this.addConstraint(this.vertices[i][j], this.vertices[i + 1][j + 1]);
          this.addConstraint(this.vertices[i + 1][j], this.vertices[i][j + 1]);
        }
      }
    }
  }

  private addConstraint(v1: ClothVertex, v2: ClothVertex) {
    this.constraints.push({
      v1,
      v2,
      restLength: v1.position.distanceTo(v2.position)
    });
  }

  private createGeometry(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];

    const vertexCount = (this.segments + 1) * (this.segments + 1);

    for (let i = 0; i <= this.segments; i++) {
      for (let j = 0; j <= this.segments; j++) {
        const v = this.vertices[i][j];
        positions.push(v.position.x, v.position.y, v.position.z);
        uvs.push(j / this.segments, i / this.segments);
      }
    }

    for (let i = 0; i < this.segments; i++) {
      for (let j = 0; j < this.segments; j++) {
        const a = i * (this.segments + 1) + j;
        const b = a + 1;
        const c = a + this.segments + 1;
        const d = c + 1;

        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }

  setSphere(sphere: THREE.Mesh) {
    this.sphere = sphere;
  }

  setWindStrength(strength: number) {
    this.windStrength = strength;
  }

  setWindDirection(direction: number) {
    this.targetWindDirection = direction;
  }

  setGravity(gravity: number) {
    this.gravity = gravity;
  }

  startReset() {
    this.isResetting = true;
    this.resetProgress = 0;
  }

  update(deltaTime: number) {
    const dt = Math.min(deltaTime, 0.033);

    const windDiff = this.targetWindDirection - this.windDirection;
    this.windDirection += windDiff * dt * 2;

    if (this.isResetting) {
      this.resetProgress += dt * 2;
      if (this.resetProgress >= 1) {
        this.resetProgress = 1;
        this.isResetting = false;
        for (let i = 0; i <= this.segments; i++) {
          for (let j = 0; j <= this.segments; j++) {
            this.vertices[i][j].reset();
          }
        }
      } else {
        const t = this.resetProgress;
        const easeT = t * t * (3 - 2 * t);
        for (let i = 0; i <= this.segments; i++) {
          for (let j = 0; j <= this.segments; j++) {
            const v = this.vertices[i][j];
            v.position.lerpVectors(v.position, v.originalPosition, easeT * dt * 5);
            v.previous.copy(v.position);
          }
        }
      }
    }

    const windRad = (this.windDirection * Math.PI) / 180;
    const windVector = new THREE.Vector3(
      Math.sin(windRad),
      0,
      Math.cos(windRad)
    ).multiplyScalar(this.windStrength * 0.1);

    const gravityVec = new THREE.Vector3(0, -this.gravity * 0.01, 0);

    for (let i = 0; i <= this.segments; i++) {
      for (let j = 0; j <= this.segments; j++) {
        const v = this.vertices[i][j];

        const time = performance.now() * 0.001;
        const waveOffset = Math.sin(time * 2 + i * 0.3 + j * 0.3) * this.windStrength * 0.005;
        const windForce = windVector.clone().multiplyScalar(1 + waveOffset);

        if (this.windStrength > 15) {
          const edgeFactor = (j === 0 || j === this.segments || i === this.segments) ? 1.5 : 1;
          windForce.multiplyScalar(edgeFactor);
          windForce.y += Math.sin(time * 8 + i + j) * this.windStrength * 0.003;
        }

        v.addForce(gravityVec);
        v.addForce(windForce);

        v.integrate(0.98);

        if (this.sphere) {
          const spherePos = this.sphere.position;
          const sphereRadius = (this.sphere.geometry as THREE.SphereGeometry).parameters.radius;

          const toVertex = v.position.clone().sub(spherePos);
          const dist = toVertex.length();

          if (dist < sphereRadius) {
            const normal = toVertex.normalize();
            const surfacePoint = spherePos.clone().add(normal.multiplyScalar(sphereRadius));
            v.position.copy(surfacePoint);
          }
        }
      }
    }

    for (let iter = 0; iter < this.iterations; iter++) {
      for (const constraint of this.constraints) {
        const diff = constraint.v2.position.clone().sub(constraint.v1.position);
        const dist = diff.length();
        if (dist === 0) continue;

        const correction = diff.multiplyScalar((dist - constraint.restLength) / dist * 0.5);

        if (!constraint.v1.pinned) {
          constraint.v1.position.add(correction);
        }
        if (!constraint.v2.pinned) {
          constraint.v2.position.sub(correction);
        }
      }
    }

    this.updateGeometry();
  }

  private updateGeometry() {
    const positions = (this.mesh.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
    const wirePositions = (this.wireframe.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;

    let idx = 0;
    for (let i = 0; i <= this.segments; i++) {
      for (let j = 0; j <= this.segments; j++) {
        const v = this.vertices[i][j];
        positions[idx * 3] = v.position.x;
        positions[idx * 3 + 1] = v.position.y;
        positions[idx * 3 + 2] = v.position.z;

        wirePositions[idx * 3] = v.position.x;
        wirePositions[idx * 3 + 1] = v.position.y;
        wirePositions[idx * 3 + 2] = v.position.z;

        idx++;
      }
    }

    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.wireframe.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
  }

  setTexture(texture: THREE.Texture) {
    (this.mesh.material as THREE.MeshPhongMaterial).map = texture;
    (this.mesh.material as THREE.MeshPhongMaterial).needsUpdate = true;
  }
}
