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
  if (t > 0.75) {
    const lt = (t - 0.75) / 0.25;
    r += 0.04 * Math.sin(lt * Math.PI * 2.5) * (1 - lt);
  }
  return r;
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
    this.animateIn(this.mainGroup, params);

    const totalDuration = 400 + params.floors * 80 + 700;
    setTimeout(() => {
      this.disposeGroup(oldGroup);
      this.isTransitioning = false;
    }, totalDuration + 200);

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
      const colMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });

      for (let ix = 0; ix <= BAYS_X; ix++) {
        for (let iz = 0; iz <= BAYS_Z; iz++) {
          const col = new THREE.Mesh(colGeo, colMat);
          col.position.set(offsetX + ix * columnSpacing, baseY, offsetZ + iz * columnSpacing);
          col.userData.type = 'column';
          col.userData.floor = f;
          floorGroup.add(col);
        }
      }

      const beamMat = new THREE.MeshStandardMaterial({ color: 0x64748b });

      for (let ix = 0; ix <= BAYS_X; ix++) {
        for (let iz = 0; iz < BAYS_Z; iz++) {
          const beamGeo = new THREE.BoxGeometry(BEAM_SIZE, BEAM_SIZE, columnSpacing);
          beamGeo.translate(0, 0, 0);
          const beam = new THREE.Mesh(beamGeo, beamMat);
          beam.position.set(
            offsetX + ix * columnSpacing,
            baseY + floorHeight,
            offsetZ + (iz + 0.5) * columnSpacing
          );
          beam.userData.type = 'beam';
          beam.userData.floor = f;
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
      floorGroup.add(slab);

      this.addGlassWalls(floorGroup, f, baseY, floorHeight, columnSpacing, windowRatio, offsetX, offsetZ, totalW, totalD, startInvisible);

      group.add(floorGroup);
    }

    for (let f = 2; f <= floors; f += 2) {
      this.addBridge(group, f, floorHeight, columnSpacing, offsetX, offsetZ, totalD, startInvisible);
    }

    if (startInvisible) {
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as THREE.MeshStandardMaterial;
          if (mat.transparent) {
            child.userData.targetOpacity = mat.opacity;
            mat.opacity = 0;
          }
          child.userData.targetScaleY = child.scale.y;
          child.scale.y = 0.01;
        }
      });
    }
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
    totalD: number,
    startInvisible: boolean
  ): void {
    const glassH = (floorHeight - SLAB_THICKNESS) * windowRatio;
    const glassY = baseY + SLAB_THICKNESS + glassH / 2;
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.3,
      roughness: 0.1,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    const addGlassPanel = (w: number, px: number, py: number, pz: number, ry: number) => {
      const geo = new THREE.PlaneGeometry(w, glassH);
      const panel = new THREE.Mesh(geo, glassMat.clone());
      panel.position.set(px, py, pz);
      panel.rotation.y = ry;
      panel.userData.type = 'glass';
      panel.userData.floor = floorIndex;
      if (startInvisible) {
        const scatter = 2.5;
        panel.userData.finalPos = panel.position.clone();
        panel.position.x += (Math.random() - 0.5) * scatter;
        panel.position.y += (Math.random() - 0.5) * scatter;
        panel.position.z += (Math.random() - 0.5) * scatter;
        panel.userData.startPos = panel.position.clone();
        panel.scale.set(0.3, 0.3, 0.3);
        (panel.material as THREE.MeshPhysicalMaterial).opacity = 0;
        panel.userData.targetOpacity = 0.3;
      }
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
    totalD: number,
    startInvisible: boolean
  ): void {
    const y = floorNum * floorHeight;
    const totalW = BAYS_X * columnSpacing;
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });

    const deckGeo = new THREE.BoxGeometry(BRIDGE_WIDTH, 0.1, totalD - columnSpacing);
    const deck = new THREE.Mesh(deckGeo, bridgeMat);
    deck.position.set(0, y, offsetZ + totalD / 2);
    deck.userData.type = 'bridge';
    group.add(deck);

    const railGeo = new THREE.CylinderGeometry(0.03, 0.03, totalD - columnSpacing, 6);
    railGeo.rotateX(Math.PI / 2);

    const rail1 = new THREE.Mesh(railGeo, bridgeMat);
    rail1.position.set(-BRIDGE_WIDTH / 2, y + RAILING_HEIGHT, offsetZ + totalD / 2);
    rail1.userData.type = 'bridge';
    group.add(rail1);

    const rail2 = new THREE.Mesh(railGeo, bridgeMat);
    rail2.position.set(BRIDGE_WIDTH / 2, y + RAILING_HEIGHT, offsetZ + totalD / 2);
    rail2.userData.type = 'bridge';
    group.add(rail2);

    const postGeo = new THREE.CylinderGeometry(0.025, 0.025, RAILING_HEIGHT, 6);
    postGeo.translate(0, RAILING_HEIGHT / 2, 0);

    const numPosts = Math.max(2, Math.floor((totalD - columnSpacing) / columnSpacing) + 1);
    const spanLength = (totalD - columnSpacing) / (numPosts - 1);

    for (let i = 0; i < numPosts; i++) {
      const pz = offsetZ + columnSpacing / 2 + i * spanLength;

      const p1 = new THREE.Mesh(postGeo, bridgeMat);
      p1.position.set(-BRIDGE_WIDTH / 2, y, pz);
      p1.userData.type = 'bridge';
      group.add(p1);

      const p2 = new THREE.Mesh(postGeo, bridgeMat);
      p2.position.set(BRIDGE_WIDTH / 2, y, pz);
      p2.userData.type = 'bridge';
      group.add(p2);
    }

    if (startInvisible) {
      group.children.forEach((child) => {
        if (child instanceof THREE.Mesh && child.userData.type === 'bridge') {
          const mat = child.material as THREE.MeshStandardMaterial;
          mat.transparent = true;
          child.userData.targetOpacity = 1;
          mat.opacity = 0;
          child.userData.targetScaleY = child.scale.y;
          child.scale.y = 0.01;
        }
      });
    }
  }

  private animateOut(group: THREE.Group): void {
    const meshes: THREE.Mesh[] = [];
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) meshes.push(child);
    });

    const maxFloor = Math.max(...meshes.map((m) => m.userData.floor || 0));

    for (const mesh of meshes) {
      const floor = mesh.userData.floor || 0;
      const delay = floor * 60;
      const mat = mesh.material as THREE.MeshStandardMaterial;

      const state = { opacity: mat.opacity, scaleY: mesh.scale.y };
      new Tween(state, this.tweenGroup)
        .to({ opacity: 0, scaleY: 0.01 }, 500)
        .delay(delay)
        .easing(Easing.Cubic.In)
        .onUpdate(() => {
          mat.opacity = state.opacity;
          mat.transparent = true;
          mesh.scale.y = state.scaleY;
        })
        .start();
    }

    new Tween({ v: 0 }, this.tweenGroup)
      .to({ v: 1 }, maxFloor * 60 + 600)
      .start();
  }

  private animateIn(group: THREE.Group, params: AtriumParams): void {
    const meshes: THREE.Mesh[] = [];
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) meshes.push(child);
    });

    for (const mesh of meshes) {
      const floor = mesh.userData.floor || 0;
      const type = mesh.userData.type;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const baseDelay = 200 + floor * 80;

      if (type === 'glass' && mesh.userData.finalPos) {
        const startPos = mesh.userData.startPos as THREE.Vector3;
        const finalPos = mesh.userData.finalPos as THREE.Vector3;
        const state = {
          x: startPos.x, y: startPos.y, z: startPos.z,
          sx: 0.3, sy: 0.3, sz: 0.3,
          opacity: 0,
        };

        new Tween(state, this.tweenGroup)
          .to({
            x: finalPos.x, y: finalPos.y, z: finalPos.z,
            sx: 1, sy: 1, sz: 1,
            opacity: mesh.userData.targetOpacity ?? 0.3,
          }, 700)
          .delay(baseDelay + 200)
          .easing(easeInOutCubicElastic)
          .onUpdate(() => {
            mesh.position.set(state.x, state.y, state.z);
            mesh.scale.set(state.sx, state.sy, state.sz);
            mat.opacity = state.opacity;
          })
          .start();
      } else {
        const targetOpacity = mesh.userData.targetOpacity ?? mat.opacity;
        const targetScaleY = mesh.userData.targetScaleY ?? 1;
        const state = { opacity: mat.opacity, scaleY: mesh.scale.y };

        new Tween(state, this.tweenGroup)
          .to({ opacity: targetOpacity, scaleY: targetScaleY }, 600)
          .delay(baseDelay)
          .easing(easeInOutCubicElastic)
          .onUpdate(() => {
            mat.opacity = state.opacity;
            mat.transparent = true;
            mesh.scale.y = Math.max(0.01, state.scaleY);
          })
          .start();
      }
    }
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
    this.environmentGroup.add(ground);

    const buildingCount = 10 + Math.floor(Math.random() * 6);
    const buildingMat = new THREE.MeshStandardMaterial({ color: 0x334155 });

    for (let i = 0; i < buildingCount; i++) {
      const angle = (i / buildingCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const dist = 22 + Math.random() * 12;
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
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
      group.remove(child);
    }
  }

  private disposeGroup(group: THREE.Group): void {
    this.clearGroup(group);
    this.scene.remove(group);
  }
}
