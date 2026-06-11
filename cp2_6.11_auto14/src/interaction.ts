// ============================================================
// 用户交互处理模块 (InteractionManager)
// 数据流向：
//   1. 监听 DOM 事件（鼠标、键盘、触摸、拖拽）
//   2. 通过回调接口将操作传递给 main.ts
//   3. main.ts 再调用 gallery.ts / renderer.ts 的方法
// 职责：
//   - 鼠标拖拽旋转整个展厅视角（带0.5秒缓动过渡）
//   - 点击选中展品 / 滚轮缩放（30-120度限制）
//   - 键盘：R 旋转、D 删除、WASD XZ移动、Q/E 上下移动
//   - 右侧模板库的 dragstart / drop 拖拽功能
//   - 保存/加载布局 JSON
//   - 视角切换0.5秒平滑缓动插值
// ============================================================

import type { ExhibitTemplate, Camera } from './types.js';
import { Gallery } from './gallery.js';
import { Renderer } from './renderer.js';

const DEG_TO_RAD = Math.PI / 180;
const CAMERA_TRANSITION_SEC = 0.5;
const MIN_FOV = 30;
const MAX_FOV = 120;
const MIN_PITCH = 0.05;
const MAX_PITCH = Math.PI / 2 - 0.15;
const MOVE_STEP = 0.2;

export interface InteractionCallbacks {
  onCameraRotateDelta: (dyaw: number, dpitch: number) => void;
  onCameraFovDelta: (delta: number) => void;
  onClickExhibit: (id: string | null) => void;
  onCanvasToWorldPick: (screenX: number, screenY: number) => string | null;
  onToggleRotation: () => void;
  onDeleteSelected: () => void;
  onMoveSelected: (forward: number, right: number, up: number) => void;
  onRotateSelectedDelta: (dry: number) => void;
  onSetRotationSpeed: (speed: number) => void;
  onAddTemplateAtFreeSlot: (template: ExhibitTemplate) => void;
  onSaveLayout: () => void;
  onLoadLayoutJson: (text: string) => void;
  onResetGallery: () => void;
  onCameraYaw: () => number;
  onSetMouseNdc: (ndcX: number, ndcY: number) => void;
  onRequestExhibitAtSlot: (template: ExhibitTemplate, slotIndex: number) => void;
}

export class InteractionManager {
  private canvas: HTMLCanvasElement;
  private cb: InteractionCallbacks;
  private gallery: Gallery;
  private renderer: Renderer;

  // 相机平滑过渡状态
  private cameraStart: { yaw: number; pitch: number; fov: number; distance: number } | null = null;
  private cameraTarget: { yaw: number; pitch: number; fov: number; distance: number };
  private cameraProgress: number = 1;
  private currentCamera: { yaw: number; pitch: number; fov: number; distance: number };

  // 鼠标拖拽状态
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private mouseDownTime: number = 0;
  private dragMoved: boolean = false;

  // 键盘状态（连续按键支持）
  private keyState: Map<string, boolean> = new Map();

  constructor(
    canvas: HTMLCanvasElement,
    gallery: Gallery,
    renderer: Renderer,
    callbacks: InteractionCallbacks,
    initialCamera: { yaw: number; pitch: number; fov: number; distance: number }
  ) {
    this.canvas = canvas;
    this.cb = callbacks;
    this.gallery = gallery;
    this.renderer = renderer;
    this.currentCamera = { ...initialCamera };
    this.cameraTarget = { ...initialCamera };
    this.attachCanvasEvents();
    this.attachKeyboardEvents();
    this.attachTemplateDragEvents();
    this.attachLayoutFileEvents();
    this.attachControlPanelEvents();
    this.attachWindowEvents();
  }

  // ------------------------------------------------------------
  // 每帧推进：由 main.ts 的渲染循环调用
  // ------------------------------------------------------------

