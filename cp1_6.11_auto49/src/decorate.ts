import * as THREE from 'three';
import { BakeStats, BakeResult } from './baking';

export interface DecorationItem {
  id: string;
  type: 'sprinkle' | 'rainbow';
  color: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  mesh: THREE.Object3D;
}

export interface CardData {
  imageData: string;
  title: string;
  stats: BakeStats;
  description: string;
  shareLink: string;
}

export class DecorationSystem {
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private cakeMesh: THREE.Mesh | null = null;
  private decorations: DecorationItem[] = [];
  private selectedTool: string | null = null;
  private isDragging: boolean = false;
  private previousMouseX: number = 0;
  private previousMouseY: number = 0;
  private targetRotationX: number = 0;
  private targetRotationY: number = 0;
  private currentRotationX: number = 0;
  private currentRotationY: number = 0;
  private animationId: number = 0;
  private container: HTMLElement | null = null;
  private cakeContainer: THREE.Group | null = null;
  private onShareCallback: ((card: CardData) => void) | null = null;
  private bakeResult: BakeResult | null = null;

  private sprinkleColors: Record<string, string> = {
    'sprinkle-yellow': '#FFD700',
    'sprinkle-pink': '#FF6EC7',
    'sprinkle-blue': '#7DD3FC'
  };

  constructor() {}

  setOnShare(callback: (card: CardData) => void) {
    this.onShareCallback = callback;
  }

  init(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) return;
    this.container = container;

