import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomManager, ROOM_TEMPLATES } from './room';
import { ColorPicker } from './palette';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private roomManager: RoomManager;
  private colorPicker: ColorPicker | null = null;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private selectedSurfaceId: string | null = null;
  private currentRoom: string = 'nordic-living';
  private timeOfDay: number = 14;
  private isDraggingSlider: boolean = false;
  private container: HTMLElement;
  private leftPanel: HTMLElement;
  private centerPanel: HTMLElement;
  private rightPanel: HTMLElement;
  private timeDisplay: HTMLElement | null = null;
  private selectedSurfaceDisplay: HTMLElement | null = null;
  private colorPreview: HTMLElement | null = null;
  private hexInput: HTMLInputElement | null = null;
  private clock: THREE.Clock;

  constructor() {
    this.container = document.getElementById('app')!;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a1a);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(6, 5, 8);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 20;
    this.controls.maxPolarAngle = Math.PI / 2;
    this.controls.target.set(0, 1.5, 0);

    this.roomManager = new RoomManager(this.scene, this.onSurfaceSelected.bind(this));

    this.leftPanel = this.createLeftPanel();
    this.centerPanel = this.createCenterPanel();
    this.rightPanel = this.createRightPanel();

    this.container.appendChild(this.leftPanel);
    this.container.appendChild(this.centerPanel);
    this.container.appendChild(this.rightPanel);

    this.centerPanel.appendChild(this.renderer.domElement);

    this.setupEventListeners();
    this.roomManager.setupRoom(this.currentRoom);
    this.roomManager.updateLighting(this.timeOfDay);
    this.updateTimeDisplay();
    this.onWindowResize();
    this.animate();
  }

  private createLeftPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.style.width = '240px';
    panel.style.minWidth = '240px';
    panel.style.backgroundColor = '#2c2c2c';
    panel.style.color = '#ffffff';
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    panel.style.overflowY = 'auto';
    panel.style.transition = 'all 0.3s ease';

    const title = document.createElement('div');
    title.textContent = '工具箱';
    title.style.fontSize = '16px';
    title.style.fontWeight = 'bold';
    title.style.padding = '20px 16px';
    title.style.borderBottom = '1px solid #3a3a3a';
    panel.appendChild(title);

    const menuTitle = document.createElement('div');
    menuTitle.textContent = '房间模板';
    menuTitle.style.fontSize = '12px';
    menuTitle.style.color = '#888888';
    menuTitle.style.padding = '16px 16px 8px 16px';
    panel.appendChild(menuTitle);

    ROOM_TEMPLATES.forEach((template, index) => {
      const item = document.createElement('div');
      item.textContent = template.displayName;
      item.style.fontSize = '14px';
      item.style.padding = '12px 16px';
      item.style.cursor = 'pointer';
      item.style.transition = 'all 0.2s ease';
      item.style.position = 'relative';

      if (index === 0) {
        item.style.backgroundColor = '#42a5f5';
        item.style.color = '#ffffff';
      }

      item.addEventListener('mouseenter', () => {
        if (item.style.backgroundColor !== 'rgb(66, 165, 245)') {
          item.style.backgroundColor = '#3a3a3a';
        }
      });

      item.addEventListener('mouseleave', () => {
        if (item.style.backgroundColor !== 'rgb(66, 165, 245)') {
          item.style.backgroundColor = 'transparent';
        }
      });

      item.addEventListener('click', () => {
        this.switchRoom(template.name);
        panel.querySelectorAll('.room-item').forEach(el => {
          (el as HTMLElement).style.backgroundColor = 'transparent';
          (el as HTMLElement).style.color = '#ffffff';
        });
        item.style.backgroundColor = '#42a5f5';
        item.style.color = '#ffffff';
      });

      item.className = 'room-item';
      panel.appendChild(item);
    });

    const tipTitle = document.createElement('div');
    tipTitle.textContent = '操作提示';
    tipTitle.style.fontSize = '12px';
    tipTitle.style.color = '#888888';
    tipTitle.style.padding = '24px 16px 8px 16px';
    panel.appendChild(tipTitle);

    const tips = [
      '点击墙面/家具选择部位',
      '拖动鼠标旋转视角',
      '滚轮缩放场景',
      '右键平移视图'
    ];

    tips.forEach(tip => {
      const tipItem = document.createElement('div');
      tipItem.textContent = tip;
      tipItem.style.fontSize = '12px';
      tipItem.style.color = '#aaaaaa';
      tipItem.style.padding = '6px 16px';
      tipItem.style.paddingLeft = '28px';
      tipItem.style.position = 'relative';
      tipItem.style.lineHeight = '1.5';

      const dot = document.createElement('span');
      dot.textContent = '•';
      dot.style.position = 'absolute';
      dot.style.left = '16px';
      dot.style.color = '#42a5f5';
      tipItem.insertBefore(dot, tipItem.firstChild);

      panel.appendChild(tipItem);
    });

    return panel;
  }

  private createCenterPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.style.flex = '1';
    panel.style.position = 'relative';
    panel.style.overflow = 'hidden';
    panel.style.minWidth = '0';

    const bottomBar = document.createElement('div');
    bottomBar.style.position = 'absolute';
    bottomBar.style.bottom = '20px';
    bottomBar.style.left = '50%';
    bottomBar.style.transform = 'translateX(-50%)';
    bottomBar.style.backgroundColor = 'rgba(245, 245, 245, 0.9)';
    bottomBar.style.backdropFilter = 'blur(10px)';
    bottomBar.style.borderRadius = '8px';
    bottomBar.style.padding = '12px 24px';
    bottomBar.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    bottomBar.style.display = 'flex';
    bottomBar.style.alignItems = 'center';
    bottomBar.style.gap = '16px';
    bottomBar.style.zIndex = '100';

    const timeLabel = document.createElement('span');
    timeLabel.textContent = '时间：';
    timeLabel.style.fontSize = '13px';
    timeLabel.style.color = '#333333';
    timeLabel.style.whiteSpace = 'nowrap';
    bottomBar.appendChild(timeLabel);

    this.timeDisplay = document.createElement('span');
    this.timeDisplay.textContent = '14:00';
    this.timeDisplay.style.fontSize = '14px';
    this.timeDisplay.style.fontWeight = 'bold';
    this.timeDisplay.style.color = '#42a5f5';
    this.timeDisplay.style.minWidth = '50px';
    this.timeDisplay.style.textAlign = 'center';
    bottomBar.appendChild(this.timeDisplay);

    const sliderContainer = document.createElement('div');
    sliderContainer.style.position = 'relative';
    sliderContainer.style.flex = '1';
    sliderContainer.style.minWidth = '200px';

    const sliderTrack = document.createElement('div');
    sliderTrack.style.height = '6px';
    sliderTrack.style.backgroundColor = '#dddddd';
    sliderTrack.style.borderRadius = '3px';
    sliderTrack.style.cursor = 'pointer';

    const sliderFill = document.createElement('div');
    sliderFill.id = 'slider-fill';
    sliderFill.style.position = 'absolute';
    sliderFill.style.left = '0';
    sliderFill.style.top = '50%';
    sliderFill.style.transform = 'translateY(-50%)';
    sliderFill.style.height = '6px';
    sliderFill.style.backgroundColor = '#42a5f5';
    sliderFill.style.borderRadius = '3px';
    sliderFill.style.width = '50%';
    sliderFill.style.pointerEvents = 'none';
    sliderTrack.appendChild(sliderFill);

    const sliderHandle = document.createElement('div');
    sliderHandle.id = 'slider-handle';
    sliderHandle.style.position = 'absolute';
    sliderHandle.style.top = '50%';
    sliderHandle.style.left = '50%';
    sliderHandle.style.transform = 'translate(-50%, -50%)';
    sliderHandle.style.width = '18px';
    sliderHandle.style.height = '18px';
    sliderHandle.style.backgroundColor = '#ffffff';
    sliderHandle.style.border = '2px solid #42a5f5';
    sliderHandle.style.borderRadius = '50%';
    sliderHandle.style.cursor = 'grab';
    sliderHandle.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.2)';
    sliderHandle.style.transition = 'box-shadow 0.2s ease';
    sliderTrack.appendChild(sliderHandle);

    sliderContainer.appendChild(sliderTrack);

    const ticksContainer = document.createElement('div');
    ticksContainer.style.display = 'flex';
    ticksContainer.style.justifyContent = 'space-between';
    ticksContainer.style.marginTop = '6px';
    ticksContainer.style.fontSize = '10px';
    ticksContainer.style.color = '#666666';

    ['8:00', '11:00', '14:00', '17:00', '20:00'].forEach(time => {
      const tick = document.createElement('span');
      tick.textContent = time;
      ticksContainer.appendChild(tick);
    });

    sliderContainer.appendChild(ticksContainer);

    sliderTrack.addEventListener('mousedown', (e) => {
      this.isDraggingSlider = true;
      this.updateSliderFromEvent(e);
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isDraggingSlider) {
        this.updateSliderFromEvent(e);
      }
    });

    document.addEventListener('mouseup', () => {
      this.isDraggingSlider = false;
    });

    bottomBar.appendChild(sliderContainer);
    panel.appendChild(bottomBar);

    const hintBar = document.createElement('div');
    hintBar.style.position = 'absolute';
    hintBar.style.bottom = '80px';
    hintBar.style.left = '50%';
    hintBar.style.transform = 'translateX(-50%)';
    hintBar.style.backgroundColor = 'rgba(44, 44, 44, 0.8)';
    hintBar.style.color = '#ffffff';
    hintBar.style.fontSize = '12px';
    hintBar.style.padding = '8px 16px';
    hintBar.style.borderRadius = '4px';
    hintBar.style.pointerEvents = 'none';
    hintBar.style.transition = 'opacity 0.3s ease';
    hintBar.textContent = '点击房间内任意表面选择要改色的部位';
    hintBar.id = 'hint-bar';
    panel.appendChild(hintBar);

    return panel;
  }

  private createRightPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.style.width = '280px';
    panel.style.minWidth = '280px';
    panel.style.backgroundColor = '#f5f5f5';
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    panel.style.overflowY = 'auto';
    panel.style.transition = 'all 0.3s ease';

    const title = document.createElement('div');
    title.textContent = '属性面板';
    title.style.fontSize = '16px';
    title.style.fontWeight = 'bold';
    title.style.padding = '20px 16px';
    title.style.borderBottom = '1px solid #e0e0e0';
    title.style.color = '#333333';
    panel.appendChild(title);

    const card1 = document.createElement('div');
    card1.style.backgroundColor = '#ffffff';
    card1.style.borderRadius = '8px';
    card1.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
    card1.style.margin = '16px';
    card1.style.padding = '16px';
    card1.style.transition = 'all 0.3s ease';

    const card1Title = document.createElement('div');
    card1Title.textContent = '选中部位';
    card1Title.style.fontSize = '13px';
    card1Title.style.color = '#666666';
    card1Title.style.marginBottom = '8px';
    card1.appendChild(card1Title);

    this.selectedSurfaceDisplay = document.createElement('div');
    this.selectedSurfaceDisplay.textContent = '未选择';
    this.selectedSurfaceDisplay.style.fontSize = '18px';
    this.selectedSurfaceDisplay.style.fontWeight = 'bold';
    this.selectedSurfaceDisplay.style.color = '#333333';
    card1.appendChild(this.selectedSurfaceDisplay);

    panel.appendChild(card1);

    const card2 = document.createElement('div');
    card2.style.backgroundColor = '#ffffff';
    card2.style.borderRadius = '8px';
    card2.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
    card2.style.margin = '0 16px 16px 16px';
    card2.style.padding = '16px';
    card2.style.transition = 'all 0.3s ease';

    const card2Title = document.createElement('div');
    card2Title.textContent = '颜色选择';
    card2Title.style.fontSize = '13px';
    card2Title.style.color = '#666666';
    card2Title.style.marginBottom = '12px';
    card2.appendChild(card2Title);

    const colorPickerContainer = document.createElement('div');
    colorPickerContainer.style.display = 'flex';
    colorPickerContainer.style.justifyContent = 'center';
    colorPickerContainer.style.marginBottom = '16px';
    card2.appendChild(colorPickerContainer);

    this.colorPicker = new ColorPicker(colorPickerContainer, (color) => {
      this.onColorChanged(color);
    });

    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '12px';

    this.colorPreview = document.createElement('div');
    this.colorPreview.style.width = '40px';
    this.colorPreview.style.height = '40px';
    this.colorPreview.style.borderRadius = '6px';
    this.colorPreview.style.backgroundColor = '#ffffff';
    this.colorPreview.style.border = '2px solid #e0e0e0';
    this.colorPreview.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
    this.colorPreview.style.transition = 'all 0.3s ease';
    row.appendChild(this.colorPreview);

    const hexLabel = document.createElement('span');
    hexLabel.textContent = 'HEX:';
    hexLabel.style.fontSize = '13px';
    hexLabel.style.color = '#666666';
    row.appendChild(hexLabel);

    this.hexInput = document.createElement('input');
    this.hexInput.type = 'text';
    this.hexInput.value = '#ffffff';
    this.hexInput.style.flex = '1';
    this.hexInput.style.padding = '8px 10px';
    this.hexInput.style.border = '1px solid #e0e0e0';
    this.hexInput.style.borderRadius = '4px';
    this.hexInput.style.fontSize = '13px';
    this.hexInput.style.fontFamily = 'monospace';
    this.hexInput.style.outline = 'none';
    this.hexInput.style.transition = 'border-color 0.2s ease';

    this.hexInput.addEventListener('focus', () => {
      this.hexInput!.style.borderColor = '#42a5f5';
    });

    this.hexInput.addEventListener('blur', () => {
      this.hexInput!.style.borderColor = '#e0e0e0';
      const val = this.hexInput!.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
        this.colorPicker?.setColor(val);
        this.onColorChanged(val);
      }
    });

    this.hexInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.hexInput!.blur();
      }
    });

    row.appendChild(this.hexInput);
    card2.appendChild(row);

    panel.appendChild(card2);

    const card3 = document.createElement('div');
    card3.style.backgroundColor = '#ffffff';
    card3.style.borderRadius = '8px';
    card3.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
    card3.style.margin = '0 16px 16px 16px';
    card3.style.padding = '16px';
    card3.style.transition = 'all 0.3s ease';

    const card3Title = document.createElement('div');
    card3Title.textContent = '快速配色';
    card3Title.style.fontSize = '13px';
    card3Title.style.color = '#666666';
    card3Title.style.marginBottom = '12px';
    card3.appendChild(card3Title);

    const presetColors = [
      '#ffffff', '#f5f5f5', '#e0e0e0', '#9e9e9e', '#616161', '#212121',
      '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3',
      '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39',
      '#ffeb3b', '#ffc107', '#ff9800', '#ff5722', '#795548', '#607d8b'
    ];

    const presetGrid = document.createElement('div');
    presetGrid.style.display = 'grid';
    presetGrid.style.gridTemplateColumns = 'repeat(6, 1fr)';
    presetGrid.style.gap = '8px';

    presetColors.forEach(color => {
      const colorSwatch = document.createElement('div');
      colorSwatch.style.backgroundColor = color;
      colorSwatch.style.width = '100%';
      colorSwatch.style.aspectRatio = '1';
      colorSwatch.style.borderRadius = '4px';
      colorSwatch.style.cursor = 'pointer';
      colorSwatch.style.border = '2px solid transparent';
      colorSwatch.style.transition = 'all 0.2s ease';
      colorSwatch.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';

      colorSwatch.addEventListener('mouseenter', () => {
        colorSwatch.style.transform = 'scale(1.15)';
        colorSwatch.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
      });

      colorSwatch.addEventListener('mouseleave', () => {
        colorSwatch.style.transform = 'scale(1)';
        colorSwatch.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
      });

      colorSwatch.addEventListener('click', () => {
        this.colorPicker?.setColor(color);
        this.onColorChanged(color);
      });

      presetGrid.appendChild(colorSwatch);
    });

    card3.appendChild(presetGrid);
    panel.appendChild(card3);

    return panel;
  }

  private updateSliderFromEvent(e: MouseEvent): void {
    const sliderTrack = this.centerPanel.querySelector('#slider-fill')?.parentElement;
    if (!sliderTrack) return;

    const rect = sliderTrack.getBoundingClientRect();
    let percent = (e.clientX - rect.left) / rect.width;
    percent = Math.max(0, Math.min(1, percent));

    this.timeOfDay = 8 + percent * 12;

    const handle = this.centerPanel.querySelector('#slider-handle') as HTMLElement;
    const fill = this.centerPanel.querySelector('#slider-fill') as HTMLElement;
    if (handle) handle.style.left = `${percent * 100}%`;
    if (fill) fill.style.width = `${percent * 100}%`;

    this.updateTimeDisplay();
    this.roomManager.updateLighting(this.timeOfDay);
  }

  private updateTimeDisplay(): void {
    if (!this.timeDisplay) return;
    const hours = Math.floor(this.timeOfDay);
    const minutes = Math.round((this.timeOfDay - hours) * 60);
    this.timeDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  private switchRoom(roomName: string): void {
    this.currentRoom = roomName;
    this.roomManager.setupRoom(roomName);
    this.selectedSurfaceId = null;
    if (this.selectedSurfaceDisplay) {
      this.selectedSurfaceDisplay.textContent = '未选择';
    }
    this.hideHintBar(false);
  }

  private onSurfaceSelected(surfaceId: string | null): void {
    this.selectedSurfaceId = surfaceId;
    if (this.selectedSurfaceDisplay) {
      this.selectedSurfaceDisplay.textContent = surfaceId
        ? this.roomManager.getSurfaceName(surfaceId)
        : '未选择';
    }

    if (surfaceId) {
      const surfaces = this.roomManager.getSurfaces();
      const surface = surfaces.get(surfaceId);
      if (surface) {
        const colorHex = '#' + surface.currentColor.getHexString();
        if (this.colorPreview) {
          this.colorPreview.style.backgroundColor = colorHex;
        }
        if (this.hexInput) {
          this.hexInput.value = colorHex;
        }
        this.colorPicker?.setColor(colorHex);
      }
      this.hideHintBar(true);
    }
  }

  private onColorChanged(color: string): void {
    if (this.colorPreview) {
      this.colorPreview.style.backgroundColor = color;
    }
    if (this.hexInput) {
      this.hexInput.value = color;
    }

    if (this.selectedSurfaceId) {
      this.roomManager.setColor(this.selectedSurfaceId, color);
    }
  }

  private hideHintBar(hide: boolean): void {
    const hintBar = document.getElementById('hint-bar');
    if (hintBar) {
      hintBar.style.opacity = hide ? '0' : '1';
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));

    this.renderer.domElement.addEventListener('click', this.onCanvasClick.bind(this));
  }

  private onCanvasClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const roomGroup = this.roomManager.getRoomGroup();
    const surfaces = this.roomManager.getSurfaces();

    const meshes: THREE.Mesh[] = [];
    surfaces.forEach(surface => {
      meshes.push(surface.mesh);
    });

    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;
      let surfaceId: string | null = null;

      surfaces.forEach((surface, id) => {
        if (surface.mesh === clickedMesh) {
          surfaceId = id;
        }
      });

      if (surfaceId) {
        this.roomManager.selectSurface(surfaceId);
      }
    } else {
      this.roomManager.selectSurface(null);
    }
  }

  private onWindowResize(): void {
    const isMobile = window.innerWidth <= 1024;
    const container = this.container;

    if (isMobile) {
      container.style.flexDirection = 'column';
      container.style.alignItems = 'stretch';

      this.leftPanel.style.width = '100%';
      this.leftPanel.style.minWidth = '100%';
      this.leftPanel.style.height = '200px';
      this.leftPanel.style.maxHeight = '200px';
      this.leftPanel.style.flex = '0 0 200px';
      this.leftPanel.style.minHeight = '200px';
      this.leftPanel.style.overflowY = 'auto';

      this.centerPanel.style.width = '100%';
      this.centerPanel.style.minWidth = '100%';
      this.centerPanel.style.height = 'auto';
      this.centerPanel.style.flex = '1 1 auto';
      this.centerPanel.style.minHeight = '400px';
      this.centerPanel.style.maxHeight = 'none';

      this.rightPanel.style.width = '100%';
      this.rightPanel.style.minWidth = '100%';
      this.rightPanel.style.height = '350px';
      this.rightPanel.style.maxHeight = '400px';
      this.rightPanel.style.flex = '0 0 350px';
      this.rightPanel.style.minHeight = '350px';
      this.rightPanel.style.overflowY = 'auto';
    } else {
      container.style.flexDirection = 'row';
      container.style.alignItems = 'stretch';

      this.leftPanel.style.width = '240px';
      this.leftPanel.style.minWidth = '240px';
      this.leftPanel.style.height = '100%';
      this.leftPanel.style.maxHeight = 'none';
      this.leftPanel.style.flex = '0 0 240px';
      this.leftPanel.style.minHeight = '0';

      this.centerPanel.style.width = 'auto';
      this.centerPanel.style.minWidth = '0';
      this.centerPanel.style.height = '100%';
      this.centerPanel.style.flex = '1 1 auto';
      this.centerPanel.style.minHeight = '0';
      this.centerPanel.style.maxHeight = 'none';

      this.rightPanel.style.width = '280px';
      this.rightPanel.style.minWidth = '280px';
      this.rightPanel.style.height = '100%';
      this.rightPanel.style.maxHeight = 'none';
      this.rightPanel.style.flex = '0 0 280px';
      this.rightPanel.style.minHeight = '0';
    }

    requestAnimationFrame(() => {
      const centerPanelWidth = this.centerPanel.clientWidth;
      const centerPanelHeight = this.centerPanel.clientHeight;

      if (centerPanelWidth > 0 && centerPanelHeight > 0) {
        this.camera.aspect = centerPanelWidth / centerPanelHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(centerPanelWidth, centerPanelHeight);
      }
    });
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();

    this.controls.update();
    this.roomManager.update(delta);

    this.renderer.render(this.scene, this.camera);
  }

  public start(): void {
    this.onWindowResize();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.start();
});
