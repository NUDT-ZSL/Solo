import * as THREE from 'three';
import { OceanScene } from './oceanScene';

const SCENE_SIZE = 400;
const CORAL_MIN = 80;
const CORAL_MAX = 120;
const FISH_COUNT = 60;
const PATH_SWITCH_INTERVAL = 10;
const SCHOOL_PULSE_INTERVAL = 5;

const CORAL_COLOR_START = new THREE.Color('#FF6B6B');
const CORAL_COLOR_END = new THREE.Color('#FFD93D');
const FISH_COLOR_START = new THREE.Color('#D3D3D3');
const FISH_COLOR_END = new THREE.Color('#A9A9A9');

interface CoralData {
  group: THREE.Group;
  basePos: THREE.Vector3;
  swayOffset: number;
}

interface FishData {
  offset: THREE.Vector3;
  speed: number;
  phase: number;
  baseScale: number;
}

interface BezierPath {
  p0: THREE.Vector3;
  p1: THREE.Vector3;
  p2: THREE.Vector3;
  p3: THREE.Vector3;
}

export class Creatures {
  public group: THREE.Group;
  private scene: THREE.Scene;
  private oceanScene: OceanScene;
  private corals: CoralData[] = [];
  private fishGroup!: THREE.Group;
  private fishMesh!: THREE.InstancedMesh;
  private fishData: FishData[] = [];
  private dummy: THREE.Object3D;

  private schoolCenter: THREE.Vector3;
  private schoolTarget: THREE.Vector3;
  private schoolVelocity: THREE.Vector3;
  private currentPath: BezierPath;
  private nextPath: BezierPath;
  private pathProgress = 0;
  private pathTransitionProgress = 0;
  private timeSincePathSwitch = 0;
  private schoolPulsePhase = 0;
  private timeSincePulse = 0;

  constructor(scene: THREE.Scene, oceanScene: OceanScene) {
    this.scene = scene;
    this.oceanScene = oceanScene;
    this.group = new THREE.Group();
    this.dummy = new THREE.Object3D();

    this.schoolCenter = new THREE.Vector3(0, 10, 0);
    this.schoolTarget = this.randomSchoolTarget();
    this.schoolVelocity = new THREE.Vector3();

    this.currentPath = this.generatePath();
    this.nextPath = this.generatePath();

    this.createCorals();
    this.createFish();
    this.scene.add(this.group);
  }

  private randomSchoolTarget(): THREE.Vector3 {
    return new THREE.Vector3(
      (Math.random() - 0.5) * 200,
      5 + Math.random() * 35,
      (Math.random() - 0.5) * 200
    );
  }

  private generatePath(): BezierPath {
    const center = this.randomSchoolTarget();
    const radius = 40 + Math.random() * 30;
    const angle1 = Math.random() * Math.PI * 2;
    const angle2 = angle1 + Math.PI * 0.6 + Math.random() * Math.PI * 0.8;
    const angle3 = angle1 + Math.PI * 1.2 + Math.random() * Math.PI * 0.8;
    const angle4 = angle1 + Math.PI * 2;

    const y1 = center.y + (Math.random() - 0.5) * 20;
    const y2 = center.y + (Math.random() - 0.5) * 25;
    const y3 = center.y + (Math.random() - 0.5) * 20;
    const y4 = y1;

    return {
      p0: new THREE.Vector3(center.x + Math.cos(angle1) * radius, y1, center.z + Math.sin(angle1) * radius),
      p1: new THREE.Vector3(center.x + Math.cos(angle2) * radius * 1.3, y2, center.z + Math.sin(angle2) * radius * 1.3),
      p2: new THREE.Vector3(center.x + Math.cos(angle3) * radius * 1.3, y3, center.z + Math.sin(angle3) * radius * 1.3),
      p3: new THREE.Vector3(center.x + Math.cos(angle4) * radius, y4, center.z + Math.sin(angle4) * radius)
    };
  }

