import * as THREE from 'three';
import type { CatalogEntry } from './ocrParser';

const LEVEL_COLORS: Record<number, number> = {
  1: 0xff8c00,
  2: 0xffd700,
  3: 0x90ee90,
};

const LEVEL_THICKNESS: Record<number, number> = {
  1: 20,
  2: 12,
  3: 6,
};

const BOOK_HEIGHT = 80;
const HOVER_POP_DISTANCE = 15;
const HOVER_DURATION = 0.3;
const CLICK_DURATION = 0.8;
const BREATH_AMPLITUDE = 0.5;
const BREATH_PERIOD = 6;
const BLUR_PERIOD = 2;

interface SpineData {
  mesh: THREE.Group;
  entry: CatalogEntry;
  originalZ: number;
  targetZ: number;
  currentZ: number;
  isHovered: boolean;
  isHighlighted: boolean;
  highlightIntensity: number;
  layerIndex: number;
  positionInLayer: number;
  glowMesh?: THREE.Mesh;
}

type BackgroundStyle = 'wood' | 'black' | 'blue';

const BG_GRADIENTS: Record<BackgroundStyle, { top: number; bottom: number }> = {
  wood: { top: 0x3e2723, bottom: 0x5d4037 },
  black: { top: 0x0a0a0a, bottom: 0x1a1a1a },
  blue: { top: 0x0a1628, bottom: 0x162d50 },
};

