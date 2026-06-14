/* =========================================================
 * scene-manager.ts —— Three.js 3D 场景管理器
 * 职责：构建楼宇模型、悬浮标签、热力图、告警标记，
 *       通过 EventBus 接收数据更新，驱动场景动画。
 *
 * 调用关系：
 *   main.tsx           → new SceneManager(container, eventBus)  创建实例
 *   main.tsx           → .start()                                启动渲染循环
 *   UIPanel            → .selectFloor() / .setView()             交互联动
 *   EventBus           → on("data:update")                       数据订阅
 *
 * 内部数据流：
 *   数据更新 → updateData() → 插值目标值 → render() 每帧 lerp 到目标值
 * ========================================================= */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BuildingData, EventBus, FloorData, ViewMode } from './event-bus';

interface FloorState {
  targetEnergy: number;
  targetPeople: number;
  targetAlert: 0 | 1 | 2 | 3;
  currentEnergy: number;
  currentPeople: number;
  currentAlert: 0 | 1 | 2 | 3;
  targetHeatColors: THREE.Color[];
  currentHeatColors: THREE.Color[];
  heatTransitionStart: number;
}

export class SceneManager {
  private container: HTMLElement;
  private bus: EventBus;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private clock: THREE.Clock;
  private rafId: number | null = null;

  private buildingGroup: THREE.Group;
  private floorMeshes: THREE.Mesh[] = [];
  private floorEdges: THREE.LineSegments[] = [];
  private floorEdgeMaterials: THREE.LineBasicMaterial[] = [];
  private labelSprites: THREE.Sprite[] = [];
  private labelCanvases: (HTMLCanvasElement | null)[] = [];
  private heatmapMeshes: THREE.Mesh[] = [];
  private heatmapGeometries: THREE.BufferGeometry[] = [];
  private alertSprites: (THREE.Sprite | null)[] = [];

  private floorStates: FloorState[] = [];
  private selectedFloor: number | null = null;
  private currentView: ViewMode = 'free';
  private viewAnimProgress: number = 1;
  private viewAnimFrom: THREE.Vector3 = new THREE.Vector3();
  private viewAnimTo: THREE.Vector3 = new THREE.Vector3();
  private targetAnimTo: THREE.Vector3 = new THREE.Vector3();

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredFloor: number | null = null;
  private tooltipEl: HTMLDivElement | null = null;

  private buildingSlideProgress: number = 0;

  private unsubscribers: Array<() => void> = [];

  private readonly FLOORS = 10;
  private readonly FLOOR_HEIGHT = 2;
  private readonly FLOOR_WIDTH = 8;
  private readonly FLOOR_DEPTH = 6;
  private readonly HEAT_DIV = 4;
  private readonly HEAT_TRANSITION_MS = 500;

  constructor(container: HTMLElement, bus: EventBus) {
    this.container = container;
    this.bus = bus;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a);

    const { clientWidth, clientHeight } = container;
    this.camera = new THREE.PerspectiveCamera(60, clientWidth / clientHeight, 0.1, 1000);
    this.camera.position.set(18, 22, 22);
    this.camera.lookAt(0, this.FLOORS * this.FLOOR_HEIGHT / 2, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(clientWidth, clientHeight);
    this.renderer.setClearColor(0x0f172a, 1);
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 60;
    this.controls.maxPolarAngle = Math.PI / 2.05;

    this.buildingGroup = new THREE.Group();
    this.scene.add(this.buildingGroup);

    this.setupLights();
    this.setupGround();
    this.setupBuilding();
    this.setupTooltip();
    this.bindEvents();

    const unsub1 = this.bus.on('data:update', (d) => this.updateData(d));
    const unsub2 = this.bus.on('floor:select', (f) => this.selectFloor(f));
    const unsub3 = this.bus.on('view:change', (v) => this.setView(v));
    this.unsubscribers.push(unsub1, unsub2, unsub3);

    window.addEventListener('resize', this.onResize);
  }

