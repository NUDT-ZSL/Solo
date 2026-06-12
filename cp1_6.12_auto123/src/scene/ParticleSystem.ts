import * as THREE from 'three';
import type { ParticleConfig, ConnectionConfig } from '../types';
import { hexToRgb } from '../utils/colorUtils';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: string;
  size: number;
  path: THREE.CubicBezierCurve3 | null;
  pathProgress: number;
  pathFrames: number;
}

interface Connection {
  p1Index: number;
  p2Index: number;
  distance: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  private particleMesh: THREE.Points | null = null;
  private lineMesh: THREE.LineSegments | null = null;
  private particleConfig: ParticleConfig;
  private connectionConfig: ConnectionConfig;
  private frameCount: number = 0;
  private connections: Connection[] = [];
  private connectionCount: number = 0;
  private camera: THREE.PerspectiveCamera;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private boundsMesh: THREE.Mesh | null = null;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    particleConfig: ParticleConfig,
    connectionConfig: ConnectionConfig
  ) {
    this.scene = scene;
    this.camera = camera;
    this.particleConfig = particleConfig;
    this.connectionConfig = connectionConfig;

    const boundsGeom = new THREE.BoxGeometry(
      particleConfig.boundsX[1] - particleConfig.boundsX[0],
      particleConfig.boundsY[1] - particleConfig.boundsY[0],
      particleConfig.boundsZ[1] - particleConfig.boundsZ[0]
    );
    const boundsMat = new THREE.MeshBasicMaterial({ visible: false });
    this.boundsMesh = new THREE.Mesh(boundsGeom, boundsMat);
    this.boundsMesh.position.set(0, 0, 0);
    this.scene.add(this.boundsMesh);

    this.initParticles();
    this.createParticleMesh();
    this.createLineMesh();
  }

  private initParticles(): void {
    this.particles = [];
    const { count, colors, sizeMin, sizeMax, boundsX, boundsY, boundsZ, centerDensityRatio, centerRange } = this.particleConfig;

    for (let i = 0; i < count; i++) {
      const color = colors[i % colors.length];
      const size = sizeMin + Math.random() * (sizeMax - sizeMin);

      const position = this.generateWeightedPosition(
        boundsX, boundsY, boundsZ, centerDensityRatio, centerRange
      );

      const particle: Particle = {
        position,
        velocity: new THREE.Vector3(),
        color,
        size,
        path: null,
        pathProgress: 0,
        pathFrames: 0,
      };

      this.generateNewPath(particle);
      this.particles.push(particle);
    }
  }

  private generateWeightedPosition(
    boundsX: [number, number],
    boundsY: [number, number],
    boundsZ: [number, number],
    centerRatio: number,
    centerRange: number
  ): THREE.Vector3 {
    const rand = Math.random();
    const inCenter = rand < centerRatio;

    const getAxisPos = (bounds: [number, number]): number => {
      if (inCenter) {
        const halfRange = centerRange;
        return -halfRange + Math.random() * (halfRange * 2);
      } else {
        const outer = (bounds[1] - bounds[0]) / 2 - centerRange;
        const side = Math.random() > 0.5 ? 1 : -1;
        return side * (centerRange + Math.random() * outer);
      }
    };

    return new THREE.Vector3(
      getAxisPos(boundsX),
      getAxisPos(boundsY),
      getAxisPos(boundsZ)
    );
  }

  private generateNewPath(particle: Particle, startPoint?: THREE.Vector3): void {
    const start = startPoint || particle.position.clone();
    const { boundsX, boundsY, boundsZ } = this.particleConfig;

    const randInBounds = (bounds: [number, number], base: number): number => {
      const range = (bounds[1] - bounds[0]) * 0.4;
      let val = base + (Math.random() - 0.5) * range * 2;
      val = Math.max(bounds[0], Math.min(bounds[1], val));
      return val;
    };

    const cp1 = new THREE.Vector3(
      randInBounds(boundsX, start.x),
      randInBounds(boundsY, start.y),
      randInBounds(boundsZ, start.z)
    );

    const cp2 = new THREE.Vector3(
      randInBounds(boundsX, start.x),
      randInBounds(boundsY, start.y),
      randInBounds(boundsZ, start.z)
    );

    const end = new THREE.Vector3(
      randInBounds(boundsX, start.x),
      randInBounds(boundsY, start.y),
      randInBounds(boundsZ, start.z)
    );

    particle.path = new THREE.CubicBezierCurve3(start, cp1, cp2, end);
    particle.pathProgress = 0;
    particle.pathFrames = 0;
  }

  private createParticleMesh(): void {
    if (this.particleMesh) {
      this.scene.remove(this.particleMesh);
      this.particleMesh.geometry.dispose();
      (this.particleMesh.material as THREE.Material).dispose();
    }

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particles.length * 3);
    const colors = new Float32Array(this.particles.length * 3);

    this.particles.forEach((p, i) => {
      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;

      const { r, g, b } = hexToRgb(p.color);
      colors[i * 3] = r / 255;
      colors[i * 3 + 1] = g / 255;
      colors[i * 3 + 2] = b / 255;
    });

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
    });

    this.particleMesh = new THREE.Points(geometry, material);
    this.scene.add(this.particleMesh);
  }

  private createLineMesh(): void {
    if (this.lineMesh) {
      this.scene.remove(this.lineMesh);
      this.lineMesh.geometry.dispose();
      (this.lineMesh.material as THREE.Material).dispose();
    }

    const maxLines = this.connectionConfig.maxConnections;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(maxLines * 6);
    const colors = new Float32Array(maxLines * 6);

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 1,
      linewidth: 1,
    });

    this.lineMesh = new THREE.LineSegments(geometry, material);
    this.scene.add(this.lineMesh);
  }

  update(): void {
    this.frameCount++;
    const { speed, pathRefreshFrames } = this.particleConfig;

    this.particles.forEach((particle) => {
      if (!particle.path) return;

      particle.pathFrames++;

      if (particle.pathFrames >= pathRefreshFrames || particle.pathProgress >= 1) {
        if (particle.pathProgress >= 1) {
          const endPoint = particle.path.getPoint(1);
          this.generateNewPath(particle, endPoint);
        } else {
          this.generateNewPath(particle, particle.position.clone());
        }
      }

      if (particle.path) {
        particle.pathProgress += speed;
        if (particle.pathProgress > 1) particle.pathProgress = 1;
        const point = particle.path.getPoint(particle.pathProgress);
        particle.position.copy(point);
      }
    });

    this.updateParticleMesh();
    this.updateConnections();
    this.updateLineMesh();
  }

  private updateParticleMesh(): void {
    if (!this.particleMesh) return;

    const positions = this.particleMesh.geometry.attributes.position.array as Float32Array;
    this.particles.forEach((p, i) => {
      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;
    });
    this.particleMesh.geometry.attributes.position.needsUpdate = true;
  }

  private updateConnections(): void {
    const { maxDistance, maxConnections } = this.connectionConfig;
    const { width, height } = this.camera.getViewSize
      ? { width: 0, height: 0 }
      : this.getViewDimensions();

    const vFov = this.camera.fov * Math.PI / 180;
    const aspect = this.camera.aspect;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);

    this.connections = [];
    const maxDist = maxDistance;

    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const p1 = this.particles[i];
        const p2 = this.particles[j];

        const dx = p1.position.x - p2.position.x;
        const dy = p1.position.y - p2.position.y;
        const dz = p1.position.z - p2.position.z;
        const dist3d = Math.sqrt(dx * dx + dy * dy + dz * dz);

        const avgZ = (p1.position.z + p2.position.z) / 2;
        const camDist = this.camera.position.z - avgZ;
        const pixelPerUnit = (height / 2) / Math.tan(vFov / 2) / Math.abs(camDist || 1);

        const screenDist = dist3d * pixelPerUnit;

        if (screenDist < maxDist) {
          this.connections.push({
            p1Index: i,
            p2Index: j,
            distance: screenDist,
          });
        }
      }
    }

    this.connections.sort((a, b) => a.distance - b.distance);

    if (this.connections.length > maxConnections) {
      this.connections = this.connections.slice(0, maxConnections);
    }

    this.connectionCount = this.connections.length;
  }

  private getViewDimensions(): { width: number; height: number } {
    const renderer = this.scene.userData.renderer as THREE.WebGLRenderer | undefined;
    if (renderer) {
      const size = new THREE.Vector2();
      renderer.getSize(size);
      return { width: size.x, height: size.y };
    }
    return { width: window.innerWidth, height: window.innerHeight };
  }

  private updateLineMesh(): void {
    if (!this.lineMesh) return;

    const positions = this.lineMesh.geometry.attributes.position.array as Float32Array;
    const colors = this.lineMesh.geometry.attributes.color.array as Float32Array;
    const { opacityMin, opacityMax, maxDistance } = this.connectionConfig;

    for (let i = 0; i < this.connections.length; i++) {
      const conn = this.connections[i];
      const p1 = this.particles[conn.p1Index];
      const p2 = this.particles[conn.p2Index];

      positions[i * 6] = p1.position.x;
      positions[i * 6 + 1] = p1.position.y;
      positions[i * 6 + 2] = p1.position.z;
      positions[i * 6 + 3] = p2.position.x;
      positions[i * 6 + 4] = p2.position.y;
      positions[i * 6 + 5] = p2.position.z;

      const distRatio = conn.distance / maxDistance;
      const alpha = opacityMax - (opacityMax - opacityMin) * distRatio;

      const c1 = hexToRgb(p1.color);
      const c2 = hexToRgb(p2.color);

      colors[i * 6] = (c1.r / 255) * alpha;
      colors[i * 6 + 1] = (c1.g / 255) * alpha;
      colors[i * 6 + 2] = (c1.b / 255) * alpha;
      colors[i * 6 + 3] = (c2.r / 255) * alpha;
      colors[i * 6 + 4] = (c2.g / 255) * alpha;
      colors[i * 6 + 5] = (c2.b / 255) * alpha;
    }

    const drawCount = this.connections.length * 2;
    this.lineMesh.geometry.setDrawRange(0, drawCount);
    this.lineMesh.geometry.attributes.position.needsUpdate = true;
    this.lineMesh.geometry.attributes.color.needsUpdate = true;
  }

  getConnectionCount(): number {
    return this.connectionCount;
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  setParticleConfig(config: Partial<ParticleConfig>): void {
    this.particleConfig = { ...this.particleConfig, ...config };
    if (config.count !== undefined || config.colors !== undefined ||
        config.sizeMin !== undefined || config.sizeMax !== undefined) {
      this.initParticles();
      this.createParticleMesh();
    }
  }

  setConnectionConfig(config: Partial<ConnectionConfig>): void {
    this.connectionConfig = { ...this.connectionConfig, ...config };
    if (config.maxConnections !== undefined) {
      this.createLineMesh();
    }
  }

  reset(): void {
    this.frameCount = 0;
    this.initParticles();
    this.createParticleMesh();
    this.createLineMesh();
  }

  dispose(): void {
    if (this.particleMesh) {
      this.scene.remove(this.particleMesh);
      this.particleMesh.geometry.dispose();
      (this.particleMesh.material as THREE.Material).dispose();
    }
    if (this.lineMesh) {
      this.scene.remove(this.lineMesh);
      this.lineMesh.geometry.dispose();
      (this.lineMesh.material as THREE.Material).dispose();
    }
    if (this.boundsMesh) {
      this.scene.remove(this.boundsMesh);
      this.boundsMesh.geometry.dispose();
      (this.boundsMesh.material as THREE.Material).dispose();
    }
    this.particles = [];
    this.connections = [];
  }
}
