import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { SceneManager } from './sceneManager';
import { OreVeinData, FaultPlaneData } from './terrainGenerator';

export class InteractionController {
  private sceneManager: SceneManager;
  private infoLabel: HTMLElement;
  private cuttingStatus: HTMLElement;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private highlightedVein: OreVeinData | null = null;
  private highlightedFault: FaultPlaneData | null = null;

  private isCutting: boolean = false;
  private originalVertices: Float32Array | null = null;
  private originalTerrainPosition: THREE.Vector3 | null = null;

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
    this.infoLabel = document.getElementById('info-label')!;
    this.cuttingStatus = document.getElementById('cutting-status')!;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }

  init(): void {
    this.setupKeyboardListeners();
    this.setupMouseMoveListener();
  }

  private setupKeyboardListeners(): void {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        this.startFaultCutting();
      }
      if (e.code === 'Escape') {
        this.clearHighlights();
      }
    });
  }

  private setupMouseMoveListener(): void {
    const canvas = this.sceneManager.getRenderer().domElement;
    canvas.addEventListener('mousemove', (e) => {
      this.updateLabelPosition(e.clientX, e.clientY);
    });
  }

  handleClick(clientX: number, clientY: number): void {
    const startTime = performance.now();

    this.updateMouseNDC(clientX, clientY);
    this.clearHighlights();

    const terrainData = this.sceneManager.getTerrainData();
    if (!terrainData) return;

    const detectables: THREE.Object3D[] = [];
    terrainData.oreVeins.forEach((vein) => detectables.push(vein.mesh));
    terrainData.faultPlanes.forEach((fault) => detectables.push(fault.mesh));
    detectables.push(terrainData.mesh);

    this.raycaster.setFromCamera(this.mouse, this.sceneManager.getCamera());
    const intersects = this.raycaster.intersectObjects(detectables, true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      let object = hit.object;

      while (object.parent && !this.isDetectableObject(object)) {
        object = object.parent;
      }

      const userData = this.findUserData(object);

      if (userData) {
        if (userData.type === 'oreVein') {
          const vein = terrainData.oreVeins[userData.index];
          if (vein) {
            this.highlightOreVein(vein);
            this.showOreVeinInfo(vein, clientX, clientY);
          }
        } else if (userData.type === 'faultPlane') {
          const fault = terrainData.faultPlanes[userData.index];
          if (fault) {
            this.highlightFaultPlane(fault);
            this.showFaultPlaneInfo(fault, clientX, clientY);
          }
        } else {
          this.showTerrainInfo(hit.point, clientX, clientY);
        }
      } else {
        this.showTerrainInfo(hit.point, clientX, clientY);
      }
    } else {
      this.hideInfoLabel();
    }

    const elapsed = performance.now() - startTime;
    if (elapsed > 100) {
      console.warn(`点击探测响应时间: ${elapsed.toFixed(2)}ms (超过100ms阈值)`);
    }
  }

  private isDetectableObject(obj: THREE.Object3D): boolean {
    return obj.userData && (obj.userData.type === 'oreVein' || obj.userData.type === 'faultPlane' || obj.userData.type === 'terrain');
  }

  private findUserData(obj: THREE.Object3D): { type: string; index: number } | null {
    let current: THREE.Object3D | null = obj;
    while (current) {
      if (current.userData && current.userData.type) {
        return {
          type: current.userData.type,
          index: current.userData.index ?? 0
        };
      }
      current = current.parent;
    }

    const terrainData = this.sceneManager.getTerrainData();
    if (terrainData && obj === terrainData.mesh) {
      return { type: 'terrain', index: 0 };
    }
    return null;
  }

  private highlightOreVein(vein: OreVeinData): void {
    const material = vein.mesh.material as THREE.MeshStandardMaterial;

    new TWEEN.Tween({ intensity: material.emissiveIntensity, opacity: material.opacity })
      .to({ intensity: vein.originalEmissiveIntensity * 1.5, opacity: 0.95 }, 300)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate((obj) => {
        material.emissiveIntensity = obj.intensity;
        material.opacity = obj.opacity;
        material.emissive.copy(vein.originalEmissive).multiplyScalar(1.3);
      })
      .start();

    material.color.lerpColors(vein.originalColor, new THREE.Color(0xffffff), 0.25);

    if (vein.haloParticles) {
      vein.haloParticles.visible = true;
      const haloMat = vein.haloParticles.material as THREE.PointsMaterial;
      haloMat.opacity = 0;
      new TWEEN.Tween({ opacity: 0 })
        .to({ opacity: 0.6 }, 400)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate((obj) => {
          haloMat.opacity = obj.opacity;
        })
        .start();
    }

    this.highlightedVein = vein;
  }

  private highlightFaultPlane(fault: FaultPlaneData): void {
    const material = fault.mesh.material as THREE.MeshStandardMaterial;

    new TWEEN.Tween({ opacity: material.opacity })
      .to({ opacity: 0.6 }, 300)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate((obj) => {
        material.opacity = obj.opacity;
      })
      .start();

    material.color.setHex(0xffffaa);

    if (fault.mesh.children.length > 0) {
      const edges = fault.mesh.children[0] as THREE.LineSegments;
      const edgesMat = edges.material as THREE.LineBasicMaterial;
      edgesMat.color.setHex(0xffff00);
      edgesMat.opacity = 1.0;
    }

    this.highlightedFault = fault;
  }

  private clearHighlights(): void {
    if (this.highlightedVein) {
      const vein = this.highlightedVein;
      const material = vein.mesh.material as THREE.MeshStandardMaterial;

      new TWEEN.Tween({
        intensity: material.emissiveIntensity,
        opacity: material.opacity
      })
        .to({
          intensity: vein.originalEmissiveIntensity,
          opacity: 0.75
        }, 300)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate((obj) => {
          material.emissiveIntensity = obj.intensity;
          material.opacity = obj.opacity;
          material.emissive.copy(vein.originalEmissive);
        })
        .start();

      material.color.copy(vein.originalColor);

      if (vein.haloParticles) {
        const haloMat = vein.haloParticles.material as THREE.PointsMaterial;
        new TWEEN.Tween({ opacity: haloMat.opacity })
          .to({ opacity: 0 }, 300)
          .easing(TWEEN.Easing.Quadratic.Out)
          .onUpdate((obj) => {
            haloMat.opacity = obj.opacity;
          })
          .onComplete(() => {
            if (vein.haloParticles) {
              vein.haloParticles.visible = false;
            }
          })
          .start();
      }

      this.highlightedVein = null;
    }

    if (this.highlightedFault) {
      const fault = this.highlightedFault;
      const material = fault.mesh.material as THREE.MeshStandardMaterial;

      new TWEEN.Tween({ opacity: material.opacity })
        .to({ opacity: 0.3 }, 300)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate((obj) => {
          material.opacity = obj.opacity;
        })
        .start();

      material.color.setHex(0xffffff);

      if (fault.mesh.children.length > 0) {
        const edges = fault.mesh.children[0] as THREE.LineSegments;
        const edgesMat = edges.material as THREE.LineBasicMaterial;
        edgesMat.color.setHex(0xffffff);
        edgesMat.opacity = 0.6;
      }

      this.highlightedFault = null;
    }

    this.hideInfoLabel();
  }

  private showOreVeinInfo(vein: OreVeinData, clientX: number, clientY: number): void {
    const typeNames = {
      gold: '金矿石',
      emerald: '翡翠矿'
    };

    const purity = (85 + Math.random() * 10).toFixed(1);
    const reserves = (1000 + Math.random() * 5000).toFixed(0);

    this.infoLabel.innerHTML = `
      <div class="label-title">💎 ${vein.name}</div>
      <div class="label-row"><span class="label-key">矿物类型</span><span class="label-value">${typeNames[vein.type]}</span></div>
      <div class="label-row"><span class="label-key">埋藏深度</span><span class="label-value">${vein.depth.toFixed(1)} m</span></div>
      <div class="label-row"><span class="label-key">矿脉长度</span><span class="label-value">${vein.length.toFixed(1)} m</span></div>
      <div class="label-row"><span class="label-key">矿脉宽度</span><span class="label-value">${vein.width.toFixed(1)} m</span></div>
      <div class="label-row"><span class="label-key">矿石纯度</span><span class="label-value" style="color:#FFD700">${purity}%</span></div>
      <div class="label-row"><span class="label-key">预估储量</span><span class="label-value">${reserves} 吨</span></div>
    `;
    this.showInfoLabel(clientX, clientY);
  }

  private showFaultPlaneInfo(fault: FaultPlaneData, clientX: number, clientY: number): void {
    const displacement = (1.5 + Math.random() * 3.5).toFixed(1);
    const angle = (Math.random() * 90).toFixed(1);
    const age = (6500 + Math.random() * 3500).toFixed(0);

    this.infoLabel.innerHTML = `
      <div class="label-title">📐 ${fault.name}</div>
      <div class="label-row"><span class="label-key">断层类型</span><span class="label-value">正断层</span></div>
      <div class="label-row"><span class="label-key">断距</span><span class="label-value">${displacement} m</span></div>
      <div class="label-row"><span class="label-key">产状倾角</span><span class="label-value">${angle}°</span></div>
      <div class="label-row"><span class="label-key">形成年代</span><span class="label-value">${age} 万年前</span></div>
      <div class="label-row"><span class="label-key">活动性</span><span class="label-value" style="color:#66ccff">稳定</span></div>
    `;
    this.showInfoLabel(clientX, clientY);
  }

  private showTerrainInfo(point: THREE.Vector3, clientX: number, clientY: number): void {
    const elevation = (point.y + 15).toFixed(2);
    const rockTypes = ['石灰岩', '花岗岩', '砂岩', '页岩', '片麻岩'];
    const rockType = rockTypes[Math.floor(Math.random() * rockTypes.length)];
    const hardness = (3 + Math.random() * 5).toFixed(1);

    this.infoLabel.innerHTML = `
      <div class="label-title">🌍 地表岩层探测</div>
      <div class="label-row"><span class="label-key">相对高程</span><span class="label-value">${elevation} m</span></div>
      <div class="label-row"><span class="label-key">岩石类型</span><span class="label-value">${rockType}</span></div>
      <div class="label-row"><span class="label-key">莫氏硬度</span><span class="label-value">${hardness}</span></div>
      <div class="label-row"><span class="label-key">坐标位置</span><span class="label-value" style="font-family:monospace;font-size:12px">(${point.x.toFixed(1)}, ${point.y.toFixed(1)}, ${point.z.toFixed(1)})</span></div>
    `;
    this.showInfoLabel(clientX, clientY);
  }

  private showInfoLabel(clientX: number, clientY: number): void {
    this.infoLabel.style.display = 'block';
    this.updateLabelPosition(clientX, clientY);
  }

  private hideInfoLabel(): void {
    this.infoLabel.style.display = 'none';
  }

  private updateLabelPosition(clientX: number, clientY: number): void {
    if (this.infoLabel.style.display === 'none') return;

    const rect = this.sceneManager.getContainer().getBoundingClientRect();
    let x = clientX - rect.left;
    let y = clientY - rect.top;

    const labelWidth = this.infoLabel.offsetWidth;
    const labelHeight = this.infoLabel.offsetHeight;
    const padding = 15;

    if (x - labelWidth / 2 < padding) {
      x = labelWidth / 2 + padding;
    }
    if (x + labelWidth / 2 > rect.width - padding) {
      x = rect.width - labelWidth / 2 - padding;
    }
    if (y - labelHeight - 20 < padding) {
      y = labelHeight + 20 + padding;
    }

    this.infoLabel.style.left = `${x}px`;
    this.infoLabel.style.top = `${y}px`;
  }

  private updateMouseNDC(clientX: number, clientY: number): void {
    const rect = this.sceneManager.getRenderer().domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  private startFaultCutting(): void {
    if (this.isCutting) return;

    const terrainData = this.sceneManager.getTerrainData();
    if (!terrainData) return;

    this.isCutting = true;
    this.cuttingStatus.style.display = 'block';

    const faults = this.sceneManager.getFaultPlanes();
    if (faults.length === 0) {
      setTimeout(() => {
        this.isCutting = false;
        this.cuttingStatus.style.display = 'none';
      }, 500);
      return;
    }

    const fault = faults[0];
    const camera = this.sceneManager.getCamera();
    const cameraDir = new THREE.Vector3();
    camera.getWorldDirection(cameraDir);

    let cutNormal = fault.normal.clone();
    if (cutNormal.dot(cameraDir) > 0) {
      cutNormal.negate();
    }

    const cutCenter = fault.center.clone();
    this.sceneManager.spawnCuttingParticles(cutNormal, cutCenter, 250);

    const geometry = terrainData.geometry;
    const positions = geometry.attributes.position.array as Float32Array;

    if (!this.originalVertices) {
      this.originalVertices = new Float32Array(positions);
    }

    const mesh = terrainData.mesh;
    const originalYRotation = mesh.rotation.x;

    const cutState = { progress: 0 };
    const maxCutDepth = 25;

    const terrainNormal = new THREE.Vector3(0, 0, 1);
    terrainNormal.applyQuaternion(mesh.quaternion);

    new TWEEN.Tween(cutState)
      .to({ progress: 1 }, 5000)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate((obj) => {
        const currentDepth = obj.progress * maxCutDepth;
        this.applyCutToTerrain(geometry, positions, cutNormal, cutCenter, currentDepth);
      })
      .onComplete(() => {
        new TWEEN.Tween(cutState)
          .to({ progress: 0 }, 5000)
          .easing(TWEEN.Easing.Cubic.InOut)
          .onUpdate((obj) => {
            const currentDepth = obj.progress * maxCutDepth;
            this.applyCutToTerrain(geometry, positions, cutNormal, cutCenter, currentDepth);
          })
          .onComplete(() => {
            this.finishCutting(geometry, mesh);
          })
          .start();
      })
      .start();
  }

  private wireframeCutFrameCounter: number = 0;

  private applyCutToTerrain(
    geometry: THREE.PlaneGeometry,
    positions: Float32Array,
    cutNormal: THREE.Vector3,
    cutCenter: THREE.Vector3,
    cutDepth: number
  ): void {
    if (!this.originalVertices) return;

    const terrainData = this.sceneManager.getTerrainData();
    if (!terrainData) return;

    const mesh = terrainData.mesh;
    const worldPos = mesh.position.clone();
    const meshQuat = mesh.quaternion;

    for (let i = 0; i < positions.length; i += 3) {
      const originalX = this.originalVertices[i];
      const originalY = this.originalVertices[i + 1];
      const originalZ = this.originalVertices[i + 2];

      const lx = originalX, ly = originalY, lz = originalZ;
      const wx = lx * (1 - 2 * (meshQuat.y * meshQuat.y + meshQuat.z * meshQuat.z)) +
                 ly * 2 * (meshQuat.x * meshQuat.y - meshQuat.w * meshQuat.z) +
                 lz * 2 * (meshQuat.x * meshQuat.z + meshQuat.w * meshQuat.y) + worldPos.x;
      const wy = lx * 2 * (meshQuat.x * meshQuat.y + meshQuat.w * meshQuat.z) +
                 ly * (1 - 2 * (meshQuat.x * meshQuat.x + meshQuat.z * meshQuat.z)) +
                 lz * 2 * (meshQuat.y * meshQuat.z - meshQuat.w * meshQuat.x) + worldPos.y;
      const wz = lx * 2 * (meshQuat.x * meshQuat.z - meshQuat.w * meshQuat.y) +
                 ly * 2 * (meshQuat.y * meshQuat.z + meshQuat.w * meshQuat.x) +
                 lz * (1 - 2 * (meshQuat.x * meshQuat.x + meshQuat.y * meshQuat.y)) + worldPos.z;

      const dx = wx - cutCenter.x;
      const dy = wy - cutCenter.y;
      const dz = wz - cutCenter.z;
      const distance = dx * cutNormal.x + dy * cutNormal.y + dz * cutNormal.z;

      if (distance > 0) {
        const offset = Math.min(distance, cutDepth);
        const nwx = wx - cutNormal.x * offset;
        const nwy = wy - cutNormal.y * offset;
        const nwz = wz - cutNormal.z * offset;

        const tlx = nwx - worldPos.x;
        const tly = nwy - worldPos.y;
        const tlz = nwz - worldPos.z;

        const invW = meshQuat.w;
        const invX = -meshQuat.x;
        const invY = -meshQuat.y;
        const invZ = -meshQuat.z;

        positions[i] = tlx * (1 - 2 * (invY * invY + invZ * invZ)) +
                       tly * 2 * (invX * invY - invW * invZ) +
                       tlz * 2 * (invX * invZ + invW * invY);
        positions[i + 1] = tlx * 2 * (invX * invY + invW * invZ) +
                           tly * (1 - 2 * (invX * invX + invZ * invZ)) +
                           tlz * 2 * (invY * invZ - invW * invX);
        positions[i + 2] = tlx * 2 * (invX * invZ - invW * invY) +
                           tly * 2 * (invY * invZ + invW * invX) +
                           tlz * (1 - 2 * (invX * invX + invY * invY));
      } else {
        positions[i] = originalX;
        positions[i + 1] = originalY;
        positions[i + 2] = originalZ;
      }
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();

    this.wireframeCutFrameCounter++;
    if (this.wireframeCutFrameCounter % 5 === 0) {
      const wireframe = terrainData.wireframe;
      wireframe.geometry.dispose();
      wireframe.geometry = new THREE.WireframeGeometry(geometry);
    }
  }

  private finishCutting(geometry: THREE.PlaneGeometry, mesh: THREE.Mesh): void {
    if (this.originalVertices) {
      const positions = geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i++) {
        positions[i] = this.originalVertices[i];
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.computeVertexNormals();

      const terrainData = this.sceneManager.getTerrainData();
      if (terrainData) {
        terrainData.wireframe.geometry.dispose();
        terrainData.wireframe.geometry = new THREE.WireframeGeometry(geometry);
      }
    }

    this.originalVertices = null;
    this.isCutting = false;
    this.cuttingStatus.style.display = 'none';
    this.sceneManager.clearCuttingParticles();
  }

  update(timestamp: number): void {
    TWEEN.update(timestamp);
  }
}
