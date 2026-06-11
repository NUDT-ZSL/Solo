import * as THREE from 'three';
import type { CatalogItem, ShelfConfig } from './main';

interface BookSpine3D {
  mesh: THREE.Mesh;
  item: CatalogItem;
  originalZ: number;
  isHovered: boolean;
  isSelected: boolean;
  targetZ: number;
  edgeGlow?: THREE.Mesh;
}

interface LevelColor {
  main: number;
  glow: number;
  css: string;
}

const LEVEL_COLORS: Record<1 | 2 | 3, LevelColor> = {
  1: { main: 0xFF8C00, glow: 0xFFA500, css: '#FF8C00' },
  2: { main: 0xFFD700, glow: 0xFFEC8B, css: '#FFD700' },
  3: { main: 0x90EE90, glow: 0x98FB98, css: '#90EE90' }
};

const LEVEL_THICKNESS: Record<1 | 2 | 3, number> = {
  1: 20,
  2: 12,
  3: 6
};

const BOOK_HEIGHT = 80;
const SHELF_BOARD_THICKNESS = 8;
const SHELF_BOARD_DEPTH = 50;

export class BookShelf {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private shelfGroup: THREE.Group;
  private booksGroup: THREE.Group;
  private particleSystem?: THREE.Points;

  private bookSpines: BookSpine3D[] = [];
  private config: ShelfConfig;
  private items: CatalogItem[] = [];

  private hoveredSpine: BookSpine3D | null = null;
  private selectedSpine: BookSpine3D | null = null;

  private clock: THREE.Clock;
  private startTime: number;

  private cameraAnim: {
    active: boolean;
    fromPos: THREE.Vector3;
    toPos: THREE.Vector3;
    fromLook: THREE.Vector3;
    toLook: THREE.Vector3;
    t: number;
    duration: number;
  } | null = null;

  private domEvents: { canvas: HTMLElement; onMove: (e: MouseEvent) => void; onClick: (e: MouseEvent) => void; onResize: () => void };
  private listeners: {
    onHover?: (item: CatalogItem | null, screenX: number, screenY: number) => void;
    onClick?: (item: CatalogItem) => void;
  };

  private bgType: 'wood' | 'black' | 'navy' = 'wood';

