import * as THREE from 'three';
import gsap from 'gsap';
import {
  type Occluder,
  type WindowDef,
  type WorkerSceneData,
  type WorkerResult,
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
} from '../../constants';

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

vec3 heatColor(float t) {
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
  vec4 f = texture2D(uTextureFrom, vUv);
  vec4 to = texture2D(uTextureTo, vUv);
  vec4 b = mix(f, to, uTransition);
  float ill = b.r;
  vec3 col = heatColor(ill / 1000.0);
  gl_FragColor = vec4(col, uOpacity);
}
`;

export class GridRenderer {
  private scene: THREE.Scene;
  private heatmapMesh: THREE.Mesh | null = null;
  private gridLines: THREE.Group | null = null;
  private cellHitPlanes: THREE.Group | null = null;
  private textureFrom: THREE.DataTexture;
  private textureTo: THREE.DataTexture;
  private shaderMaterial: THREE.ShaderMaterial;
  private worker: Worker;
  private pending = false;
  private lastCompute = 0;
  private minInterval = 66;
  private currentSamples: Float32Array;
  private targetSamples: Float32Array;
  private tween: gsap.core.Tween | null = null;
  private infoCard: HTMLElement | null = null;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private pendingOccluders: Occluder[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.currentSamples = new Float32Array(GRID_COLS * GRID_ROWS * 2);
    this.targetSamples = new Float32Array(GRID_COLS * GRID_ROWS * 2);

    this.textureFrom = this.makeTex(this.currentSamples);
    this.textureTo = this.makeTex(this.targetSamples);

    this.shaderMaterial = new THREE.ShaderMaterial({
      vertexShader: HEATMAP_VERT,
      fragmentShader: HEATMAP_FRAG,
      uniforms: {
        uTextureFrom: { value: this.textureFrom },
        uTextureTo: { value: this.textureTo },
        uTransition: { value: 1 },
        uOpacity: { value: 0.72 },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.createMeshes();
    this.createCard();

    this.worker = new Worker(
      new URL('../worker/rayTracing.worker.ts', import.meta.url),
      { type: 'module' }
    );
    this.worker.onmessage = this.onWorkerDone.bind(this);

    this.scheduleCompute([]);
  }

  private makeTex(data: Float32Array): THREE.DataTexture {
    const arr = new Float32Array(GRID_COLS * GRID_ROWS * 4);
    for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) {
      arr[i * 4] = data[i * 2];
      arr[i * 4 + 1] = data[i * 2 + 1];
      arr[i * 4 + 2] = 0;
      arr[i * 4 + 3] = 1;
    }
    const tex = new THREE.DataTexture(
      arr,
      GRID_COLS,
      GRID_ROWS,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  }

  private syncTex(tex: THREE.DataTexture, data: Float32Array): void {
    const arr = tex.image.data as Float32Array;
    for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) {
      arr[i * 4] = data[i * 2];
      arr[i * 4 + 1] = data[i * 2 + 1];
    }
    tex.needsUpdate = true;
  }

  private createMeshes(): void {
    const geo = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH, 1, 1);
    geo.rotateX(-Math.PI / 2);
    const uvs = geo.attributes.uv;
    for (let i = 0; i < uvs.count; i++) {
      const x = uvs.getX(i);
      const y = uvs.getY(i);
      uvs.setXY(i, x, 1 - y);
    }
    this.heatmapMesh = new THREE.Mesh(geo, this.shaderMaterial);
    this.heatmapMesh.position.set(ROOM_WIDTH / 2, 0.015, ROOM_DEPTH / 2);
    this.heatmapMesh.renderOrder = 2;
    this.scene.add(this.heatmapMesh);

    this.gridLines = new THREE.Group();
    const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1 });
    for (let i = 0; i <= DISPLAY_GRID_COLS; i++) {
      const x = (i / DISPLAY_GRID_COLS) * ROOM_WIDTH;
      const pts = [new THREE.Vector3(x, 0.018, 0), new THREE.Vector3(x, 0.018, ROOM_DEPTH)];
      this.gridLines.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    }
    for (let j = 0; j <= DISPLAY_GRID_ROWS; j++) {
      const z = (j / DISPLAY_GRID_ROWS) * ROOM_DEPTH;
      const pts = [new THREE.Vector3(0, 0.018, z), new THREE.Vector3(ROOM_WIDTH, 0.018, z)];
      this.gridLines.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    }
    this.scene.add(this.gridLines);

    this.cellHitPlanes = new THREE.Group();
    const cellW = ROOM_WIDTH / DISPLAY_GRID_COLS;
    const cellD = ROOM_DEPTH / DISPLAY_GRID_ROWS;
    const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    for (let r = 0; r < DISPLAY_GRID_ROWS; r++) {
      for (let c = 0; c < DISPLAY_GRID_COLS; c++) {
        const cellGeo = new THREE.PlaneGeometry(cellW, cellD);
        cellGeo.rotateX(-Math.PI / 2);
        const cell = new THREE.Mesh(cellGeo, hitMat);
        cell.position.set(
          (c + 0.5) * cellW,
          0.022,
          (r + 0.5) * cellD
        );
        cell.userData = { gridCol: c, gridRow: r };
        cell.renderOrder = 1;
        this.cellHitPlanes.add(cell);
      }
    }
    this.scene.add(this.cellHitPlanes);
  }

  private createCard(): void {
    this.infoCard = document.createElement('div');
    this.infoCard.className = 'info-card';
    this.infoCard.innerHTML = `
      <div class="info-card-inner">
        <div class="info-card-title">采光分析</div>
        <div class="info-card-row">
          <span class="info-card-label">照度</span>
          <span class="info-card-value" id="info-illum">0</span>
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
    this.pendingOccluders = occluders;
    const now = performance.now();
    if (this.pending) return;
    if (now - this.lastCompute < this.minInterval) {
      setTimeout(() => this.scheduleCompute(this.pendingOccluders), this.minInterval - (now - this.lastCompute));
      return;
    }
    this.scheduleCompute(occluders);
  }

  private scheduleCompute(occluders: Occluder[]): void {
    if (this.pending) return;
    this.pending = true;
    this.lastCompute = performance.now();
    const windows: WindowDef[] = [
      { centerX: 0, centerY: 1.4, centerZ: 1.25, width: WINDOW_WIDTH, height: WINDOW_HEIGHT, normalX: 1, normalY: 0, normalZ: 0 },
      { centerX: 0, centerY: 1.4, centerZ: 3.75, width: WINDOW_WIDTH, height: WINDOW_HEIGHT, normalX: 1, normalY: 0, normalZ: 0 },
    ];
    const data: WorkerSceneData = {
      roomWidth: ROOM_WIDTH,
      roomDepth: ROOM_DEPTH,
      roomHeight: ROOM_HEIGHT,
      windows,
      sunDirectionX: 0.85,
      sunDirectionY: -0.45,
      sunDirectionZ: 0.25,
      sunIntensity: 1.5,
      occluders,
      gridCols: GRID_COLS,
      gridRows: GRID_ROWS,
    };
    this.worker.postMessage(data);
  }

  private onWorkerDone(e: MessageEvent): void {
    const r: WorkerResult = e.data;
    this.pending = false;

    this.currentSamples = new Float32Array(this.targetSamples);
    this.targetSamples = new Float32Array(r.samples);
    this.syncTex(this.textureFrom, this.currentSamples);
    this.syncTex(this.textureTo, this.targetSamples);

    if (this.tween) this.tween.kill();
    this.shaderMaterial.uniforms.uTransition.value = 0;
    this.tween = gsap.to(this.shaderMaterial.uniforms.uTransition, {
      value: 1,
      duration: 0.8,
      ease: 'power2.inOut',
    });
  }

  handleClick(ev: MouseEvent, camera: THREE.Camera, renderer: THREE.WebGLRenderer): boolean {
    if (!this.cellHitPlanes) return false;
    const rect = renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, camera);
    const hits = this.raycaster.intersectObjects(this.cellHitPlanes.children, false);
    if (hits.length > 0) {
      const { gridCol, gridRow } = hits[0].object.userData as { gridCol: number; gridRow: number };
      const info = this.cellInfo(gridCol, gridRow);
      this.showCard(ev.clientX, ev.clientY, info);
      return true;
    }
    this.hideCard();
    return false;
  }

  private cellInfo(col: number, row: number): GridCellInfo {
    const gc = Math.floor(GRID_COLS / DISPLAY_GRID_COLS);
    const gr = Math.floor(GRID_ROWS / DISPLAY_GRID_ROWS);
    const cs = col * gc;
    const ce = Math.min(GRID_COLS, (col + 1) * gc);
    const rs = row * gr;
    const re = Math.min(GRID_ROWS, (row + 1) * gr);
    let sI = 0, sP = 0, n = 0;
    for (let r = rs; r < re; r++) {
      for (let c = cs; c < ce; c++) {
        const i = (r * GRID_COLS + c) * 2;
        sI += this.targetSamples[i];
        sP += this.targetSamples[i + 1];
        n++;
      }
    }
    if (n === 0) n = 1;
    return {
      illuminance: Math.round(Math.min(MAX_ILLUMINANCE, sI / n)),
      pathCount: Math.round(Math.min(20, sP / n)),
    };
  }

  private showCard(x: number, y: number, info: GridCellInfo): void {
    if (!this.infoCard) return;
    const iEl = this.infoCard.querySelector('#info-illum');
    const pEl = this.infoCard.querySelector('#info-paths');
    if (iEl) iEl.textContent = String(info.illuminance);
    if (pEl) pEl.textContent = String(info.pathCount);

    let left = x + 16;
    let top = y - 110;
    if (left + 200 > window.innerWidth) left = x - 216;
    if (top < 8) top = y + 16;

    this.infoCard.style.left = `${left}px`;
    this.infoCard.style.top = `${top}px`;
    this.infoCard.style.display = 'block';
    this.infoCard.classList.remove('info-card-hidden');
    this.infoCard.classList.add('info-card-visible');
  }

  hideCard(): void {
    if (!this.infoCard || this.infoCard.style.display === 'none') return;
    this.infoCard.classList.remove('info-card-visible');
    this.infoCard.classList.add('info-card-hidden');
    setTimeout(() => { if (this.infoCard) this.infoCard.style.display = 'none'; }, 300);
  }

  forceUpdate(occluders: Occluder[]): void {
    this.pending = false;
    this.scheduleCompute(occluders);
  }

  dispose(): void {
    this.worker.terminate();
    if (this.heatmapMesh) { this.scene.remove(this.heatmapMesh); this.heatmapMesh.geometry.dispose(); }
    if (this.gridLines) this.scene.remove(this.gridLines);
    if (this.cellHitPlanes) this.scene.remove(this.cellHitPlanes);
    this.textureFrom.dispose();
    this.textureTo.dispose();
    this.shaderMaterial.dispose();
    if (this.infoCard && this.infoCard.parentNode) this.infoCard.parentNode.removeChild(this.infoCard);
  }
}
