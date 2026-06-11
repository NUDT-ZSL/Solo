// ============================================================
// 应用主入口 (main.ts)
// 数据流向：
//   初始化流程：
//     DOMContentLoaded -> 创建 Gallery / Renderer / InteractionManager
//     -> 构建初始展品 -> requestAnimationFrame 启动渲染循环
//
//   每帧循环：
//     1. interaction.update() -> 获取缓动后的相机参数
//     2. gallery.update(deltaTime) -> 展品动画步进
//     3. renderer.render(gallery, camera, lights, deltaTime) -> 绘制一帧
//
//   事件流向：
//     DOM事件 -> InteractionManager回调 -> gallery/renderer 方法
// ============================================================

import { Gallery } from './gallery.js';
import { Renderer } from './renderer.js';
import { InteractionManager, type InteractionCallbacks } from './interaction.js';
import type { Camera, Light, ExhibitTemplate } from './types.js';
import type { Exhibit } from './exhibit.js';

const DEG_TO_RAD = Math.PI / 180;

const DEFAULT_CAMERA = {
  yaw: Math.PI * 0.25,
  pitch: 0.55,
  fov: 60,
  distance: 12
};

const lights: Light[] = [
  { type: 'ambient', color: '#FFFFFF', intensity: 0.45, position: { x: 0, y: 0, z: 0 } },
  { type: 'point', color: '#FFFFFF', intensity: 1.4, position: { x: 4, y: 6, z: 4 } },
  { type: 'spot', color: '#7C4DFF', intensity: 0.8, position: { x: -5, y: 4, z: -3 } },
  { type: 'point', color: '#4FC3F7', intensity: 0.6, position: { x: 0, y: 8, z: 0 } }
];

let gallery: Gallery;
let renderer: Renderer;
let interaction: InteractionManager;
let camera: Camera;
let lastFrameTime: number = 0;
let fpsCounter = 0;
let fpsTimer = 0;
let infoPanelNeedsUpdate = false;

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gallery-canvas') as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('未找到 gallery-canvas 元素');
    return;
  }

  gallery = new Gallery();
  renderer = new Renderer(canvas);
  camera = buildCameraFromSpherical(DEFAULT_CAMERA);

  const callbacks: InteractionCallbacks = buildInteractionCallbacks();
  interaction = new InteractionManager(
    canvas,
    gallery,
    renderer,
    callbacks,
    { ...DEFAULT_CAMERA }
  );

  buildTemplateLibraryUI();
  lastFrameTime = performance.now();
  requestAnimationFrame(renderLoop);
  updateInfoPanel();
  updateControlPanel();
});

function buildInteractionCallbacks(): InteractionCallbacks {
  return {
    onCameraRotateDelta: (_dyaw, _dpitch) => {},
    onCameraFovDelta: (_delta) => {},
    onClickExhibit: (id) => {
      gallery.selectExhibit(id);
      infoPanelNeedsUpdate = true;
    },
    onCanvasToWorldPick: (sx, sy) => pickExhibitAtScreen(sx, sy),
    onToggleRotation: () => {
      if (gallery.toggleSelectedRotation()) {
        infoPanelNeedsUpdate = true;
        updateControlPanel();
      }
    },
    onDeleteSelected: () => {
      gallery.removeSelected();
      infoPanelNeedsUpdate = true;
    },
    onMoveSelected: (forward, right, up) => {
      const yaw = interaction.getCurrentCameraYaw();
      gallery.moveSelectedByStep(forward, right, up, yaw);
      infoPanelNeedsUpdate = true;
    },
    onRotateSelectedDelta: (dry) => gallery.rotateSelected(0, dry, 0),
    onSetRotationSpeed: (speed) => gallery.setSelectedRotationSpeed(speed),
    onAddTemplateAtFreeSlot: (template) => gallery.addExhibitFromTemplate(template),
    onSaveLayout: () => {
      const camAny = interaction as unknown as Record<string, unknown>;
      const cc = (camAny.currentCamera as typeof DEFAULT_CAMERA) ?? {
        yaw: camera.yaw,
        pitch: camera.pitch,
        fov: camera.fov,
        distance: DEFAULT_CAMERA.distance
      };
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      gallery.downloadLayoutAsJson(`光之橱窗-${ts}.json`, cc.yaw, cc.pitch, cc.fov, cc.distance);
    },
    onLoadLayoutJson: (text) => {
      const cam = gallery.parseAndLoadLayout(text);
      if (cam) {
        interaction.setCameraTarget(cam.yaw, cam.pitch, cam.fov, cam.distance);
        camera = buildCameraFromSpherical(cam);
        infoPanelNeedsUpdate = true;
      }
    },
    onResetGallery: () => {
      gallery.clearAll();
      const templates = Gallery.getBuiltinTemplates();
      const slots = gallery.getPlatformSlots();
      for (let i = 0; i < Math.min(templates.length, slots.length); i++) {
        gallery.placeTemplateOnSlot(templates[i], i);
      }
      interaction.setCameraTarget(DEFAULT_CAMERA.yaw, DEFAULT_CAMERA.pitch, DEFAULT_CAMERA.fov, DEFAULT_CAMERA.distance);
      infoPanelNeedsUpdate = true;
    },
    onCameraYaw: () => interaction.getCurrentCameraYaw(),
    onSetMouseNdc: (x, y) => {
      renderer.mouseNdcX = x;
      renderer.mouseNdcY = y;
    },
    onRequestExhibitAtSlot: (template, slot) => gallery.placeTemplateOnSlot(template, slot)
  };
}