  /* ========== 初始化 ========== */
  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xffffff, 0.85);
    dir.position.set(15, 25, 12);
    this.scene.add(dir);

    const rim = new THREE.DirectionalLight(0x60a5fa, 0.25);
    rim.position.set(-12, 8, -10);
    this.scene.add(rim);
  }

  private setupGround(): void {
    const grid = new THREE.GridHelper(20, 20, 0x475569, 0x334155);
    grid.position.y = -0.01;
    this.scene.add(grid);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.6 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    this.scene.add(ground);
  }

  private setupBuilding(): void {
    const boxGeom = new THREE.BoxGeometry(this.FLOOR_WIDTH, this.FLOOR_HEIGHT * 0.95, this.FLOOR_DEPTH);
    const edgeGeom = new THREE.EdgesGeometry(boxGeom);

    const lowColor = new THREE.Color(0x3b82f6);
    const highColor = new THREE.Color(0xef4444);

    for (let i = 0; i < this.FLOORS; i++) {
      const floorNum = i + 1;
      const y = i * this.FLOOR_HEIGHT + this.FLOOR_HEIGHT / 2;

      const mesh = new THREE.Mesh(
        boxGeom,
        new THREE.MeshStandardMaterial({
          color: 0x94a3b8,
          transparent: true,
          opacity: 0.45,
          roughness: 0.6,
          metalness: 0.15
        })
      );
      mesh.position.y = y;
      mesh.userData.floor = floorNum;
      mesh.userData.type = 'floor';
      this.buildingGroup.add(mesh);
      this.floorMeshes.push(mesh);

      const edgeMat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.85
      });
      const edges = new THREE.LineSegments(edgeGeom, edgeMat);
      edges.position.y = y;
      edges.userData.floor = floorNum;
      this.buildingGroup.add(edges);
      this.floorEdges.push(edges);
      this.floorEdgeMaterials.push(edgeMat);

      const label = this.createLabelSprite(floorNum);
      label.position.set(this.FLOOR_WIDTH / 2 + 0.8, y, 0);
      label.userData.floor = floorNum;
      label.userData.type = 'label';
      this.buildingGroup.add(label);
      this.labelSprites.push(label);

      const heat = this.createHeatmapMesh(floorNum, lowColor, highColor);
      heat.position.set(0, i * this.FLOOR_HEIGHT + this.FLOOR_HEIGHT * 0.49, 0);
      heat.userData.floor = floorNum;
      this.buildingGroup.add(heat);
      this.heatmapMeshes.push(heat);

      const heatColors: THREE.Color[] = [];
      const targetColors: THREE.Color[] = [];
      for (let k = 0; k < this.HEAT_DIV * this.HEAT_DIV; k++) {
        heatColors.push(lowColor.clone());
        targetColors.push(lowColor.clone());
      }

      this.floorStates.push({
        targetEnergy: 100,
        targetPeople: 50,
        targetAlert: 0,
        currentEnergy: 100,
        currentPeople: 50,
        currentAlert: 0,
        targetHeatColors: targetColors,
        currentHeatColors: heatColors,
        heatTransitionStart: 0
      });

      this.alertSprites.push(null);
    }

    this.buildingGroup.position.y = -this.FLOORS * this.FLOOR_HEIGHT;
  }

  private createLabelSprite(floor: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 120;
    this.labelCanvases.push(canvas);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.2, 0.6, 1);
    this.updateLabelTexture(canvas, floor, 100);
    return sprite;
  }

  private updateLabelTexture(canvas: HTMLCanvasElement, floor: number, energy: number): void {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const radius = 24;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    this.roundRect(ctx, 4, 4, canvas.width - 8, canvas.height - 8, radius);
    ctx.fill();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
    ctx.lineWidth = 2;
    this.roundRect(ctx, 4, 4, canvas.width - 8, canvas.height - 8, radius);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${floor}F`, canvas.width / 2, canvas.height / 2 - 18);

    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 24px monospace';
    ctx.fillText(`${energy.toFixed(1)} kW`, canvas.width / 2, canvas.height / 2 + 22);

    (this.labelSprites[floor - 1].material as THREE.SpriteMaterial).map!.needsUpdate = true;
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  private createHeatmapMesh(floor: number, low: THREE.Color, high: THREE.Color): THREE.Mesh {
    const sizeW = this.FLOOR_WIDTH * 0.98;
    const sizeD = this.FLOOR_DEPTH * 0.98;
    const divs = this.HEAT_DIV;
    const geometry = new THREE.PlaneGeometry(sizeW, sizeD, divs, divs);
    geometry.rotateX(-Math.PI / 2);

    const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const vertexCount = positionAttr.count;
    const colors = new Float32Array(vertexCount * 3);

    for (let i = 0; i < vertexCount; i++) {
      const faceIdx = Math.floor(i / 4);
      const t = (faceIdx % (divs * divs)) / (divs * divs);
      const c = low.clone().lerp(high, t);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    this.heatmapGeometries.push(geometry);
    mesh.userData.floor = floor;
    return mesh;
  }

  private setupTooltip(): void {
    const el = document.createElement('div');
    el.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 9999;
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid rgba(59, 130, 246, 0.6);
      border-radius: 10px;
      padding: 10px 14px;
      color: #ffffff;
      font-family: "Microsoft YaHei", sans-serif;
      font-size: 13px;
      line-height: 1.6;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(8px);
      opacity: 0;
      transition: opacity 0.15s ease;
      white-space: nowrap;
    `;
    document.body.appendChild(el);
    this.tooltipEl = el;
  }

  /* ========== 事件绑定 ========== */
  private bindEvents(): void {
    const dom = this.renderer.domElement;
    dom.addEventListener('mousemove', this.onMouseMove);
    dom.addEventListener('mouseleave', this.onMouseLeave);
  }

  private onMouseMove = (e: MouseEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const pickables: THREE.Object3D[] = [];
    this.floorMeshes.forEach((m) => pickables.push(m));
    this.labelSprites.forEach((s) => pickables.push(s));

    const intersects = this.raycaster.intersectObjects(pickables, false);
    let newHover: number | null = null;

    if (intersects.length > 0) {
      const obj = intersects[0].object;
      if (obj.userData.floor !== undefined) {
        newHover = obj.userData.floor;
      }
    }

    if (newHover !== this.hoveredFloor) {
      if (this.hoveredFloor !== null) {
        const idx = this.hoveredFloor - 1;
        this.labelSprites[idx].scale.set(1.2, 0.6, 1);
        if (this.selectedFloor !== this.hoveredFloor) {
          (this.floorMeshes[idx].material as THREE.MeshStandardMaterial).opacity = 0.45;
        }
      }
      if (newHover !== null) {
        const idx = newHover - 1;
        this.labelSprites[idx].scale.set(1.2 * 1.2, 0.6 * 1.2, 1);
        if (this.selectedFloor !== newHover) {
          (this.floorMeshes[idx].material as THREE.MeshStandardMaterial).opacity = 0.65;
        }
        this.showTooltip(e.clientX, e.clientY, newHover);
      } else {
        this.hideTooltip();
      }
      this.hoveredFloor = newHover;
    } else if (newHover !== null) {
      this.updateTooltipPosition(e.clientX, e.clientY);
    }
  };

  private onMouseLeave = (): void => {
    if (this.hoveredFloor !== null) {
      const idx = this.hoveredFloor - 1;
      this.labelSprites[idx].scale.set(1.2, 0.6, 1);
      if (this.selectedFloor !== this.hoveredFloor) {
        (this.floorMeshes[idx].material as THREE.MeshStandardMaterial).opacity = 0.45;
      }
    }
    this.hoveredFloor = null;
    this.hideTooltip();
  };

  private showTooltip(clientX: number, clientY: number, floor: number): void {
    if (!this.tooltipEl) return;
    const state = this.floorStates[floor - 1];
    const alertText = ['正常', '注意', '警告', '严重'][state.currentAlert];
    const alertColor = ['#22c55e', '#eab308', '#f97316', '#ef4444'][state.currentAlert];
    this.tooltipEl.innerHTML = `
      <div style="font-weight:bold;margin-bottom:4px;color:#22d3ee">${floor}F 详细数据</div>
      <div>人流量：<span style="color:#22d3ee;font-weight:bold">${state.currentPeople}</span> 人</div>
      <div>告警级别：<span style="color:${alertColor};font-weight:bold">${alertText}</span> (${state.currentAlert})</div>
      <div>当前能耗：<span style="color:#22d3ee;font-weight:bold">${state.currentEnergy.toFixed(1)} kW</span></div>
    `;
    this.tooltipEl.style.opacity = '1';
    this.updateTooltipPosition(clientX, clientY);
  }

  private updateTooltipPosition(clientX: number, clientY: number): void {
    if (!this.tooltipEl) return;
    const pad = 15;
    const rect = this.tooltipEl.getBoundingClientRect();
    let x = clientX + pad;
    let y = clientY + pad;
    if (x + rect.width > window.innerWidth) x = clientX - rect.width - pad;
    if (y + rect.height > window.innerHeight) y = clientY - rect.height - pad;
    this.tooltipEl.style.left = `${x}px`;
    this.tooltipEl.style.top = `${y}px`;
  }

  private hideTooltip(): void {
    if (this.tooltipEl) this.tooltipEl.style.opacity = '0';
  }

  private onResize = (): void => {
    const { clientWidth, clientHeight } = this.container;
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight);
  };

  /* ========== 公共 API ========== */
  start(): void {
    if (this.rafId !== null) return;
    this.clock.start();
    const loop = () => {
      this.rafId = requestAnimationFrame(loop);
      this.update();
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  dispose(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.unsubscribers.forEach((u) => u());
    window.removeEventListener('resize', this.onResize);
    const dom = this.renderer.domElement;
    dom.removeEventListener('mousemove', this.onMouseMove);
    dom.removeEventListener('mouseleave', this.onMouseLeave);
    if (this.tooltipEl) this.tooltipEl.remove();
    this.renderer.dispose();
    this.container.removeChild(dom);
  }

  selectFloor(floor: number): void {
    if (this.selectedFloor === floor) return;
    if (this.selectedFloor !== null) {
      const idx = this.selectedFloor - 1;
      const mat = this.floorMeshes[idx].material as THREE.MeshStandardMaterial;
      mat.emissive = new THREE.Color(0x000000);
      mat.opacity = 0.45;
    }
    this.selectedFloor = floor;
    const idx = floor - 1;
    const mat = this.floorMeshes[idx].material as THREE.MeshStandardMaterial;
    mat.emissive = new THREE.Color(0x3b82f6);
    mat.emissiveIntensity = 0.35;
    mat.opacity = 0.7;
    this.bus.emit('floor:select', floor);
  }

  setView(view: ViewMode): void {
    this.currentView = view;
    this.viewAnimProgress = 0;
    this.viewAnimFrom.copy(this.camera.position);
    const centerY = this.FLOORS * this.FLOOR_HEIGHT / 2;
    this.targetAnimTo.set(0, centerY, 0);

    if (view === 'overhead') {
      this.viewAnimTo.set(0, 35, 0.01);
    } else if (view === 'front') {
      this.viewAnimTo.set(0, centerY, 28);
    } else {
      this.viewAnimTo.set(18, 22, 22);
    }
    this.controls.enabled = view === 'free';
    this.bus.emit('view:change', view);
  }

  updateData(data: BuildingData): void {
    const now = performance.now();
    data.floors.forEach((fd) => {
      const idx = fd.floor - 1;
      if (idx < 0 || idx >= this.FLOORS) return;
      const state = this.floorStates[idx];
      state.targetEnergy = fd.energy;
      state.targetPeople = fd.people;
      state.targetAlert = fd.alertLevel;
      state.heatTransitionStart = now;

      const ratio = Math.min(1, fd.people / 480);
      const low = new THREE.Color(0x3b82f6);
      const high = new THREE.Color(0xef4444);

      for (let k = 0; k < this.HEAT_DIV * this.HEAT_DIV; k++) {
        const jitter = (Math.sin(fd.floor * 7 + k * 3 + now * 0.001) + 1) * 0.08;
        const t = Math.max(0, Math.min(1, ratio + jitter - 0.04));
        state.targetHeatColors[k].copy(low).lerp(high, t);
      }

      if (state.targetAlert >= 2 && !this.alertSprites[idx]) {
        this.alertSprites[idx] = this.createAlertSprite();
        const yy = idx * this.FLOOR_HEIGHT + this.FLOOR_HEIGHT + 0.5;
        this.alertSprites[idx]!.position.set(0, yy, this.FLOOR_DEPTH / 2 + 0.3);
        this.buildingGroup.add(this.alertSprites[idx]!);
      } else if (state.targetAlert < 2 && this.alertSprites[idx]) {
        this.buildingGroup.remove(this.alertSprites[idx]!);
        this.alertSprites[idx]!.material!.dispose();
        const map = (this.alertSprites[idx]!.material as THREE.SpriteMaterial).map;
        if (map) map.dispose();
        this.alertSprites[idx] = null;
      }
    });
  }

  private createAlertSprite(): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(64, 64, 52, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(64, 64, 52, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 84px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', 64, 68);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.0, 1.0, 1);
    return sprite;
  }

  /* ========== 帧更新 ========== */
  private update(): void {
    const dt = this.clock.getDelta();
    const t = this.clock.elapsedTime;
    const now = performance.now();

    if (this.buildingSlideProgress < 1) {
      this.buildingSlideProgress = Math.min(1, this.buildingSlideProgress + dt / 1.0);
      const ease = this.easeOutCubic(this.buildingSlideProgress);
      const totalH = this.FLOORS * this.FLOOR_HEIGHT;
      this.buildingGroup.position.y = -totalH * (1 - ease);
    }

    if (this.viewAnimProgress < 1) {
      this.viewAnimProgress = Math.min(1, this.viewAnimProgress + dt / 0.8);
      const ease = this.easeInOutCubic(this.viewAnimProgress);
      this.camera.position.lerpVectors(this.viewAnimFrom, this.viewAnimTo, ease);
      this.camera.lookAt(this.targetAnimTo);
    } else if (this.currentView !== 'free') {
      this.camera.lookAt(this.targetAnimTo);
    } else {
      this.controls.update();
    }

    for (let i = 0; i < this.FLOORS; i++) {
      const state = this.floorStates[i];

      state.currentEnergy += (state.targetEnergy - state.currentEnergy) * Math.min(1, dt * 3);
      state.currentPeople += (state.targetPeople - state.currentPeople) * Math.min(1, dt * 3);
      state.currentAlert = state.targetAlert;

      const canvas = this.labelCanvases[i];
      if (canvas) {
        this.updateLabelTexture(canvas, i + 1, state.currentEnergy);
      }

      const edgeMat = this.floorEdgeMaterials[i];
      if (state.currentAlert >= 2) {
        const brightness = 0.3 + (Math.sin(t * Math.PI * 2) + 1) * 0.5 * 0.7;
        edgeMat.color.setRGB(brightness, brightness * 0.2, brightness * 0.2);
        edgeMat.opacity = brightness;
        if (this.alertSprites[i]) {
          const pulse = 1 + Math.sin(t * 4) * 0.08;
          this.alertSprites[i]!.scale.set(1.0 * pulse, 1.0 * pulse, 1);
        }
      } else {
        edgeMat.color.setRGB(1, 1, 1);
        edgeMat.opacity = 0.85;
      }

      const transElapsed = now - state.heatTransitionStart;
      const tween = Math.min(1, transElapsed / this.HEAT_TRANSITION_MS);
      const easedTween = this.easeInOutCubic(tween);

      for (let k = 0; k < this.HEAT_DIV * this.HEAT_DIV; k++) {
        state.currentHeatColors[k].lerp(
          state.targetHeatColors[k],
          Math.min(1, dt * 2.5)
        );
        if (tween < 1) {
          state.currentHeatColors[k].lerp(
            state.targetHeatColors[k],
            easedTween * 0.05
          );
        }
      }

      this.updateHeatmapColors(i);
    }
  }

  private updateHeatmapColors(floorIdx: number): void {
    const geometry = this.heatmapGeometries[floorIdx];
    if (!geometry) return;
    const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute;
    const colors = colorAttr.array as Float32Array;
    const state = this.floorStates[floorIdx];
    const divs = this.HEAT_DIV;
    const vertexCount = colorAttr.count;

    for (let i = 0; i < vertexCount; i++) {
      const faceIdx = Math.floor(i / 4);
      const k = faceIdx % (divs * divs);
      const c = state.currentHeatColors[k];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    colorAttr.needsUpdate = true;
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}
