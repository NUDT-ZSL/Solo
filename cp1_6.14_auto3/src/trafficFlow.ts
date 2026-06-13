import * as THREE from 'three';
import type {
  TrafficFrame,
  StreetSegment,
  ParticleData,
} from './types';
import { TrafficDataSimulator } from './trafficData';
import { SPEED_COLOR_SCALE, sizeBySpeed } from './utils/color';
import { lerp, clamp } from './utils/easing';

export class TrafficFlowSystem {
  readonly PARTICLE_COUNT = 5000;

  private scene: THREE.Scene;
  private simulator: TrafficDataSimulator;
  private particles: ParticleData[] = [];
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  private segmentCache: Map<string, StreetSegment> = new Map();

  constructor(scene: THREE.Scene, simulator: TrafficDataSimulator) {
    this.scene = scene;
    this.simulator = simulator;

    for (const seg of simulator.getSegments()) {
      this.segmentCache.set(seg.id, seg);
    }

    this.positions = new Float32Array(this.PARTICLE_COUNT * 3);
    this.colors = new Float32Array(this.PARTICLE_COUNT * 3);
    this.sizes = new Float32Array(this.PARTICLE_COUNT);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.positions, 3)
    );
    this.geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(this.colors, 3)
    );
    this.geometry.setAttribute(
      'size',
      new THREE.BufferAttribute(this.sizes, 1)
    );

    this.material = new THREE.PointsMaterial({
      size: 3,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);

    this.initializeParticles();
  }

  private initializeParticles(): void {
    const segments = this.simulator.getSegments();

    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      const segment = segments[Math.floor(Math.random() * segments.length)];
      const reverse = Math.random() > 0.5;

      this.particles.push({
        segmentId: segment.id,
        progress: Math.random(),
        speed: 20 + Math.random() * 60,
        baseSpeed: 20 + Math.random() * 60,
        active: true,
        reverse,
      });

      this.updateParticleBuffer(i, segment);
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
  }

  private updateParticleBuffer(index: number, segment: StreetSegment): void {
    const particle = this.particles[index];
    const pos = this.getPositionOnPath(segment, particle.progress, particle.reverse);
    const [r, g, b] = SPEED_COLOR_SCALE(particle.speed);
    const size = sizeBySpeed(particle.speed);

    const i3 = index * 3;
    this.positions[i3] = pos.x;
    this.positions[i3 + 1] = pos.y;
    this.positions[i3 + 2] = pos.z;

    this.colors[i3] = r;
    this.colors[i3 + 1] = g;
    this.colors[i3 + 2] = b;

    this.sizes[index] = size;
  }

  private getPositionOnPath(
    segment: StreetSegment,
    progress: number,
    reverse: boolean
  ): THREE.Vector3 {
    const points = segment.pathPoints;
    const t = reverse ? 1 - progress : progress;
    const scaledT = t * (points.length - 1);
    const idx = Math.floor(scaledT);
    const frac = scaledT - idx;

    const p0 = points[Math.min(idx, points.length - 1)];
    const p1 = points[Math.min(idx + 1, points.length - 1)];

    return new THREE.Vector3(
      lerp(p0.x, p1.x, frac),
      lerp(p0.y, p1.y, frac) + 0.15,
      lerp(p0.z, p1.z, frac)
    );
  }

  private chooseNextSegment(current: StreetSegment, atEnd: boolean): StreetSegment | null {
    const adjacent = this.simulator.getAdjacentSegments(current, atEnd);
    if (adjacent.length === 0) return null;

    const filtered = adjacent.filter(
      (s) => s.id !== current.id
    );
    if (filtered.length === 0) return adjacent[0];

    return filtered[Math.floor(Math.random() * filtered.length)];
  }

  update(frame: TrafficFrame, deltaTime: number, transitionT: number = 1.0): void {
    void transitionT;
    const segments = this.simulator.getSegments();

    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      const particle = this.particles[i];
      if (!particle.active) continue;

      const segment = this.segmentCache.get(particle.segmentId);
      if (!segment) continue;

      const avgSpeed = this.getSegmentSpeed(segment, frame);
      particle.speed = lerp(particle.speed, avgSpeed, clamp(deltaTime * 2, 0, 1));

      const speedFactor = (particle.speed / 40) * deltaTime * 0.8;
      particle.progress += speedFactor;

      if (particle.progress >= 1) {
        particle.progress -= 1;
        const atEnd = !particle.reverse;
        const next = this.chooseNextSegment(segment, atEnd);

        if (next) {
          particle.segmentId = next.id;
          if (atEnd) {
            particle.reverse = next.to !== segment.to;
          } else {
            particle.reverse = next.from !== segment.from;
          }
        } else {
          particle.reverse = !particle.reverse;
        }

        if (Math.random() < 0.02) {
          const newSeg = segments[Math.floor(Math.random() * segments.length)];
          particle.segmentId = newSeg.id;
          particle.progress = 0;
          particle.reverse = Math.random() > 0.5;
        }
      }

      particle.progress = clamp(particle.progress, 0, 1);
      const currentSeg = this.segmentCache.get(particle.segmentId) || segment;
      this.updateParticleBuffer(i, currentSeg);
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
  }

  private getSegmentSpeed(segment: StreetSegment, frame: TrafficFrame): number {
    const fromData = frame.data.get(segment.from);
    const toData = frame.data.get(segment.to);

    const fromSpeed = fromData?.speed ?? 40;
    const toSpeed = toData?.speed ?? 40;

    return (fromSpeed + toSpeed) / 2;
  }

  setParticleCount(count: number): void {
    console.warn(`Performance degradation: reducing particles from ${this.PARTICLE_COUNT} to ${count}`);
  }

  dispose(): void {
    this.scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
  }
}
