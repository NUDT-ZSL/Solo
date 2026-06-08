import * as THREE from 'three';
import { getGradientColor, randomRange, randomSphere, clamp } from './utils';

const MAX_TRAIL_POINTS = 600;
const RAY_SPEED = 4.0;
const RAY_LIFETIME = 8.0;

interface RayTrail {
  coreLine: THREE.Line;
  glowPoints: THREE.Points;
  positions: THREE.Vector3[];
  velocity: THREE.Vector3;
  age: number;
  maxAge: number;
  colorTStart: number;
  alive: boolean;
  scene: THREE.Scene;
}

export class RayTracer {
  private scene: THREE.Scene;
  private trails: RayTrail[] = [];
  private rayThickness: number = 1.5;
  private pixelRatio: number;

  constructor(scene: THREE.Scene, pixelRatio: number) {
    this.scene = scene;
    this.pixelRatio = Math.min(pixelRatio, 2);
  }

  setRayThickness(thickness: number): void {
    this.rayThickness = thickness;
    for (const trail of this.trails) {
      const sizeAttr = trail.glowPoints.geometry.getAttribute('size') as THREE.BufferAttribute;
      if (sizeAttr) {
        for (let i = 0; i < sizeAttr.count; i++) {
          sizeAttr.setX(i, this.rayThickness * this.pixelRatio * 4.0);
        }
        sizeAttr.needsUpdate = true;
      }
    }
  }

  spawnRay(origin: THREE.Vector3, direction: THREE.Vector3): void {
    const vel = direction.clone().normalize().multiplyScalar(RAY_SPEED);
    const wanderVel = randomSphere(0.5);
    vel.add(wanderVel);

    const colorTStart = Math.random();
    const trail: RayTrail = {
      coreLine: null!,
      glowPoints: null!,
      positions: [origin.clone()],
      velocity: vel,
      age: 0,
      maxAge: RAY_LIFETIME,
      colorTStart,
      alive: true,
      scene: this.scene,
    };

    const coreGeo = new THREE.BufferGeometry();
    const corePositions = new Float32Array(MAX_TRAIL_POINTS * 3);
    const coreColors = new Float32Array(MAX_TRAIL_POINTS * 3);
    coreGeo.setAttribute('position', new THREE.BufferAttribute(corePositions, 3));
    coreGeo.setAttribute('color', new THREE.BufferAttribute(coreColors, 3));
    coreGeo.setDrawRange(0, 1);

    const p = origin;
    corePositions[0] = p.x;
    corePositions[1] = p.y;
    corePositions[2] = p.z;

    const c = getGradientColor(colorTStart);
    coreColors[0] = c.r;
    coreColors[1] = c.g;
    coreColors[2] = c.b;

    const coreMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    trail.coreLine = new THREE.Line(coreGeo, coreMat);
    this.scene.add(trail.coreLine);

    const glowGeo = new THREE.BufferGeometry();
    const glowPositions = new Float32Array(MAX_TRAIL_POINTS * 3);
    const glowColorArr = new Float32Array(MAX_TRAIL_POINTS * 3);
    const glowSizes = new Float32Array(MAX_TRAIL_POINTS);
    glowGeo.setAttribute('position', new THREE.BufferAttribute(glowPositions, 3));
    glowGeo.setAttribute('aColor', new THREE.BufferAttribute(glowColorArr, 3));
    glowGeo.setAttribute('size', new THREE.BufferAttribute(glowSizes, 1));
    glowGeo.setDrawRange(0, 1);

    glowPositions[0] = p.x;
    glowPositions[1] = p.y;
    glowPositions[2] = p.z;
    glowColorArr[0] = c.r;
    glowColorArr[1] = c.g;
    glowColorArr[2] = c.b;
    glowSizes[0] = this.rayThickness * this.pixelRatio * 4.0;

    const glowMat = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: this.pixelRatio },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 aColor;
        varying vec3 vColor;
        uniform float uPixelRatio;
        void main() {
          vColor = aColor;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_PointSize = clamp(gl_PointSize, 1.0, 128.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.0, 0.5, d);
          float glow = exp(-d * 6.0);
          vec3 col = vColor * (1.0 + glow * 0.5);
          gl_FragColor = vec4(col, alpha * 0.35);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    trail.glowPoints = new THREE.Points(glowGeo, glowMat);
    this.scene.add(trail.glowPoints);

    this.trails.push(trail);
  }

