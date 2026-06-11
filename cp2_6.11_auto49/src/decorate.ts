import * as THREE from 'three';
import { createId } from 'cuid';
import { DessertProperties } from './ingredients';

export enum DecorationType {
  STAR_SPRINKLE = 'star_sprinkle',
  RAINBOW_SAUCE = 'rainbow_sauce'
}

export interface Decoration {
  id: string;
  type: DecorationType;
  color: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  mesh: THREE.Mesh;
}

interface StarColor {
  color: string;
  name: string;
}

const STAR_COLORS: StarColor[] = [
  { color: '#FFD700', name: '金色' },
  { color: '#FF69B4', name: '粉色' },
  { color: '#87CEEB', name: '蓝色' }
];

export class DecorationSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private dessertMesh: THREE.Mesh;
  private decorations: Decoration[] = [];
  private selectedDecoration: DecorationType = DecorationType.STAR_SPRINKLE;
  private selectedColor: string = STAR_COLORS[0].color;
  private isDragging: boolean = false;
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private targetRotation: { x: number; y: number } = { x: 0, y: 0 };
  private currentRotation: { x: number; y: number } = { x: 0, y: 0 };
  private animationFrameId: number | null = null;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private sprinkleGeometry: THREE.CylinderGeometry | null = null;
  private sprinkleMaterials: Map<string, THREE.MeshStandardMaterial> = new Map();
  private sauceGeometry: THREE.CircleGeometry | null = null;
  private sauceMaterial: THREE.ShaderMaterial | null = null;
  private onShareReady: (() => void) | null = null;
  private properties: DessertProperties;
  private dessertGroup: THREE.Group = new THREE.Group();

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    dessertMesh: THREE.Mesh,
    properties: DessertProperties
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.dessertMesh = dessertMesh;
    this.properties = properties;

    this.dessertGroup.add(this.dessertMesh);
    this.scene.add(this.dessertGroup);

    this.init();
  }

  private init(): void {
    this.createSharedGeometries();
    this.createSharedMaterials();
    this.setupLighting();
    this.setupEventListeners();
    this.startAnimation();
  }

  private createSharedGeometries(): void {
    this.sprinkleGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8);
    this.sauceGeometry = new THREE.CircleGeometry(0.15, 32);
  }

  private createSharedMaterials(): void {
    STAR_COLORS.forEach(sc => {
      const color = new THREE.Color(sc.color);
      const material = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.5,
        metalness: 0.3,
        roughness: 0.2
      });
      this.sprinkleMaterials.set(sc.color, material);
    });

    const rainbowVertexShader = `
      varying vec2 vUv;
      varying vec3 vPosition;
      void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const rainbowFragmentShader = `
      uniform float time;
      varying vec2 vUv;
      varying vec3 vPosition;
      
      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }
      
      void main() {
        float hue = vUv.x + time * 0.1;
        float alpha = 1.0 - smoothstep(0.0, 0.5, length(vUv - 0.5));
        vec3 color = hsv2rgb(vec3(hue, 0.8, 1.0));
        gl_FragColor = vec4(color, alpha * 0.8);
      }
    `;

    this.sauceMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: rainbowVertexShader,
      fragmentShader: rainbowFragmentShader,
      transparent: true,
      side: THREE.DoubleSide
    });
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(5, 5, 5);
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x87ceeb, 0.4);
    fillLight.position.set(-5, 3, -5);
    this.scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xff69b4, 0.5, 10);
    rimLight.position.set(0, 2, -3);
    this.scene.add(rimLight);
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
    canvas.addEventListener('click', this.onClick.bind(this));

    const decorationItems = document.querySelectorAll('.decoration-item');
    decorationItems.forEach(item => {
      item.addEventListener('click', () => {
        decorationItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        const type = (item as HTMLElement).dataset.decoration as DecorationType;
        this.selectedDecoration = type;
      });
    });

    const colorOptions = document.querySelectorAll('.color-option');
    colorOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        colorOptions.forEach(o => o.classList.remove('active'));
        option.classList.add('active');
        this.selectedColor = (option as HTMLElement).dataset.color || STAR_COLORS[0].color;
      });
    });
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.previousMousePosition = { x: e.clientX, y: e.clientY };
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.previousMousePosition.x;
    const deltaY = e.clientY - this.previousMousePosition.y;

    this.targetRotation.y += deltaX * 0.005;
    this.targetRotation.x += deltaY * 0.005;
    this.targetRotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.targetRotation.x));

    this.previousMousePosition = { x: e.clientX, y: e.clientY };
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onClick(e: MouseEvent): void {
    if (this.isDragging) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.dessertMesh);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      const normal = intersects[0].face?.normal || new THREE.Vector3(0, 1, 0);
      this.addDecoration(point, normal);
    }
  }

  private addDecoration(position: THREE.Vector3, normal: THREE.Vector3): void {
    const id = createId();
    let mesh: THREE.Mesh;

    if (this.selectedDecoration === DecorationType.STAR_SPRINKLE) {
      const material = this.sprinkleMaterials.get(this.selectedColor);
      if (!material || !this.sprinkleGeometry) return;
      
      mesh = new THREE.Mesh(this.sprinkleGeometry, material);
      
      const rotation = new THREE.Euler(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      mesh.position.copy(position);
      mesh.rotation.copy(rotation);
      mesh.scale.setScalar(0.8 + Math.random() * 0.4);
      
    } else {
      if (!this.sauceGeometry || !this.sauceMaterial) return;
      
      mesh = new THREE.Mesh(this.sauceGeometry, this.sauceMaterial.clone());
      
      const rotation = new THREE.Euler(
        -Math.PI / 2 + (Math.random() - 0.5) * 0.3,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      mesh.position.copy(position).add(normal.clone().multiplyScalar(0.05));
      mesh.rotation.copy(rotation);
      mesh.scale.setScalar(0.8 + Math.random() * 0.6);
    }

    this.dessertGroup.add(mesh);

    this.decorations.push({
      id,
      type: this.selectedDecoration,
      color: this.selectedColor,
      position: position.clone(),
      rotation: mesh.rotation.clone(),
      mesh
    });
  }

  private startAnimation(): void {
    const animate = () => {
      this.update();
      this.renderer.render(this.scene, this.camera);
      this.animationFrameId = requestAnimationFrame(animate);
    };
    animate();
  }

  private update(): void {
    this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * 0.1;
    this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * 0.1;

    this.dessertGroup.rotation.x = this.currentRotation.x;
    this.dessertGroup.rotation.y = this.currentRotation.y;

    if (!this.isDragging) {
      this.targetRotation.y += 0.002;
    }

    const time = performance.now() * 0.001;
    if (this.sauceMaterial) {
      this.sauceMaterial.uniforms.time.value = time;
    }

    this.decorations.forEach(dec => {
      if (dec.type === DecorationType.RAINBOW_SAUCE) {
        const material = dec.mesh.material as THREE.ShaderMaterial;
        if (material.uniforms) {
          material.uniforms.time.value = time;
        }
      }
    });
  }

  public generateShareCard(): Promise<{
    imageData: string;
    description: string;
    shareLink: string;
  }> {
    return new Promise((resolve) => {
      this.renderer.render(this.scene, this.camera);
      
      const canvas = this.renderer.domElement;
      const imageData = canvas.toDataURL('image/png', 1.0);
      
      const id = createId();
      const baseUrl = window.location.origin + window.location.pathname;
      const shareLink = `${baseUrl}?dessert=${id}`;
      
      const description = this.generateDescription();
      
      resolve({
        imageData,
        description,
        shareLink
      });
    });
  }

  private generateDescription(): string {
    const { sweetness, fluffiness, glowIntensity } = this.properties;
    
    const sweetDescriptions = [
      '甜度恰到好处，让人回味无穷',
      '甜蜜满溢，幸福的味道在舌尖绽放',
      '清淡的甜味，如初恋般美好',
      '浓郁的香甜，让人欲罢不能'
    ];
    
    const fluffDescriptions = [
      '蓬松如云，入口即化',
      '绵密细腻的口感，堪称完美',
      '轻盈的质地，仿佛在云端漫步',
      '扎实中带着柔软，层次丰富'
    ];
    
    const glowDescriptions = [
      '散发着迷人的光芒，如星辰般璀璨',
      '微光闪烁，神秘而优雅',
      '璀璨夺目，照亮整个房间',
      '柔和的光晕，温暖而治愈'
    ];

    const getIndex = (value: number) => Math.min(3, Math.floor(value / 25));

    const sweetDesc = sweetDescriptions[getIndex(sweetness)];
    const fluffDesc = fluffDescriptions[getIndex(fluffiness)];
    const glowDesc = glowDescriptions[getIndex(glowIntensity)];

    const names = ['星辰', '月光', '彩虹', '梦幻', '魔法', '银河'];
    const suffixes = ['蛋糕', '甜点', '糕点', '布丁', '松饼'];
    const randomName = names[Math.floor(Math.random() * names.length)] + 
                       suffixes[Math.floor(Math.random() * suffixes.length)];

    return `✨ 「${randomName}」 ✨\n\n${sweetDesc}。${fluffDesc}。${glowDesc}。\n\n甜度：${this.getStars(sweetness)}\n蓬松度：${this.getStars(fluffiness)}\n发光强度：${this.getStars(glowIntensity)}\n\n—— 来自星辰烘焙坊的魔法甜点`;
  }

  private getStars(value: number): string {
    const count = Math.max(1, Math.min(5, Math.ceil(value / 20)));
    return '★'.repeat(count) + '☆'.repeat(5 - count);
  }

  public getStarRating(value: number): string {
    return this.getStars(value);
  }

  public downloadImage(imageData: string, filename: string = 'stardust-dessert.png'): void {
    const link = document.createElement('a');
    link.download = filename;
    link.href = imageData;
    link.click();
  }

  public async copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    }
  }

  public getDecorations(): Decoration[] {
    return [...this.decorations];
  }

  public getDessertGroup(): THREE.Group {
    return this.dessertGroup;
  }

  public reset(): void {
    this.decorations.forEach(dec => {
      this.dessertGroup.remove(dec.mesh);
    });
    this.decorations = [];
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.sprinkleGeometry?.dispose();
    this.sprinkleMaterials.forEach(mat => mat.dispose());
    this.sauceGeometry?.dispose();
    this.sauceMaterial?.dispose();

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Light) {
        this.scene.remove(obj);
      }
    });

    this.scene.remove(this.dessertGroup);
  }
}
