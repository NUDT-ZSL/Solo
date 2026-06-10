import * as THREE from 'three';
import { EcoElementType } from './EcoElementFactory';
import { EcoBottleManager } from './EcoBottleManager';

interface PanelItemConfig {
  type: EcoElementType;
  name: string;
  icon: string;
  color: string;
  description: string;
}

export class DragDropPanel {
  private panelEl: HTMLElement;
  private panelItemsEl: HTMLElement;
  private ghostEl: HTMLElement;
  private ghostIconEl: HTMLElement;
  private ghostLabelEl: HTMLElement;
  private tooltipEl: HTMLElement;
  private toggleEl: HTMLElement;

  private bottleManager: EcoBottleManager;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private raycaster: THREE.Raycaster;
  private groundPlane: THREE.Plane;

  private isDragging = false;
  private dragType: EcoElementType | null = null;
  private currentPlacePos: THREE.Vector3 | null = null;
  private onPlaceCallback: ((type: EcoElementType, pos: THREE.Vector3) => void) | null = null;

  private items: PanelItemConfig[] = [
    { type: 'tree', name: '树木', icon: '🌲', color: '#4CAF50', description: '释放氧气，增加生物多样性，根须向水源延伸' },
    { type: 'rock', name: '石头', icon: '🪨', color: '#9E9E9E', description: '提供遮蔽，略微提升温度，压出凹陷地形' },
    { type: 'water', name: '水源', icon: '💧', color: '#4FC3F7', description: '增加湿度，降低温度，吸引动植物聚集' },
    { type: 'smallAnimal', name: '小动物', icon: '✨', color: '#FFD54F', description: '发光的小精灵，在植物与水源间游走' },
    { type: 'largeAnimal', name: '大动物', icon: '🦌', color: '#8D6E63', description: '沿边界巡行，遇到石头会绕行' },
    { type: 'weather', name: '云朵', icon: '☁️', color: '#ECEFF1', description: '放置云朵触发天气：1云=雨，2云=雷暴，3云=雪' },
  ];

  constructor(
    panelId: string,
    itemsId: string,
    ghostId: string,
    tooltipId: string,
    bottleManager: EcoBottleManager,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer
  ) {
    const panelEl = document.getElementById(panelId);
    const itemsEl = document.getElementById(itemsId);
    const ghostEl = document.getElementById(ghostId);
    const tooltipEl = document.getElementById(tooltipId);
    const toggleEl = document.querySelector('.panel-toggle');

    if (!panelEl || !itemsEl || !ghostEl || !tooltipEl || !toggleEl) {
      throw new Error('Required DOM elements not found');
    }

    this.panelEl = panelEl;
    this.panelItemsEl = itemsEl;
    this.ghostEl = ghostEl;
    this.ghostIconEl = ghostEl.querySelector('#ghostIcon')!;
    this.ghostLabelEl = ghostEl.querySelector('#ghostLabel')!;
    this.tooltipEl = tooltipEl;
    this.toggleEl = toggleEl as HTMLElement;

    this.bottleManager = bottleManager;
    this.camera = camera;
    this.renderer = renderer;
    this.raycaster = new THREE.Raycaster();

    const bottlePos = bottleManager.getBottleWorldPosition();
    const bottleY = bottlePos.y - bottleManager.getBottleRadius() + 0.02;
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -bottleY);

