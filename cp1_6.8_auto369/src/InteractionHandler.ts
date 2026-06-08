import * as THREE from 'three';
import { TerrainGenerator } from './TerrainGenerator';
import { EnvironmentManager } from './EnvironmentManager';

export type EditMode = 'raise' | 'flatten' | 'place';
export type PlaceTool = 'tree' | 'rock' | 'river';

export class InteractionHandler {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private terrain: TerrainGenerator;
  private environment: EnvironmentManager;
  private scene: THREE.Scene;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private editMode: EditMode = 'raise';
  private placeTool: PlaceTool = 'tree';
  private editRadius: number = 3;
  private editStrength: number = 0.5;

  private isDragging: boolean = false;
  private cursorMesh: THREE.Mesh;
  private depthRing: THREE.Mesh;

  private riverStartPoint: THREE.Vector3 | null = null;
  private riverStartMarker: THREE.Mesh | null = null;

  private audioContext: AudioContext | null = null;

  private particleSystems: {
    points: THREE.Points;
    velocities: Float32Array;
    life: number;
    maxLife: number;
  }[] = [];

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    terrain: TerrainGenerator,
    environment: EnvironmentManager
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.scene = scene;
    this.terrain = terrain;
    this.environment = environment;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    const cursorGeo = new THREE.CircleGeometry(1, 32);
    const cursorMat = new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthTest: false,
    });
    this.cursorMesh = new THREE.Mesh(cursorGeo, cursorMat);
    this.cursorMesh.renderOrder = 999;
    this.cursorMesh.visible = false;
    scene.add(this.cursorMesh);

    const ringGeo = new THREE.RingGeometry(0.9, 1.0, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#4CAF50',
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthTest: false,
    });
    this.depthRing = new THREE.Mesh(ringGeo, ringMat);
    this.depthRing.renderOrder = 999;
    this.depthRing.visible = false;
    scene.add(this.depthRing);

    this.bindEvents();
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
    canvas.addEventListener('pointermove', this.onPointerMove.bind(this));
    canvas.addEventListener('pointerup', this.onPointerUp.bind(this));
    canvas.addEventListener('pointerleave', this.onPointerUp.bind(this));
  }

  private getIntersection(event: PointerEvent): THREE.Vector3 | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.terrain.getMesh());

    if (intersects.length > 0) {
      return intersects[0].point;
    }
    return null;
  }

  private onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;

    const point = this.getIntersection(event);
    if (!point) return;

    if (this.editMode === 'place') {
      this.handlePlace(point);
    } else {
      this.isDragging = true;
      this.terrain.deform(point, this.editRadius, this.editStrength, this.editMode);
    }
  }

  private onPointerMove(event: PointerEvent): void {
    const point = this.getIntersection(event);

    if (point) {
      this.updateCursor(point);

      if (this.isDragging && this.editMode !== 'place') {
        this.terrain.deform(point, this.editRadius, this.editStrength, this.editMode);
      }
    } else {
      this.cursorMesh.visible = false;
      this.depthRing.visible = false;
    }
  }

  private onPointerUp(): void {
    this.isDragging = false;
  }

  private handlePlace(point: THREE.Vector3): void {
    switch (this.placeTool) {
      case 'tree':
        this.environment.placeTree(point);
        this.spawnParticles(point, '#2E7D32');
        this.playSound(440, 0.1, 'sine');
        break;
      case 'rock':
        this.environment.placeRock(point);
        this.spawnParticles(point, '#9E9E9E');
        this.playSound(220, 0.1, 'triangle');
        break;
      case 'river':
        if (!this.riverStartPoint) {
          this.riverStartPoint = point.clone();
          this.createRiverStartMarker(point);
          const hint = document.getElementById('river-hint');
          if (hint) hint.style.display = 'block';
        } else {
          this.environment.placeRiver(this.riverStartPoint, point);
          this.removeRiverStartMarker();
          this.riverStartPoint = null;
          this.spawnParticles(point, '#4FC3F7');
          this.playSound(660, 0.15, 'sine');
          const hint = document.getElementById('river-hint');
          if (hint) hint.style.display = 'none';
        }
        break;
    }
  }

  private createRiverStartMarker(point: THREE.Vector3): void {
    const geo = new THREE.SphereGeometry(0.3, 8, 6);
    const mat = new THREE.MeshBasicMaterial({ color: '#4FC3F7', transparent: true, opacity: 0.8 });
    this.riverStartMarker = new THREE.Mesh(geo, mat);
    this.riverStartMarker.position.copy(point);
    this.riverStartMarker.position.y += 0.3;
    this.scene.add(this.riverStartMarker);
  }

  private removeRiverStartMarker(): void {
    if (this.riverStartMarker) {
      this.scene.remove(this.riverStartMarker);
      this.riverStartMarker.geometry.dispose();
      (this.riverStartMarker.material as THREE.Material).dispose();
      this.riverStartMarker = null;
    }
  }

  private updateCursor(point: THREE.Vector3): void {
    this.cursorMesh.visible = true;
    this.depthRing.visible = true;

    this.cursorMesh.position.set(point.x, point.y + 0.1, point.z);
    this.cursorMesh.rotation.x = -Math.PI / 2;
    this.cursorMesh.scale.setScalar(this.editRadius);

    this.depthRing.position.set(point.x, point.y + 0.12, point.z);
    this.depthRing.rotation.x = -Math.PI / 2;
    this.depthRing.scale.setScalar(this.editRadius);

    if (this.editMode === 'raise') {
      (this.depthRing.material as THREE.MeshBasicMaterial).color.set('#4CAF50');
    } else if (this.editMode === 'flatten') {
      (this.depthRing.material as THREE.MeshBasicMaterial).color.set('#FF9800');
    } else {
      (this.depthRing.material as THREE.MeshBasicMaterial).color.set('#4FC3F7');
      this.cursorMesh.visible = false;
      this.depthRing.visible = false;
    }
  }

  private spawnParticles(position: THREE.Color | THREE.Vector3, color: string | number): void {
    const particleCount = 30;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    const posVec = position as THREE.Vector3;

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = posVec.x;
      positions[i * 3 + 1] = posVec.y + 0.5;
      positions[i * 3 + 2] = posVec.z;

      velocities[i * 3] = (Math.random() - 0.5) * 4;
      velocities[i * 3 + 1] = Math.random() * 3 + 1;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 4;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: color as THREE.ColorRepresentation,
      size: 0.15,
      transparent: true,
      opacity: 1,
      depthTest: false,
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.particleSystems.push({
      points,
      velocities,
      life: 0,
      maxLife: 1.0,
    });
  }

  updateParticles(delta: number): void {
    for (let i = this.particleSystems.length - 1; i >= 0; i--) {
      const system = this.particleSystems[i];
      system.life += delta;

      if (system.life >= system.maxLife) {
        this.scene.remove(system.points);
        system.points.geometry.dispose();
        (system.points.material as THREE.Material).dispose();
        this.particleSystems.splice(i, 1);
        continue;
      }

      const positions = system.points.geometry.attributes.position;
      for (let j = 0; j < positions.count; j++) {
        positions.setX(j, positions.getX(j) + system.velocities[j * 3] * delta);
        positions.setY(j, positions.getY(j) + system.velocities[j * 3 + 1] * delta);
        positions.setZ(j, positions.getZ(j) + system.velocities[j * 3 + 2] * delta);
        system.velocities[j * 3 + 1] -= 5 * delta;
      }
      positions.needsUpdate = true;

      const t = system.life / system.maxLife;
      (system.points.material as THREE.PointsMaterial).opacity = 1 - t;
    }
  }

  private playSound(frequency: number, duration: number, type: OscillatorType): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }
      const ctx = this.audioContext;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        frequency * 0.5,
        ctx.currentTime + duration
      );

      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (_e) {
      // Audio not available
    }
  }

  setEditMode(mode: EditMode): void {
    this.editMode = mode;
    if (mode !== 'place' && this.riverStartPoint) {
      this.removeRiverStartMarker();
      this.riverStartPoint = null;
      const hint = document.getElementById('river-hint');
      if (hint) hint.style.display = 'none';
    }
  }

  setPlaceTool(tool: PlaceTool): void {
    this.placeTool = tool;
  }

  setEditRadius(radius: number): void {
    this.editRadius = radius;
  }

  setEditStrength(strength: number): void {
    this.editStrength = strength;
  }

  getEditMode(): EditMode {
    return this.editMode;
  }

  getPlaceTool(): PlaceTool {
    return this.placeTool;
  }

  cancelRiverPlacement(): void {
    if (this.riverStartPoint) {
      this.removeRiverStartMarker();
      this.riverStartPoint = null;
      const hint = document.getElementById('river-hint');
      if (hint) hint.style.display = 'none';
    }
  }
}
