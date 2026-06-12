import * as THREE from 'three';
import gsap from 'gsap';
import {
  type WorkerSceneData,
  type WorkerResult,
  type Occluder,
  type WindowDef,
  type GridCellInfo,
  ROOM_WIDTH,
  ROOM_DEPTH,
  ROOM_HEIGHT,
  WINDOW_WIDTH,
  WINDOW_HEIGHT,
  GRID_COLS,
  GRID_ROWS,
  DISPLAY_GRID_COLS,
  DISPLAY_GRID_ROWS,
  MAX_ILLUMINANCE,
} from '../../types';

const HEATMAP_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const HEATMAP_FRAG = `
uniform sampler2D uTextureFrom;
uniform sampler2D uTextureTo;
uniform float uTransition;
uniform float uOpacity;
varying vec2 vUv;

vec3 illuminanceToColor(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 c0 = vec3(0.0, 0.102, 0.302);
  vec3 c1 = vec3(0.0, 0.333, 0.8);
  vec3 c2 = vec3(0.0, 0.8, 0.8);
  vec3 c3 = vec3(1.0, 1.0, 0.0);
  vec3 c4 = vec3(1.0, 0.98, 0.804);

  if (t < 0.25) return mix(c0, c1, t / 0.25);
  if (t < 0.5) return mix(c1, c2, (t - 0.25) / 0.25);
  if (t < 0.75) return mix(c2, c3, (t - 0.5) / 0.25);
  return mix(c3, c4, (t - 0.75) / 0.25);
}

void main() {
  vec4 fromVal = texture2D(uTextureFrom, vUv);
  vec4 toVal = texture2D(uTextureTo, vUv);
  vec4 blended = mix(fromVal, toVal, uTransition);
  float illuminance = blended.r;
  vec3 color = illuminanceToColor(illuminance / 1000.0);
  gl_FragColor = vec4(color, uOpacity);
}
`;

export class GridRenderer {
  private scene: THREE.Scene;
  private heatmapMesh: THREE.Mesh | null = null;
  private gridLines: THREE.Group | null = null;
  private textureFrom: THREE.DataTexture;
  private textureTo: THREE.DataTexture;
  private shaderMaterial: THREE.ShaderMaterial;
  private worker: Worker;
  private pendingCompute = false;
  private lastComputeTime = 0;
  private computeInterval = 66;
  private currentSamples: Float32Array;
  private targetSamples: Float32Array;
  private transitionTween: gsap.core.Tween | null = null;
  private infoCard: HTMLElement | null = null;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.currentSamples = new Float32Array(GRID_COLS * GRID_ROWS * 2);
    this.targetSamples = new Float32Array(GRID_COLS * GRID_ROWS * 2);

    this.textureFrom = this.createDataTexture(this.currentSamples);
    this.textureTo = this.createDataTexture(this.targetSamples);

