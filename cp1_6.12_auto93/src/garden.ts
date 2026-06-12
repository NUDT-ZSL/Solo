import * as THREE from 'three';
import gsap from 'gsap';
import {
  CrystalClusterData,
  createCrystalCluster,
  updateCrystalHeight,
  updateCrystalColor,
} from './crystal';

export interface HabitData {
  id: string;
  name: string;
  colorTheme: string;
  icon: string;
  streak: number;
  todayDone: boolean;
  position: { x: number; z: number };
}

const PARTICLE_COUNT = 300;
const GARDEN_RADIUS = 5;
const BLESSINGS = [
  '太棒了，继续加油！',
  '坚持就是胜利！',
  '每一滴汗水都在发光！',
  '又一天，又一步！',
  '水晶因你而闪耀！',
  '你的坚持正在结晶！',
  '保持节奏，稳步前行！',
  '奇迹在每一天中累积！',
  '真了不起！',
  '你是最闪亮的！',
];

export class GardenManager {
  private scene: THREE.Scene;
  private clusters: Map<string, CrystalClusterData> = new Map();
  private habits: Map<string, HabitData> = new Map();
  private particles: THREE.Points | null = null;
  private particleVelocities: Float32Array = new Float32Array(0);
  private groundMesh: THREE.Mesh | null = null;
  private nextPositionIndex = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createGround();
    this.createParticles();
  }

  private createGround(): void {
    const groundGeom = new THREE.CircleGeometry(GARDEN_RADIUS + 1, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a1a,
      roughness: 0.9,
      metalness: 0.1,
      transparent: true,
      opacity: 0.8,
    });
    this.groundMesh = new THREE.Mesh(groundGeom, groundMat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.position.y = -0.01;
    this.scene.add(this.groundMesh);
  }

  private getNextPosition(): { x: number; z: number } {
    if (this.nextPositionIndex === 0) {
      this.nextPositionIndex++;
      return { x: 0, z: 0 };
    }

    const ring = Math.ceil(Math.sqrt(this.nextPositionIndex));
    const indexInRing = this.nextPositionIndex - (ring - 1) * (ring - 1);
    const angle = (indexInRing / (2 * ring - 1)) * Math.PI * 2 + ring * 0.5;
    const dist = ring * 0.9;

    this.nextPositionIndex++;
    return {
      x: Math.cos(angle) * dist,
      z: Math.sin(angle) * dist,
    };
  }

  createParticles(): void {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    this.particleVelocities = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 14;
      positions[i3 + 1] = Math.random() * 6;
      positions[i3 + 2] = (Math.random() - 0.5) * 14;

      this.particleVelocities[i3] = (Math.random() - 0.5) * 0.003;
      this.particleVelocities[i3 + 1] = Math.random() * 0.005 + 0.001;
      this.particleVelocities[i3 + 2] = (Math.random() - 0.5) * 0.003;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0x7c3aed,
      size: 0.04,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.particles = new THREE.Points(geom, mat);
    this.scene.add(this.particles);
  }

  updateParticles(): void {
    if (!this.particles) return;
    const positions = this.particles.geometry.attributes.position;
    const arr = positions.array as Float32Array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      arr[i3] += this.particleVelocities[i3];
      arr[i3 + 1] += this.particleVelocities[i3 + 1];
      arr[i3 + 2] += this.particleVelocities[i3 + 2];

      if (arr[i3 + 1] > 6) {
        arr[i3 + 1] = 0;
        arr[i3] = (Math.random() - 0.5) * 14;
        arr[i3 + 2] = (Math.random() - 0.5) * 14;
      }
    }

    positions.needsUpdate = true;
  }

  addHabit(habit: HabitData): CrystalClusterData {
    const cluster = createCrystalCluster(habit.streak, habit.colorTheme, true);
    cluster.id = habit.id;
    cluster.group.userData.clusterId = habit.id;

    const pos = habit.position.x !== 0 || habit.position.z !== 0
      ? habit.position
      : this.getNextPosition();

    cluster.group.position.set(pos.x, 0, pos.z);
    this.scene.add(cluster.group);

    this.clusters.set(habit.id, cluster);
    this.habits.set(habit.id, habit);

    this.animateEmergence(cluster);

    return cluster;
  }

  private animateEmergence(cluster: CrystalClusterData): void {
    const targets: THREE.Mesh[] = [cluster.mainBody, cluster.mainTip, ...cluster.smallCrystals];

    gsap.to(cluster.group.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 1.2,
      ease: 'power2.out',
    });

    targets.forEach((mesh, index) => {
      const mat = mesh.material as THREE.MeshPhysicalMaterial;
      gsap.to(mat, {
        opacity: 0.88,
        duration: 1.2,
        ease: 'power2.out',
        delay: index * 0.05,
      });
    });
  }

  removeHabit(id: string): void {
    const cluster = this.clusters.get(id);
    if (!cluster) return;

    gsap.to(cluster.group.scale, {
      x: 0,
      y: 0,
      z: 0,
      duration: 0.6,
      ease: 'power2.in',
      onComplete: () => {
        this.scene.remove(cluster.group);
        cluster.group.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      },
    });

    this.clusters.delete(id);
    this.habits.delete(id);
  }

  checkIn(id: string): void {
    const cluster = this.clusters.get(id);
    const habit = this.habits.get(id);
    if (!cluster || !habit) return;

    habit.streak += 1;
    habit.todayDone = true;

    updateCrystalHeight(cluster, habit.streak);

    this.animateLightFlow(cluster);
    this.animateFlash(cluster);
  }

  private animateLightFlow(cluster: CrystalClusterData): void {
    if (!cluster.lightBand) return;

    const band = cluster.lightBand;
    band.visible = true;

    const bodyHeight = cluster.mainBody.position.y * 2;
    const startY = 0;
    const endY = bodyHeight + (cluster.mainTip.position.y - bodyHeight / 2);

    band.position.y = startY;

    const bandMat = band.material as THREE.MeshBasicMaterial;
    bandMat.opacity = 0.8;

    gsap.to(band.position, {
      y: endY,
      duration: 0.6,
      ease: 'none',
      onComplete: () => {
        band.visible = false;
        bandMat.opacity = 0;
      },
    });

    gsap.to(bandMat, {
      opacity: 0,
      duration: 0.6,
      ease: 'power1.in',
    });
  }

  private animateFlash(cluster: CrystalClusterData): void {
    const meshes: THREE.Mesh[] = [cluster.mainBody, cluster.mainTip, ...cluster.smallCrystals];

    meshes.forEach((mesh) => {
      const mat = mesh.material as THREE.MeshPhysicalMaterial;
      const originalOpacity = mat.opacity;

      gsap.to(mat, {
        opacity: 0.7,
        duration: 0.1,
        onComplete: () => {
          gsap.to(mat, {
            opacity: originalOpacity,
            duration: 0.15,
            ease: 'power2.out',
          });
        },
      });
    });
  }

  update(delta: number): void {
    void delta;
    this.updateParticles();
  }

  getCluster(id: string): CrystalClusterData | undefined {
    return this.clusters.get(id);
  }

  getHabit(id: string): HabitData | undefined {
    return this.habits.get(id);
  }

  getAllHabits(): HabitData[] {
    return Array.from(this.habits.values());
  }

  getRandomBlessing(): string {
    return BLESSINGS[Math.floor(Math.random() * BLESSINGS.length)]!;
  }

  resetDayForAll(): void {
    this.habits.forEach((habit) => {
      habit.todayDone = false;
    });
  }
}