  constructor(canvas: HTMLCanvasElement, listeners: BookShelf['listeners'] = {}) {
    this.scene = new THREE.Scene();
    this.config = { layers: 5, bookGap: 8, background: 'wood' };
    this.clock = new THREE.Clock();
    this.startTime = performance.now();
    this.listeners = listeners;

    const rect = canvas.getBoundingClientRect();
    this.camera = new THREE.PerspectiveCamera(45, rect.width / rect.height, 0.1, 5000);
    this.camera.position.set(0, 150, 500);
    this.camera.lookAt(0, 150, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(rect.width, rect.height, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.shelfGroup = new THREE.Group();
    this.booksGroup = new THREE.Group();
    this.scene.add(this.shelfGroup);
    this.scene.add(this.booksGroup);

    this.setupLights();
    this.setupBackground();
    this.setupParticles();

    const onMove = (e: MouseEvent) => this.handleMouseMove(e);
    const onClick = (e: MouseEvent) => this.handleClick(e);
    const onResize = () => this.handleResize();
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('click', onClick);
    window.addEventListener('resize', onResize);
    this.domEvents = { canvas, onMove, onClick, onResize };

    this.animate();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);

    const topLight = new THREE.PointLight(0xFFA500, 0.9, 1500, 2);
    topLight.position.set(0, 520, 260);
    this.scene.add(topLight);

    const bottomLight = new THREE.PointLight(0x8B4513, 0.6, 900, 2);
    bottomLight.position.set(0, -200, 260);
    this.scene.add(bottomLight);

    const frontLight = new THREE.DirectionalLight(0xffeedd, 0.35);
    frontLight.position.set(0, 300, 500);
    this.scene.add(frontLight);
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    this.updateBackgroundTexture(canvas);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = tex;
  }

  private updateBackgroundTexture(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width;
    const h = canvas.height;
    let c1: string, c2: string;
    if (this.bgType === 'wood') {
      c1 = '#3E2723'; c2 = '#5D4037';
    } else if (this.bgType === 'black') {
      c1 = '#000000'; c2 = '#1a1a1a';
    } else {
      c1 = '#000033'; c2 = '#0a0a4a';
    }
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    if (this.bgType === 'wood') {
      ctx.globalAlpha = 0.06;
      for (let i = 0; i < 40; i++) {
        const y = (i / 40) * h + (Math.sin(i * 2.1) * 6);
        ctx.strokeStyle = i % 2 ? '#000' : '#8d6e63';
        ctx.lineWidth = 1 + Math.random() * 1.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x < w; x += 18) {
          const ny = y + Math.sin(x * 0.02 + i) * 5;
          ctx.lineTo(x, ny);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  public setBackground(bg: 'wood' | 'black' | 'navy'): void {
    this.bgType = bg;
    this.config.background = bg;
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    this.updateBackgroundTexture(canvas);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const old = this.scene.background as THREE.Texture | null;
    this.scene.background = tex;
    old?.dispose();
  }

  private setupParticles(): void {
    const count = 120;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const color = new THREE.Color();

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 1200;
      positions[i * 3 + 1] = Math.random() * 800 - 100;
      positions[i * 3 + 2] = Math.random() * 600 - 100;
      color.setHSL(0.08 + Math.random() * 0.08, 0.9, 0.55 + Math.random() * 0.3);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      speeds[i] = 6 + Math.random() * 12;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    (geo as any).userData.speeds = speeds;

    const mat = new THREE.PointsMaterial({
      size: 3.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particleSystem = new THREE.Points(geo, mat);
    this.scene.add(this.particleSystem);
  }

  public setConfig(partial: Partial<ShelfConfig>): void {
    const needsRebuild = partial.layers !== undefined && partial.layers !== this.config.layers ||
                        partial.bookGap !== undefined && partial.bookGap !== this.config.bookGap;
    this.config = { ...this.config, ...partial };
    if (partial.background) {
      this.setBackground(partial.background);
    }
    if (needsRebuild && this.items.length > 0) {
      this.buildShelf(this.items);
    }
  }

  public buildShelf(items: CatalogItem[]): void {
    this.clearShelf();
    this.items = [...items];
    const layers = this.config.layers;
    const perLayer = Math.ceil(items.length / layers);
    const gap = this.config.bookGap;

    let maxShelfWidth = 0;
    const layerItems: CatalogItem[][] = [];
    for (let l = 0; l < layers; l++) {
      const slice = items.slice(l * perLayer, (l + 1) * perLayer);
      layerItems.push(slice);
      const width = slice.reduce((sum, it) => sum + LEVEL_THICKNESS[it.level], 0) + Math.max(0, slice.length - 1) * gap;
      maxShelfWidth = Math.max(maxShelfWidth, width);
    }
    maxShelfWidth = Math.max(maxShelfWidth + 40, 400);

    const totalHeight = layers * (BOOK_HEIGHT + SHELF_BOARD_THICKNESS) + SHELF_BOARD_THICKNESS;
    const startY = -totalHeight / 2 + SHELF_BOARD_THICKNESS;

    this.buildShelves(layers, maxShelfWidth, startY);
    this.buildBackPanel(layers, maxShelfWidth, totalHeight, startY);

    let spinesCreated = 0;
    layerItems.forEach((slice, layerIdx) => {
      const layerWidth = slice.reduce((sum, it) => sum + LEVEL_THICKNESS[it.level], 0) + Math.max(0, slice.length - 1) * gap;
      let x = -layerWidth / 2;
      const y = startY + layerIdx * (BOOK_HEIGHT + SHELF_BOARD_THICKNESS) + SHELF_BOARD_THICKNESS + BOOK_HEIGHT / 2;

      slice.forEach((item, idxOnLayer) => {
        const thickness = LEVEL_THICKNESS[item.level];
        const colors = LEVEL_COLORS[item.level];
        item.shelfIndex = layerIdx;
        item.positionOnShelf = idxOnLayer;

        const group = new THREE.Group();
        const depth = 35;
        const geo = new THREE.BoxGeometry(thickness, BOOK_HEIGHT, depth);

        const frontCanvas = this.createSpineTexture(item, thickness);
        const frontTex = new THREE.CanvasTexture(frontCanvas);
        frontTex.colorSpace = THREE.SRGBColorSpace;
        frontTex.anisotropy = 8;

        const sideColor = new THREE.Color(colors.main).multiplyScalar(0.55);
        const backColor = new THREE.Color(colors.main).multiplyScalar(0.4);
        const topBottomColor = new THREE.Color(colors.main).multiplyScalar(0.65);

        const materials = [
          new THREE.MeshStandardMaterial({ color: sideColor, roughness: 0.75, metalness: 0.08 }),
          new THREE.MeshStandardMaterial({ color: sideColor, roughness: 0.75, metalness: 0.08 }),
          new THREE.MeshStandardMaterial({ color: topBottomColor, roughness: 0.8 }),
          new THREE.MeshStandardMaterial({ color: topBottomColor, roughness: 0.8 }),
          new THREE.MeshStandardMaterial({ map: frontTex, roughness: 0.55, metalness: 0.1 }),
          new THREE.MeshStandardMaterial({ color: backColor, roughness: 0.85 })
        ];

        const mesh = new THREE.Mesh(geo, materials);
        mesh.castShadow = false;
        mesh.receiveShadow = false;

        group.add(mesh);

        const edgeGeo = new THREE.BoxGeometry(thickness + 1.2, BOOK_HEIGHT + 1.2, depth + 1.2);
        const edgeMat = new THREE.MeshBasicMaterial({
          color: colors.glow,
          transparent: true,
          opacity: 0,
          side: THREE.BackSide,
          blending: THREE.AdditiveBlending
        });
        const edgeMesh = new THREE.Mesh(edgeGeo, edgeMat);
        group.add(edgeMesh);

        const zOffset = (item.level - 1) * 0.5;
        group.position.set(x + thickness / 2, y, zOffset);
        (mesh.userData as any).catalogItem = item;
        (group.userData as any).catalogItem = item;

        this.booksGroup.add(group);

        this.bookSpines.push({
          mesh: group as unknown as THREE.Mesh,
          item,
          originalZ: zOffset,
          isHovered: false,
          isSelected: false,
          targetZ: zOffset,
          edgeGlow: edgeMesh
        });

        x += thickness + gap;
        spinesCreated++;
      });
    });

    this.resetCameraView();
  }

  private createSpineTexture(item: CatalogItem, thickness: number): HTMLCanvasElement {
    const W = Math.max(256, Math.round(thickness * 10));
    const H = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    const colors = LEVEL_COLORS[item.level];

    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, this.shadeColor(colors.css, -20));
    grad.addColorStop(0.3, colors.css);
    grad.addColorStop(0.7, colors.css);
    grad.addColorStop(1, this.shadeColor(colors.css, -25));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 20; i++) {
      ctx.strokeStyle = i % 2 ? '#000000' : '#ffffff';
      ctx.lineWidth = 0.5 + Math.random();
      ctx.beginPath();
      const y = Math.random() * H;
      ctx.moveTo(0, y);
      for (let x = 0; x < W; x += 5) {
        ctx.lineTo(x, y + Math.sin(x * 0.1 + i) * 2);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#FFD700';
    ctx.font = `bold ${Math.max(18, Math.round(W * 0.22))}px "Microsoft YaHei", sans-serif`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText(item.page || '—', 14, 28);

    ctx.save();
    ctx.translate(W / 2, H / 2 + 20);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.max(28, Math.round(W * 0.32))}px "Microsoft YaHei", "PingFang SC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const maxChars = Math.min(item.title.length, Math.floor(H * 0.85 / (W * 0.35)));
    let displayTitle = item.title;
    if (maxChars < item.title.length) {
      displayTitle = item.title.slice(0, Math.max(1, maxChars - 1)) + '…';
    }
    ctx.fillText(displayTitle, 0, 0);
    ctx.restore();

    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, W - 4, H - 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, W - 20, H - 20);

    return canvas;
  }

  private shadeColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
    return '#' + ((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1);
  }

  private buildShelves(layers: number, width: number, startY: number): void {
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x5D4037,
      roughness: 0.85,
      metalness: 0.05
    });
    for (let l = 0; l <= layers; l++) {
      const y = startY + l * (BOOK_HEIGHT + SHELF_BOARD_THICKNESS);
      const geo = new THREE.BoxGeometry(width, SHELF_BOARD_THICKNESS, SHELF_BOARD_DEPTH);
      const board = new THREE.Mesh(geo, woodMat);
      board.position.set(0, y, 0);
      this.shelfGroup.add(board);
    }
    const sideMat = new THREE.MeshStandardMaterial({
      color: 0x4E342E, roughness: 0.9, metalness: 0.03
    });
    const totalH = layers * (BOOK_HEIGHT + SHELF_BOARD_THICKNESS) + SHELF_BOARD_THICKNESS;
    const sideGeo = new THREE.BoxGeometry(SHELF_BOARD_THICKNESS * 1.2, totalH, SHELF_BOARD_DEPTH);
    const leftSide = new THREE.Mesh(sideGeo, sideMat);
    leftSide.position.set(-width / 2, startY + totalH / 2 - SHELF_BOARD_THICKNESS / 2, 0);
    const rightSide = new THREE.Mesh(sideGeo, sideMat);
    rightSide.position.set(width / 2, startY + totalH / 2 - SHELF_BOARD_THICKNESS / 2, 0);
    this.shelfGroup.add(leftSide, rightSide);
  }

  private buildBackPanel(layers: number, width: number, totalH: number, startY: number): void {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#2d1f1a');
    grad.addColorStop(1, '#1a100b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 0.05;
    for (let i = 0; i < 60; i++) {
      ctx.strokeStyle = i % 2 ? '#000' : '#8d6e63';
      ctx.lineWidth = 1 + Math.random();
      ctx.beginPath();
      const y = Math.random() * canvas.height;
      ctx.moveTo(0, y);
      for (let x = 0; x < canvas.width; x += 20) {
        ctx.lineTo(x, y + Math.sin(x * 0.01 + i) * 6);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 1);

    const backMat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.95,
      metalness: 0
    });
    const panelH = totalH;
    const panelGeo = new THREE.PlaneGeometry(width * 0.995, panelH);
    const panel = new THREE.Mesh(panelGeo, backMat);
    panel.position.set(0, startY + panelH / 2 - SHELF_BOARD_THICKNESS / 2, -SHELF_BOARD_DEPTH / 2 + 1);
    this.shelfGroup.add(panel);
  }

  private clearShelf(): void {
    [...this.booksGroup.children].forEach(child => {
      this.booksGroup.remove(child);
      child.traverse(obj => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mats: THREE.Material[] = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach(m => {
          const mm = m as THREE.MeshStandardMaterial;
          if (mm.map) mm.map.dispose();
          m.dispose();
        });
      });
    });
    [...this.shelfGroup.children].forEach(child => {
      this.shelfGroup.remove(child);
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach(m => m.dispose());
      else if (mat) {
        const mm = mat as THREE.MeshStandardMaterial;
        if (mm.map) mm.map.dispose();
        mat.dispose();
      }
    });
    this.bookSpines = [];
    this.hoveredSpine = null;
    this.selectedSpine = null;
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const spineMeshes = this.bookSpines.map(b => b.mesh);
    const intersects = this.raycaster.intersectObjects(spineMeshes, true);

    let found: BookSpine3D | null = null;
    if (intersects.length > 0) {
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj && !(obj.userData && obj.userData.catalogItem)) {
        obj = obj.parent;
      }
      if (obj) {
        const item = obj.userData.catalogItem;
        found = this.bookSpines.find(b => b.item.id === item.id) || null;
      }
    }

    if (found !== this.hoveredSpine) {
      if (this.hoveredSpine) {
        this.hoveredSpine.isHovered = false;
        this.hoveredSpine.targetZ = this.hoveredSpine.originalZ;
      }
      this.hoveredSpine = found;
      if (found) {
        found.isHovered = true;
        found.targetZ = found.originalZ + 15;
      }
    }

    if (found) {
      const world = new THREE.Vector3();
      found.mesh.getWorldPosition(world);
      const projected = world.clone().project(this.camera);
      const sx = (projected.x * 0.5 + 0.5) * window.innerWidth;
      const sy = (-projected.y * 0.5 + 0.5) * window.innerHeight;
      this.listeners.onHover?.(found.item, sx - 70, sy - 40);
      this.renderer.domElement.style.cursor = 'pointer';
    } else {
      this.listeners.onHover?.(null, 0, 0);
      this.renderer.domElement.style.cursor = 'default';
    }
  }