  public update(deltaTime: number, camera: Camera): { yaw: number; pitch: number; fov: number; distance: number } {
    // 连续按键移动（WASD / QE）
    this.applyHeldKeys(deltaTime);

    // 相机缓动过渡
    if (this.cameraProgress < 1) {
      this.cameraProgress = Math.min(1, this.cameraProgress + deltaTime / CAMERA_TRANSITION_SEC);
      const prev = this.cameraStart ?? this.currentCamera;
      const result = Renderer.interpolateCamera(prev, this.cameraTarget, this.cameraProgress);
      this.currentCamera = result;
      return result;
    }
    return this.currentCamera;
  }

  // ------------------------------------------------------------
  // 设置相机目标值（启动0.5秒缓动）
  // ------------------------------------------------------------

  public setCameraTarget(yaw: number, pitch: number, fov: number, distance: number): void {
    this.cameraStart = { ...this.currentCamera };
    this.cameraTarget = {
      yaw,
      pitch: Math.max(MIN_PITCH, Math.min(MAX_PITCH, pitch)),
      fov: Math.max(MIN_FOV, Math.min(MAX_FOV, fov)),
      distance
    };
    this.cameraProgress = 0;
  }

  public adjustCameraTargetByDelta(dyaw: number, dpitch: number, dfov: number = 0): void {
    const cur = this.cameraProgress < 1 ? this.cameraTarget : this.currentCamera;
    this.setCameraTarget(
      cur.yaw + dyaw,
      cur.pitch + dpitch,
      Math.max(MIN_FOV, Math.min(MAX_FOV, cur.fov + dfov)),
      cur.distance
    );
  }

  public getCurrentCameraYaw(): number {
    return this.currentCamera.yaw;
  }

  // ------------------------------------------------------------
  // 鼠标事件：Canvas区域
  // ------------------------------------------------------------