    const canvas = document.getElementById('decorateCanvas') as HTMLCanvasElement;
    if (!canvas) return;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0b2a);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.set(0, 0.5, 4);
    this.camera.lookAt(0, 0, 0);

    this.setupLights();
    this.setupCakeContainer();
    this.setupEventListeners();
    this.resize();

    window.addEventListener('resize', () => this.resize());
  }

  private setupLights() {
    if (!this.scene) return;

    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(2, 3, 3);
    keyLight.castShadow = true;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xaaccff, 0.4);
    fillLight.position.set(-2, 1, 2);
    this.scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xff88ff, 0.5, 10);
    rimLight.position.set(0, 2, -3);
    this.scene.add(rimLight);
  }

  private setupCakeContainer() {
    if (!this.scene) return;
    this.cakeContainer = new THREE.Group();
    this.scene.add(this.cakeContainer);
  }

  private setupEventListeners() {
    const canvasArea = document.getElementById('decorateCanvasArea');
    if (!canvasArea) return;

    canvasArea.addEventListener('mousedown', (e) => this.onMouseDown(e));
    canvasArea.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvasArea.addEventListener('mouseup', () => this.onMouseUp());
    canvasArea.addEventListener('mouseleave', () => this.onMouseUp());
    canvasArea.addEventListener('click', (e) => this.onClick(e));

    canvasArea.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.onMouseDown({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
    });
    canvasArea.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.onMouseMove({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
    });
    canvasArea.addEventListener('touchend', () => this.onMouseUp());

    const toolItems = document.querySelectorAll('.tool-item');
    toolItems.forEach((item) => {
      item.addEventListener('click', () => {
        const tool = item.getAttribute('data-tool');
        if (tool) {
          this.selectTool(tool);
        }
      });
    });
  }

  selectTool(toolId: string) {
    this.selectedTool = toolId;
    document.querySelectorAll('.tool-item').forEach((item) => {
      item.classList.remove('active');
      if (item.getAttribute('data-tool') === toolId) {
        item.classList.add('active');
      }
    });
  }

  private onMouseDown(e: MouseEvent) {
    this.isDragging = true;
    this.previousMouseX = e.clientX;
    this.previousMouseY = e.clientY;
  }

  private onMouseMove(e: MouseEvent) {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.previousMouseX;
    const deltaY = e.clientY - this.previousMouseY;

    this.targetRotationY += deltaX * 0.01;
    this.targetRotationX += deltaY * 0.01;
    this.targetRotationX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.targetRotationX));

    this.previousMouseX = e.clientX;
    this.previousMouseY = e.clientY;
  }

  private onMouseUp() {
    this.isDragging = false;
  }

  private onClick(e: MouseEvent) {
    if (!this.selectedTool || !this.cakeMesh || !this.camera || !this.container) return;

    const rect = this.container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

    const intersects = raycaster.intersectObject(this.cakeMesh);
    if (intersects.length > 0) {
      const point = intersects[0].point;
      this.addDecoration(this.selectedTool, point);
    }
  }

  addDecoration(toolId: string, position: THREE.Vector3) {
    if (!this.cakeContainer || !this.cakeMesh) return;

    const localPos = this.cakeContainer.worldToLocal(position.clone());
    const dir = localPos.clone().normalize();
    const radius = 0.8 * this.cakeMesh.scale.x;
    const surfacePos = dir.multiplyScalar(radius);

    let mesh: THREE.Object3D;

    if (toolId.startsWith('sprinkle-')) {
      mesh = this.createSprinkle(this.sprinkleColors[toolId] || '#FFD700');
    } else if (toolId === 'rainbow') {
      mesh = this.createRainbowDrop();
    } else {
      return;
    }

    mesh.position.copy(surfacePos);
    mesh.lookAt(dir.multiplyScalar(2));
    mesh.rotateZ(Math.random() * Math.PI * 2);

    this.cakeContainer.add(mesh);

    this.decorations.push({
      id: `dec_${Date.now()}_${Math.random()}`,
      type: toolId.startsWith('sprinkle-') ? 'sprinkle' : 'rainbow',
      color: this.sprinkleColors[toolId] || 'rainbow',
      position: surfacePos.clone(),
      rotation: mesh.rotation.clone(),
      mesh
    });
  }

  private createSprinkle(color: string): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 8);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.3,
      roughness: 0.3,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.3
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    return mesh;
  }

  private createRainbowDrop(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.08, 16, 16);
    geometry.scale(1, 0.3, 1);
    
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.1,
      roughness: 0.2,
      transparent: true,
      opacity: 0.8
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;

    const colors = [0xFF6B6B, 0xFFE66D, 0x7DD3FC, 0xC9B8FF];
    const innerGeo = new THREE.SphereGeometry(0.05, 16, 16);
    innerGeo.scale(1, 0.3, 1);
    const innerMat = new THREE.MeshBasicMaterial({
      color: colors[Math.floor(Math.random() * colors.length)],
      transparent: true,
      opacity: 0.6
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    mesh.add(inner);

    return mesh;
  }

  clearDecorations() {
    if (!this.cakeContainer) return;
    this.decorations.forEach((dec) => {
      this.cakeContainer?.remove(dec.mesh);
      if (dec.mesh instanceof THREE.Mesh) {
        dec.mesh.geometry.dispose();
        if (Array.isArray(dec.mesh.material)) {
          dec.mesh.material.forEach((m) => m.dispose());
        } else {
          dec.mesh.material.dispose();
        }
      }
    });
    this.decorations = [];
  }

  setCakeFromBakeResult(result: BakeResult) {
    this.bakeResult = result;
    
    if (!this.cakeContainer || !this.scene) return;

    this.clearDecorations();

    if (this.cakeMesh) {
      this.cakeContainer.remove(this.cakeMesh);
      if (this.cakeMesh.geometry) this.cakeMesh.geometry.dispose();
      if (this.cakeMesh.material) {
        if (Array.isArray(this.cakeMesh.material)) {
          this.cakeMesh.material.forEach((m) => m.dispose());
        } else {
          (this.cakeMesh.material as THREE.Material).dispose();
        }
      }
    }

    const geometry = new THREE.SphereGeometry(0.8, 64, 64);
    const material = new THREE.MeshStandardMaterial({
      color: result.finalColor,
      roughness: 0.5,
      metalness: 0.1,
      emissive: result.finalColor,
      emissiveIntensity: 0.15 * (result.stats.glow / 5)
    });

    this.cakeMesh = new THREE.Mesh(geometry, material);
    this.cakeMesh.scale.set(result.scale, result.scale, result.scale);
    this.cakeMesh.castShadow = true;
    this.cakeMesh.receiveShadow = true;
    this.cakeContainer.add(this.cakeMesh);
  }

  private animate = () => {
    this.currentRotationX += (this.targetRotationX - this.currentRotationX) * 0.1;
    this.currentRotationY += (this.targetRotationY - this.currentRotationY) * 0.1;

    if (this.cakeContainer) {
      this.cakeContainer.rotation.x = this.currentRotationX;
      this.cakeContainer.rotation.y = this.currentRotationY;
    }

    this.render();
    this.animationId = requestAnimationFrame(this.animate);
  };

  private render() {
    if (!this.renderer || !this.scene || !this.camera) return;
    this.renderer.render(this.scene, this.camera);
  }

  show() {
    const overlay = document.getElementById('decorateOverlay');
    if (overlay) {
      overlay.classList.add('active');
    }
    setTimeout(() => this.resize(), 100);
    this.animate();
  }

  hide() {
    const overlay = document.getElementById('decorateOverlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
    cancelAnimationFrame(this.animationId);
  }

  private resize() {
    if (!this.renderer || !this.camera || !this.container) return;
    const rect = this.container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  generateCardData(): CardData | null {
    if (!this.bakeResult || !this.renderer || !this.scene || !this.camera) return null;

    this.renderer.setPixelRatio(2);
    this.renderer.render(this.scene, this.camera);

    const canvas = this.renderer.domElement;
    const imageData = canvas.toDataURL('image/png');

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const stats = this.bakeResult.stats;
    const title = this.generateCakeTitle(stats);
    const description = this.generateDescription(stats);
    const shareLink = this.generateShareLink();

    return {
      imageData,
      title,
      stats,
      description,
      shareLink
    };
  }

  private generateCakeTitle(stats: BakeStats): string {
    const prefixes = ['星尘', '月光', '闪耀', '梦幻', '星云', '银河'];
    const suffixes = ['蛋糕', '布丁', '塔', '泡芙', '慕斯', '果冻'];
    
    const prefixIndex = Math.floor((stats.sweetness + stats.glow) * 0.6) % prefixes.length;
    const suffixIndex = Math.floor(stats.fluffiness * 1.2) % suffixes.length;
    
    return prefixes[prefixIndex] + suffixes[suffixIndex];
  }

  private generateDescription(stats: BakeStats): string {
    const sweetDesc = [
      '清淡雅致',
      '微甜不腻',
      '甜度适中',
      '甜蜜满满',
      '极致甜美'
    ][Math.min(4, Math.floor(stats.sweetness - 0.5))] || '清淡雅致';

    const fluffDesc = [
      '紧实绵密',
      '略微蓬松',
      '松软可口',
      '轻盈如云',
      '入口即化'
    ][Math.min(4, Math.floor(stats.fluffiness - 0.5))] || '紧实绵密';

    const glowDesc = [
      '温润内敛',
      '微微发光',
      '光彩照人',
      '熠熠生辉',
      '璀璨夺目'
    ][Math.min(4, Math.floor(stats.glow - 0.5))] || '温润内敛';

    return `一道${glowDesc}的魔法甜点，${sweetDesc}，口感${fluffDesc}，每一口都是宇宙的滋味。`;
  }

  private generateShareLink(): string {
    const baseUrl = window.location.origin + window.location.pathname;
    const id = this.generateId();
    return `${baseUrl}?cake=${id}`;
  }

  private generateId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  getStars(value: number): string {
    const full = Math.floor(value / 5 * 3);
    return '★'.repeat(full) + '☆'.repeat(3 - full);
  }

  destroy() {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', () => this.resize());
    this.clearDecorations();
  }
}
