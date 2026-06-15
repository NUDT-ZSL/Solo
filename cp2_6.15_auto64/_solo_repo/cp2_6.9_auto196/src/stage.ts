import * as THREE from 'three';
import { LightAnimator } from './effects';

export interface LightBeam {
  id: number;
  anchorIndex: number;
  color: THREE.Color;
  group: THREE.Group;
  cylinder: THREE.Mesh;
  particles: THREE.Points;
  particleVelocities: Float32Array;
  height: number;
  rotation: number;
  opacity: number;
  anchorGlow: THREE.Mesh;
}

export interface AnchorPoint {
  index: number;
  position: THREE.Vector3;
  angle: number;
  mesh: THREE.Mesh;
  glow: THREE.Mesh;
  occupied: boolean;
  lightId: number | null;
}

export class StageManager {
  scene: THREE.Scene;
  stageGroup: THREE.Group;
  anchors: AnchorPoint[] = [];
  lights: Map<number, LightBeam> = new Map();
  animator: LightAnimator;
  private nextLightId: number = 0;

  private readonly STAGE_RADIUS: number = 8;
  private readonly ANCHOR_COUNT: number = 12;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.stageGroup = new THREE.Group();
    this.scene.add(this.stageGroup);
    this.animator = new LightAnimator();
    this.createStage();
    this.createAnchors();
  }

  private createStage(): void {
    const stageGeometry = new THREE.CylinderGeometry(
      this.STAGE_RADIUS,
      this.STAGE_RADIUS,
      0.2,
      64
    );
    const stageMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x1a3a5c,
      transparent: true,
      opacity: 0.4,
      roughness: 0.1,
      metalness: 0.3,
      transmission: 0.5,
      thickness: 0.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.2
    });
    const stage = new THREE.Mesh(stageGeometry, stageMaterial);
    stage.position.y = -0.1;
    stage.receiveShadow = true;
    this.stageGroup.add(stage);

    const rimGeometry = new THREE.TorusGeometry(this.STAGE_RADIUS, 0.15, 8, 64);
    const rimMaterial = new THREE.MeshBasicMaterial({
      color: 0x5ac8fa,
      transparent: true,
      opacity: 0.3
    });
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.01;
    this.stageGroup.add(rim);

    const ambientLight = new THREE.AmbientLight(0x404080, 0.4);
    this.stageGroup.add(ambientLight);

    const blueLight = new THREE.PointLight(0x5ac8fa, 0.6, 30);
    blueLight.position.set(0, 5, 0);
    this.stageGroup.add(blueLight);
  }

  private createAnchors(): void {
    for (let i = 0; i < this.ANCHOR_COUNT; i++) {
      const angle = (i * 30 * Math.PI) / 180;
      const x = Math.cos(angle) * this.STAGE_RADIUS;
      const z = Math.sin(angle) * this.STAGE_RADIUS;
      const position = new THREE.Vector3(x, 0.05, z);

      const shape = new THREE.Shape();
      const hexSize = 1;
      for (let j = 0; j < 6; j++) {
        const a = (j * Math.PI) / 3;
        const px = Math.cos(a) * hexSize;
        const py = Math.sin(a) * hexSize;
        if (j === 0) shape.moveTo(px, py);
        else shape.lineTo(px, py);
      }
      shape.closePath();

      const points = shape.getPoints();
      const geometryPoints: THREE.Vector2[] = [];
      points.forEach(p => geometryPoints.push(new THREE.Vector2(p.x, p.y)));
      
      const hexGeometry = new THREE.BufferGeometry().setFromPoints(
        geometryPoints.map(v => new THREE.Vector3(v.x, 0, v.y))
      );

      const lineSegments = [];
      for (let j = 0; j < 6; j++) {
        lineSegments.push(new THREE.Vector3(geometryPoints[j].x, 0, geometryPoints[j].y));
        const next = (j + 1) % 6;
        lineSegments.push(new THREE.Vector3(geometryPoints[next].x, 0, geometryPoints[next].y));
      }
      const lineGeom = new THREE.BufferGeometry().setFromPoints(lineSegments);
      
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x666666,
        transparent: true,
        opacity: 0.5
      });
      const hexMesh = new THREE.LineSegments(lineGeom, lineMat);
      hexMesh.position.copy(position);
      this.stageGroup.add(hexMesh);

      const glowGeometry = new THREE.CircleGeometry(hexSize * 0.9, 6);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x888888,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.rotation.x = -Math.PI / 2;
      glow.position.copy(position);
      glow.position.y = 0.02;
      this.stageGroup.add(glow);

      this.anchors.push({
        index: i,
        position,
        angle,
        mesh: hexMesh as unknown as THREE.Mesh,
        glow,
        occupied: false,
        lightId: null
      });
    }
  }

  createLight(anchorIndex: number, colorHex: number): LightBeam | null {
    const anchor = this.anchors[anchorIndex];
    if (!anchor || anchor.occupied) return null;

    const id = this.nextLightId++;
    const height = 6;
    const color = new THREE.Color(colorHex);

    const group = new THREE.Group();
    group.position.copy(anchor.position);
    group.position.y = 0;

    const cylinderGeometry = new THREE.CylinderGeometry(0.5, 0.5, height, 16, 1, true);
    const cylinderMaterial = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    cylinder.position.y = height / 2;
    group.add(cylinder);

    const particleCount = 80;
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.8;
      positions[i * 3 + 1] = Math.random() * height;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
      velocities[i] = 0.5 + Math.random() * 0.5;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: colorHex,
      size: 0.1,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    particles.position.y = 0;
    group.add(particles);

    anchor.glow.material = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.6
    });
    (anchor.mesh.material as THREE.LineBasicMaterial).color.setHex(colorHex);
    (anchor.mesh.material as THREE.LineBasicMaterial).opacity = 1;

    const light: LightBeam = {
      id,
      anchorIndex,
      color,
      group,
      cylinder,
      particles,
      particleVelocities: velocities,
      height,
      rotation: 0,
      opacity: 0.5,
      anchorGlow: anchor.glow
    };

    this.stageGroup.add(group);
    this.lights.set(id, light);
    anchor.occupied = true;
    anchor.lightId = id;

    return light;
  }

  removeLight(id: number): void {
    const light = this.lights.get(id);
    if (!light) return;

    const anchor = this.anchors[light.anchorIndex];
    anchor.occupied = false;
    anchor.lightId = null;
    (anchor.mesh.material as THREE.LineBasicMaterial).color.setHex(0x666666);
    (anchor.mesh.material as THREE.LineBasicMaterial).opacity = 0.5;
    anchor.glow.material = new THREE.MeshBasicMaterial({
      color: 0x888888,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });

    this.stageGroup.remove(light.group);
    light.cylinder.geometry.dispose();
    (light.cylinder.material as THREE.Material).dispose();
    light.particles.geometry.dispose();
    (light.particles.material as THREE.Material).dispose();
    this.lights.delete(id);
    this.animator.reset(id);
  }

  setLightHeight(id: number, height: number): void {
    const light = this.lights.get(id);
    if (!light) return;
    light.height = height;

    light.cylinder.geometry.dispose();
    light.cylinder.geometry = new THREE.CylinderGeometry(0.5, 0.5, height, 16, 1, true);
    light.cylinder.position.y = height / 2;

    const positions = light.particles.geometry.attributes.position.array as Float32Array;
    const particleCount = positions.length / 3;
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3 + 1] = Math.random() * height;
    }
    light.particles.geometry.attributes.position.needsUpdate = true;
  }

  setLightState(
    id: number,
    color: THREE.Color,
    rotation: number,
    opacity: number
  ): void {
    const light = this.lights.get(id);
    if (!light) return;

    (light.cylinder.material as THREE.MeshBasicMaterial).color.copy(color);
    (light.cylinder.material as THREE.MeshBasicMaterial).opacity = opacity;
    (light.particles.material as THREE.PointsMaterial).color.copy(color);
    light.group.rotation.y = rotation;
    light.color.copy(color);
    light.rotation = rotation;
    light.opacity = opacity;
  }

  animateLight(
    id: number,
    targetColor: THREE.Color,
    targetRotation: number,
    targetOpacity: number,
    duration: number
  ): void {
    this.animator.startAnimation(id, targetColor, targetRotation, targetOpacity, duration);
  }

  resetAll(): void {
    const ids = Array.from(this.lights.keys());
    this.animator.resetAll();
    for (const id of ids) {
      const light = this.lights.get(id);
      if (!light) continue;
      this.setLightHeight(id, 4);
      this.setLightState(
        id,
        new THREE.Color(0x888888),
        0,
        0.2
      );
    }
  }

  update(deltaTime: number): void {
    const ids = Array.from(this.lights.keys());
    for (const id of ids) {
      const state = this.animator.update(id);
      if (state) {
        this.setLightState(id, state.color, state.rotation, state.opacity);
      }

      const light = this.lights.get(id);
      if (!light) continue;

      const positions = light.particles.geometry.attributes.position.array as Float32Array;
      const particleCount = positions.length / 3;
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3 + 1] += light.particleVelocities[i] * deltaTime;
        if (positions[i * 3 + 1] > light.height) {
          positions[i * 3 + 1] = 0;
          positions[i * 3] = (Math.random() - 0.5) * 0.8;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
        }
      }
      light.particles.geometry.attributes.position.needsUpdate = true;
    }
  }

  findAnchorAtScreenPosition(
    screenX: number,
    screenY: number,
    camera: THREE.Camera,
    container: HTMLElement
  ): AnchorPoint | null {
    const raycaster = new THREE.Raycaster();
    const rect = container.getBoundingClientRect();
    const x = ((screenX - rect.left) / rect.width) * 2 - 1;
    const y = -((screenY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersect = new THREE.Vector3();
    raycaster.ray.intersectPlane(groundPlane, intersect);

    if (!intersect) return null;

    let closest: AnchorPoint | null = null;
    let closestDist = 2;

    for (const anchor of this.anchors) {
      const dist = intersect.distanceTo(anchor.position);
      if (dist < closestDist) {
        closestDist = dist;
        closest = anchor;
      }
    }
    return closest;
  }
}