export class BookShelf {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private spines: SpineData[] = [];
  private hoveredSpine: SpineData | null = null;
  private selectedSpine: SpineData | null = null;
  private cameraAnimating = false;
  private cameraAnimProgress = 0;
  private cameraStartPos = new THREE.Vector3();
  private cameraEndPos = new THREE.Vector3();
  private cameraStartLookAt = new THREE.Vector3();
  private cameraEndLookAt = new THREE.Vector3();
  private currentLookAt = new THREE.Vector3();
  private defaultCameraPos = new THREE.Vector3();
  private defaultLookAt = new THREE.Vector3();
  private shelfGroup: THREE.Group;
  private particles: THREE.Points | null = null;
  private breathTime = 0;
  private canvas: HTMLCanvasElement;
  private container: HTMLElement;
  private bgStyle: BackgroundStyle = 'wood';
  private ambientLight!: THREE.AmbientLight;
  private topLight!: THREE.PointLight;
  private bottomLight!: THREE.PointLight;
  private shelfLayers: number = 5;
  private spineSpacing: number = 8;
  private entries: CatalogEntry[] = [];
  private onSpineClick: ((entry: CatalogEntry) => void) | null = null;
  private tooltipEl: HTMLDivElement | null = null;
  private blurCanvas: HTMLCanvasElement | null = null;
  private blurCtx: CanvasRenderingContext2D | null = null;
  private sourceImage: HTMLImageElement | null = null;
  private blurPhase = 0;
  private shelfWidth = 600;
  private animationId: number = 0;
  private lastTime = 0;
  private tooltipImg: HTMLImageElement | null = null;
  private tooltipMouseX = 0;
  private tooltipMouseY = 0;
  private tooltipActive = false;
  private shelfBackPlane: THREE.Mesh | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    container.appendChild(this.canvas);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 2000);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setClearColor(BG_GRADIENTS[this.bgStyle].top);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-999, -999);

    this.shelfGroup = new THREE.Group();
    this.scene.add(this.shelfGroup);

    this.setupLights();
    this.setupDefaultCamera();

    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('click', this.onClick.bind(this));
    window.addEventListener('resize', this.onResize.bind(this));

    this.createTooltip();
    this.createBlurCanvas();
  }

  private setupDefaultCamera() {
    this.defaultCameraPos.set(0, 0, 300);
    this.defaultLookAt.set(0, 0, 0);
    this.camera.position.copy(this.defaultCameraPos);
    this.currentLookAt.copy(this.defaultLookAt);
    this.camera.lookAt(this.currentLookAt);
  }

  private setupLights() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);

    this.topLight = new THREE.PointLight(0xffa500, 0.3, 800);
    this.topLight.position.set(0, 250, 150);
    this.scene.add(this.topLight);

    this.bottomLight = new THREE.PointLight(0x8b4513, 0.2, 600);
    this.bottomLight.position.set(0, -150, 100);
    this.scene.add(this.bottomLight);
  }

  private createTooltip() {
    this.tooltipEl = document.createElement('div');
    this.tooltipEl.style.cssText = `
      position: fixed;
      width: 120px;
      height: 80px;
      background: rgba(30, 30, 30, 0.75);
      backdrop-filter: blur(4px);
      border-radius: 6px;
      border: 1px solid rgba(255, 140, 0, 0.3);
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease-out;
      z-index: 50;
      overflow: hidden;
    `;

    const arrow = document.createElement('div');
    arrow.style.cssText = `
      position: absolute;
      right: -8px;
      top: 50%;
      transform: translateY(-50%);
      width: 0;
      height: 0;
      border-top: 6px solid transparent;
      border-bottom: 6px solid transparent;
      border-left: 8px solid rgba(255, 140, 0, 0.4);
    `;
    this.tooltipEl.appendChild(arrow);

    this.tooltipImg = document.createElement('img');
    this.tooltipImg.style.cssText = `width: 100%; height: 100%; object-fit: cover; display: block;`;
    this.tooltipEl.appendChild(this.tooltipImg);

    document.body.appendChild(this.tooltipEl);
  }

  private createBlurCanvas() {
    this.blurCanvas = document.createElement('canvas');
    this.blurCanvas.width = 120;
    this.blurCanvas.height = 80;
    this.blurCtx = this.blurCanvas.getContext('2d');
  }

  setSourceImage(img: HTMLImageElement) {
    this.sourceImage = img;
  }

  setOnSpineClick(cb: (entry: CatalogEntry) => void) {
    this.onSpineClick = cb;
  }

  setBgStyle(style: BackgroundStyle) {
    this.bgStyle = style;
    this.updateShelfBackground();
  }

  setLayers(count: number) {
    this.shelfLayers = count;
    if (this.entries.length > 0) {
      this.buildShelf(this.entries);
    }
  }

  setSpacing(spacing: number) {
    this.spineSpacing = spacing;
    if (this.entries.length > 0) {
      this.buildShelf(this.entries);
    }
  }

  private updateShelfBackground() {
    const grad = BG_GRADIENTS[this.bgStyle];
    this.renderer.setClearColor(grad.top);

    if (this.shelfBackPlane) {
      const backCanvas = document.createElement('canvas');
      backCanvas.width = 512;
      backCanvas.height = 512;
      const ctx = backCanvas.getContext('2d')!;
      const gradient = ctx.createLinearGradient(0, 0, 0, 512);
      gradient.addColorStop(0, '#' + grad.top.toString(16).padStart(6, '0'));
      gradient.addColorStop(1, '#' + grad.bottom.toString(16).padStart(6, '0'));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);

      const mat = this.shelfBackPlane.material as THREE.MeshStandardMaterial;
      if (mat.map) {
        mat.map.dispose();
      }
      mat.map = new THREE.CanvasTexture(backCanvas);
      mat.needsUpdate = true;
    }

    this.shelfGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.userData.isShelfBoard === true) {
          const mat = child.material as THREE.MeshStandardMaterial;
          mat.color.setHex(grad.bottom);
        }
        if (child.userData.isShelfBack === true) {
          const mat = child.material as THREE.MeshStandardMaterial;
          const topColor = new THREE.Color(grad.top);
          const botColor = new THREE.Color(grad.bottom);
          mat.color.copy(topColor).lerp(botColor, 0.5);
        }
      }
    });
  }

  buildShelf(entries: CatalogEntry[]): number {
    const startTime = performance.now();
    this.entries = entries;

    while (this.shelfGroup.children.length > 0) {
      const child = this.shelfGroup.children[0];
      this.shelfGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) child.material.dispose();
        if (child.material instanceof THREE.MeshStandardMaterial && child.material.map) {
          child.material.map.dispose();
        }
      }
    }
    this.spines = [];
    this.hoveredSpine = null;
    this.selectedSpine = null;

    const containerWidth = this.container.clientWidth;
    this.shelfWidth = Math.max(600, Math.min(1200, containerWidth - 40));

    const layers = this.shelfLayers;
    const perLayer = Math.ceil(entries.length / layers);
    const layerHeight = BOOK_HEIGHT + 40;
    const totalHeight = layers * layerHeight;

    this.createShelfBack(totalHeight);

    this.createParticles(totalHeight);

    const grad = BG_GRADIENTS[this.bgStyle];

    for (let layer = 0; layer < layers; layer++) {
      const layerEntries = entries.slice(layer * perLayer, (layer + 1) * perLayer);
      if (layerEntries.length === 0) break;

      const y = (layers / 2 - layer - 0.5) * layerHeight;

      this.createShelfBoard(0, y - BOOK_HEIGHT / 2 - 5, grad.bottom);

      let xOffset = 0;
      for (let i = 0; i < layerEntries.length; i++) {
        const entry = layerEntries[i];
        const thickness = LEVEL_THICKNESS[entry.level] || 12;
        const spine = this.createSpine(entry, thickness, layer, i);
        spine.position.x = xOffset + thickness / 2;
        spine.position.y = y;
        spine.position.z = 0;
        this.shelfGroup.add(spine);

        const originalZ = 0;
        this.spines.push({
          mesh: spine,
          entry,
          originalZ,
          targetZ: originalZ,
          currentZ: originalZ,
          isHovered: false,
          isHighlighted: false,
          highlightIntensity: 0,
          layerIndex: layer,
          positionInLayer: i,
          glowMesh: (spine as any).userData.glowMesh,
        });

        xOffset += thickness + this.spineSpacing;
      }

      const totalWidth = xOffset - this.spineSpacing;
      const offsetX = -totalWidth / 2;
      for (const s of this.spines) {
        if (s.layerIndex === layer) {
          s.mesh.position.x += offsetX;
          s.originalZ = 0;
          s.targetZ = 0;
          s.currentZ = 0;
        }
      }

      if (layer === 0) {
        this.createShelfBoard(0, y + BOOK_HEIGHT / 2 + 5, grad.bottom);
      }
    }

    this.defaultCameraPos.set(0, 0, totalHeight * 0.9);
    this.camera.position.copy(this.defaultCameraPos);
    this.currentLookAt.set(0, 0, 0);
    this.camera.lookAt(this.currentLookAt);

    this.updateShelfBackground();

    return performance.now() - startTime;
  }

  private createShelfBack(totalHeight: number) {
    const grad = BG_GRADIENTS[this.bgStyle];
    const backCanvas = document.createElement('canvas');
    backCanvas.width = 512;
    backCanvas.height = 512;
    const ctx = backCanvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#' + grad.top.toString(16).padStart(6, '0'));
    gradient.addColorStop(1, '#' + grad.bottom.toString(16).padStart(6, '0'));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(backCanvas);
    const backGeo = new THREE.PlaneGeometry(this.shelfWidth + 40, totalHeight + 60);
    const backMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });
    this.shelfBackPlane = new THREE.Mesh(backGeo, backMat);
    this.shelfBackPlane.position.set(0, 0, -45);
    this.shelfBackPlane.userData.isShelfBackPlane = true;
    this.shelfGroup.add(this.shelfBackPlane);
  }

  private createShelfBoard(x: number, y: number, color: number) {
    const boardGeo = new THREE.BoxGeometry(this.shelfWidth, 4, 60);
    const boardMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.8,
      metalness: 0.1,
    });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.set(x, y, -10);
    board.userData.isShelfBoard = true;
    board.receiveShadow = true;
    this.shelfGroup.add(board);
  }

  private createSpine(entry: CatalogEntry, thickness: number, layerIndex: number, posInLayer: number): THREE.Group {
    const group = new THREE.Group();
    group.userData = { entryId: entry.id, isSpine: true };

    const color = LEVEL_COLORS[entry.level] || 0xffd700;
    const spineGeo = new THREE.BoxGeometry(thickness, BOOK_HEIGHT, 30);
    const spineMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.5,
      metalness: 0.15,
      emissive: 0x000000,
      emissiveIntensity: 0,
    });
    const spineMesh = new THREE.Mesh(spineGeo, spineMat);
    spineMesh.userData.isSpineBody = true;
    group.add(spineMesh);

    const glowGeo = new THREE.BoxGeometry(thickness + 3, BOOK_HEIGHT + 3, 31);
    const glowMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0,
      side: THREE.BackSide,
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.position.z = 0.5;
    glowMesh.userData.isGlow = true;
    group.add(glowMesh);

    const pixelRatio = 4;
    const titleCanvas = document.createElement('canvas');
    titleCanvas.width = Math.round(thickness * pixelRatio);
    titleCanvas.height = Math.round(BOOK_HEIGHT * pixelRatio);
    const ctx = titleCanvas.getContext('2d')!;

    ctx.clearRect(0, 0, titleCanvas.width, titleCanvas.height);

    ctx.save();
    ctx.translate(titleCanvas.width / 2, titleCanvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.translate(-titleCanvas.height / 2, -titleCanvas.width / 2);

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const maxTextWidth = titleCanvas.height * 0.9;
    let fontSize = titleCanvas.width * 0.7;
    fontSize = Math.min(fontSize, 48 * pixelRatio / 2);
    let displayTitle = entry.title;

    ctx.font = `bold ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;

    while (ctx.measureText(displayTitle).width > maxTextWidth && fontSize > 10 * pixelRatio / 2) {
      fontSize -= 1;
      ctx.font = `bold ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
    }

    if (ctx.measureText(displayTitle).width > maxTextWidth) {
      while (ctx.measureText(displayTitle + '…').width > maxTextWidth && displayTitle.length > 1) {
        displayTitle = displayTitle.slice(0, -1);
      }
      displayTitle += '…';
    }

    ctx.fillText(displayTitle, titleCanvas.height / 2, titleCanvas.width / 2);
    ctx.restore();

    const titleTexture = new THREE.CanvasTexture(titleCanvas);
    titleTexture.minFilter = THREE.LinearFilter;
    titleTexture.magFilter = THREE.LinearFilter;
    const titleMat = new THREE.MeshBasicMaterial({
      map: titleTexture,
      transparent: true,
      side: THREE.FrontSide,
    });
    const titlePlane = new THREE.PlaneGeometry(thickness, BOOK_HEIGHT);
    const titleMesh = new THREE.Mesh(titlePlane, titleMat);
    titleMesh.position.z = 15.1;
    titleMesh.userData.isTitle = true;
    group.add(titleMesh);

    if (entry.page) {
      const pagePixelRatio = 4;
      const pageCanvas = document.createElement('canvas');
      const pageW = 16 * pagePixelRatio;
      const pageH = 8 * pagePixelRatio;
      pageCanvas.width = pageW;
      pageCanvas.height = pageH;
      const pctx = pageCanvas.getContext('2d')!;
      pctx.clearRect(0, 0, pageW, pageH);
      pctx.fillStyle = '#FFD700';
      pctx.font = `bold ${pageH * 0.7}px "Microsoft YaHei", sans-serif`;
      pctx.textAlign = 'left';
      pctx.textBaseline = 'top';
      pctx.fillText(entry.page, 0, 0);

      const pageTexture = new THREE.CanvasTexture(pageCanvas);
      pageTexture.minFilter = THREE.LinearFilter;
      const pageMat = new THREE.MeshBasicMaterial({
        map: pageTexture,
        transparent: true,
        side: THREE.FrontSide,
      });
      const pagePlane = new THREE.PlaneGeometry(16, 8);
      const pageMesh = new THREE.Mesh(pagePlane, pageMat);
      pageMesh.position.set(-thickness / 2 + 8, BOOK_HEIGHT / 2 - 8, 15.2);
      group.add(pageMesh);
    }

    (group as any).userData.glowMesh = glowMesh;

    return group;
  }

  private createParticles(totalHeight: number) {
    if (this.particles) {
      this.scene.remove(this.particles);
      this.particles.geometry.dispose();
      (this.particles.material as THREE.Material).dispose();
    }

    const count = 200;
    const positions = new Float32Array(count * 3);
    const spread = this.shelfWidth / 2;

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * spread * 2;
      positions[i * 3 + 1] = (Math.random() - 0.5) * totalHeight * 1.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100 + 50;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xffa500,
      size: 1.5,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.particles = new THREE.Points(geo, mat);
    this.scene.add(this.particles);
  }

  focusSpine(entryId: number) {
    const spine = this.spines.find((s) => s.entry.id === entryId);
    if (!spine) return;

    this.selectedSpine = spine;

    const worldPos = new THREE.Vector3();
    spine.mesh.getWorldPosition(worldPos);

    this.cameraStartPos.copy(this.camera.position);
    this.cameraEndPos.set(worldPos.x, worldPos.y, worldPos.z + 50);

    this.cameraStartLookAt.copy(this.currentLookAt);
    this.cameraEndLookAt.copy(worldPos);

    this.cameraAnimating = true;
    this.cameraAnimProgress = 0;

    this.spines.forEach((s) => {
      s.isHighlighted = s.entry.id === entryId;
    });
  }

  resetCamera() {
    this.cameraStartPos.copy(this.camera.position);
    this.cameraEndPos.copy(this.defaultCameraPos);
    this.cameraStartLookAt.copy(this.currentLookAt);
    this.cameraEndLookAt.copy(this.defaultLookAt);
    this.cameraAnimating = true;
    this.cameraAnimProgress = 0;

    this.selectedSpine = null;
    this.spines.forEach((s) => {
      s.isHighlighted = false;
    });
  }

  private onMouseMove(event: MouseEvent) {
    this.tooltipMouseX = event.clientX;
    this.tooltipMouseY = event.clientY;

    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const allMeshes: THREE.Object3D[] = [];
    this.shelfGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        allMeshes.push(child);
      }
    });

    const intersects = this.raycaster.intersectObjects(allMeshes, false);

    let found: SpineData | null = null;
    for (const hit of intersects) {
      let obj: THREE.Object3D | null = hit.object;
      while (obj) {
        if (obj.userData && obj.userData.isSpine) {
          const sd = this.spines.find((s) => s.mesh === obj);
          if (sd) {
            found = sd;
            break;
          }
        }
        obj = obj.parent;
      }
      if (found) break;
    }

    const prevHovered = this.hoveredSpine;
    this.hoveredSpine = found;

    if (prevHovered && prevHovered !== found) {
      prevHovered.isHovered = false;
      prevHovered.targetZ = prevHovered.originalZ;
    }

    if (found) {
      found.isHovered = true;
      found.targetZ = found.originalZ + HOVER_POP_DISTANCE;
      this.canvas.style.cursor = 'pointer';
      this.tooltipActive = true;
    } else {
      this.canvas.style.cursor = 'default';
      this.tooltipActive = false;
    }
  }

  private updateTooltipImage() {
    if (!this.hoveredSpine || !this.sourceImage || !this.blurCtx || !this.tooltipImg) return;

    const entry = this.hoveredSpine.entry;
    if (!entry.region) return;

    const { x, y, w, h } = entry.region;
    const imgW = this.sourceImage.naturalWidth;
    const imgH = this.sourceImage.naturalHeight;

    if (w <= 0 || h <= 0 || x < 0 || y < 0 || x + w > imgW || y + h > imgH) return;

    const blurRadius = 2 + 2 * Math.sin(this.blurPhase);

    this.blurCtx.clearRect(0, 0, 120, 80);
    this.blurCtx.save();
    this.blurCtx.filter = `blur(${blurRadius}px)`;
    this.blurCtx.drawImage(this.sourceImage, x, y, w, h, -4, -4, 128, 88);
    this.blurCtx.restore();

    this.tooltipImg.src = this.blurCanvas!.toDataURL();
  }

  private updateTooltipPosition() {
    if (!this.tooltipEl) return;

    if (this.tooltipActive) {
      this.tooltipEl.style.left = `${this.tooltipMouseX - 135}px`;
      this.tooltipEl.style.top = `${this.tooltipMouseY - 40}px`;
      this.tooltipEl.style.opacity = '1';
    } else {
      this.tooltipEl.style.opacity = '0';
    }
  }

  private onClick() {
    if (this.hoveredSpine) {
      const entry = this.hoveredSpine.entry;
      this.focusSpine(entry.id);
      if (this.onSpineClick) {
        this.onSpineClick(entry);
      }
    }
  }

  private onResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  start() {
    this.lastTime = performance.now();
    this.animate(this.lastTime);
  }

  stop() {
    cancelAnimationFrame(this.animationId);
  }

  private animate(time: number) {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    const delta = (time - this.lastTime) / 1000;
    this.lastTime = time;

    this.breathTime += delta;
    this.blurPhase += delta * (2 * Math.PI) / BLUR_PERIOD;

    const breathOffset = Math.sin((this.breathTime * 2 * Math.PI) / BREATH_PERIOD) * BREATH_AMPLITUDE;
    this.shelfGroup.position.z = breathOffset;

    if (this.particles) {
      const positions = this.particles.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < positions.count; i++) {
        let y = positions.getY(i);
        y -= delta * 8;
        if (y < -250) {
          y = 250;
        }
        positions.setY(i, y);
      }
      positions.needsUpdate = true;
    }

    for (const spine of this.spines) {
      const speed = HOVER_POP_DISTANCE / HOVER_DURATION;
      const diff = spine.targetZ - spine.currentZ;
      if (Math.abs(diff) > 0.01) {
        const step = Math.sign(diff) * Math.min(Math.abs(diff), speed * delta);
        spine.currentZ += step;
        spine.mesh.position.z = spine.currentZ;
      } else {
        spine.currentZ = spine.targetZ;
        spine.mesh.position.z = spine.currentZ;
      }

      if (spine.isHighlighted) {
        spine.highlightIntensity = Math.min(1, spine.highlightIntensity + delta * 2);
      } else {
        spine.highlightIntensity = Math.max(0, spine.highlightIntensity - delta * 2);
      }

      if (spine.glowMesh) {
        const glowMat = spine.glowMesh.material as THREE.MeshBasicMaterial;
        glowMat.opacity = spine.highlightIntensity * 0.5;
      }

      spine.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.userData.isSpineBody === true) {
          const mat = child.material as THREE.MeshStandardMaterial;
          const levelColor = LEVEL_COLORS[spine.entry.level] || 0xffd700;
          mat.emissive.setHex(levelColor);
          mat.emissiveIntensity = spine.highlightIntensity * 0.4;
        }
      });
    }

    if (this.cameraAnimating) {
      this.cameraAnimProgress += delta / CLICK_DURATION;
      if (this.cameraAnimProgress >= 1) {
        this.cameraAnimProgress = 1;
        this.cameraAnimating = false;
      }

      const t = this.easeInOut(this.cameraAnimProgress);
      this.camera.position.lerpVectors(this.cameraStartPos, this.cameraEndPos, t);
      this.currentLookAt.lerpVectors(this.cameraStartLookAt, this.cameraEndLookAt, t);
      this.camera.lookAt(this.currentLookAt);
    }

    if (this.tooltipActive && this.hoveredSpine) {
      this.updateTooltipImage();
    }
    this.updateTooltipPosition();

    this.renderer.render(this.scene, this.camera);
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  dispose() {
    this.stop();
    this.canvas.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.removeEventListener('click', this.onClick.bind(this));
    window.removeEventListener('resize', this.onResize.bind(this));

    if (this.tooltipEl && this.tooltipEl.parentNode) {
      this.tooltipEl.parentNode.removeChild(this.tooltipEl);
    }

    this.shelfGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) child.material.dispose();
      }
    });

    this.renderer.dispose();
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}
