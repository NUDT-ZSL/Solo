import * as THREE from 'three';
import { CubicBezierCurve3D, easeInOutCubic } from './utils/BezierCurve';
import { TrailParticles } from './utils/Particles';

export interface Rune {
  id: number;
  group: THREE.Group;
  lines: THREE.Line[];
  haloMesh: THREE.Mesh;
  baseColor: THREE.Color;
  basePosition: THREE.Vector3;
  currentPosition: THREE.Vector3;
  driftDirection: THREE.Vector3;
  driftSpeed: number;
  angularVelocity: THREE.Vector3;
  baseAngularSpeed: number;
  isSelected: boolean;
  isFlying: boolean;
  isCollected: boolean;
  isResonating: boolean;
  resonanceTimer: number;
  resonanceFlashTimer: number;
  resonanceFlashCount: number;
  flyProgress: number;
  flyDuration: number;
  flyCurve: CubicBezierCurve3D | null;
  trail: TrailParticles | null;
  hovered: boolean;
  boundingRadius: number;
}

export type RuneSelectionCallback = (rune: Rune) => void;
export type RuneArrivedCallback = (rune: Rune) => void;

export class RuneSystem {
  private scene: THREE.Scene;
  private runes: Rune[] = [];
  private runeCount: number = 40;
  private minRadius: number = 12;
  private maxRadius: number = 18;
  private raycaster: THREE.Raycaster;
  private onRuneSelected: RuneSelectionCallback | null = null;
  private onRuneArrived: RuneArrivedCallback | null = null;
  private altarPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private flyQueue: Rune[] = [];
  private flyTimer: number = 0;
  private flyInterval: number = 0.3;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.raycaster = new THREE.Raycaster();
    this.generateRunes();
  }

  setSelectionCallback(callback: RuneSelectionCallback): void {
    this.onRuneSelected = callback;
  }

  setArrivedCallback(callback: RuneArrivedCallback): void {
    this.onRuneArrived = callback;
  }

  getRunes(): Rune[] {
    return this.runes;
  }

  getCollectedCount(): number {
    return this.runes.filter(r => r.isCollected).length;
  }

  private fibonacciSphere(count: number, minR: number, maxR: number): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    const phi = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const theta = phi * i;
      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;

      const r = minR + Math.random() * (maxR - minR);
      points.push(new THREE.Vector3(x * r, y * r, z * r));
    }

    return points;
  }

  private generateRunes(): void {
    const positions = this.fibonacciSphere(this.runeCount, this.minRadius, this.maxRadius);

    for (let i = 0; i < this.runeCount; i++) {
      const rune = this.createRune(i, positions[i]);
      this.runes.push(rune);
      this.scene.add(rune.group);
    }
  }

  private createRune(id: number, position: THREE.Vector3): Rune {
    const group = new THREE.Group();
    group.position.copy(position);

    const hue = 200 + Math.random() * 100;
    const baseColor = new THREE.Color().setHSL(hue / 360, 0.8, 1);

    const lineCount = 4 + Math.floor(Math.random() * 4);
    const lines: THREE.Line[] = [];
    const runeScale = 0.5 + Math.random() * 0.5;
    let maxDist = 0;

    for (let j = 0; j < lineCount; j++) {
      const points = this.generateRuneLinePoints(runeScale);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: baseColor.clone(),
        transparent: true,
        opacity: 0.9,
        linewidth: 2
      });
      const line = new THREE.Line(geometry, material);
      lines.push(line);
      group.add(line);

      for (const p of points) {
        maxDist = Math.max(maxDist, p.length());
      }
    }

    const haloRadius = (maxDist + 0.3) * 1.3;
    const haloGeo = new THREE.RingGeometry(haloRadius * 0.9, haloRadius, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: baseColor.clone(),
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.lookAt(new THREE.Vector3(0, 0, 0));
    group.add(haloMesh);

    const driftDir = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).normalize();

    const angVel = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2
    ).normalize();

    return {
      id,
      group,
      lines,
      haloMesh,
      baseColor,
      basePosition: position.clone(),
      currentPosition: position.clone(),
      driftDirection: driftDir,
      driftSpeed: 0.02 + Math.random() * 0.03,
      angularVelocity: angVel,
      baseAngularSpeed: 0.01 + Math.random() * 0.02,
      isSelected: false,
      isFlying: false,
      isCollected: false,
      isResonating: false,
      resonanceTimer: 0,
      resonanceFlashTimer: 0,
      resonanceFlashCount: 0,
      flyProgress: 0,
      flyDuration: 1.5,
      flyCurve: null,
      trail: null,
      hovered: false,
      boundingRadius: haloRadius * 1.5
    };
  }

  private generateRuneLinePoints(scale: number): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    const segments = 3 + Math.floor(Math.random() * 4);
    const startAngle = Math.random() * Math.PI * 2;
    const angleStep = (Math.random() * 0.8 + 0.4) * (Math.random() > 0.5 ? 1 : -1);
    const radius = scale * (0.2 + Math.random() * 0.4);

    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + angleStep * i;
      const r = radius * (0.6 + Math.random() * 0.8);
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      const z = (Math.random() - 0.5) * scale * 0.2;
      points.push(new THREE.Vector3(x, y, z));
    }

    return points;
  }

  setHovered(rune: Rune, hovered: boolean): void {
    if (rune.isCollected || rune.isFlying) return;
    rune.hovered = hovered;
    const haloMat = rune.haloMesh.material as THREE.MeshBasicMaterial;
    haloMat.opacity = hovered ? 0.3 : 0;
  }

  selectRune(rune: Rune): void {
    if (rune.isSelected || rune.isCollected || rune.isFlying) return;

    rune.isSelected = true;
    for (const line of rune.lines) {
      const mat = line.material as THREE.LineBasicMaterial;
      mat.color.set(0xffffff);
      mat.linewidth = 4;
    }

    this.flyQueue.push(rune);
    this.triggerResonance(rune);

    if (this.onRuneSelected) {
      this.onRuneSelected(rune);
    }
  }

  selectRunes(runes: Rune[]): void {
    const validRunes = runes.filter(r => !r.isSelected && !r.isCollected && !r.isFlying);
    for (let i = 0; i < validRunes.length; i++) {
      const rune = validRunes[i];
      rune.isSelected = true;
      for (const line of rune.lines) {
        const mat = line.material as THREE.LineBasicMaterial;
        mat.color.set(0xffffff);
        mat.linewidth = 4;
      }
      this.flyQueue.push(rune);

      if (i === 0) {
        this.triggerResonance(rune);
      }

      if (this.onRuneSelected) {
        this.onRuneSelected(rune);
      }
    }
  }

  private triggerResonance(source: Rune): void {
    const resonanceRadius = 5;
    const nearbyRunes = this.runes.filter(r => {
      if (r === source || r.isCollected || r.isFlying || r.isSelected) return false;
      return r.currentPosition.distanceTo(source.currentPosition) <= resonanceRadius;
    });

    const resonatingCount = Math.min(Math.max(nearbyRunes.length, 2), 8);
    const sorted = nearbyRunes.sort((a, b) => 
      a.currentPosition.distanceTo(source.currentPosition) - 
      b.currentPosition.distanceTo(source.currentPosition)
    );

    for (let i = 0; i < resonatingCount && i < sorted.length; i++) {
      const rune = sorted[i];
      rune.isResonating = true;
      rune.resonanceTimer = 1.5;
      rune.resonanceFlashTimer = 0;
      rune.resonanceFlashCount = 0;
    }
  }

  private startFlight(rune: Rune): void {
    rune.isFlying = true;
    rune.flyProgress = 0;

    const startPos = rune.currentPosition.clone();
    const endPos = this.altarPosition.clone().add(new THREE.Vector3(0, 2, 0));
    rune.flyCurve = CubicBezierCurve3D.createArcPath(startPos, endPos, 4);

    rune.trail = new TrailParticles(this.scene, 20, new THREE.Color(0xffffff), 3);
  }

  pickRune(screenX: number, screenY: number, camera: THREE.Camera): Rune | null {
    const mouse = new THREE.Vector2(screenX * 2 - 1, -(screenY * 2 - 1));
    this.raycaster.setFromCamera(mouse, camera);

    const meshes: THREE.Object3D[] = [];
    for (const rune of this.runes) {
      if (!rune.isCollected && !rune.isFlying) {
        meshes.push(rune.group);
      }
    }

    const intersects = this.raycaster.intersectObjects(meshes, true);

    if (intersects.length > 0) {
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj) {
        const rune = this.runes.find(r => r.group === obj);
        if (rune) return rune;
        obj = obj.parent;
      }
    }

    return null;
  }

  pickRunesInRect(
    x1: number, y1: number, x2: number, y2: number,
    camera: THREE.Camera, width: number, height: number
  ): Rune[] {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    const result: Rune[] = [];
    const projScreen = new THREE.Vector3();

    for (const rune of this.runes) {
      if (rune.isCollected || rune.isFlying || rune.isSelected) continue;

      projScreen.copy(rune.currentPosition).project(camera);
      const sx = (projScreen.x + 1) * 0.5 * width;
      const sy = (-projScreen.y + 1) * 0.5 * height;

      if (sx >= minX && sx <= maxX && sy >= minY && sy <= maxY) {
        result.push(rune);
      }
    }

    return result;
  }

  update(deltaTime: number): void {
    this.flyTimer += deltaTime;
    if (this.flyTimer >= this.flyInterval && this.flyQueue.length > 0) {
      const nextRune = this.flyQueue.shift();
      if (nextRune) {
        this.startFlight(nextRune);
      }
      this.flyTimer = 0;
    }

    for (const rune of this.runes) {
      if (rune.isCollected) continue;

      if (rune.isFlying) {
        this.updateFlyingRune(rune, deltaTime);
      } else if (!rune.isSelected) {
        this.updateIdleRune(rune, deltaTime);
      }

      if (rune.isResonating) {
        this.updateResonance(rune, deltaTime);
      }

      rune.haloMesh.lookAt(new THREE.Vector3(0, 0, 0));
    }
  }

  private updateIdleRune(rune: Rune, deltaTime: number): void {
    rune.currentPosition.addScaledVector(rune.driftDirection, rune.driftSpeed * deltaTime);

    const distFromCenter = rune.currentPosition.length();
    if (distFromCenter > this.maxRadius + 2 || distFromCenter < this.minRadius - 2) {
      const toCenter = rune.currentPosition.clone().normalize();
      if (distFromCenter > this.maxRadius + 2) {
        rune.driftDirection.reflect(toCenter);
      } else {
        rune.driftDirection.reflect(toCenter.negate());
      }
      rune.driftDirection.normalize();
    }

    rune.group.position.copy(rune.currentPosition);

    let speed = rune.baseAngularSpeed;
    if (rune.isResonating) {
      speed = rune.baseAngularSpeed * 3;
    }

    rune.group.rotation.x += rune.angularVelocity.x * speed * deltaTime * 60;
    rune.group.rotation.y += rune.angularVelocity.y * speed * deltaTime * 60;
    rune.group.rotation.z += rune.angularVelocity.z * speed * deltaTime * 60;
  }

  private updateFlyingRune(rune: Rune, deltaTime: number): void {
    rune.flyProgress += deltaTime / rune.flyDuration;

    if (rune.flyProgress >= 1) {
      rune.flyProgress = 1;
      rune.isFlying = false;
      rune.isCollected = true;

      if (rune.trail) {
        rune.trail.fadeOut(1000, 10);
      }

      if (this.onRuneArrived) {
        this.onRuneArrived(rune);
      }
      return;
    }

    const t = easeInOutCubic(rune.flyProgress);
    const pos = rune.flyCurve!.getPoint(t);
    rune.currentPosition.copy(pos);
    rune.group.position.copy(pos);

    rune.group.rotation.x += 0.1;
    rune.group.rotation.y += 0.15;
    rune.group.rotation.z += 0.08;

    if (rune.trail) {
      rune.trail.addPoint(pos.clone());
    }

    if (rune.trail && rune.flyProgress > 0.8) {
      rune.trail.fadeOut(deltaTime, 1.5);
    }
  }

  private updateResonance(rune: Rune, deltaTime: number): void {
    rune.resonanceTimer -= deltaTime;
    if (rune.resonanceTimer <= 0) {
      rune.isResonating = false;
      for (const line of rune.lines) {
        (line.material as THREE.LineBasicMaterial).color.copy(rune.baseColor);
      }
      return;
    }

    rune.resonanceFlashTimer -= deltaTime;
    if (rune.resonanceFlashTimer <= 0 && rune.resonanceFlashCount < 6) {
      rune.resonanceFlashCount++;
      const isBright = rune.resonanceFlashCount % 2 === 1;
      for (const line of rune.lines) {
        const mat = line.material as THREE.LineBasicMaterial;
        if (isBright) {
          mat.color.set(0xffffff);
        } else {
          mat.color.copy(rune.baseColor);
        }
      }
      rune.resonanceFlashTimer = 0.1;
    }
  }

  dispose(): void {
    for (const rune of this.runes) {
      if (rune.trail) rune.trail.dispose();
      for (const line of rune.lines) {
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      }
      rune.haloMesh.geometry.dispose();
      (rune.haloMesh.material as THREE.Material).dispose();
      this.scene.remove(rune.group);
    }
    this.runes = [];
  }
}
