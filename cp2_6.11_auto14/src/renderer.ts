// ============================================================
// Canvas 2D 3D 渲染器 (Renderer)
// 数据流向：
//   1. 被 main.ts 创建并持有（main.ts -> new Renderer()）
//   2. main.ts 每帧调用 render(gallery, camera, ...) 进行绘制
//   3. 本类从 gallery.getExhibits() 读取场景数据进行投影
//   4. 输出到 Canvas 2D 上下文
// 职责：
//   - 3D透视投影（针孔相机模型）
//   - 简单光照模型（环境光+漫反射）
//   - Z-buffer（按深度排序实现）
//   - 半透明光晕、地板反射效果
//   - 展品高亮：金橙->暖红 渐变缓动闪烁(1.5秒)
// ============================================================

import { Gallery } from './gallery.js';
import { Exhibit } from './exhibit.js';
import type { Vec3, Camera, Light, GeometryType, GeometryPart } from './types.js';

const DEG_TO_RAD = Math.PI / 180;

// ------------------------------------------------------------
// 高亮动画参数：金橙(#FFA726) -> 暖红(#FF5252)，渐变缓动闪烁，周期1.5秒
// ------------------------------------------------------------
const HIGHLIGHT_COLOR_START = { r: 0xff, g: 0xa7, b: 0x26 };
const HIGHLIGHT_COLOR_END = { r: 0xff, g: 0x52, b: 0x52 };
const HIGHLIGHT_PERIOD_SEC = 1.5;

interface RenderFace {
  points: { x: number; y: number }[];
  avgZ: number;
  fillStyle: string | CanvasGradient;
  strokeStyle: string;
  strokeWidth: number;
  alpha: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private width: number = 0;
  private height: number = 0;
  private highlightTime: number = 0;