function pickExhibitAtScreen(sx: number, sy: number): string | null {
  let bestId: string | null = null;
  let bestDist = Infinity;
  const canvas = document.getElementById('gallery-canvas') as HTMLCanvasElement;
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  for (const ex of gallery.getExhibits()) {
    const proj = projectExhibitCenter(ex, camera, cw, ch);
    if (!proj) continue;
    const dx = proj.x - sx;
    const dy = proj.y - sy;
    const d = Math.hypot(dx, dy);
    const threshold = Math.max(40, proj.r * 1.3);
    if (d < threshold && d < bestDist) {
      bestDist = d;
      bestId = ex.id;
    }
  }
  return bestId;
}

function projectExhibitCenter(
  ex: Exhibit, cam: Camera, w: number, h: number
): { x: number; y: number; r: number } | null {
  const p = { x: ex.position.x, y: ex.position.y + 0.5, z: ex.position.z };
  const dx = p.x - cam.position.x;
  const dy = p.y - cam.position.y;
  const dz = p.z - cam.position.z;
  const cy = Math.cos(-cam.yaw), sy = Math.sin(-cam.yaw);
  const rx = dx * cy + dz * sy;
  const rz = -dx * sy + dz * cy;
  const cp = Math.cos(-cam.pitch), sp = Math.sin(-cam.pitch);
  const ry = dy * cp - rz * sp;
  const fz = dy * sp + rz * cp;
  if (fz <= cam.near) return null;
  const f = (h * 0.5) / Math.tan((cam.fov * DEG_TO_RAD) * 0.5);
  return {
    x: w * 0.5 + (rx / fz) * f,
    y: h * 0.5 - (ry / fz) * f,
    r: (ex.boundingRadius * f) / fz
  };
}

function buildCameraFromSpherical(
  sph: { yaw: number; pitch: number; fov: number; distance: number }
): Camera {
  const px = Math.sin(sph.yaw) * Math.cos(sph.pitch) * sph.distance;
  const py = Math.sin(sph.pitch) * sph.distance + 1.5;
  const pz = Math.cos(sph.yaw) * Math.cos(sph.pitch) * sph.distance;
  return {
    position: { x: px, y: py, z: pz },
    target: { x: 0, y: 0.5, z: 0 },
    fov: sph.fov,
    near: 0.1,
    far: 200,
    yaw: sph.yaw,
    pitch: sph.pitch,
    distance: sph.distance
  };
}