    this.buildItems();
    this.bindEvents();
  }

  private buildItems(): void {
    this.panelItemsEl.innerHTML = '';
    for (const item of this.items) {
      const card = document.createElement('div');
      card.className = 'item-card';
      card.dataset.type = item.type;
      card.innerHTML = `
        <div class="item-icon" style="font-size:28px;">${item.icon}</div>
        <div class="item-name">${item.name}</div>
      `;
      card.addEventListener('mousedown', (e) => this.onDragStart(e, item.type));
      card.addEventListener('touchstart', (e) => this.onTouchStart(e, item), { passive: false });
      card.addEventListener('mouseenter', (e) => this.showTooltip(e, item));
      card.addEventListener('mousemove', (e) => this.moveTooltip(e));
      card.addEventListener('mouseleave', () => this.hideTooltip());
      this.panelItemsEl.appendChild(card);
    }
  }

  private showTooltip(e: MouseEvent, item: PanelItemConfig): void {
    this.tooltipEl.textContent = item.description;
    this.tooltipEl.style.display = 'block';
    this.moveTooltip(e);
  }

  private moveTooltip(e: MouseEvent): void {
    const x = e.clientX;
    const y = e.clientY - 12;
    this.tooltipEl.style.left = x + 'px';
    this.tooltipEl.style.top = y + 'px';
  }

  private hideTooltip(): void {
    this.tooltipEl.style.display = 'none';
  }

  private onDragStart(e: MouseEvent, type: EcoElementType): void {
    e.preventDefault();
    this.startDrag(type, e.clientX, e.clientY);

    const onMouseMove = (ev: MouseEvent) => {
      this.onDragMove(ev.clientX, ev.clientY);
    };

    const onMouseUp = (ev: MouseEvent) => {
      this.onDragEnd(ev.clientX, ev.clientY);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  private onTouchStart(e: TouchEvent, item: PanelItemConfig): void {
    e.preventDefault();
    const touch = e.touches[0];
    this.startDrag(item.type, touch.clientX, touch.clientY);

    const onTouchMove = (ev: TouchEvent) => {
      ev.preventDefault();
      const t = ev.touches[0];
      this.onDragMove(t.clientX, t.clientY);
    };

    const onTouchEnd = (ev: TouchEvent) => {
      const t = ev.changedTouches[0];
      this.onDragEnd(t.clientX, t.clientY);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };

    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
  }

  private startDrag(type: EcoElementType, x: number, y: number): void {
    this.isDragging = true;
    this.dragType = type;

    const item = this.items.find(i => i.type === type);
    if (item) {
      this.ghostIconEl.innerHTML = `<span style="font-size:36px;">${item.icon}</span>`;
      this.ghostLabelEl.textContent = item.name;
    }

    this.ghostEl.style.display = 'block';
    this.ghostEl.style.left = x + 'px';
    this.ghostEl.style.top = y + 'px';

    this.hideTooltip();
  }

  private onDragMove(clientX: number, clientY: number): void {
    if (!this.isDragging) return;

    this.ghostEl.style.left = clientX + 'px';
    this.ghostEl.style.top = clientY + 'px';

    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

    const intersectPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.groundPlane, intersectPoint);

    if (intersectPoint) {
      const bottlePos = this.bottleManager.getBottleWorldPosition();
      const bottleRadius = this.bottleManager.getBottleRadius();
      const localX = intersectPoint.x - bottlePos.x;
      const localZ = intersectPoint.z - bottlePos.z;
      const dist = Math.sqrt(localX ** 2 + localZ ** 2);

      if (dist < bottleRadius * 0.9) {
        this.currentPlacePos = intersectPoint.clone();
        this.bottleManager.setPreviewPosition(intersectPoint);
        this.ghostEl.style.opacity = '0.85';
      } else {
        this.currentPlacePos = null;
        this.bottleManager.setPreviewPosition(null);
        this.ghostEl.style.opacity = '0.4';
      }
    } else {
      this.currentPlacePos = null;
      this.bottleManager.setPreviewPosition(null);
    }
  }

  private onDragEnd(clientX: number, clientY: number): void {
    if (!this.isDragging || !this.dragType) return;

    if (this.currentPlacePos && this.onPlaceCallback) {
      this.onPlaceCallback(this.dragType, this.currentPlacePos.clone());
    }

    this.bottleManager.setPreviewPosition(null);
    this.ghostEl.style.display = 'none';
    this.isDragging = false;
    this.dragType = null;
    this.currentPlacePos = null;
  }

  public onPlace(callback: (type: EcoElementType, pos: THREE.Vector3) => void): void {
    this.onPlaceCallback = callback;
  }

  private bindEvents(): void {
    this.toggleEl.addEventListener('click', () => {
      this.panelEl.classList.toggle('collapsed');
    });

    const handleResize = () => {
      const bottlePos = this.bottleManager.getBottleWorldPosition();
      const bottleY = bottlePos.y - this.bottleManager.getBottleRadius() + 0.02;
      this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -bottleY);
    };
    window.addEventListener('resize', handleResize);
  }

  public togglePanel(collapsed?: boolean): void {
    if (collapsed === undefined) {
      this.panelEl.classList.toggle('collapsed');
    } else {
      this.panelEl.classList.toggle('collapsed', collapsed);
    }
  }

  public updateGroundPlane(): void {
    const bottlePos = this.bottleManager.getBottleWorldPosition();
    const bottleY = bottlePos.y - this.bottleManager.getBottleRadius() + 0.02;
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -bottleY);
  }
}