    this.shaderMaterial = new THREE.ShaderMaterial({
      vertexShader: HEATMAP_VERT,
      fragmentShader: HEATMAP_FRAG,
      uniforms: {
        uTextureFrom: { value: this.textureFrom },
        uTextureTo: { value: this.textureTo },
        uTransition: { value: 1.0 },
        uOpacity: { value: 0.75 },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.createHeatmapMesh();
    this.createGridLines();
    this.createInfoCard();

    this.worker = new Worker(
      new URL('../worker/rayTracing.worker.ts', import.meta.url),
      { type: 'module' }
    );
    this.worker.onmessage = this.handleWorkerResult.bind(this);

    this.triggerRecalculation([]);
  }

  private createDataTexture(data: Float32Array): THREE.DataTexture {
    const texture = new THREE.DataTexture(
      data,
      GRID_COLS,
      GRID_ROWS,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    return texture;
  }

  private createHeatmapMesh(): void {
    const geo = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH, 1, 1);
    geo.rotateX(-Math.PI / 2);
    this.heatmapMesh = new THREE.Mesh(geo, this.shaderMaterial);
    this.heatmapMesh.position.set(ROOM_WIDTH / 2, 0.015, ROOM_DEPTH / 2);
    this.heatmapMesh.renderOrder = 1;
    this.scene.add(this.heatmapMesh);
  }

  private createGridLines(): void {
    this.gridLines = new THREE.Group();
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.12,
    });

    for (let i = 0; i <= DISPLAY_GRID_COLS; i++) {
      const x = (i / DISPLAY_GRID_COLS) * ROOM_WIDTH;
      const points = [
        new THREE.Vector3(x, 0.02, 0),
        new THREE.Vector3(x, 0.02, ROOM_DEPTH),
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      this.gridLines.add(new THREE.Line(geo, lineMaterial));
    }

    for (let j = 0; j <= DISPLAY_GRID_ROWS; j++) {
      const z = (j / DISPLAY_GRID_ROWS) * ROOM_DEPTH;
      const points = [
        new THREE.Vector3(0, 0.02, z),
        new THREE.Vector3(ROOM_WIDTH, 0.02, z),
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      this.gridLines.add(new THREE.Line(geo, lineMaterial));
    }

    this.scene.add(this.gridLines);
  }

  private createInfoCard(): void {
    this.infoCard = document.createElement('div');
    this.infoCard.className = 'info-card';
    this.infoCard.innerHTML = `
      <div class="info-card-content">
        <div class="info-card-row">
          <span class="info-card-label">照度</span>
          <span class="info-card-value" id="info-illuminance">0</span>
          <span class="info-card-unit">lux</span>
        </div>
        <div class="info-card-row">
          <span class="info-card-label">光线路径</span>
          <span class="info-card-value" id="info-paths">0</span>
          <span class="info-card-unit">条</span>
        </div>
      </div>
    `;
    this.infoCard.style.display = 'none';
    document.body.appendChild(this.infoCard);
  }

  updateOccluders(occluders: Occluder[]): void {
    const now = performance.now();
    if (now - this.lastComputeTime < this.computeInterval && this.pendingCompute) {
      return;
    }
    this.triggerRecalculation(occluders);
  }

  private triggerRecalculation(occluders: Occluder[]): void {
    this.lastComputeTime = performance.now();
    this.pendingCompute = true;

    const windows: WindowDef[] = [
      {
        centerX: 0,
        centerY: 1.4,
        centerZ: 1.25,
        width: WINDOW_WIDTH,
        height: WINDOW_HEIGHT,
        normalX: 1,
        normalY: 0,
        normalZ: 0,
      },
      {
        centerX: 0,
        centerY: 1.4,
        centerZ: 3.75,
        width: WINDOW_WIDTH,
        height: WINDOW_HEIGHT,
        normalX: 1,
        normalY: 0,
        normalZ: 0,
      },
    ];

    const sceneData: WorkerSceneData = {
      roomWidth: ROOM_WIDTH,
      roomDepth: ROOM_DEPTH,
      roomHeight: ROOM_HEIGHT,
      windows,
      sunDirectionX: 1,
      sunDirectionY: -0.3,
      sunDirectionZ: 0,
      sunIntensity: 1.5,
      occluders,
      gridCols: GRID_COLS,
      gridRows: GRID_ROWS,
    };

    this.worker.postMessage(sceneData);
  }

  private handleWorkerResult(e: MessageEvent): void {
    const result: WorkerResult = e.data;
    this.pendingCompute = false;

    const newSamples = result.samples;

    this.currentSamples = new Float32Array(this.targetSamples);
    this.targetSamples = new Float32Array(newSamples);

    this.updateTextureData(this.textureFrom, this.currentSamples);
    this.updateTextureData(this.textureTo, this.targetSamples);

    if (this.transitionTween) {
      this.transitionTween.kill();
    }

    this.shaderMaterial.uniforms.uTransition.value = 0;
    this.transitionTween = gsap.to(this.shaderMaterial.uniforms.uTransition, {
      value: 1,
      duration: 0.8,
      ease: 'power2.inOut',
    });
  }

  private updateTextureData(texture: THREE.DataTexture, data: Float32Array): void {
    const imgData = texture.image.data;
    const len = GRID_COLS * GRID_ROWS;
    for (let i = 0; i < len; i++) {
      imgData[i * 4] = data[i * 2];
      imgData[i * 4 + 1] = data[i * 2 + 1];
      imgData[i * 4 + 2] = 0;
      imgData[i * 4 + 3] = 1;
    }
    texture.needsUpdate = true;
  }

  handleClick(event: MouseEvent, camera: THREE.Camera, renderer: THREE.WebGLRenderer): boolean {
    if (!this.heatmapMesh) return false;

    const rect = renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, camera);
    const intersects = this.raycaster.intersectObject(this.heatmapMesh);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      const info = this.getGridCellInfo(point.x, point.z);
      this.showInfoCard(event.clientX, event.clientY, info);
      return true;
    }

    this.hideInfoCard();
    return false;
  }

