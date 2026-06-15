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
  shareText: string;
}

export class DecorationSystem {
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private cakeMesh: THREE.Mesh | null = null;
  private decorations: DecorationItem[] = [];
  private selectedTool: string | null = null;
  private isDragging: boolean = false;
  private isRotating: boolean = false;
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
  private autoRotate: boolean = true;
  private mouseDownPos: { x: number; y: number } = { x: 0, y: 0 };
  private ambientLight: THREE.AmbientLight | null = null;
  private keyLight: THREE.DirectionalLight | null = null;
  private rimLight: THREE.PointLight | null = null;
  private fillLight: THREE.DirectionalLight | null = null;
  private sparkleParticles: THREE.Points | null = null;

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
    this.scene.background = new THREE.Color(0x1a0530);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.set(0, 0.3, 4);
    this.camera.lookAt(0, 0, 0);

    this.setupLights();
    this.setupCakeContainer();
    this.setupSparkles();
    this.setupEventListeners();
    this.resize();

    window.addEventListener('resize', () => this.resize());
  }

  private setupLights() {
    if (!this.scene) return;

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);

    this.keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
    this.keyLight.position.set(2, 3, 3);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 1024;
    this.keyLight.shadow.mapSize.height = 1024;
    this.scene.add(this.keyLight);

    this.fillLight = new THREE.DirectionalLight(0xaaccff, 0.4);
    this.fillLight.position.set(-2, 1, 2);
    this.scene.add(this.fillLight);

    this.rimLight = new THREE.PointLight(0xff88ff, 0.6, 10);
    this.rimLight.position.set(0, 2, -3);
    this.scene.add(this.rimLight);

    const bottomLight = new THREE.PointLight(0x88aaff, 0.3, 5);
    bottomLight.position.set(0, -2, 1);
    this.scene.add(bottomLight);
  }

  private setupCakeContainer() {
    if (!this.scene) return;
    this.cakeContainer = new THREE.Group();
    this.scene.add(this.cakeContainer);
  }

  private setupSparkles() {
    if (!this.scene) return;

    const count = 50;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const radius = 2 + Math.random() * 1.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const colorChoice = Math.random();
      if (colorChoice < 0.4) {
        colors[i * 3] = 1; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 1;
      } else if (colorChoice < 0.7) {
        colors[i * 3] = 1; colors[i * 3 + 1] = 0.8; colors[i * 3 + 2] = 0.5;
      } else {
        colors[i * 3] = 0.7; colors[i * 3 + 1] = 0.8; colors[i * 3 + 2] = 1;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    this.sparkleParticles = new THREE.Points(geometry, material);
    this.scene.add(this.sparkleParticles);
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
      this.onMouseDown({ clientX: touch.clientX, clientY: touch.clientY, button: 0 } as MouseEvent);
    }, { passive: false });

    canvasArea.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.onMouseMove({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
    }, { passive: false });

    canvasArea.addEventListener('touchend', () => this.onMouseUp());

    const toolItems = document.querySelectorAll('.tool-item');
    toolItems.forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const tool = item.getAttribute('data-tool');
        if (tool) {
          this.selectTool(tool);
        }
      });
    });
  }

  selectTool(toolId: string) {
    this.selectedTool = toolId;
    this.autoRotate = false;
    document.querySelectorAll('.tool-item').forEach((item) => {
      item.classList.remove('active');
      if (item.getAttribute('data-tool') === toolId) {
        item.classList.add('active');
      }
    });

    const canvasArea = document.getElementById('decorateCanvasArea');
    if (canvasArea) {
      if (toolId.startsWith('sprinkle-') || toolId === 'rainbow') {
        canvasArea.style.cursor = 'crosshair';
      } else {
        canvasArea.style.cursor = 'grab';
      }
    }
  }

  private onMouseDown(e: MouseEvent) {
    this.isDragging = true;
    this.isRotating = !this.selectedTool;
    this.previousMouseX = e.clientX;
    this.previousMouseY = e.clientY;
    this.mouseDownPos = { x: e.clientX, y: e.clientY };

    const canvasArea = document.getElementById('decorateCanvasArea');
    if (canvasArea && this.isRotating) {
      canvasArea.style.cursor = 'grabbing';
    }
  }

  private onMouseMove(e: MouseEvent) {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.previousMouseX;
    const deltaY = e.clientY - this.previousMouseY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > 3) {
      this.isRotating = true;
    }

    if (this.isRotating) {
      this.autoRotate = false;
      this.targetRotationY += deltaX * 0.01;
      this.targetRotationX += deltaY * 0.01;
      this.targetRotationX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.targetRotationX));
    }

    this.previousMouseX = e.clientX;
    this.previousMouseY = e.clientY;
  }

  private onMouseUp() {
    this.isDragging = false;

    const canvasArea = document.getElementById('decorateCanvasArea');
    if (canvasArea) {
      canvasArea.style.cursor = this.selectedTool ? 'crosshair' : 'grab';
    }
  }

  private onClick(e: MouseEvent) {
    const deltaX = Math.abs(e.clientX - this.mouseDownPos.x);
    const deltaY = Math.abs(e.clientY - this.mouseDownPos.y);
    if (deltaX > 5 || deltaY > 5) return;

    if (!this.selectedTool || !this.cakeMesh || !this.camera || !this.container || !this.cakeContainer) return;

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

  addDecoration(toolId: string, worldPosition: THREE.Vector3) {
    if (!this.cakeContainer || !this.cakeMesh) return;

    const localPos = this.cakeContainer.worldToLocal(worldPosition.clone());
    const dir = localPos.clone().normalize();
    const radius = 0.85 * this.cakeMesh.scale.x;
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
    mesh.lookAt(dir.clone().multiplyScalar(2));
    mesh.rotateZ(Math.random() * Math.PI * 2);

    this.cakeContainer.add(mesh);

    this.decorations.push({
      id: `dec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: toolId.startsWith('sprinkle-') ? 'sprinkle' : 'rainbow',
      color: this.sprinkleColors[toolId] || 'rainbow',
      position: surfacePos.clone(),
      rotation: mesh.rotation.clone(),
      mesh
    });
  }

  private createSprinkle(color: string): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(0.025, 0.025, 0.18, 8);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.4,
      roughness: 0.2,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.4
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private createRainbowDrop(): THREE.Group {
    const group = new THREE.Group();

    const outerGeo = new THREE.SphereGeometry(0.1, 24, 24);
    outerGeo.scale(1, 0.35, 1);
    const outerMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0.05,
      transmission: 0.9,
      thickness: 0.1,
      transparent: true,
      opacity: 0.7,
      clearcoat: 1,
      clearcoatRoughness: 0.1
    });
    const outer = new THREE.Mesh(outerGeo, outerMat);
    outer.castShadow = true;
    group.add(outer);

    const colors = [0xFF6B6B, 0xFFE66D, 0x7DD3FC, 0xC9B8FF, 0xFF6EC7];
    for (let i = 0; i < 3; i++) {
      const innerGeo = new THREE.SphereGeometry(0.04 - i * 0.01, 12, 12);
      innerGeo.scale(1, 0.35, 1);
      const innerMat = new THREE.MeshBasicMaterial({
        color: colors[(i + Math.floor(Math.random() * colors.length)) % colors.length],
        transparent: true,
        opacity: 0.7
      });
      const inner = new THREE.Mesh(innerGeo, innerMat);
      inner.position.set(
        (Math.random() - 0.5) * 0.08,
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.08
      );
      group.add(inner);
    }

    return group;
  }

  clearDecorations() {
    if (!this.cakeContainer) return;
    this.decorations.forEach((dec) => {
      this.cakeContainer?.remove(dec.mesh);
      this.disposeObject(dec.mesh);
    });
    this.decorations = [];
  }

  private disposeObject(obj: THREE.Object3D) {
    if (obj instanceof THREE.Mesh) {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    }
    obj.children.forEach((child) => this.disposeObject(child));
  }

  setCakeFromBakeResult(result: BakeResult) {
    this.bakeResult = result;
    
    if (!this.cakeContainer || !this.scene) return;

    this.clearDecorations();

    if (this.cakeMesh) {
      this.cakeContainer.remove(this.cakeMesh);
      this.disposeObject(this.cakeMesh);
    }

    const geometry = new THREE.SphereGeometry(0.9, 64, 64);
    const material = new THREE.MeshStandardMaterial({
      color: result.finalColor,
      roughness: 0.5,
      metalness: 0.05,
      emissive: result.finalColor,
      emissiveIntensity: result.glowIntensity
    });

    this.cakeMesh = new THREE.Mesh(geometry, material);
    this.cakeMesh.scale.set(result.scale, result.scale, result.scale);
    this.cakeMesh.castShadow = true;
    this.cakeMesh.receiveShadow = true;
    this.cakeContainer.add(this.cakeMesh);

    this.targetRotationX = 0;
    this.targetRotationY = 0;
    this.currentRotationX = 0;
    this.currentRotationY = 0;
    this.autoRotate = true;
    this.selectedTool = null;

    document.querySelectorAll('.tool-item').forEach((item) => {
      item.classList.remove('active');
    });
  }

  private animate = () => {
    if (this.autoRotate && !this.isDragging) {
      this.targetRotationY += 0.003;
    }

    this.currentRotationX += (this.targetRotationX - this.currentRotationX) * 0.1;
    this.currentRotationY += (this.targetRotationY - this.currentRotationY) * 0.1;

    if (this.cakeContainer) {
      this.cakeContainer.rotation.x = this.currentRotationX;
      this.cakeContainer.rotation.y = this.currentRotationY;
    }

    if (this.sparkleParticles) {
      this.sparkleParticles.rotation.y += 0.001;
      this.sparkleParticles.rotation.x += 0.0005;
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
    setTimeout(() => {
      this.resize();
      this.animate();
    }, 50);
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

    const originalPixelRatio = this.renderer.getPixelRatio();
    this.renderer.setPixelRatio(2);
    
    const originalRotationX = this.targetRotationX;
    const originalRotationY = this.targetRotationY;
    this.targetRotationX = 0;
    this.targetRotationY = 0;
    this.currentRotationX = 0;
    this.currentRotationY = 0;
    
    if (this.cakeContainer) {
      this.cakeContainer.rotation.x = 0;
      this.cakeContainer.rotation.y = 0;
    }
    
    this.renderer.render(this.scene, this.camera);

    const canvas = this.renderer.domElement;
    const imageData = canvas.toDataURL('image/png');

    this.renderer.setPixelRatio(originalPixelRatio);
    this.targetRotationX = originalRotationX;
    this.targetRotationY = originalRotationY;

    const stats = this.bakeResult.stats;
    const title = this.generateCakeTitle(stats);
    const description = this.generateDescription(stats);
    const shareLink = this.generateShareLink();
    const shareText = this.generateShareText(title, stats);

    return {
      imageData,
      title,
      stats,
      description,
      shareLink,
      shareText
    };
  }

  private generateCakeTitle(stats: BakeStats): string {
    const prefixes = ['星尘', '月光', '闪耀', '梦幻', '星云', '银河', '极光', '水晶'];
    const suffixes = ['蛋糕', '布丁', '塔', '泡芙', '慕斯', '果冻', '舒芙蕾', '马卡龙'];
    
    const prefixIndex = Math.floor((stats.sweetness + stats.glow) * 0.8) % prefixes.length;
    const suffixIndex = Math.floor(stats.fluffiness * 1.5) % suffixes.length;
    
    return prefixes[prefixIndex] + suffixes[suffixIndex];
  }

  private generateDescription(stats: BakeStats): string {
    const sweetDescs = [
      '清淡雅致，余味悠长',
      '微甜不腻，清新自然',
      '甜度适中，温润可口',
      '甜蜜满满，幸福洋溢',
      '极致甜美，如梦似幻'
    ];
    const sweetDesc = sweetDescs[Math.min(4, Math.max(0, Math.floor(stats.sweetness - 0.5)))] || '清淡雅致';

    const fluffDescs = [
      '紧实绵密，口感醇厚',
      '略微蓬松，层次分明',
      '松软可口，恰到好处',
      '轻盈如云，入口即化',
      '空气感十足，飘飘欲仙'
    ];
    const fluffDesc = fluffDescs[Math.min(4, Math.max(0, Math.floor(stats.fluffiness - 0.5)))] || '紧实绵密';

    const glowDescs = [
      '温润内敛，低调奢华',
      '微微发光，温柔可爱',
      '光彩照人，熠熠生辉',
      '璀璨夺目，华丽非凡',
      '光芒万丈，震撼人心'
    ];
    const glowDesc = glowDescs[Math.min(4, Math.max(0, Math.floor(stats.glow - 0.5)))] || '温润内敛';

    return `这是一道${glowDesc}的魔法甜点，${sweetDesc}，口感${fluffDesc}。每一口都仿佛在舌尖绽放出整个银河的滋味，让你在星辰的怀抱中沉醉。`;
  }

  private generateShareText(title: string, stats: BakeStats): string {
    const stars = this.getStars(Math.round((stats.sweetness + stats.fluffiness + stats.glow) / 3));
    return `我在星辰烘焙坊制作了「${title}」！甜度${this.getStars(stats.sweetness)} 蓬松度${this.getStars(stats.fluffiness)} 发光强度${this.getStars(stats.glow)} 综合评分：${stars}颗星✨ 快来制作你的专属魔法甜点吧！`;
  }

  private generateShareLink(): string {
    const baseUrl = window.location.origin + window.location.pathname;
    const id = this.generateId();
    return `${baseUrl}?cake=${id}`;
  }

  private generateId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  getStars(value: number): string {
    const full = Math.min(5, Math.max(0, Math.round(value / 5 * 5)));
    return '★'.repeat(full) + '☆'.repeat(5 - full);
  }

  getStatsStars(value: number): string {
    const full = Math.min(3, Math.max(0, Math.round(value / 5 * 3)));
    return '★'.repeat(full) + '☆'.repeat(3 - full);
  }

  destroy() {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', () => this.resize());
    this.clearDecorations();
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