function renderLoop(t: number): void {
  void t;
  const now = performance.now();
  const deltaTime = Math.min(0.05, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  fpsCounter++;
  fpsTimer += deltaTime;
  if (fpsTimer >= 1) {
    const fps = Math.round(fpsCounter / fpsTimer);
    const el = document.getElementById('fps-counter');
    if (el) el.textContent = fps.toString() + ' FPS';
    fpsCounter = 0;
    fpsTimer = 0;
  }

  const camResult = interaction.update(deltaTime, camera);
  camera = buildCameraFromSpherical(camResult);
  gallery.update(deltaTime);
  renderer.render(gallery, camera, lights, deltaTime);

  if (infoPanelNeedsUpdate) {
    infoPanelNeedsUpdate = false;
    updateInfoPanel();
    updateControlPanel();
  }

  requestAnimationFrame(renderLoop);
}

function buildTemplateLibraryUI(): void {
  const container = document.getElementById('template-grid');
  if (!container) return;
  const templates = Gallery.getBuiltinTemplates();
  container.innerHTML = '';
  for (const tpl of templates) {
    const card = document.createElement('div');
    card.className = 'template-card';
    card.setAttribute('data-template-id', tpl.id);
    card.setAttribute('draggable', 'true');
    card.innerHTML = `
      <div class="template-thumb" data-template-thumb="${tpl.id}"></div>
      <div class="template-meta">
        <div class="template-name">${tpl.name}</div>
        <div class="template-desc">${tpl.description}</div>
      </div>
      <button class="template-add-btn" data-template-action="add" type="button">+ 添加</button>
    `;
    container.appendChild(card);
    const thumb = card.querySelector('[data-template-thumb]') as HTMLElement;
    if (thumb) drawTemplateThumbnail(thumb, tpl);
  }
}

function drawTemplateThumbnail(el: HTMLElement, tpl: ExhibitTemplate): void {
  const cvs = document.createElement('canvas');
  cvs.width = 160;
  cvs.height = 160;
  const ctx = cvs.getContext('2d');
  if (!ctx) return;
  const w = cvs.width;
  const h = cvs.height;
  const bg = ctx.createRadialGradient(w / 2, h / 2, 5, w / 2, h / 2, w / 2);
  bg.addColorStop(0, '#1C1B33');
  bg.addColorStop(1, '#0A1128');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2;
  let y = h * 0.78;
  for (let i = tpl.parts.length - 1; i >= 0; i--) {
    const p = tpl.parts[i];
    const size = 16 + (p.scale.x + p.scale.y + p.scale.z) * 8;
    y -= size * 0.5;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = 0.9;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    if (p.type === 'sphere') {
      ctx.beginPath();
      ctx.arc(cx, y, size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'cone') {
      ctx.beginPath();
      ctx.moveTo(cx, y - size * 0.5);
      ctx.lineTo(cx - size * 0.5, y + size * 0.4);
      ctx.lineTo(cx + size * 0.5, y + size * 0.4);
      ctx.closePath();
      ctx.fill();
    } else if (p.type === 'torus') {
      ctx.lineWidth = size * 0.2;
      ctx.strokeStyle = p.color;
      ctx.beginPath();
      ctx.arc(cx, y, size * 0.4, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillRect(cx - size * 0.5, y - size * 0.4, size, size * 0.8);
    }
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  const grad = ctx.createRadialGradient(cx, h * 0.3, 0, cx, h * 0.3, w * 0.5);
  grad.addColorStop(0, 'rgba(124,77,255,0.3)');
  grad.addColorStop(1, 'rgba(79,195,247,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  el.style.backgroundImage = `url(${cvs.toDataURL()})`;
  el.style.backgroundSize = 'cover';
}

function updateInfoPanel(): void {
  const panel = document.getElementById('info-panel-content');
  if (!panel) return;
  const ex = gallery.getSelectedExhibit();
  if (!ex) {
    panel.innerHTML = `
      <div class="info-empty">
        <div class="info-empty-icon">◇</div>
        <div class="info-empty-title">未选中展品</div>
        <div class="info-empty-desc">点击展厅中的展品查看详情<br>或从右侧模板库拖入新展品</div>
      </div>
    `;
    return;
  }
  const partsHtml = ex.parts.map(p => `
    <div class="part-row">
      <span class="color-swatch" style="background:${p.color}"></span>
      <span class="part-name">${geometryName(p.type)}</span>
      <span class="part-color-hex">${p.color.toUpperCase()}</span>
      <span class="part-material">${materialName(p.material)}</span>
    </div>
  `).join('');
  panel.innerHTML = `
    <div class="info-header">
      <h3 class="info-title">${escapeHtml(ex.name)}</h3>
      <div class="info-id">${ex.id.slice(0, 18)}</div>
    </div>
    <div class="info-section">
      <div class="info-row"><span class="info-label">位置</span>
        <span class="info-val mono">X:${ex.position.x.toFixed(2)}  Y:${ex.position.y.toFixed(2)}  Z:${ex.position.z.toFixed(2)}</span>
      </div>
      <div class="info-row"><span class="info-label">旋转</span>
        <span class="info-val mono">X:${formatAngle(ex.rotation.x)}  Y:${formatAngle(ex.rotation.y)}  Z:${formatAngle(ex.rotation.z)}</span>
      </div>
      <div class="info-row"><span class="info-label">自转</span>
        <span class="info-val ${ex.isRotating ? 'on' : 'off'}">${ex.isRotating ? `开启 ${ex.rotationSpeed.toFixed(1)}°/帧` : '关闭'}</span>
      </div>
      <div class="info-row"><span class="info-label">缩放</span>
        <span class="info-val mono">${ex.scale.toFixed(2)}x</span>
      </div>
    </div>
    <div class="info-section">
      <h4 class="info-subtitle">组成几何体 (${ex.parts.length})</h4>
      <div class="parts-grid">${partsHtml}</div>
    </div>
    <div class="info-tips">
      <div class="tip-row"><kbd>W A S D</kbd> 平面移动</div>
      <div class="tip-row"><kbd>Q / E</kbd> 上下移动</div>
      <div class="tip-row"><kbd>R</kbd> 自转开关</div>
      <div class="tip-row"><kbd>D</kbd> 删除展品</div>
    </div>
  `;
}

function updateControlPanel(): void {
  const ex = gallery.getSelectedExhibit();
  const speedSlider = document.getElementById('rotation-speed') as HTMLInputElement | null;
  if (speedSlider && ex) speedSlider.value = ex.rotationSpeed.toString();
  const rotToggle = document.getElementById('rot-toggle-indicator');
  if (rotToggle) rotToggle.textContent = ex?.isRotating ? '● 旋转中' : '○ 已停止';
}

function geometryName(t: string): string {
  return ({ cube: '立方体', sphere: '球体', cone: '圆锥', cylinder: '圆柱', torus: '圆环' } as Record<string, string>)[t] ?? t;
}

function materialName(m: string): string {
  return ({ metal: '金属', glass: '磨砂玻璃', matte: '哑光' } as Record<string, string>)[m] ?? m;
}

function formatAngle(rad: number): string {
  const deg = rad * 180 / Math.PI;
  const normalized = ((deg % 360) + 360) % 360;
  return normalized.toFixed(1) + '°';
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  } as Record<string, string>)[c] ?? c);
}