  private getGridCellInfo(worldX: number, worldZ: number): GridCellInfo {
    const displayCol = Math.floor((worldX / ROOM_WIDTH) * DISPLAY_GRID_COLS);
    const displayRow = Math.floor((worldZ / ROOM_DEPTH) * DISPLAY_GRID_ROWS);

    const clampedCol = Math.max(0, Math.min(DISPLAY_GRID_COLS - 1, displayCol));
    const clampedRow = Math.max(0, Math.min(DISPLAY_GRID_ROWS - 1, displayRow));

    const colStart = Math.floor((clampedCol / DISPLAY_GRID_COLS) * GRID_COLS);
    const colEnd = Math.floor(((clampedCol + 1) / DISPLAY_GRID_COLS) * GRID_COLS);
    const rowStart = Math.floor((clampedRow / DISPLAY_GRID_ROWS) * GRID_ROWS);
    const rowEnd = Math.floor(((clampedRow + 1) / DISPLAY_GRID_ROWS) * GRID_ROWS);

    let totalIllum = 0;
    let totalPaths = 0;
    let count = 0;

    for (let r = rowStart; r < rowEnd; r++) {
      for (let c = colStart; c < colEnd; c++) {
        const idx = (r * GRID_COLS + c) * 2;
        totalIllum += this.targetSamples[idx];
        totalPaths += this.targetSamples[idx + 1];
        count++;
      }
    }

    if (count === 0) count = 1;

    return {
      illuminance: Math.round(Math.min(MAX_ILLUMINANCE, totalIllum / count)),
      pathCount: Math.round(Math.min(20, totalPaths / count)),
    };
  }

  private showInfoCard(x: number, y: number, info: GridCellInfo): void {
    if (!this.infoCard) return;

    const illumEl = this.infoCard.querySelector('#info-illuminance');
    const pathsEl = this.infoCard.querySelector('#info-paths');
    if (illumEl) illumEl.textContent = String(info.illuminance);
    if (pathsEl) pathsEl.textContent = String(info.pathCount);

    const cardWidth = 180;
    const cardHeight = 90;
    let left = x + 15;
    let top = y - cardHeight - 15;

    if (left + cardWidth > window.innerWidth) left = x - cardWidth - 15;
    if (top < 10) top = y + 15;

    this.infoCard.style.left = `${left}px`;
    this.infoCard.style.top = `${top}px`;
    this.infoCard.style.display = 'block';
    this.infoCard.classList.remove('info-card-hidden');
    this.infoCard.classList.add('info-card-visible');
  }

  hideInfoCard(): void {
    if (!this.infoCard || this.infoCard.style.display === 'none') return;
    this.infoCard.classList.remove('info-card-visible');
    this.infoCard.classList.add('info-card-hidden');
    setTimeout(() => {
      if (this.infoCard) {
        this.infoCard.style.display = 'none';
      }
    }, 300);
  }

  forceRecalculation(occluders: Occluder[]): void {
    this.triggerRecalculation(occluders);
  }

  dispose(): void {
    this.worker.terminate();
    if (this.heatmapMesh) {
      this.scene.remove(this.heatmapMesh);
      this.heatmapMesh.geometry.dispose();
    }
    if (this.gridLines) {
      this.scene.remove(this.gridLines);
    }
    this.textureFrom.dispose();
    this.textureTo.dispose();
    this.shaderMaterial.dispose();
    if (this.infoCard && this.infoCard.parentNode) {
      this.infoCard.parentNode.removeChild(this.infoCard);
    }
  }
}