  private attachCanvasEvents(): void {
    const canvas = this.canvas;

    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.mouseDownTime = performance.now();
      this.dragMoved = false;
    });

    window.addEventListener('mouseup', (e) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      if (!this.dragMoved && e.target === canvas) {
        // 点击（非拖拽）- 进行射线选中
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const id = this.cb.onCanvasToWorldPick(sx, sy);
        this.cb.onClickExhibit(id);
      }
    });

    window.addEventListener('mousemove', (e) => {
      // 更新鼠标NDC位置（背景渐变移动）
      const rect = canvas.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      this.cb.onSetMouseNdc(ndcX, ndcY);

      if (!this.isDragging) return;
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      if (Math.abs(dx) + Math.abs(dy) > 3) this.dragMoved = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      // 将像素增量转为弧度
      const dyaw = -dx * 0.005;
      const dpitch = -dy * 0.004;
      this.adjustCameraTargetByDelta(dyaw, dpitch, 0);
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 3 : -3;
      this.adjustCameraTargetByDelta(0, 0, delta);
    }, { passive: false });
  }

  // ------------------------------------------------------------
  // 键盘事件：R旋转、D删除、WASD移动XZ、Q/E上下
  // ------------------------------------------------------------

  private attachKeyboardEvents(): void {
    window.addEventListener('keydown', (e) => {
      if (this.isInputFocused(e)) return;
      const key = e.key.toLowerCase();
      this.keyState.set(key, true);

      // 单次触发
      if (key === 'r') {
        e.preventDefault();
        this.cb.onToggleRotation();
      } else if (key === 'd') {
        e.preventDefault();
        if (this.gallery.getSelectedExhibit()) {
          this.cb.onDeleteSelected();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keyState.set(e.key.toLowerCase(), false);
    });

    window.addEventListener('blur', () => {
      this.keyState.clear();
    });
  }

  // 连续按键步进移动
  private applyHeldKeys(deltaTime: number): void {
    const ex = this.gallery.getSelectedExhibit();
    if (!ex) return;

    let forward = 0, right = 0, up = 0;
    const stepFactor = MOVE_STEP * Math.min(deltaTime * 10, 1.5);
    if (this.keyState.get('w')) forward += stepFactor;
    if (this.keyState.get('s')) forward -= stepFactor;
    if (this.keyState.get('d')) right += stepFactor;
    if (this.keyState.get('a')) right -= stepFactor;
    if (this.keyState.get('e')) up += stepFactor;
    if (this.keyState.get('q')) up -= stepFactor;

    if (forward !== 0 || right !== 0 || up !== 0) {
      // 使用步长模式，每按键一次至少0.2单位
      this.cb.onMoveSelected(forward, right, up);
    }
  }

  private isInputFocused(e: Event): boolean {
    const t = e.target as HTMLElement | null;
    if (!t) return false;
    const tag = t.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || t.isContentEditable;
  }

  // ------------------------------------------------------------
  // 模板库拖拽功能（HTML5 DnD）
  // 数据流向：模板元素 dragstart -> Canvas drop -> gallery.addExhibit()
  // ------------------------------------------------------------

  private attachTemplateDragEvents(): void {
    // 绑定模板卡片的 dragstart
    document.addEventListener('dragstart', (e) => {
      const target = e.target as HTMLElement;
      const card = target.closest('[data-template-id]') as HTMLElement | null;
      if (!card || !e.dataTransfer) return;
      const templateId = card.getAttribute('data-template-id') ?? '';
      e.dataTransfer.setData('application/x-template-id', templateId);
      e.dataTransfer.effectAllowed = 'copy';
      // 拖拽视觉反馈
      card.classList.add('is-dragging');
    });

    document.addEventListener('dragend', (e) => {
      const target = e.target as HTMLElement;
      const card = target.closest('[data-template-id]') as HTMLElement | null;
      if (card) card.classList.remove('is-dragging');
    });

    // 防止 dragenter/dragover 默认行为，允许 drop
    this.canvas.addEventListener('dragenter', (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      this.canvas.classList.add('drop-target-active');
    });
    this.canvas.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    });
    this.canvas.addEventListener('dragleave', (e) => {
      if (e.target === this.canvas) this.canvas.classList.remove('drop-target-active');
    });

    // Canvas 区域 drop：放置到下一个空闲展台
    this.canvas.addEventListener('drop', (e) => {
      e.preventDefault();
      this.canvas.classList.remove('drop-target-active');
      const templateId = e.dataTransfer?.getData('application/x-template-id') ?? '';
      if (!templateId) return;
      const template = Gallery.getBuiltinTemplates().find(t => t.id === templateId);
      if (!template) return;

      // 判断 drop 位置是否在某个展品位附近，是则替换；否则放下一个空位
      const rect = this.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const slot = this.pickSlotByScreen(sx, sy);
      if (slot >= 0) {
        this.cb.onRequestExhibitAtSlot(template, slot);
      } else {
        this.cb.onAddTemplateAtFreeSlot(template);
      }
    });

    // 模板卡片点击也可添加
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const btn = target.closest('[data-template-action="add"]') as HTMLElement | null;
      const card = target.closest('[data-template-id]') as HTMLElement | null;
      if (btn && card) {
        const id = card.getAttribute('data-template-id') ?? '';
        const tpl = Gallery.getBuiltinTemplates().find(t => t.id === id);
        if (tpl) this.cb.onAddTemplateAtFreeSlot(tpl);
      }
    });
  }

  // 屏幕坐标命中最近的展品位
  private pickSlotByScreen(sx: number, sy: number): number {
    const slots = this.gallery.getPlatformSlots();
    let bestIdx = -1;
    let bestDist = Infinity;
    const cam = this.getCurrentCameraProxy();
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    for (let i = 0; i < slots.length; i++) {
      const proj = this.projectPoint({ x: slots[i].x, y: -0.5, z: slots[i].z }, cam, w, h);
      if (!proj) continue;
      const dx = proj.x - sx;
      const dy = proj.y - sy;
      const d = Math.hypot(dx, dy);
      if (d < 100 && d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  private getCurrentCameraProxy(): Camera {
    return {
      position: { x: 0, y: 0, z: 0 },
      target: { x: 0, y: 0, z: 0 },
      fov: this.currentCamera.fov,
      near: 0.1,
      far: 100,
      yaw: this.currentCamera.yaw,
      pitch: this.currentCamera.pitch,
      distance: this.currentCamera.distance
    };
  }

  private projectPoint(p: { x: number; y: number; z: number }, cam: Camera, w: number, h: number): { x: number; y: number } | null {
    // 简化投影（与 renderer 保持一致）
    const camPos = {
      x: Math.sin(cam.yaw) * Math.cos(cam.pitch) * cam.distance,
      y: Math.sin(cam.pitch) * cam.distance + 1.5,
      z: Math.cos(cam.yaw) * Math.cos(cam.pitch) * cam.distance
    };
    const dx = p.x - camPos.x;
    const dy = p.y - camPos.y;
    const dz = p.z - camPos.z;
    const cy = Math.cos(-cam.yaw), sy = Math.sin(-cam.yaw);
    const rx = dx * cy + dz * sy;
    const rz = -dx * sy + dz * cy;
    const cp = Math.cos(-cam.pitch), sp = Math.sin(-cam.pitch);
    const ry = dy * cp - rz * sp;
    const fz = dy * sp + rz * cp;
    if (fz <= 0.1) return null;
    const f = (h * 0.5) / Math.tan((cam.fov * DEG_TO_RAD) * 0.5);
    return {
      x: w * 0.5 + (rx / fz) * f,
      y: h * 0.5 - (ry / fz) * f
    };
  }

  // ------------------------------------------------------------
  // 保存/加载布局（拖入JSON文件 + 按钮）
  // ------------------------------------------------------------

  private attachLayoutFileEvents(): void {
    // 拖入JSON文件到页面即可加载
    window.addEventListener('dragover', (e) => {
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }
    });
    window.addEventListener('drop', (e) => {
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;
      const jsonFile = Array.from(files).find(f =>
        f.name.endsWith('.json') || f.type === 'application/json'
      );
      if (jsonFile) {
        e.preventDefault();
        const reader = new FileReader();
        reader.onload = () => {
          const text = typeof reader.result === 'string' ? reader.result : '';
          if (text) this.cb.onLoadLayoutJson(text);
        };
        reader.readAsText(jsonFile);
      }
    });

    // 显式文件选择（隐藏 input + 按钮触发）
    document.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t.matches('[data-action="load-layout"]')) {
        e.preventDefault();
        const input = document.getElementById('layout-file-input') as HTMLInputElement | null;
        if (input) input.click();
      }
    });
    document.addEventListener('change', (e) => {
      const t = e.target as HTMLInputElement;
      if (t.matches('#layout-file-input')) {
        const file = t.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            const text = typeof reader.result === 'string' ? reader.result : '';
            if (text) this.cb.onLoadLayoutJson(text);
          };
          reader.readAsText(file);
        }
        t.value = '';
      }
    });

    // 保存按钮
    document.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t.matches('[data-action="save-layout"]')) {
        e.preventDefault();
        this.cb.onSaveLayout();
      } else if (t.matches('[data-action="reset-gallery"]')) {
        e.preventDefault();
        this.cb.onResetGallery();
      }
    });
  }

  // ------------------------------------------------------------
  // 控制面板事件（转速滑块等）
  // ------------------------------------------------------------

  private attachControlPanelEvents(): void {
    document.addEventListener('input', (e) => {
      const t = e.target as HTMLInputElement;
      if (t.matches('#rotation-speed')) {
        const v = parseFloat(t.value);
        if (!Number.isNaN(v)) this.cb.onSetRotationSpeed(v);
      }
    });
  }

  private attachWindowEvents(): void {
    window.addEventListener('resize', () => {
      this.renderer.resize();
    });
  }
}
