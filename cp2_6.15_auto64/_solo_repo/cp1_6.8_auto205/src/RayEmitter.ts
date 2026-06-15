import * as THREE from 'three';

const COLOR_A = new THREE.Color(0.388, 0.31, 0.95);
const COLOR_B = new THREE.Color(0.545, 0.36, 0.97);
const COLOR_C = new THREE.Color(0.96, 0.62, 0.04);

const MAX_TRAIL_POINTS = 600;

class RayTrail {
  points: THREE.Vector3[] = [];
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  perpA: THREE.Vector3;
  perpB: THREE.Vector3;
  speed: number;
  age = 0;
  maxAge: number;
  colorOffset: number;
  alive = true;
  seed: number;
  seed2: number;

  mesh: THREE.Points;
  geometry: THREE.BufferGeometry;
  posAttr: THREE.BufferAttribute;
  progAttr: THREE.BufferAttribute;
  alphaAttr: THREE.BufferAttribute;
  material: THREE.ShaderMaterial;

  constructor(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    thickness: number,
    colorOffset: number
  ) {
    this.origin = origin.clone();
    this.direction = direction.clone().normalize();
    this.speed = 1.2 + Math.random() * 1.2;
    this.maxAge = 5 + Math.random() * 4;
    this.colorOffset = colorOffset;
    this.seed = Math.random() * Math.PI * 2;
    this.seed2 = Math.random() * Math.PI * 2;

    const up =
      Math.abs(this.direction.y) < 0.9
        ? new THREE.Vector3(0, 1, 0)
        : new THREE.Vector3(1, 0, 0);
    this.perpA = new THREE.Vector3()
      .crossVectors(this.direction, up)
      .normalize();
    this.perpB = new THREE.Vector3()
      .crossVectors(this.direction, this.perpA)
      .normalize();

    const positions = new Float32Array(MAX_TRAIL_POINTS * 3);
    const progress = new Float32Array(MAX_TRAIL_POINTS);
    const alphas = new Float32Array(MAX_TRAIL_POINTS);

    this.geometry = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(positions, 3);
    this.progAttr = new THREE.BufferAttribute(progress, 1);
    this.alphaAttr = new THREE.BufferAttribute(alphas, 1);

    this.geometry.setAttribute('position', this.posAttr);
    this.geometry.setAttribute('aProgress', this.progAttr);
    this.geometry.setAttribute('aAlpha', this.alphaAttr);
    this.geometry.setDrawRange(0, 0);

    this.addPoint(origin, 0, 0);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uThickness: { value: thickness },
        uColorA: { value: COLOR_A.clone() },
        uColorB: { value: COLOR_B.clone() },
        uColorC: { value: COLOR_C.clone() },
      },
      vertexShader: /* glsl */ `
        attribute float aProgress;
        attribute float aAlpha;
        varying float vProgress;
        varying float vAlpha;
        uniform float uThickness;
        void main() {
          vProgress = aProgress;
          vAlpha = aAlpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = uThickness * (280.0 / -mvPosition.z);
          gl_PointSize = clamp(gl_PointSize, 1.0, 128.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vProgress;
        varying float vAlpha;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform vec3 uColorC;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5)) * 2.0;
          if (d > 1.0) discard;
          float core = 1.0 - smoothstep(0.0, 0.18, d);
          float halo = 1.0 - smoothstep(0.0, 1.0, d);
          halo = pow(halo, 1.8);
          float alpha = (core * 1.0 + halo * 0.32) * vAlpha;
          vec3 col;
          if (vProgress < 0.5) {
            col = mix(uColorA, uColorB, vProgress * 2.0);
          } else {
            col = mix(uColorB, uColorC, (vProgress - 0.5) * 2.0);
          }
          gl_FragColor = vec4(col * (1.0 + core * 0.4), alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.mesh = new THREE.Points(this.geometry, this.material);
    this.mesh.userData.rayTrail = this;
  }

  private addPoint(point: THREE.Vector3, progress: number, alpha: number): void {
    if (this.points.length >= MAX_TRAIL_POINTS) return;
    const idx = this.points.length;
    this.points.push(point.clone());
    this.posAttr.setXYZ(idx, point.x, point.y, point.z);
    this.progAttr.setX(idx, progress);
    this.alphaAttr.setX(idx, alpha);
    this.geometry.setDrawRange(0, idx + 1);
    this.posAttr.needsUpdate = true;
    this.progAttr.needsUpdate = true;
    this.alphaAttr.needsUpdate = true;
  }

  update(delta: number): void {
    if (!this.alive) return;
    this.age += delta;
    if (this.age >= this.maxAge) {
      this.alive = false;
      return;
    }

    const t = this.age;
    const oscA = Math.sin(t * 1.8 + this.seed) * 0.4;
    const oscB = Math.cos(t * 2.3 + this.seed2) * 0.3;

    const head = this.origin
      .clone()
      .addScaledVector(this.direction, this.speed * t)
      .addScaledVector(this.perpA, oscA)
      .addScaledVector(this.perpB, oscB);

    const last = this.points[this.points.length - 1];
    if (head.distanceTo(last) > 0.015) {
      const prog = (this.colorOffset + (t / this.maxAge) * 0.6) % 1.0;
      this.addPoint(head, prog, 1.0);
    }

    const lifeRatio = this.age / this.maxAge;
    const fadeStart = 0.65;
    for (let i = 0; i < this.points.length; i++) {
      const pointRatio = i / this.points.length;
      let a = 1.0;
      if (pointRatio < 0.05) {
        a = pointRatio / 0.05;
      }
      if (lifeRatio > fadeStart) {
        a *= 1.0 - (lifeRatio - fadeStart) / (1.0 - fadeStart);
      }
      this.alphaAttr.setX(i, a);
    }
    this.alphaAttr.needsUpdate = true;
  }

  setThickness(value: number): void {
    this.material.uniforms.uThickness.value = value;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

export class RayEmitter {
  private scene: THREE.Scene;
  private trails: RayTrail[] = [];
  private _thickness = 3.0;
  private colorIdx = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  emit(origin: THREE.Vector3, direction: THREE.Vector3): void {
    const colorOffset = (this.colorIdx * 0.22) % 1.0;
    this.colorIdx++;
    const trail = new RayTrail(origin, direction, this._thickness, colorOffset);
    this.trails.push(trail);
    this.scene.add(trail.mesh);
  }

  update(delta: number): void {
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const trail = this.trails[i];
      trail.update(delta);
      if (!trail.alive) {
        this.scene.remove(trail.mesh);
        trail.dispose();
        this.trails.splice(i, 1);
      }
    }
  }

  setThickness(v: number): void {
    this._thickness = v;
    for (const t of this.trails) t.setThickness(v);
  }

  getTrailMeshes(): THREE.Points[] {
    return this.trails.filter((t) => t.alive).map((t) => t.mesh);
  }

  findTrailByMesh(mesh: THREE.Object3D): RayTrail | null {
    return this.trails.find((t) => t.mesh === mesh) ?? null;
  }

  explodeTrail(trail: RayTrail): { positions: THREE.Vector3[]; colorOffset: number } {
    const positions = trail.points.map((p) => p.clone());
    const colorOffset = trail.colorOffset;
    trail.alive = false;
    return { positions, colorOffset };
  }

  reset(): void {
    for (const t of this.trails) {
      this.scene.remove(t.mesh);
      t.dispose();
    }
    this.trails.length = 0;
  }
}
