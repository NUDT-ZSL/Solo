import * as THREE from 'three';
import { MazeGenerator } from './maze';

const PLAYER_RADIUS = 0.3;
const MOVE_SPEED = 2.0;
const TRAIL_MAX_PARTICLES = 200;
const TRAIL_LIFETIME = 0.5;
const STEP_DISTANCE = 2.0;

interface TrailParticle {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

export class Player {
  public mesh: THREE.Mesh;
  public light: THREE.PointLight;
  public position: THREE.Vector3;
  private velocity: THREE.Vector3;
  private scene: THREE.Scene;
  private maze: MazeGenerator;
  private keys: Set<string> = new Set();
  private trailGroup: THREE.Group;
  private trailParticles: TrailParticle[] = [];
  private trailTimer: number = 0;
  private distanceTraveled: number = 0;
  public steps: number = 0;

  constructor(scene: THREE.Scene, maze: MazeGenerator) {
    this.scene = scene;
    this.maze = maze;
    this.position = maze.startPos.clone();
    this.velocity = new THREE.Vector3();

    const geometry = new THREE.SphereGeometry(PLAYER_RADIUS, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0xFF8C00,
      emissive: 0xFF8C00,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.8,
      roughness: 0.2,
      metalness: 0.5
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.position);
    this.mesh.castShadow = true;
    this.scene.add(this.mesh);

    this.light = new THREE.PointLight(0xFF8C00, 1.0, 4.0);
    this.light.position.copy(this.position);
    this.light.castShadow = true;
    this.scene.add(this.light);

    this.trailGroup = new THREE.Group();
    this.scene.add(this.trailGroup);

    this.setupInputListeners();
  }

  private setupInputListeners(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
  }

  update(delta: number, cameraDirection: THREE.Vector3): void {
    const forward = cameraDirection.clone();
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    let moveX = 0;
    let moveZ = 0;

    if (this.keys.has('w')) {
      moveX += forward.x;
      moveZ += forward.z;
    }
    if (this.keys.has('s')) {
      moveX -= forward.x;
      moveZ -= forward.z;
    }
    if (this.keys.has('d')) {
      moveX += right.x;
      moveZ += right.z;
    }
    if (this.keys.has('a')) {
      moveX -= right.x;
      moveZ -= right.z;
    }

    const moveLength = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (moveLength > 0) {
      moveX /= moveLength;
      moveZ /= moveLength;
    }

    const moveDistance = MOVE_SPEED * delta;
    const newPosition = this.position.clone();

    const testX = this.position.clone();
    testX.x += moveX * moveDistance;
    if (!this.maze.checkCollision(testX, PLAYER_RADIUS)) {
      newPosition.x = testX.x;
    }

    const testZ = this.position.clone();
    testZ.z += moveZ * moveDistance;
    if (!this.maze.checkCollision(testZ, PLAYER_RADIUS)) {
      newPosition.z = testZ.z;
    }

    const moved = this.position.distanceTo(newPosition);
    this.distanceTraveled += moved;

    while (this.distanceTraveled >= STEP_DISTANCE) {
      this.distanceTraveled -= STEP_DISTANCE;
      this.steps++;
    }

    this.position.copy(newPosition);
    this.mesh.position.copy(this.position);
    this.light.position.copy(this.position);

    if (moved > 0) {
      this.trailTimer += delta;
      if (this.trailTimer >= 0.02) {
        this.trailTimer = 0;
        this.addTrailParticle();
      }
    }

    this.updateTrail(delta);
  }

  private addTrailParticle(): void {
    if (this.trailParticles.length >= TRAIL_MAX_PARTICLES) {
      const oldest = this.trailParticles.shift();
      if (oldest) {
        this.trailGroup.remove(oldest.mesh);
        oldest.mesh.geometry.dispose();
        (oldest.mesh.material as THREE.Material).dispose();
      }
    }

    const geometry = new THREE.RingGeometry(0.1, 0.15, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0xFF8C00,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const particle = new THREE.Mesh(geometry, material);
    particle.position.copy(this.position);
    particle.position.y = 0.1;
    particle.rotation.x = -Math.PI / 2;

    this.trailGroup.add(particle);
    this.trailParticles.push({
      mesh: particle,
      life: TRAIL_LIFETIME,
      maxLife: TRAIL_LIFETIME
    });
  }

  private updateTrail(delta: number): void {
    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      const particle = this.trailParticles[i];
      particle.life -= delta;

      const t = particle.life / particle.maxLife;
      (particle.mesh.material as THREE.MeshBasicMaterial).opacity = 0.6 * t;
      const scale = 0.5 + t * 0.5;
      particle.mesh.scale.set(scale, scale, scale);

      if (particle.life <= 0) {
        this.trailGroup.remove(particle.mesh);
        particle.mesh.geometry.dispose();
        (particle.mesh.material as THREE.Material).dispose();
        this.trailParticles.splice(i, 1);
      }
    }
  }

  reset(): void {
    this.position.copy(this.maze.startPos);
    this.mesh.position.copy(this.position);
    this.light.position.copy(this.position);
    this.steps = 0;
    this.distanceTraveled = 0;

    for (const particle of this.trailParticles) {
      this.trailGroup.remove(particle.mesh);
      particle.mesh.geometry.dispose();
      (particle.mesh.material as THREE.Material).dispose();
    }
    this.trailParticles = [];
  }

  setMaze(maze: MazeGenerator): void {
    this.maze = maze;
    this.reset();
  }

  dispose(): void {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();

    this.scene.remove(this.light);

    for (const particle of this.trailParticles) {
      this.trailGroup.remove(particle.mesh);
      particle.mesh.geometry.dispose();
      (particle.mesh.material as THREE.Material).dispose();
    }
    this.scene.remove(this.trailGroup);
  }
}

export function getStepColor(steps: number): string {
  if (steps > 100) {
    return '#FF3333';
  }
  const t = steps / 100;
  const startColor = new THREE.Color('#00FF88');
  const endColor = new THREE.Color('#FF6666');
  const interpolated = startColor.clone().lerp(endColor, t);
  return '#' + interpolated.getHexString();
}