  private handleClick(_e: MouseEvent): void {
    if (this.hoveredSpine) {
      this.focusOnBook(this.hoveredSpine.item);
      this.listeners.onClick?.(this.hoveredSpine.item);
    }
  }

  public focusOnBook(item: CatalogItem): void {
    const spine = this.bookSpines.find(b => b.item.id === item.id);
    if (!spine) return;

    if (this.selectedSpine) {
      this.selectedSpine.isSelected = false;
    }
    this.selectedSpine = spine;
    spine.isSelected = true;

    const worldPos = new THREE.Vector3();
    spine.mesh.getWorldPosition(worldPos);

    const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(spine.mesh.quaternion);
    const targetPos = worldPos.clone().add(new THREE.Vector3(0, 0, 60));

    this.cameraAnim = {
      active: true,
      fromPos: this.camera.position.clone(),
      toPos: targetPos,
      fromLook: new THREE.Vector3(),
      toLook: worldPos.clone(),
      t: 0,
      duration: 0.8
    };
    const curLook = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).add(this.camera.position);
    this.cameraAnim.fromLook = curLook;
  }

  public resetCameraView(): void {
    this.cameraAnim = {
      active: true,
      fromPos: this.camera.position.clone(),
      toPos: new THREE.Vector3(0, 120, 480),
      fromLook: new THREE.Vector3(),
      toLook: new THREE.Vector3(0, 100, 0),
      t: 0,
      duration: 0.8
    };
    const curLook = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).add(this.camera.position);
    this.cameraAnim.fromLook = curLook;
    if (this.selectedSpine) {
      this.selectedSpine.isSelected = false;
      this.selectedSpine = null;
    }
  }

  private handleResize(): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    this.camera.aspect = rect.width / rect.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(rect.width, rect.height, false);
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    const dt = this.clock.getDelta();
    const elapsed = (performance.now() - this.startTime) / 1000;

    this.shelfGroup.position.z = Math.sin(elapsed / 6 * Math.PI * 2) * 0.5;
    this.booksGroup.position.z = this.shelfGroup.position.z;

    this.bookSpines.forEach(spine => {
      const curZ = spine.mesh.position.z;
      const diff = spine.targetZ - curZ;
      if (Math.abs(diff) > 0.01) {
        const d = Math.sign(diff) * Math.min(Math.abs(diff), Math.abs(diff) * dt * 12 + 0.3);
        spine.mesh.position.z = curZ + d;
      } else {
        spine.mesh.position.z = spine.targetZ;
      }

      if (spine.edgeGlow) {
        const mat = spine.edgeGlow.material as THREE.MeshBasicMaterial;
        const targetOp = (spine.isHovered || spine.isSelected) ? 0.5 : 0;
        mat.opacity += (targetOp - mat.opacity) * Math.min(1, dt * 8);
      }
    });

    if (this.cameraAnim && this.cameraAnim.active) {
      this.cameraAnim.t += dt / this.cameraAnim.duration;
      const t = Math.min(1, this.cameraAnim.t);
      const et = this.easeInOut(t);
      this.camera.position.lerpVectors(this.cameraAnim.fromPos, this.cameraAnim.toPos, et);
      const look = new THREE.Vector3().lerpVectors(this.cameraAnim.fromLook, this.cameraAnim.toLook, et);
      this.camera.lookAt(look);
      if (t >= 1) {
        this.cameraAnim.active = false;
      }
    }

    if (this.particleSystem) {
      const pos = this.particleSystem.geometry.getAttribute('position') as THREE.BufferAttribute;
      const speeds = (this.particleSystem.geometry as any).userData.speeds as Float32Array;
      const arr = pos.array as Float32Array;
      for (let i = 0; i < speeds.length; i++) {
        arr[i * 3 + 1] -= speeds[i] * dt;
        if (arr[i * 3 + 1] < -150) {
          arr[i * 3 + 1] = 650;
          arr[i * 3] = (Math.random() - 0.5) * 1200;
        }
      }
      pos.needsUpdate = true;
      this.particleSystem.rotation.y = Math.sin(elapsed * 0.05) * 0.1;
    }

    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    this.domEvents.canvas.removeEventListener('mousemove', this.domEvents.onMove);
    this.domEvents.canvas.removeEventListener('click', this.domEvents.onClick);
    window.removeEventListener('resize', this.domEvents.onResize);
    this.clearShelf();
    if (this.particleSystem) {
      this.scene.remove(this.particleSystem);
      this.particleSystem.geometry.dispose();
      (this.particleSystem.material as THREE.Material).dispose();
    }
    this.renderer.dispose();
  }
}