  private createCorals(): void {
    const count = Math.floor(Math.random() * (CORAL_MAX - CORAL_MIN + 1)) + CORAL_MIN;
    const half = SCENE_SIZE / 2 - 20;

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * (half * 2);
      const z = (Math.random() - 0.5) * (half * 2);
      const y = this.oceanScene.getTerrainHeight(x, z);

      const coralGroup = this.createSingleCoral();
      coralGroup.position.set(x, y, z);
      coralGroup.rotation.y = Math.random() * Math.PI * 2;

      const scale = 0.6 + Math.random() * 0.9;
      coralGroup.scale.setScalar(scale);

      this.corals.push({
        group: coralGroup,
        basePos: new THREE.Vector3(x, y, z),
        swayOffset: Math.random() * Math.PI * 2
      });

      this.group.add(coralGroup);
    }
  }

  private createSingleCoral(): THREE.Group {
    const group = new THREE.Group();
    const ringCount = 3 + Math.floor(Math.random() * 3);
    const colorT = Math.random();
    const baseColor = CORAL_COLOR_START.clone().lerp(CORAL_COLOR_END, colorT);

    for (let i = 0; i < ringCount; i++) {
      const t = i / ringCount;
      const radius = 2.5 - t * 1.2;
      const tube = 0.3 + (1 - t) * 0.3;
      const y = i * 1.8 + 0.5;

      const ringGeo = new THREE.TorusGeometry(radius, tube, 10, 20);
      const color = baseColor.clone().offsetHSL(0, 0, (Math.random() - 0.5) * 0.15);
      const ringMat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.7,
        metalness: 0.1,
        flatShading: true,
        transparent: true,
        opacity: 0.95
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      group.add(ring);

      if (i > 0 && Math.random() > 0.4) {
        const sphereGeo = new THREE.SphereGeometry(radius * 0.5, 10, 8);
        const sphereMat = new THREE.MeshStandardMaterial({
          color: baseColor.clone().offsetHSL(0.05, 0, -0.1),
          roughness: 0.6,
          metalness: 0.15,
          flatShading: true,
          transparent: true,
          opacity: 0.9
        });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        sphere.position.set(
          (Math.random() - 0.5) * radius * 1.2,
          y + Math.random() * 0.8,
          (Math.random() - 0.5) * radius * 1.2
        );
        group.add(sphere);
      }

      if (i === ringCount - 1) {
        const topGeo = new THREE.SphereGeometry(radius * 0.7, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2);
        const topMat = new THREE.MeshStandardMaterial({
          color: baseColor.clone().offsetHSL(0, 0, 0.1),
          roughness: 0.55,
          metalness: 0.2,
          flatShading: true,
          transparent: true,
          opacity: 0.95
        });
        const top = new THREE.Mesh(topGeo, topMat);
        top.position.y = y + radius * 0.5;
        group.add(top);
      }
    }

    const branchCount = Math.floor(Math.random() * 3);
    for (let b = 0; b < branchCount; b++) {
      const branchY = 1 + Math.random() * 3;
      const branchAngle = Math.random() * Math.PI * 2;
      const branchLen = 1.5 + Math.random() * 2;

      const branchGeo = new THREE.CylinderGeometry(0.2, 0.4, branchLen, 8);
      const branchMat = new THREE.MeshStandardMaterial({
        color: baseColor.clone().offsetHSL(-0.02, 0, -0.05),
        roughness: 0.75,
        metalness: 0.1,
        flatShading: true,
        transparent: true,
        opacity: 0.92
      });
      const branch = new THREE.Mesh(branchGeo, branchMat);
      branch.position.set(
        Math.cos(branchAngle) * 0.8,
        branchY,
        Math.sin(branchAngle) * 0.8
      );
      branch.rotation.set(
        (Math.random() - 0.5) * 0.5,
        branchAngle,
        (Math.random() - 0.5) * 0.5
      );
      group.add(branch);
    }

    return group;
  }

  private createFish(): void {
    this.fishGroup = new THREE.Group();

    const shape = new THREE.Shape();
    shape.moveTo(1.5, 0);
    shape.lineTo(-0.8, 0.6);
    shape.lineTo(-0.5, 0);
    shape.lineTo(-0.8, -0.6);
    shape.closePath();

    const fishGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.15,
      bevelEnabled: false
    });
    fishGeo.center();
    fishGeo.scale(0.8, 0.8, 0.8);

    const fishMat = new THREE.MeshStandardMaterial({
      color: 0xD3D3D3,
      roughness: 0.35,
      metalness: 0.4,
      side: THREE.DoubleSide,
      flatShading: true
    });

    this.fishMesh = new THREE.InstancedMesh(fishGeo, fishMat, FISH_COUNT);
    this.fishMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const colors = new Float32Array(FISH_COUNT * 3);
    for (let i = 0; i < FISH_COUNT; i++) {
      const t = Math.random();
      const color = FISH_COLOR_START.clone().lerp(FISH_COLOR_END, t);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      const angle = Math.random() * Math.PI * 2;
      const dist = 3 + Math.random() * 15;
      this.fishData.push({
        offset: new THREE.Vector3(
          Math.cos(angle) * dist,
          (Math.random() - 0.5) * 8,
          Math.sin(angle) * dist
        ),
        speed: 0.85 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
        baseScale: 0.9 + Math.random() * 0.6
      });
    }
    this.fishMesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);

    this.fishGroup.add(this.fishMesh);
    this.group.add(this.fishGroup);
  }

  private cubicBezier(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number, out: THREE.Vector3): void {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    out.set(
      uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
      uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
      uuu * p0.z + 3 * uu * t * p1.z + 3 * u * tt * p2.z + ttt * p3.z
    );
  }

  public getSchoolCenter(): THREE.Vector3 {
    return this.schoolCenter.clone();
  }

  public getCoralGroup(): THREE.Group {
    return this.group;
  }

  public update(delta: number, elapsed: number, cameraPosition: THREE.Vector3): void {
    for (const coral of this.corals) {
      const sway = Math.sin(elapsed * 1.2 + coral.swayOffset) * 0.03;
      const sway2 = Math.cos(elapsed * 0.9 + coral.swayOffset * 1.3) * 0.02;
      coral.group.rotation.z = sway;
      coral.group.rotation.x = sway2;
    }

    this.timeSincePathSwitch += delta;
    if (this.timeSincePathSwitch >= PATH_SWITCH_INTERVAL) {
      this.timeSincePathSwitch = 0;
      this.currentPath = this.nextPath;
      this.nextPath = this.generatePath();
      this.pathProgress = 0;
    }

    this.pathProgress += delta * 0.04;
    if (this.pathProgress > 1) this.pathProgress = 1;

    this.pathTransitionProgress = this.timeSincePathSwitch / PATH_SWITCH_INTERVAL;

    const currentCenter = new THREE.Vector3();
    this.cubicBezier(this.currentPath.p0, this.currentPath.p1, this.currentPath.p2, this.currentPath.p3, this.pathProgress, currentCenter);

    const nextCenter = new THREE.Vector3();
    this.cubicBezier(this.nextPath.p0, this.nextPath.p1, this.nextPath.p2, this.nextPath.p3, 0, nextCenter);

    const smoothT = this.smoothstep(this.pathTransitionProgress * 2, 0, 1);
    this.schoolCenter.lerpVectors(currentCenter, nextCenter, Math.min(1, smoothT));

    const half = SCENE_SIZE / 2 - 30;
    this.schoolCenter.x = Math.max(-half, Math.min(half, this.schoolCenter.x));
    this.schoolCenter.z = Math.max(-half, Math.min(half, this.schoolCenter.z));
    this.schoolCenter.y = Math.max(2, Math.min(50, this.schoolCenter.y));

    const distToCamera = this.schoolCenter.distanceTo(cameraPosition);
    if (distToCamera < 20) {
      const away = this.schoolCenter.clone().sub(cameraPosition).normalize();
      this.schoolCenter.add(away.multiplyScalar((20 - distToCamera) * delta * 3));
    }

    this.timeSincePulse += delta;
    if (this.timeSincePulse >= SCHOOL_PULSE_INTERVAL) {
      this.timeSincePulse = 0;
    }
    const pulseT = (this.timeSincePulse / SCHOOL_PULSE_INTERVAL) * Math.PI * 2;
    const pulseFactor = 0.85 + Math.sin(pulseT) * 0.25;

    for (let i = 0; i < FISH_COUNT; i++) {
      const fish = this.fishData[i];

      const moveAngle = elapsed * fish.speed + fish.phase;
      const wanderX = Math.sin(moveAngle * 1.3) * 3;
      const wanderZ = Math.cos(moveAngle * 1.1) * 3;
      const wanderY = Math.sin(moveAngle * 0.7) * 1.5;

      const spreadMult = pulseFactor;

      const fx = this.schoolCenter.x + fish.offset.x * spreadMult + wanderX;
      const fy = this.schoolCenter.y + fish.offset.y * spreadMult + wanderY;
      const fz = this.schoolCenter.z + fish.offset.z * spreadMult + wanderZ;

      const forwardAngle = elapsed * fish.speed * 0.8 + fish.phase * 0.5;
      const dirX = Math.cos(forwardAngle);
      const dirZ = Math.sin(forwardAngle);
      const yaw = Math.atan2(dirZ, dirX);
      const pitch = Math.sin(elapsed * 0.8 + fish.phase) * 0.15;

      const wobble = Math.sin(elapsed * 8 + fish.phase * 3) * 0.1;

      this.dummy.position.set(fx, fy, fz);
      this.dummy.rotation.set(pitch, yaw + wobble, 0);
      this.dummy.scale.setScalar(fish.baseScale);
      this.dummy.updateMatrix();
      this.fishMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.fishMesh.instanceMatrix.needsUpdate = true;
  }

  private smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  public dispose(): void {
    for (const coral of this.corals) {
      coral.group.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
    }
    if (this.fishMesh) {
      this.fishMesh.geometry.dispose();
      (this.fishMesh.material as THREE.Material).dispose();
    }
    this.scene.remove(this.group);
  }
}