  update(delta: number): void {
    const toRemove: number[] = [];

    for (let t = 0; t < this.trails.length; t++) {
      const trail = this.trails[t];
      if (!trail.alive) {
        toRemove.push(t);
        continue;
      }

      trail.age += delta;

      if (trail.age < trail.maxAge) {
        const wanderForce = randomSphere(0.8).multiplyScalar(delta);
        trail.velocity.add(wanderForce);

        const speed = trail.velocity.length();
        if (speed > RAY_SPEED * 2) {
          trail.velocity.normalize().multiplyScalar(RAY_SPEED * 2);
        }
        if (speed < RAY_SPEED * 0.3) {
          trail.velocity.normalize().multiplyScalar(RAY_SPEED * 0.3);
        }

        const lastPos = trail.positions[trail.positions.length - 1];
        const newPos = lastPos.clone().add(trail.velocity.clone().multiplyScalar(delta));

        const dist = newPos.length();
        if (dist > 30) {
          const pullForce = newPos.clone().normalize().multiplyScalar(-2.0 * delta);
          trail.velocity.add(pullForce);
        }

        trail.positions.push(newPos);
        const count = trail.positions.length;

        if (count <= MAX_TRAIL_POINTS) {
          const corePosAttr = trail.coreLine.geometry.getAttribute('position') as THREE.BufferAttribute;
          const coreColAttr = trail.coreLine.geometry.getAttribute('color') as THREE.BufferAttribute;
          const glowPosAttr = trail.glowPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
          const glowColAttr = trail.glowPoints.geometry.getAttribute('aColor') as THREE.BufferAttribute;
          const glowSizeAttr = trail.glowPoints.geometry.getAttribute('size') as THREE.BufferAttribute;

          const i = count - 1;
          const pi = i * 3;

          const pos = trail.positions[i];
          (corePosAttr.array as Float32Array)[pi] = pos.x;
          (corePosAttr.array as Float32Array)[pi + 1] = pos.y;
          (corePosAttr.array as Float32Array)[pi + 2] = pos.z;

          const colorT = (trail.colorTStart + i * 0.002) % 1.0;
          const c = getGradientColor(colorT);
          (coreColAttr.array as Float32Array)[pi] = c.r;
          (coreColAttr.array as Float32Array)[pi + 1] = c.g;
          (coreColAttr.array as Float32Array)[pi + 2] = c.b;

          (glowPosAttr.array as Float32Array)[pi] = pos.x;
          (glowPosAttr.array as Float32Array)[pi + 1] = pos.y;
          (glowPosAttr.array as Float32Array)[pi + 2] = pos.z;
          (glowColAttr.array as Float32Array)[pi] = c.r;
          (glowColAttr.array as Float32Array)[pi + 1] = c.g;
          (glowColAttr.array as Float32Array)[pi + 2] = c.b;
          (glowSizeAttr.array as Float32Array)[i] = this.rayThickness * this.pixelRatio * 4.0;

          corePosAttr.needsUpdate = true;
          coreColAttr.needsUpdate = true;
          glowPosAttr.needsUpdate = true;
          glowColAttr.needsUpdate = true;
          glowSizeAttr.needsUpdate = true;

          trail.coreLine.geometry.setDrawRange(0, count);
          trail.glowPoints.geometry.setDrawRange(0, count);
        }
      }

      const lifeRatio = trail.age / trail.maxAge;
      const fadeOpacity = lifeRatio > 0.7 ? 1.0 - clamp((lifeRatio - 0.7) / 0.3, 0, 1) : 1.0;

      (trail.coreLine.material as THREE.LineBasicMaterial).opacity = 0.8 * fadeOpacity;
      (trail.glowPoints.material as THREE.ShaderMaterial).uniforms.uGlobalOpacity = {
        value: 0.35 * fadeOpacity,
      };

      if (trail.age > trail.maxAge) {
        trail.alive = false;
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.removeTrail(toRemove[i]);
    }
  }

  private removeTrail(index: number): void {
    const trail = this.trails[index];
    this.scene.remove(trail.coreLine);
    this.scene.remove(trail.glowPoints);
    trail.coreLine.geometry.dispose();
    (trail.coreLine.material as THREE.Material).dispose();
    trail.glowPoints.geometry.dispose();
    (trail.glowPoints.material as THREE.Material).dispose();
    this.trails.splice(index, 1);
  }

  getTrailPositionsForBurst(trailIndex: number, hitPoint: THREE.Vector3): { positions: THREE.Vector3[], color: THREE.Color } | null {
    const trail = this.trails[trailIndex];
    if (!trail) return null;

    const positions: THREE.Vector3[] = [];
    const sampleCount = 20;
    const totalPoints = trail.positions.length;
    if (totalPoints === 0) return null;

    let closestIdx = 0;
    let closestDist = Infinity;
    for (let i = 0; i < totalPoints; i++) {
      const d = trail.positions[i].distanceTo(hitPoint);
      if (d < closestDist) {
        closestDist = d;
        closestIdx = i;
      }
    }

    const startIdx = Math.max(0, closestIdx - Math.floor(sampleCount / 2));
    const endIdx = Math.min(totalPoints, startIdx + sampleCount);

    for (let i = startIdx; i < endIdx; i++) {
      positions.push(trail.positions[i].clone());
    }

    const colorT = (trail.colorTStart + closestIdx * 0.002) % 1.0;
    return { positions, color: getGradientColor(colorT) };
  }

  removeTrailSegment(trailIndex: number, hitPoint: THREE.Vector3): void {
    const trail = this.trails[trailIndex];
    if (!trail || trail.positions.length < 10) {
      this.removeTrail(trailIndex);
      return;
    }

    let closestIdx = 0;
    let closestDist = Infinity;
    for (let i = 0; i < trail.positions.length; i++) {
      const d = trail.positions[i].distanceTo(hitPoint);
      if (d < closestDist) {
        closestDist = d;
        closestIdx = i;
      }
    }

    const removeRadius = 15;
    const start = Math.max(0, closestIdx - removeRadius);
    const end = Math.min(trail.positions.length, closestIdx + removeRadius);

    trail.positions.splice(start, end - start);
    this.rebuildTrailGeometry(trail);
  }

  private rebuildTrailGeometry(trail: RayTrail): void {
    if (trail.positions.length < 2) {
      trail.alive = false;
      return;
    }

    const count = trail.positions.length;

    const corePosAttr = trail.coreLine.geometry.getAttribute('position') as THREE.BufferAttribute;
    const coreColAttr = trail.coreLine.geometry.getAttribute('color') as THREE.BufferAttribute;
    const glowPosAttr = trail.glowPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    const glowColAttr = trail.glowPoints.geometry.getAttribute('aColor') as THREE.BufferAttribute;
    const glowSizeAttr = trail.glowPoints.geometry.getAttribute('size') as THREE.BufferAttribute;

    for (let i = 0; i < count; i++) {
      const pi = i * 3;
      const pos = trail.positions[i];
      (corePosAttr.array as Float32Array)[pi] = pos.x;
      (corePosAttr.array as Float32Array)[pi + 1] = pos.y;
      (corePosAttr.array as Float32Array)[pi + 2] = pos.z;

      const colorT = (trail.colorTStart + i * 0.002) % 1.0;
      const c = getGradientColor(colorT);
      (coreColAttr.array as Float32Array)[pi] = c.r;
      (coreColAttr.array as Float32Array)[pi + 1] = c.g;
      (coreColAttr.array as Float32Array)[pi + 2] = c.b;

      (glowPosAttr.array as Float32Array)[pi] = pos.x;
      (glowPosAttr.array as Float32Array)[pi + 1] = pos.y;
      (glowPosAttr.array as Float32Array)[pi + 2] = pos.z;
      (glowColAttr.array as Float32Array)[pi] = c.r;
      (glowColAttr.array as Float32Array)[pi + 1] = c.g;
      (glowColAttr.array as Float32Array)[pi + 2] = c.b;
      (glowSizeAttr.array as Float32Array)[i] = this.rayThickness * this.pixelRatio * 4.0;
    }

    corePosAttr.needsUpdate = true;
    coreColAttr.needsUpdate = true;
    glowPosAttr.needsUpdate = true;
    glowColAttr.needsUpdate = true;
    glowSizeAttr.needsUpdate = true;

    trail.coreLine.geometry.setDrawRange(0, count);
    trail.glowPoints.geometry.setDrawRange(0, count);
  }

  raycast(raycaster: THREE.Raycaster): { trailIndex: number; point: THREE.Vector3 } | null {
    const meshes: THREE.Object3D[] = [];
    for (const trail of this.trails) {
      if (trail.alive) {
        meshes.push(trail.coreLine);
      }
    }

    const intersects = raycaster.intersectObjects(meshes, false);
    if (intersects.length === 0) return null;

    const hit = intersects[0];
    const hitMesh = hit.object;
    const trailIndex = this.trails.findIndex(t => t.coreLine === hitMesh);
    if (trailIndex === -1) return null;

    return { trailIndex, point: hit.point.clone() };
  }

  clear(): void {
    for (let i = this.trails.length - 1; i >= 0; i--) {
      this.removeTrail(i);
    }
  }

  get trailCount(): number {
    return this.trails.length;
  }
}