  // 鼠标位置驱动渐变背景
  public mouseNdcX: number = 0;
  public mouseNdcY: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas 2D上下文');
    this.ctx = ctx;
    this.resize();
  }

  public resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const cssW = this.canvas.clientWidth || 800;
    const cssH = this.canvas.clientHeight || 600;
    this.canvas.width = Math.floor(cssW * dpr);
    this.canvas.height = Math.floor(cssH * dpr);
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ------------------------------------------------------------
  // 主渲染入口
  // 数据流向：main.ts -> renderer.render()
  // ------------------------------------------------------------

  public render(gallery: Gallery, camera: Camera, lights: Light[], deltaTime: number): void {
    this.highlightTime += deltaTime;
    const ctx = this.ctx;
    const cssW = this.canvas.clientWidth;
    const cssH = this.canvas.clientHeight;

    this.drawBackground(cssW, cssH);
    this.drawFloorReflection(gallery, camera, lights, cssW, cssH);
    this.drawPlatforms(gallery, camera, cssW, cssH);
    this.drawCentralLightPillar(gallery, camera, cssW, cssH);
    this.drawExhibits(gallery, camera, lights, cssW, cssH);
  }

  // ------------------------------------------------------------
  // 背景：夜蓝到暗紫径向渐变，中心随鼠标轻微移动
  // ------------------------------------------------------------

  private drawBackground(w: number, h: number): void {
    const ctx = this.ctx;
    const cx = w * 0.5 + this.mouseNdcX * w * 0.08;
    const cy = h * 0.45 + this.mouseNdcY * h * 0.06;
    const r = Math.max(w, h) * 0.8;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, '#1C1B33');
    grad.addColorStop(1, '#0A1128');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 星空点缀
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for (let i = 0; i < 60; i++) {
      const sx = ((i * 127.1) % 1) * w;
      const sy = ((i * 311.7) % 1) * h * 0.7;
      const size = 0.6 + ((i * 7.3) % 1) * 1.4;
      const twinkle = 0.5 + 0.5 * Math.sin(this.highlightTime * 2 + i);
      ctx.globalAlpha = 0.25 + 0.5 * twinkle;
      ctx.fillRect(sx, sy, size, size);
    }
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------
  // 展台（圆盘地面标记）
  // ------------------------------------------------------------

  private drawPlatforms(gallery: Gallery, camera: Camera, w: number, h: number): void {
    const ctx = this.ctx;
    const slots = gallery.getPlatformSlots();
    for (const slot of slots) {
      const center = this.project({ x: slot.x, y: -0.9, z: slot.z }, camera, w, h);
      if (!center) continue;
      const size = this.computeScreenScale(slot.z, camera, h) * 1.2;

      // 展台圆盘
      const grad = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, size);
      grad.addColorStop(0, 'rgba(124, 77, 255, 0.35)');
      grad.addColorStop(0.5, 'rgba(79, 195, 247, 0.18)');
      grad.addColorStop(1, 'rgba(79, 195, 247, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(center.x, center.y, size, size * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // 圆环
      ctx.strokeStyle = 'rgba(79, 195, 247, 0.5)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(center.x, center.y, size * 0.9, size * 0.36, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // ------------------------------------------------------------
  // 中央光柱
  // ------------------------------------------------------------

  private drawCentralLightPillar(gallery: Gallery, camera: Camera, w: number, h: number): void {
    const ctx = this.ctx;
    const t = gallery.getLightAnimationTime();
    const bottom = this.project({ x: 0, y: -1.0, z: 0 }, camera, w, h);
    const top = this.project({ x: 0, y: 3.0, z: 0 }, camera, w, h);
    if (!bottom || !top) return;

    const widthBottom = this.computeScreenScale(0.2, camera, h) * 1.5;
    const widthTop = this.computeScreenScale(3.0, camera, h) * 0.8;
    const pulse = 0.7 + 0.3 * Math.sin(t * 1.5);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // 外层宽柱
    const gradOut = ctx.createLinearGradient(top.x, top.y, bottom.x, bottom.y);
    gradOut.addColorStop(0, `rgba(79, 195, 247, ${0.08 * pulse})`);
    gradOut.addColorStop(0.5, `rgba(124, 77, 255, ${0.14 * pulse})`);
    gradOut.addColorStop(1, `rgba(79, 195, 247, ${0.05 * pulse})`);
    ctx.fillStyle = gradOut;
    ctx.beginPath();
    ctx.moveTo(top.x - widthTop, top.y);
    ctx.lineTo(top.x + widthTop, top.y);
    ctx.lineTo(bottom.x + widthBottom, bottom.y);
    ctx.lineTo(bottom.x - widthBottom, bottom.y);
    ctx.closePath();
    ctx.fill();

    // 内核亮柱
    const gradIn = ctx.createLinearGradient(top.x, top.y, bottom.x, bottom.y);
    gradIn.addColorStop(0, `rgba(186, 229, 255, ${0.18 * pulse})`);
    gradIn.addColorStop(0.5, `rgba(224, 206, 255, ${0.28 * pulse})`);
    gradIn.addColorStop(1, `rgba(255, 255, 255, ${0.12 * pulse})`);
    ctx.fillStyle = gradIn;
    ctx.beginPath();
    ctx.moveTo(top.x - widthTop * 0.3, top.y);
    ctx.lineTo(top.x + widthTop * 0.3, top.y);
    ctx.lineTo(bottom.x + widthBottom * 0.35, bottom.y);
    ctx.lineTo(bottom.x - widthBottom * 0.35, bottom.y);
    ctx.closePath();
    ctx.fill();

    // 地面光环
    const floorCenter = this.project({ x: 0, y: -0.98, z: 0 }, camera, w, h);
    if (floorCenter) {
      const r = this.computeScreenScale(-0.98, camera, h) * 2.0;
      const ringGrad = ctx.createRadialGradient(floorCenter.x, floorCenter.y, 0, floorCenter.x, floorCenter.y, r);
      ringGrad.addColorStop(0, 'rgba(124, 77, 255, 0)');
      ringGrad.addColorStop(0.55, `rgba(79, 195, 247, ${0.35 * pulse})`);
      ringGrad.addColorStop(0.75, `rgba(186, 229, 255, ${0.5 * pulse})`);
      ringGrad.addColorStop(1, 'rgba(79, 195, 247, 0)');
      ctx.fillStyle = ringGrad;
      ctx.beginPath();
      ctx.ellipse(floorCenter.x, floorCenter.y, r, r * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // ------------------------------------------------------------
  // 地板反射
  // ------------------------------------------------------------

  private drawFloorReflection(gallery: Gallery, camera: Camera, lights: Light[], w: number, h: number): void {
    const exhibits = gallery.getExhibits();
    if (exhibits.length === 0) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.32;

    // 对每个展品创建倒影（Y轴镜像）
    const faces: RenderFace[] = [];
    for (const ex of exhibits) {
      const mirrorEx = {
        ...ex,
        position: { x: ex.position.x, y: -ex.position.y - 2.0, z: ex.position.z },
        rotation: { x: -ex.rotation.x, y: ex.rotation.y, z: ex.rotation.z }
      } as Exhibit;
      const refFaces = this.collectExhibitFaces(mirrorEx, camera, lights, w, h, true);
      faces.push(...refFaces);
    }
    faces.sort((a, b) => b.avgZ - a.avgZ);
    for (const f of faces) this.drawFace(f);

    // 地板平面蒙层
    ctx.restore();
    const horizon = h * 0.58;
    const floorGrad = ctx.createLinearGradient(0, horizon, 0, h);
    floorGrad.addColorStop(0, 'rgba(10, 17, 40, 0.25)');
    floorGrad.addColorStop(1, 'rgba(124, 77, 255, 0.08)');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, horizon, w, h - horizon);

    // 网格线
    ctx.strokeStyle = 'rgba(79, 195, 247, 0.08)';
    ctx.lineWidth = 1;
    const gridN = 10;
    for (let i = -gridN; i <= gridN; i++) {
      const a = this.project({ x: i * 1.2, y: -1.0, z: -gridN * 1.2 }, camera, w, h);
      const b = this.project({ x: i * 1.2, y: -1.0, z: gridN * 1.2 }, camera, w, h);
      if (a && b) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      const c = this.project({ x: -gridN * 1.2, y: -1.0, z: i * 1.2 }, camera, w, h);
      const d = this.project({ x: gridN * 1.2, y: -1.0, z: i * 1.2 }, camera, w, h);
      if (c && d) {
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(d.x, d.y);
        ctx.stroke();
      }
    }
  }

  // ------------------------------------------------------------
  // 展品渲染（含高亮闪烁动画）
  // ------------------------------------------------------------

  private drawExhibits(gallery: Gallery, camera: Camera, lights: Light[], w: number, h: number): void {
    const exhibits = gallery.getExhibits();
    const ctx = this.ctx;

    // 收集所有面
    const faces: RenderFace[] = [];
    for (const ex of exhibits) {
      faces.push(...this.collectExhibitFaces(ex, camera, lights, w, h, false));
    }
    faces.sort((a, b) => b.avgZ - a.avgZ);
    for (const f of faces) this.drawFace(f);

    // 选中高亮描边（在所有展品之上叠加）
    for (const ex of exhibits) {
      if (ex.selected) {
        this.drawHighlightOutline(ex, camera, w, h);
      }
      this.drawExhibitShadow(ex, camera, w, h);
      this.drawExhibitHalo(ex, camera, w, h);
    }
  }

  // ------------------------------------------------------------
  // 高亮描边：金橙(#FFA726) -> 暖红(#FF5252) 渐变缓动闪烁，周期1.5秒
  // ------------------------------------------------------------

  private drawHighlightOutline(ex: Exhibit, camera: Camera, w: number, h: number): void {
    const ctx = this.ctx;
    // 计算闪烁进度（缓动函数 easeInOutSine）
    const t = (this.highlightTime % HIGHLIGHT_PERIOD_SEC) / HIGHLIGHT_PERIOD_SEC;
    const eased = 0.5 - 0.5 * Math.cos(t * Math.PI * 2);

    // 颜色插值
    const r = Math.round(HIGHLIGHT_COLOR_START.r + (HIGHLIGHT_COLOR_END.r - HIGHLIGHT_COLOR_START.r) * eased);
    const g = Math.round(HIGHLIGHT_COLOR_START.g + (HIGHLIGHT_COLOR_END.g - HIGHLIGHT_COLOR_START.g) * eased);
    const b = Math.round(HIGHLIGHT_COLOR_START.b + (HIGHLIGHT_COLOR_END.b - HIGHLIGHT_COLOR_START.b) * eased);
    const color = `rgb(${r}, ${g}, ${b})`;
    const glowAlpha = 0.35 + 0.5 * eased;
    const lineWidth = 2.2 + 1.8 * eased;

    // 收集展品外轮廓点并绘制发光描边
    const points = this.collectExhibitOutline(ex, camera, w, h);
    if (points.length < 3) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // 外发光层
    for (let pass = 3; pass >= 1; pass--) {
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${glowAlpha * 0.18 / pass})`;
      ctx.lineWidth = lineWidth + pass * 4;
      ctx.shadowColor = color;
      ctx.shadowBlur = 18 + pass * 8;
      this.drawOutlinePath(points);
      ctx.stroke();
    }

    // 主描边
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    this.drawOutlinePath(points);
    ctx.stroke();

    ctx.restore();
  }

  private drawOutlinePath(points: { x: number; y: number }[]): void {
    const ctx = this.ctx;
    ctx.beginPath();
    // 按角度排序得到凸包近似
    const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
    const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
    const sorted = points.map(p => ({
      ...p,
      a: Math.atan2(p.y - cy, p.x - cx)
    })).sort((a, b) => a.a - b.a);
    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
  }

  private collectExhibitOutline(ex: Exhibit, camera: Camera, w: number, h: number): { x: number; y: number }[] {
    const pts: { x: number; y: number }[] = [];
    for (const part of ex.parts) {
      const world = this.transformPartToWorld(ex, part);
      const verts = this.getGeometryVertices(part.type, world.scale);
      for (const v of verts) {
        const rotated = this.rotateVec3(v, world.rotation);
        const worldPos: Vec3 = {
          x: rotated.x + world.position.x,
          y: rotated.y + world.position.y,
          z: rotated.z + world.position.z
        };
        const p = this.project(worldPos, camera, w, h);
        if (p) pts.push(p);
      }
    }
    return pts;
  }

  // ------------------------------------------------------------
  // 展品阴影 + 光晕
  // ------------------------------------------------------------

  private drawExhibitShadow(ex: Exhibit, camera: Camera, w: number, h: number): void {
    const ctx = this.ctx;
    const floorPos = { x: ex.position.x, y: -0.98, z: ex.position.z };
    const p = this.project(floorPos, camera, w, h);
    if (!p) return;
    const scale = this.computeScreenScale(floorPos.z, camera, h) * ex.boundingRadius * 1.5;
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, scale);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
    grad.addColorStop(0.6, 'rgba(10, 17, 40, 0.25)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, scale, scale * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawExhibitHalo(ex: Exhibit, camera: Camera, w: number, h: number): void {
    const ctx = this.ctx;
    const haloPos = { x: ex.position.x, y: ex.position.y + 0.3, z: ex.position.z };
    const p = this.project(haloPos, camera, w, h);
    if (!p) return;
    const scale = this.computeScreenScale(haloPos.z, camera, h) * ex.boundingRadius * 3.2;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.6 + 0.4 * Math.sin(this.highlightTime * 1.6 + ex.id.charCodeAt(8));
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, scale);
    grad.addColorStop(0, `rgba(124, 77, 255, ${0.35 * pulse})`);
    grad.addColorStop(0.5, `rgba(79, 195, 247, ${0.18 * pulse})`);
    grad.addColorStop(1, 'rgba(79, 195, 247, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ------------------------------------------------------------
  // 收集展品所有面（用于Z排序）
  // ------------------------------------------------------------

  private collectExhibitFaces(
    ex: Exhibit, camera: Camera, lights: Light[],
    w: number, h: number, isReflection: boolean
  ): RenderFace[] {
    const faces: RenderFace[] = [];
    for (const part of ex.parts) {
      const world = this.transformPartToWorld(ex, part);
      const mesh = this.getMesh(part.type);
      const verts = mesh.vertices.map(v => {
        const scaled = { x: v.x * world.scale.x, y: v.y * world.scale.y, z: v.z * world.scale.z };
        const rotated = this.rotateVec3(scaled, world.rotation);
        return {
          x: rotated.x + world.position.x,
          y: rotated.y + world.position.y,
          z: rotated.z + world.position.z
        };
      });

      for (const face of mesh.faces) {
        const faceVerts = face.indices.map(i => verts[i]);
        const projected = faceVerts.map(v => this.project(v, camera, w, h)).filter((v): v is { x: number; y: number } => !!v);
        if (projected.length < 3) continue;

        const avgZ = faceVerts.reduce((s, v) => s + v.z, 0) / faceVerts.length;
        if (avgZ < camera.near) continue;

        // 背面剔除
        const normal = this.calculateFaceNormal(faceVerts);
        const viewDir = {
          x: camera.position.x - faceVerts[0].x,
          y: camera.position.y - faceVerts[0].y,
          z: camera.position.z - faceVerts[0].z
        };
        const dot = normal.x * viewDir.x + normal.y * viewDir.y + normal.z * viewDir.z;
        if (dot < 0) continue;

        const litColor = this.applyLighting(part.color, part.material, normal, lights, faceVerts[0]);
        const fill = this.materialFillStyle(litColor, part.material, projected, isReflection);
        const alpha = part.material === 'glass' ? (isReflection ? 0.18 : 0.78) : (isReflection ? 0.25 : 1.0);
        const stroke = this.darkenColor(litColor, 0.35);

        faces.push({
          points: projected,
          avgZ,
          fillStyle: fill,
          strokeStyle: stroke,
          strokeWidth: part.material === 'glass' ? 0.6 : 0.8,
          alpha
        });
      }
    }
    return faces;
  }

  private drawFace(f: RenderFace): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = f.alpha;
    ctx.fillStyle = f.fillStyle;
    ctx.strokeStyle = f.strokeStyle;
    ctx.lineWidth = f.strokeWidth;
    ctx.beginPath();
    ctx.moveTo(f.points[0].x, f.points[0].y);
    for (let i = 1; i < f.points.length; i++) ctx.lineTo(f.points[i].x, f.points[i].y);
    ctx.closePath();
    ctx.fill();
    if (f.strokeWidth > 0) ctx.stroke();
    ctx.restore();
  }

  // ------------------------------------------------------------
  // 材质填充样式
  // ------------------------------------------------------------

  private materialFillStyle(
    baseColor: string, material: string,
    points: { x: number; y: number }[], isReflection: boolean
  ): string | CanvasGradient {
    if (material === 'glass') {
      // 磨砂玻璃：线性渐变+低透明度
      const xs = points.map(p => p.x);
      const ys = points.map(p => p.y);
      const x1 = Math.min(...xs), y1 = Math.min(...ys);
      const x2 = Math.max(...xs), y2 = Math.max(...ys);
      const grad = this.ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, this.adjustAlpha(baseColor, isReflection ? 0.25 : 0.55));
      grad.addColorStop(1, this.adjustAlpha(this.lightenColor(baseColor, 0.25), isReflection ? 0.12 : 0.35));
      return grad;
    }
    if (material === 'metal') {
      // 金属拉丝：对角线性渐变
      const xs = points.map(p => p.x);
      const ys = points.map(p => p.y);
      const x1 = Math.min(...xs), y1 = Math.min(...ys);
      const x2 = Math.max(...xs), y2 = Math.max(...ys);
      const grad = this.ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, this.lightenColor(baseColor, 0.35));
      grad.addColorStop(0.5, baseColor);
      grad.addColorStop(1, this.darkenColor(baseColor, 0.35));
      return grad;
    }
    return baseColor;
  }

  // ------------------------------------------------------------
  // 网格数据（立方体/球体/圆锥/圆柱/圆环）
  // ------------------------------------------------------------

  private getMesh(type: GeometryType): { vertices: Vec3[]; faces: { indices: number[]; normal: Vec3 }[] } {
    switch (type) {
      case 'cube': return this.getCubeMesh();
      case 'sphere': return this.getSphereMesh(8, 6);
      case 'cone': return this.getConeMesh(10);
      case 'cylinder': return this.getCylinderMesh(10);
      case 'torus': return this.getTorusMesh(8, 5);
    }
  }

  private getCubeMesh() {
    const s = 0.5;
    const vertices: Vec3[] = [
      { x: -s, y: -s, z: -s }, { x: s, y: -s, z: -s }, { x: s, y: s, z: -s }, { x: -s, y: s, z: -s },
      { x: -s, y: -s, z: s }, { x: s, y: -s, z: s }, { x: s, y: s, z: s }, { x: -s, y: s, z: s }
    ];
    const faces = [
      { indices: [0, 3, 2, 1], normal: { x: 0, y: 0, z: -1 } },
      { indices: [4, 5, 6, 7], normal: { x: 0, y: 0, z: 1 } },
      { indices: [0, 1, 5, 4], normal: { x: 0, y: -1, z: 0 } },
      { indices: [3, 7, 6, 2], normal: { x: 0, y: 1, z: 0 } },
      { indices: [1, 2, 6, 5], normal: { x: 1, y: 0, z: 0 } },
      { indices: [0, 4, 7, 3], normal: { x: -1, y: 0, z: 0 } }
    ];
    return { vertices, faces };
  }

  private getSphereMesh(segs: number, rings: number) {
    const vertices: Vec3[] = [];
    for (let r = 0; r <= rings; r++) {
      const phi = (r / rings) * Math.PI;
      for (let s = 0; s < segs; s++) {
        const theta = (s / segs) * Math.PI * 2;
        vertices.push({
          x: Math.sin(phi) * Math.cos(theta) * 0.5,
          y: Math.cos(phi) * 0.5,
          z: Math.sin(phi) * Math.sin(theta) * 0.5
        });
      }
    }
    const faces: { indices: number[]; normal: Vec3 }[] = [];
    for (let r = 0; r < rings; r++) {
      for (let s = 0; s < segs; s++) {
        const a = r * segs + s;
        const b = r * segs + ((s + 1) % segs);
        const c = (r + 1) * segs + s;
        const d = (r + 1) * segs + ((s + 1) % segs);
        const cx = (vertices[a].x + vertices[d].x) / 2;
        const cy = (vertices[a].y + vertices[d].y) / 2;
        const cz = (vertices[a].z + vertices[d].z) / 2;
        const len = Math.hypot(cx, cy, cz) || 1;
        faces.push({
          indices: [a, b, d, c],
          normal: { x: cx / len, y: cy / len, z: cz / len }
        });
      }
    }
    return { vertices, faces };
  }

  private getConeMesh(segs: number) {
    const vertices: Vec3[] = [{ x: 0, y: 0.5, z: 0 }, { x: 0, y: -0.5, z: 0 }];
    for (let s = 0; s < segs; s++) {
      const theta = (s / segs) * Math.PI * 2;
      vertices.push({ x: Math.cos(theta) * 0.5, y: -0.5, z: Math.sin(theta) * 0.5 });
    }
    const faces: { indices: number[]; normal: Vec3 }[] = [];
    for (let s = 0; s < segs; s++) {
      const a = 2 + s;
      const b = 2 + ((s + 1) % segs);
      faces.push({ indices: [0, b, a], normal: { x: 0, y: 1, z: 0 } });
      faces.push({ indices: [1, a, b], normal: { x: 0, y: -1, z: 0 } });
    }
    return { vertices, faces };
  }

  private getCylinderMesh(segs: number) {
    const vertices: Vec3[] = [];
    for (let s = 0; s < segs; s++) {
      const theta = (s / segs) * Math.PI * 2;
      const x = Math.cos(theta) * 0.5;
      const z = Math.sin(theta) * 0.5;
      vertices.push({ x, y: -0.5, z });
      vertices.push({ x, y: 0.5, z });
    }
    const faces: { indices: number[]; normal: Vec3 }[] = [];
    for (let s = 0; s < segs; s++) {
      const a0 = s * 2, a1 = s * 2 + 1;
      const b0 = ((s + 1) % segs) * 2, b1 = ((s + 1) % segs) * 2 + 1;
      faces.push({ indices: [a0, a1, b1, b0], normal: { x: 1, y: 0, z: 0 } });
    }
    return { vertices, faces };
  }

  private getTorusMesh(segs: number, rings: number) {
    const R = 0.4, r = 0.12;
    const vertices: Vec3[] = [];
    for (let s = 0; s < segs; s++) {
      const u = (s / segs) * Math.PI * 2;
      for (let t = 0; t < rings; t++) {
        const v = (t / rings) * Math.PI * 2;
        vertices.push({
          x: (R + r * Math.cos(v)) * Math.cos(u),
          y: r * Math.sin(v),
          z: (R + r * Math.cos(v)) * Math.sin(u)
        });
      }
    }
    const faces: { indices: number[]; normal: Vec3 }[] = [];
    for (let s = 0; s < segs; s++) {
      for (let t = 0; t < rings; t++) {
        const a = s * rings + t;
        const b = ((s + 1) % segs) * rings + t;
        const c = s * rings + ((t + 1) % rings);
        const d = ((s + 1) % segs) * rings + ((t + 1) % rings);
        faces.push({ indices: [a, b, d, c], normal: { x: 0, y: 1, z: 0 } });
      }
    }
    return { vertices, faces };
  }

  private getGeometryVertices(type: GeometryType, scale: Vec3): Vec3[] {
    const mesh = this.getMesh(type);
    return mesh.vertices.map(v => ({ x: v.x * scale.x, y: v.y * scale.y, z: v.z * scale.z }));
  }

  // ------------------------------------------------------------
  // 3D数学：矩阵/投影/光照
  // ------------------------------------------------------------

  private transformPartToWorld(ex: Exhibit, part: GeometryPart) {
    const rotatedOffset = this.rotateVec3(part.position, ex.rotation);
    const exPos = ex.position;
    const worldPos: Vec3 = {
      x: rotatedOffset.x * ex.scale + exPos.x,
      y: rotatedOffset.y * ex.scale + exPos.y,
      z: rotatedOffset.z * ex.scale + exPos.z
    };
    const worldRot: Vec3 = {
      x: ex.rotation.x + part.rotation.x,
      y: ex.rotation.y + part.rotation.y,
      z: ex.rotation.z + part.rotation.z
    };
    const worldScale: Vec3 = {
      x: part.scale.x * ex.scale,
      y: part.scale.y * ex.scale,
      z: part.scale.z * ex.scale
    };
    return { position: worldPos, rotation: worldRot, scale: worldScale };
  }

  private rotateVec3(v: Vec3, r: Vec3): Vec3 {
    let { x, y, z } = v;
    // X轴
    let cy = Math.cos(r.x), sy = Math.sin(r.x);
    let y1 = y * cy - z * sy;
    let z1 = y * sy + z * cy;
    y = y1; z = z1;
    // Y轴
    cy = Math.cos(r.y); sy = Math.sin(r.y);
    let x1 = x * cy + z * sy;
    z1 = -x * sy + z * cy;
    x = x1; z = z1;
    // Z轴
    cy = Math.cos(r.z); sy = Math.sin(r.z);
    x1 = x * cy - y * sy;
    y1 = x * sy + y * cy;
    x = x1; y = y1;
    return { x, y, z };
  }

  private project(p: Vec3, camera: Camera, w: number, h: number): { x: number; y: number } | null {
    const dx = p.x - camera.position.x;
    const dy = p.y - camera.position.y;
    const dz = p.z - camera.position.z;

    const cy = Math.cos(-camera.yaw), sy = Math.sin(-camera.yaw);
    const rx = dx * cy + dz * sy;
    const rz = -dx * sy + dz * cy;

    const cp = Math.cos(-camera.pitch), sp = Math.sin(-camera.pitch);
    const ry = dy * cp - rz * sp;
    const fz = dy * sp + rz * cp;

    if (fz <= camera.near) return null;
    const f = (h * 0.5) / Math.tan((camera.fov * DEG_TO_RAD) * 0.5);
    return {
      x: w * 0.5 + (rx / fz) * f,
      y: h * 0.5 - (ry / fz) * f
    };
  }

  private computeScreenScale(z: number, camera: Camera, h: number): number {
    const f = (h * 0.5) / Math.tan((camera.fov * DEG_TO_RAD) * 0.5);
    const effectiveZ = Math.max(z - camera.position.z + camera.distance, camera.near);
    return f / effectiveZ;
  }

  private calculateFaceNormal(verts: Vec3[]): Vec3 {
    const ax = verts[1].x - verts[0].x;
    const ay = verts[1].y - verts[0].y;
    const az = verts[1].z - verts[0].z;
    const bx = verts[2].x - verts[0].x;
    const by = verts[2].y - verts[0].y;
    const bz = verts[2].z - verts[0].z;
    const nx = ay * bz - az * by;
    const ny = az * bx - ax * bz;
    const nz = ax * by - ay * bx;
    const len = Math.hypot(nx, ny, nz) || 1;
    return { x: nx / len, y: ny / len, z: nz / len };
  }

  private applyLighting(baseColor: string, material: string, normal: Vec3, lights: Light[], pos: Vec3): string {
    let r = 0, g = 0, b = 0;
    const base = this.parseHex(baseColor);

    for (const light of lights) {
      let intensity = 0;
      if (light.type === 'ambient') {
        intensity = light.intensity;
      } else {
        const lx = light.position.x - pos.x;
        const ly = light.position.y - pos.y;
        const lz = light.position.z - pos.z;
        const len = Math.hypot(lx, ly, lz) || 1;
        const ndotl = Math.max(0, normal.x * (lx / len) + normal.y * (ly / len) + normal.z * (lz / len));
        intensity = ndotl * light.intensity * (5 / Math.max(5, len));
      }
      const lc = this.parseHex(light.color);
      r += base.r * lc.r * intensity / 255;
      g += base.g * lc.g * intensity / 255;
      b += base.b * lc.b * intensity / 255;
    }
    r = Math.min(255, Math.round(r));
    g = Math.min(255, Math.round(g));
    b = Math.min(255, Math.round(b));
    return `rgb(${r}, ${g}, ${b})`;
  }

  private parseHex(hex: string): { r: number; g: number; b: number } {
    let h = hex.replace('#', '').trim();
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    if (h.length < 6) return { r: 128, g: 128, b: 128 };
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16)
    };
  }

  private adjustAlpha(color: string, alpha: number): string {
    if (color.startsWith('#')) {
      const { r, g, b } = this.parseHex(color);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    if (color.startsWith('rgb(')) {
      const m = color.match(/\d+/g);
      if (m) return `rgba(${m[0]}, ${m[1]}, ${m[2]}, ${alpha})`;
    }
    return color;
  }

  private lightenColor(color: string, amt: number): string {
    const { r, g, b } = this.parseRgbOrHex(color);
    return `rgb(${Math.min(255, Math.round(r + (255 - r) * amt))}, ${Math.min(255, Math.round(g + (255 - g) * amt))}, ${Math.min(255, Math.round(b + (255 - b) * amt))})`;
  }

  private darkenColor(color: string, amt: number): string {
    const { r, g, b } = this.parseRgbOrHex(color);
    return `rgb(${Math.round(r * (1 - amt))}, ${Math.round(g * (1 - amt))}, ${Math.round(b * (1 - amt))})`;
  }

  private parseRgbOrHex(color: string): { r: number; g: number; b: number } {
    if (color.startsWith('#')) return this.parseHex(color);
    const m = color.match(/\d+/g);
    if (m) return { r: +m[0], g: +m[1], b: +m[2] };
    return { r: 128, g: 128, b: 128 };
  }

  // ------------------------------------------------------------
  // 缓动函数（供视角平滑过渡使用）
  // ------------------------------------------------------------

  public static easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  public static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /**
   * 相机平滑插值
   * 数据流向：interaction.ts 设置目标 -> main.ts 每帧调用此函数推进
   */
  public static interpolateCamera(
    current: { yaw: number; pitch: number; fov: number; distance: number },
    target: { yaw: number; pitch: number; fov: number; distance: number },
    progress: number
  ): { yaw: number; pitch: number; fov: number; distance: number } {
    const t = Renderer.easeOutCubic(Math.max(0, Math.min(1, progress)));
    return {
      yaw: Renderer.lerp(current.yaw, target.yaw, t),
      pitch: Renderer.lerp(current.pitch, target.pitch, t),
      fov: Renderer.lerp(current.fov, target.fov, t),
      distance: Renderer.lerp(current.distance, target.distance, t)
    };
  }
}
