import * as THREE from 'three';

export interface AnnotationData {
  id: number;
  position: THREE.Vector3;
  icon: string;
  title: string;
  description: string;
}

export class AnnotationSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private targetMesh: THREE.Mesh;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private annotationMarkers: THREE.Mesh[] = [];
  private annotationData: AnnotationData[] = [];
  private activeAnnotationId: number | null = null;
  private pinnedAnnotationId: number | null = null;
  private cardElement: HTMLDivElement | null = null;
  private hoveredMarker: THREE.Mesh | null = null;
  private clock: number = 0;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    targetMesh: THREE.Mesh
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.targetMesh = targetMesh;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.annotationData = this.createAnnotationData();
    this.createMarkers();
    this.bindEvents();
  }

  public update(deltaTime: number): void {
    this.clock += deltaTime;
    this.updateMarkerAnimation();
    this.updateCardPosition();
  }

  public dispose(): void {
    this.annotationMarkers.forEach(marker => {
      this.scene.remove(marker);
      (marker.geometry as THREE.BufferGeometry).dispose();
      (marker.material as THREE.Material).dispose();
    });
    this.annotationMarkers = [];
    if (this.cardElement && this.cardElement.parentNode) {
      this.cardElement.parentNode.removeChild(this.cardElement);
    }
  }

  private createAnnotationData(): AnnotationData[] {
    const r0 = 0.8 + 0.25 * Math.exp(-Math.pow((0.35 - 0.45) / 0.2, 2));
    const r1 = 0.8 + 0.25 * Math.exp(-Math.pow((0.45 - 0.45) / 0.2, 2));
    const r2 = 0.8 + 0.25 * Math.exp(-Math.pow((0.55 - 0.45) / 0.2, 2));
    const r3 = 1.15;

    return [
      {
        id: 1,
        position: new THREE.Vector3(0, 0.6, r1 * 1.05),
        icon: '🐉',
        title: '兽面纹（正面）',
        description: '西周时期典型的饕餮纹，以对称的双目为中心，辅以云雷纹地。象征沟通天地的神权力量，是青铜器断代的重要依据。'
      },
      {
        id: 2,
        position: new THREE.Vector3(r1 * 1.05, 0.6, 0),
        icon: '👁',
        title: '兽面纹（侧面）',
        description: '兽面双目圆睁，炯炯有神。工匠以浅浮雕技法突出眼部结构，线条刚劲有力，体现西周早期青铜工艺的高超水平。'
      },
      {
        id: 3,
        position: new THREE.Vector3(0, 0.6, -r1 * 1.05),
        icon: '🐲',
        title: '兽面纹（背面）',
        description: '背面兽面纹构图与正面呼应，但细节略有变化。这种四面装饰的布局体现了"礼器四面观"的设计理念。'
      },
      {
        id: 4,
        position: new THREE.Vector3(-r1 * 1.05, 0.6, 0),
        icon: '🦬',
        title: '兽面纹（左侧）',
        description: '此面兽面纹角部特征明显，类似牛角造型。学者认为这类纹饰与祭祀活动中使用的太牢之礼有关。'
      },
      {
        id: 5,
        position: new THREE.Vector3(0, 0.5, r0 * 1.03),
        icon: '〰️',
        title: '上弦纹',
        description: '位于鼓腹上部的凸弦纹，将纹饰带与器身明显区分。弦纹在青铜器中既是装饰，也是结构加固的工艺痕迹。'
      },
      {
        id: 6,
        position: new THREE.Vector3(0, 0.3, r2 * 1.03),
        icon: '➖',
        title: '下弦纹',
        description: '位于鼓腹下部的凸弦纹，与上弦纹共同框定兽面纹装饰带。这种双弦纹布局盛行于西周早中期。'
      },
      {
        id: 7,
        position: new THREE.Vector3(0, -0.9, r0 * 0.7),
        icon: '⭕',
        title: '圈足',
        description: '器底的圈足设计，使器物放置更稳。圈足上常见镂空或铸缝痕迹，是研究古代范铸工艺的重要实物资料。'
      },
      {
        id: 8,
        position: new THREE.Vector3(0.3, 1.5, r3 * 0.85),
        icon: '📜',
        title: '铭文区域',
        description: '觚的口沿内侧常铸有铭文，内容多为族徽或祭祀记录。这些金文是研究西周社会、宗教和文字发展的珍贵史料。'
      }
    ];
  }

  private createMarkers(): void {
    this.annotationData.forEach(data => {
      const geometry = new THREE.RingGeometry(0.04, 0.05, 32);
      const material = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false
      });
      const marker = new THREE.Mesh(geometry, material);
      marker.position.copy(data.position);
      marker.userData = { annotationId: data.id, basePosition: data.position.clone() };
      marker.renderOrder = 999;
      this.scene.add(marker);
      this.annotationMarkers.push(marker);
    });
  }

  private updateMarkerAnimation(): void {
    this.annotationMarkers.forEach((marker, index) => {
      const data = this.annotationData[index];
      if (!data) return;

      const pulse = Math.sin(this.clock * (Math.PI * 2 / 1.5)) * 0.5 + 0.5;
      const baseScale = 0.04 + pulse * 0.02;

      let targetScale = baseScale;
      if (marker === this.hoveredMarker) {
        targetScale = 0.08;
      }

      const currentScale = marker.scale.x;
      const newScale = currentScale + (targetScale - currentScale) * 0.2;
      marker.scale.set(newScale, newScale, newScale);

      const direction = new THREE.Vector3()
        .subVectors(marker.position, new THREE.Vector3(0, marker.position.y, 0))
        .normalize();
      marker.lookAt(marker.position.clone().add(direction));
      marker.rotateX(Math.PI / 2);

      const material = marker.material as THREE.MeshBasicMaterial;
      const pulseOpacity = 0.6 + pulse * 0.4;
      if (marker === this.hoveredMarker) {
        material.opacity = 1.0;
      } else {
        material.opacity = pulseOpacity;
      }
    });
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('click', this.onClick.bind(this));
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const markerIntersects = this.raycaster.intersectObjects(this.annotationMarkers, false);
    const meshIntersects = this.raycaster.intersectObject(this.targetMesh, true);

    if (markerIntersects.length > 0) {
      const marker = markerIntersects[0].object as THREE.Mesh;
      this.hoveredMarker = marker;
      this.renderer.domElement.style.cursor = 'pointer';
      const annotationId = marker.userData.annotationId;
      if (annotationId !== this.activeAnnotationId && this.pinnedAnnotationId !== annotationId) {
        this.showAnnotationCard(annotationId);
      }
    } else {
      this.hoveredMarker = null;
      if (meshIntersects.length > 0) {
        this.renderer.domElement.style.cursor = 'pointer';
      } else {
        this.renderer.domElement.style.cursor = 'default';
      }
      if (this.pinnedAnnotationId === null && this.activeAnnotationId !== null) {
        this.hideAnnotationCard();
      }
    }
  }

  private onClick(_event: MouseEvent): void {
    if (this.hoveredMarker) {
      const annotationId = this.hoveredMarker.userData.annotationId;
      if (this.pinnedAnnotationId === annotationId) {
        this.pinnedAnnotationId = null;
        this.hideAnnotationCard();
      } else {
        this.pinnedAnnotationId = annotationId;
        this.showAnnotationCard(annotationId, true);
      }
    }
  }

  private showAnnotationCard(annotationId: number, pinned: boolean = false): void {
    this.activeAnnotationId = annotationId;
    const data = this.annotationData.find(d => d.id === annotationId);
    if (!data) return;

    if (!this.cardElement) {
      this.cardElement = document.createElement('div');
      this.cardElement.className = 'annotation-card';
      document.body.appendChild(this.cardElement);
    }

    if (pinned) {
      this.cardElement.classList.add('pinned');
    } else {
      this.cardElement.classList.remove('pinned');
    }

    this.cardElement.innerHTML = `
      ${pinned ? '<div class="pin-indicator">已固定</div>' : ''}
      <div class="title">
        <span class="icon">${data.icon}</span>
        ${data.title}
      </div>
      <div class="desc">${data.description}</div>
    `;

    this.cardElement.style.display = 'block';
  }

  private hideAnnotationCard(): void {
    this.activeAnnotationId = null;
    if (this.cardElement) {
      this.cardElement.style.display = 'none';
      this.cardElement.classList.remove('pinned');
    }
  }

  private updateCardPosition(): void {
    if (!this.cardElement || this.cardElement.style.display === 'none') return;

    const marker = this.annotationMarkers.find(m => m.userData.annotationId === this.activeAnnotationId);
    if (!marker) return;

    const worldPos = new THREE.Vector3();
    marker.getWorldPosition(worldPos);
    const screenPos = worldPos.clone().project(this.camera);

    const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;

    const cardWidth = 240;
    const cardHeight = this.cardElement.offsetHeight;
    let finalX = x - cardWidth / 2;
    let finalY = y - cardHeight - 20;

    if (finalX < 10) finalX = 10;
    if (finalX + cardWidth > window.innerWidth - 10) finalX = window.innerWidth - cardWidth - 10;
    if (finalY < 60) finalY = y + 30;
    if (finalY + cardHeight > window.innerHeight - 20) finalY = window.innerHeight - cardHeight - 20;

    this.cardElement.style.left = `${finalX}px`;
    this.cardElement.style.top = `${finalY}px`;
  }
}
