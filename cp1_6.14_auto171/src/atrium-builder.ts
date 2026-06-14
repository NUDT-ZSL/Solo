import * as THREE from 'three';
import { Tween, Easing, Group as TweenGroup } from '@tweenjs/tween.js';
import { AtriumParams, DEFAULT_PARAMS } from './control-panel';

const COLUMN_RADIUS = 0.15;
const BEAM_SIZE = 0.12;
const SLAB_THICKNESS = 0.2;
const BRIDGE_WIDTH = 1.2;
const RAILING_HEIGHT = 0.8;
const BAYS_X = 4;
const BAYS_Z = 3;

function easeInOutCubicElastic(t: number): number {
  let r: number;
  if (t < 0.5) {
    r = 4 * t * t * t;
  } else {
    r = 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  if (t > 0.7) {
    const lt = (t - 0.7) / 0.3;
    r += 0.05 * Math.sin(lt * Math.PI * 2) * (1 - lt);
  }
  return Math.min(1, Math.max(0, r));
}

export class AtriumBuilder {
  private scene: THREE.Scene;
  private mainGroup: THREE.Group;
  private tweenGroup: TweenGroup;
  private currentParams: AtriumParams;
  private environmentGroup: THREE.Group;
  private isTransitioning = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.mainGroup = new THREE.Group();
    this.scene.add(this.mainGroup);
    this.tweenGroup = new TweenGroup();
    this.currentParams = { ...DEFAULT_PARAMS };
    this.environmentGroup = new THREE.Group();
    this.scene.add(this.environmentGroup);
    this.buildEnvironment();
  }

  buildInitial(params: AtriumParams): void {
    this.currentParams = { ...params };
    this.clearGroup(this.mainGroup);
    this.buildAtrium(params, this.mainGroup, false);
  }

  transitionTo(params: AtriumParams): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    const oldGroup = this.mainGroup;
    this.mainGroup = new THREE.Group();
    this.scene.add(this.mainGroup);

    this.buildAtrium(params, this.mainGroup, true);

    this.animateOut(oldGroup);
    this.animateIn(this.mainGroup);

    const totalDuration = 300 + params.floors * 100 + 900;
    setTimeout(() => {
      this.disposeGroup(oldGroup);
      this.isTransitioning = false;
    }, totalDuration + 300);

    this.currentParams = { ...params };
  }

  update(): void {
    this.tweenGroup.update();
  }

  private buildAtrium(params: AtriumParams, group: THREE.Group, startInvisible: boolean): void {
    const { floors, floorHeight, columnSpacing, windowRatio } = params;
    const totalW = BAYS_X * columnSpacing;
    const totalD = BAYS_Z * columnSpacing;
    const offsetX = -totalW / 2;
    const offsetZ = -totalD / 2;

    for (let f = 0; f < floors; f++) {
      const floorGroup = new THREE.Group();
      floorGroup.userData.floorIndex = f;
      const baseY = f * floorHeight;

      const colGeo = new THREE.CylinderGeometry(COLUMN_RADIUS, COLUMN_RADIUS, floorHeight, 8);
      colGeo.translate(0, floorHeight / 2, 0);
      const colMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        transparent: true,
        opacity: 1,
      });

      for (let ix = 0; ix <= BAYS_X; ix++) {
        for (let iz = 0; iz <= BAYS_Z; iz++) {
          const col = new THREE.Mesh(colGeo, colMat);
          col.position.set(offsetX + ix * columnSpacing, baseY, offsetZ + iz * columnSpacing);
          col.userData.type = 'column';
          col.userData.floor = f;
          col.userData.targetScaleY = 1;
          col.userData.targetOpacity = 1;
          floorGroup.add(col);
        }
      }

      const beamMat = new THREE.MeshStandardMaterial({
        color: 0x64748b,
        transparent: true,
        opacity: 1,
      });

      for (let ix = 0; ix <= BAYS_X; ix++) {
        for (let iz = 0; iz < BAYS_Z; iz++) {
          const beamGeo = new THREE.BoxGeometry(BEAM_SIZE, BEAM_SIZE, columnSpacing);
          const beam = new THREE.Mesh(beamGeo, beamMat);
          beam.position.set(
            offsetX + ix * columnSpacing,
            baseY + floorHeight,
            offsetZ + (iz + 0.5) * columnSpacing
          );
          beam.userData.type = 'beam';
          beam.userData.floor = f;
          beam.userData.targetScaleY = 1;
          beam.userData.targetOpacity = 1;
          floorGroup.add(beam);
        }
      }

      for (let iz = 0; iz <= BAYS_Z; iz++) {
        for (let ix = 0; ix < BAYS_X; ix++) {
          const beamGeo = new THREE.BoxGeometry(columnSpacing, BEAM_SIZE, BEAM_SIZE);
          const beam = new THREE.Mesh(beamGeo, beamMat);
          beam.position.set(
            offsetX + (ix + 0.5) * columnSpacing,
            baseY + floorHeight,
            offsetZ + iz * columnSpacing
          );
          beam.userData.type = 'beam';
          beam.userData.floor = f;
          beam.userData.targetScaleY = 1;
          beam.userData.targetOpacity = 1;
          floorGroup.add(beam);
        }
      }

      const slabGeo = new THREE.BoxGeometry(totalW + 0.4, SLAB_THICKNESS, totalD + 0.4);
      const slabMat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        transparent: true,
        opacity: 0.85,
      });
      const slab = new THREE.Mesh(slabGeo, slabMat);
      slab.position.set(0, baseY + SLAB_THICKNESS / 2, 0);
      slab.userData.type = 'slab';
      slab.userData.floor = f;
      slab.userData.targetScaleY = 1;
      slab.userData.targetOpacity = 0.85;
      floorGroup.add(slab);

      this.addGlassWalls(floorGroup, f, baseY, floorHeight, columnSpacing, windowRatio, offsetX, offsetZ, totalW, totalD);

      group.add(floorGroup);
    }

    for (let f = 2; f <= floors; f += 2) {
      this.addBridge(group, f, floorHeight, columnSpacing, offsetX, offsetZ, totalD);
    }

    if (startInvisible) {
      this.applyInvisibleState(group);
    }
  }

  private applyInvisibleState(group: THREE.Group): void {
    group.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      const type = child.userData.type;
      const mat = child.material as THREE.MeshStandardMaterial;

      if (type === 'glass') {
        const scatter = 3 + Math.random() * 2;
        const finalPos = child.position.clone();
        const offset = new THREE.Vector3(
          (Math.random() - 0.5) * scatter,
          (Math.random() - 0.5) * scatter,
          (Math.random() - 0.5) * scatter
        );
        child.userData.finalPos = finalPos;
        child.userData.startPos = finalPos.clone().add(offset);
        child.position.copy(child.userData.startPos);

        const rotOffset = new THREE.Euler(
          (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 0.4
        );
        child.userData.finalRot = child.rotation.clone();
        child.userData.startRot = rotOffset;
        child.rotation.copy(rotOffset);

        child.scale.set(0.15, 0.15, 0.15);
        child.userData.targetScale = 1;

        mat.opacity = 0;
        child.userData.targetOpacity = child.userData.targetOpacity ?? 0.3;
      } else if (type === 'bridge') {
        mat.transparent = true;
        mat.opacity = 0;
        child.userData.targetOpacity = 1;
        child.userData.targetScaleY = 1;
        child.scale.y = 0.01;
      } else {
        mat.transparent = true;
        mat.opacity = 0;
        child.userData.targetOpacity = child.userData.targetOpacity ?? 1;
        child.userData.targetScaleY = child.userData.targetScaleY ?? 1;
        child.scale.y = 0.01;
      }
    });
  }

  private addGlassWalls(
    floorGroup: THREE.Group,
    floorIndex: number,
    baseY: number,
    floorHeight: number,
    columnSpacing: number,
    windowRatio: number,
    offsetX: number,
    offsetZ: number,
    totalW: number,
    totalD: number
  ): void {
    const glassH = (floorHeight - SLAB_THICKNESS) * windowRatio;
    const glassY = baseY + SLAB_THICKNESS + glassH / 2;

    const addGlassPanel = (w: number, px: number, py: number, pz: number, ry: number) => {
      const geo = new THREE.PlaneGeometry(w, glassH);
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0x60a5fa,
        transparent: true,
        opacity: 0.3,
        roughness: 0.1,
        metalness: 0.0,
        side: THREE.DoubleSide,
        reflectivity: 0.8,
        clearcoat: 0.3,
        clearcoatRoughness: 0.1,
      });
      const panel = new THREE.Mesh(geo, glassMat);
      panel.position.set(px, py, pz);
      panel.rotation.y = ry;
      panel.userData.type = 'glass';
      panel.userData.floor = floorIndex;
      panel.userData.targetOpacity = 0.3;
      floorGroup.add(panel);
    };

    const glassOffset = 0.08;

    for (let ix = 0; ix < BAYS_X; ix++) {
      const cx = offsetX + (ix + 0.5) * columnSpacing;
      addGlassPanel(columnSpacing * 0.92, cx, glassY, offsetZ - glassOffset, 0);
      addGlassPanel(columnSpacing * 0.92, cx, glassY, offsetZ + totalD + glassOffset, 0);
    }

    for (let iz = 0; iz < BAYS_Z; iz++) {
      const cz = offsetZ + (iz + 0.5) * columnSpacing;
      addGlassPanel(columnSpacing * 0.92, offsetX - glassOffset, glassY, cz, Math.PI / 2);
      addGlassPanel(columnSpacing * 0.92, offsetX + totalW + glassOffset, glassY, cz, Math.PI / 2);
    }
  }

  private addBridge(
    group: THREE.Group,
    floorNum: number,
    floorHeight: number,
    columnSpacing: number,
    offsetX: number,
    offsetZ: number,
    totalD: number
  ): void {
    const y = floorNum * floorHeight;
    const bridgeMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 1,
    });

    const bridgeGroup = new THREE.Group();
    bridgeGroup.userData.type = 'bridge-group';
    bridgeGroup.userData.floor = floorNum;

    const deckGeo = new THREE.BoxGeometry(BRIDGE_WIDTH, 0.1, totalD - columnSpacing);
    const deck = new THREE.Mesh(deckGeo, bridgeMat);
    deck.position.set(0, y + 0.05, offsetZ + totalD / 2);
    deck.userData.type = 'bridge';
    deck.userData.floor = floorNum;
    bridgeGroup.add(deck);

    const railRadius = 0.03;
    const railGeo = new THREE.CylinderGeometry(railRadius, railRadius, totalD - columnSpacing, 8);
    railGeo.rotateX(Math.PI / 2);

    const railTop1 = new THREE.Mesh(railGeo, bridgeMat);
    railTop1.position.set(-BRIDGE_WIDTH / 2, y + RAILING_HEIGHT, offsetZ + totalD / 2);
    railTop1.userData.type = 'bridge';
    railTop1.userData.floor = floorNum;
    bridgeGroup.add(railTop1);

    const railTop2 = new THREE.Mesh(railGeo, bridgeMat);
    railTop2.position.set(BRIDGE_WIDTH / 2, y + RAILING_HEIGHT, offsetZ + totalD / 2);
    railTop2.userData.type = 'bridge';
    railTop2.userData.floor = floorNum;
    bridgeGroup.add(railTop2);

    const railMidGeo = new THREE.CylinderGeometry(railRadius * 0.8, railRadius * 0.8, totalD - columnSpacing, 6);
    railMidGeo.rotateX(Math.PI / 2);

    const railMid1 = new THREE.Mesh(railMidGeo, bridgeMat);
    railMid1.position.set(-BRIDGE_WIDTH / 2, y + RAILING_HEIGHT * 0.45, offsetZ + totalD / 2);
    railMid1.userData.type = 'bridge';
    railMid1.userData.floor = floorNum;
    bridgeGroup.add(railMid1);

    const railMid2 = new THREE.Mesh(railMidGeo, bridgeMat);
    railMid2.position.set(BRIDGE_WIDTH / 2, y + RAILING_HEIGHT * 0.45, offsetZ + totalD / 2);
    railMid2.userData.type = 'bridge';
    railMid2.userData.floor = floorNum;
    bridgeGroup.add(railMid2);

    const postRadius = 0.025;
    const postGeo = new THREE.CylinderGeometry(postRadius, postRadius, RAILING_HEIGHT, 8);
    postGeo.translate(0, RAILING_HEIGHT / 2, 0);

    const numPosts = Math.max(3, Math.floor((totalD - columnSpacing) / columnSpacing) + 1);
    const spanLength = (totalD - columnSpacing) / (numPosts - 1);

    for (let i = 0; i < numPosts; i++) {
      const pz = offsetZ + columnSpacing / 2 + i * spanLength;

      const p1 = new THREE.Mesh(postGeo, bridgeMat);
      p1.position.set(-BRIDGE_WIDTH / 2, y + 0.1, pz);
      p1.userData.type = 'bridge';
      p1.userData.floor = floorNum;
      bridgeGroup.add(p1);

      const p2 = new THREE.Mesh(postGeo, bridgeMat);
      p2.position.set(BRIDGE_WIDTH / 2, y + 0.1, pz);
      p2.userData.type = 'bridge';
      p2.userData.floor = floorNum;
      bridgeGroup.add(p2);
    }

    group.add(bridgeGroup);
  }

  private animateOut(group: THREE.Group): void {
    const meshes: THREE.Mesh[] = [];
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) meshes.push(child);
    });

    const maxFloor = meshes.reduce((max, m) => Math.max(max, m.userData.floor ?? 0), 0);

    for (const mesh of meshes) {
      const floor = mesh.userData.floor ?? 0;
      const type = mesh.userData.type;
      const mat = mesh.material as THREE.MeshStandardMaterial;

      const delay = floor * 60;

      if (type === 'glass') {
        const state = {
          opacity: mat.opacity,
          sx: mesh.scale.x,
          sy: mesh.scale.y,
          sz: mesh.scale.z,
        };

        new Tween(state, this.tweenGroup)
          .to({ opacity: 0, sx: 0.15, sy: 0.15, sz: 0.15 }, 400)
          .delay(delay)
          .easing(Easing.Cubic.In)
          .onUpdate(() => {
            mat.opacity = state.opacity;
            mesh.scale.set(state.sx, state.sy, state.sz);
          })
          .start();
      } else {
        const state = { opacity: mat.opacity, scaleY: mesh.scale.y };

        new Tween(state, this.tweenGroup)
          .to({ opacity: 0, scaleY: 0.01 }, 450)
          .delay(delay)
          .easing(Easing.Cubic.In)
          .onUpdate(() => {
            mat.opacity = state.opacity;
            mesh.scale.y = state.scaleY;
          })
          .start();
      }
    }

    new Tween({ v: 0 }, this.tweenGroup)
      .to({ v: 1 }, maxFloor * 60 + 500)
      .start();
  }

  private animateIn(group: THREE.Group): void {
    const meshes: THREE.Mesh[] = [];
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) meshes.push(child);
    });

    const maxFloor = meshes.reduce((max, m) => Math.max(max, m.userData.floor ?? 0), 0);

    for (const mesh of meshes) {
      const floor = mesh.userData.floor ?? 0;
      const type = mesh.userData.type;
      const mat = mesh.material as THREE.MeshStandardMaterial;

      const baseDelay = 150 + floor * 90;

      if (type === 'glass') {
        const startPos = mesh.userData.startPos as THREE.Vector3;
        const finalPos = mesh.userData.finalPos as THREE.Vector3;
        const startRot = mesh.userData.startRot as THREE.Euler;
        const finalRot = mesh.userData.finalRot as THREE.Euler;
        const targetOpacity = mesh.userData.targetOpacity ?? 0.3;

        const state = {
          x: startPos.x, y: startPos.y, z: startPos.z,
          rx: startRot.x, ry: startRot.y, rz: startRot.z,
          sx: 0.15, sy: 0.15, sz: 0.15,
          opacity: 0,
        };

        new Tween(state, this.tweenGroup)
          .to({
            x: finalPos.x, y: finalPos.y, z: finalPos.z,
            rx: finalRot.x, ry: finalRot.y, rz: finalRot.z,
            sx: 1, sy: 1, sz: 1,
            opacity: targetOpacity,
          }, 850)
          .delay(baseDelay + 250)
          .easing(easeInOutCubicElastic)
          .onUpdate(() => {
            mesh.position.set(state.x, state.y, state.z);
            mesh.rotation.set(state.rx, state.ry, state.rz);
            mesh.scale.set(state.sx, state.sy, state.sz);
            mat.opacity = state.opacity;
          })
          .start();
      } else if (type === 'slab') {
        const targetOpacity = mesh.userData.targetOpacity ?? 0.85;
        const state = { opacity: 0, scaleY: 0.01, scaleXZ: 0.85 };

        new Tween(state, this.tweenGroup)
          .to({ opacity: targetOpacity, scaleY: 1, scaleXZ: 1 }, 550)
          .delay(baseDelay)
          .easing(easeInOutCubicElastic)
          .onUpdate(() => {
            mat.opacity = state.opacity;
            mesh.scale.y = state.scaleY;
            mesh.scale.x = state.scaleXZ;
            mesh.scale.z = state.scaleXZ;
          })
          .start();
      } else {
        const targetOpacity = mesh.userData.targetOpacity ?? 1;
        const state = { opacity: 0, scaleY: 0.01 };

        new Tween(state, this.tweenGroup)
          .to({ opacity: targetOpacity, scaleY: 1 }, 600)
          .delay(baseDelay)
          .easing(easeInOutCubicElastic)
          .onUpdate(() => {
            mat.opacity = state.opacity;
            mesh.scale.y = Math.max(0.01, state.scaleY);
          })
          .start();
      }
    }

    new Tween({ v: 0 }, this.tweenGroup)
      .to({ v: 1 }, 150 + maxFloor * 90 + 900)
      .start();
  }

  private buildEnvironment(): void {
    const groundGeo = new THREE.PlaneGeometry(80, 80);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.2,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    this.environmentGroup.add(ground);

    const buildingCount = 10 + Math.floor(Math.random() * 6);
    const buildingMat = new THREE.MeshStandardMaterial({ color: 0x334155 });

    for (let i = 0; i < buildingCount; i++) {
      const angle = (i / buildingCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
      const dist = 20 + Math.random() * 14;
      const w = 2 + Math.random() * 5;
      const d = 2 + Math.random() * 5;
      const h = 5 + Math.random() * 15;

      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, buildingMat);
      mesh.position.set(Math.cos(angle) * dist, h / 2, Math.sin(angle) * dist);
      mesh.rotation.y = Math.random() * Math.PI;
      this.environmentGroup.add(mesh);
    }
  }

  private clearGroup(group: THREE.Group): void {
    while (group.children.length > 0) {
      const child = group.children[0];
      this.disposeChild(child);
      group.remove(child);
    }
  }

  private disposeChild(child: THREE.Object3D): void {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else {
        child.material.dispose();
      }
    }
    if (child instanceof THREE.Group) {
      while (child.children.length > 0) {
        const c = child.children[0];
        this.disposeChild(c);
        child.remove(c);
      }
    }
  }

  private disposeGroup(group: THREE.Group): void {
    this.clearGroup(group);
    this.scene.remove(group);
  }
}
