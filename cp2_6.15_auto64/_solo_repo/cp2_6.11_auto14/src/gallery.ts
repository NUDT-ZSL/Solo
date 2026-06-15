// ============================================================
// 画廊场景类 (Gallery)
// 数据流向：
//   1. 被 main.ts 创建并持有（main.ts -> new Gallery()）
//   2. main.ts 每帧调用 update() 步进动画
//   3. interaction.ts 通过 main.ts 暴露的接口调用本类方法
//   4. 本类持有多个 Exhibit 实例并管理其生命周期
//   5. renderer.ts 调用 getExhibits() 等读取方法获取场景数据
// 职责：
//   - 管理展品集合的增删、排列
//   - 管理展台位置分配
//   - 统一调用展品的 update()
//   - 序列化/反序列化布局数据
// ============================================================

import { Exhibit } from './exhibit.js';
import type { ExhibitData, ExhibitTemplate, LayoutData, Vec3 } from './types.js';

const MAX_EXHIBITS = 8;
const PLATFORM_COUNT = 6;
const PLATFORM_RADIUS = 5.0;
const EXHIBIT_MOVE_STEP = 0.2;

export class Gallery {
  private exhibits: Exhibit[] = [];
  private platformSlots: Vec3[] = [];
  private selectedExhibitId: string | null = null;
  private lightAnimationTime: number = 0;
  public sceneDirty: boolean = true;

  constructor() {
    this.generatePlatformSlots();
    this.setupDefaultExhibits();
  }

  private onExhibitChange = (): void => {
    this.sceneDirty = true;
  };

  public clearSceneDirty(): void {
    this.sceneDirty = false;
    for (const ex of this.exhibits) ex.clearDirty();
  }

  private registerExhibitCallbacks(ex: Exhibit): void {
    ex.setOnChange(this.onExhibitChange);
  }

  // ------------------------------------------------------------
  // 展台位置生成（围绕中心的6个位置）
  // ------------------------------------------------------------

  private generatePlatformSlots(): void {
    this.platformSlots = [];
    for (let i = 0; i < PLATFORM_COUNT; i++) {
      const angle = (i / PLATFORM_COUNT) * Math.PI * 2 - Math.PI / 2;
      this.platformSlots.push({
        x: Math.cos(angle) * PLATFORM_RADIUS,
        y: 0,
        z: Math.sin(angle) * PLATFORM_RADIUS
      });
    }
  }

  // ------------------------------------------------------------
  // 初始化默认展品（6个预设）
  // ------------------------------------------------------------

  private setupDefaultExhibits(): void {
    const templates = Gallery.getBuiltinTemplates();
    for (let i = 0; i < Math.min(templates.length, PLATFORM_COUNT); i++) {
      const template = templates[i];
      const slot = this.platformSlots[i];
      const exhibit = new Exhibit({
        templateId: template.id,
        name: template.name,
        position: { x: slot.x, y: 0, z: slot.z },
        rotation: { x: 0, y: (i / PLATFORM_COUNT) * Math.PI * 2, z: 0 },
        scale: 1.0,
        parts: template.parts.map(p => ({ ...p })),
        isRotating: i === 0,
        rotationSpeed: 1.0
      });
      this.registerExhibitCallbacks(exhibit);
      this.exhibits.push(exhibit);
    }
  }

  // ------------------------------------------------------------
  // 预设几何体模板定义
  // ------------------------------------------------------------

  public static getBuiltinTemplates(): ExhibitTemplate[] {
    return [
      {
        id: 'template_crystal',
        name: '晶簇组合',
        description: '立方体基座+球体顶部+锥形晶柱',
        parts: Exhibit.buildGeometryParts([
          { type: 'cube', offset: { x: 0, y: -0.6, z: 0 }, color: '#4FC3F7', material: 'glass', scale: { x: 0.9, y: 0.4, z: 0.9 } },
          { type: 'sphere', offset: { x: 0, y: 0.1, z: 0 }, color: '#7C4DFF', material: 'metal', scale: { x: 0.5, y: 0.5, z: 0.5 } },
          { type: 'cone', offset: { x: 0.3, y: 0.5, z: 0.1 }, color: '#FF9E80', material: 'metal', scale: { x: 0.25, y: 0.6, z: 0.25 } }
        ])
      },
      {
        id: 'template_totem',
        name: '图腾柱',
        description: '多层立方体堆叠+球形装饰',
        parts: Exhibit.buildGeometryParts([
          { type: 'cube', offset: { x: 0, y: -0.8, z: 0 }, color: '#FFD54F', material: 'metal', scale: { x: 0.7, y: 0.4, z: 0.7 } },
          { type: 'cube', offset: { x: 0, y: -0.2, z: 0 }, color: '#FF7043', material: 'matte', scale: { x: 0.6, y: 0.4, z: 0.6 } },
          { type: 'sphere', offset: { x: 0, y: 0.4, z: 0 }, color: '#E91E63', material: 'metal', scale: { x: 0.35, y: 0.35, z: 0.35 } },
          { type: 'cone', offset: { x: 0, y: 0.9, z: 0 }, color: '#4FC3F7', material: 'glass', scale: { x: 0.3, y: 0.5, z: 0.3 } }
        ])
      },
      {
        id: 'template_balance',
        name: '平衡装置',
        description: '球体中心+圆柱支架+环状外框',
        parts: Exhibit.buildGeometryParts([
          { type: 'cylinder', offset: { x: 0, y: -0.7, z: 0 }, color: '#90A4AE', material: 'metal', scale: { x: 0.35, y: 0.6, z: 0.35 } },
          { type: 'cube', offset: { x: 0, y: -0.1, z: 0 }, color: '#607D8B', material: 'matte', scale: { x: 0.8, y: 0.15, z: 0.8 } },
          { type: 'sphere', offset: { x: 0, y: 0.3, z: 0 }, color: '#00E5FF', material: 'glass', scale: { x: 0.45, y: 0.45, z: 0.45 } },
          { type: 'torus', offset: { x: 0, y: 0.3, z: 0 }, color: '#B388FF', material: 'metal', scale: { x: 0.7, y: 0.7, z: 0.15 } }
        ])
      },
      {
        id: 'template_fountain',
        name: '光之喷泉',
        description: '多层锥形向上堆叠',
        parts: Exhibit.buildGeometryParts([
          { type: 'cylinder', offset: { x: 0, y: -0.8, z: 0 }, color: '#5C6BC0', material: 'matte', scale: { x: 0.8, y: 0.4, z: 0.8 } },
          { type: 'cone', offset: { x: 0, y: -0.3, z: 0 }, color: '#7E57C2', material: 'glass', scale: { x: 0.7, y: 0.5, z: 0.7 } },
          { type: 'cone', offset: { x: 0, y: 0.2, z: 0 }, color: '#AB47BC', material: 'metal', scale: { x: 0.45, y: 0.5, z: 0.45 } },
          { type: 'sphere', offset: { x: 0, y: 0.7, z: 0 }, color: '#FF80AB', material: 'glass', scale: { x: 0.22, y: 0.22, z: 0.22 } }
        ])
      },
      {
        id: 'template_geo_compass',
        name: '几何罗盘',
        description: '水平圆环+垂直圆环+中心立方体',
        parts: Exhibit.buildGeometryParts([
          { type: 'cube', offset: { x: 0, y: -0.6, z: 0 }, color: '#37474F', material: 'matte', scale: { x: 0.8, y: 0.3, z: 0.8 } },
          { type: 'torus', offset: { x: 0, y: 0, z: 0 }, color: '#FFB74D', material: 'metal', scale: { x: 0.75, y: 0.75, z: 0.12 } },
          { type: 'torus', offset: { x: 0, y: 0, z: 0 }, color: '#4DD0E1', material: 'glass', scale: { x: 0.6, y: 0.12, z: 0.6 } },
          { type: 'cube', offset: { x: 0, y: 0, z: 0 }, color: '#F06292', material: 'metal', scale: { x: 0.28, y: 0.28, z: 0.28 } }
        ])
      },
      {
        id: 'template_minaret',
        name: '微光塔',
        description: '细长圆柱+球体+锥顶',
        parts: Exhibit.buildGeometryParts([
          { type: 'cylinder', offset: { x: 0, y: -0.7, z: 0 }, color: '#26A69A', material: 'matte', scale: { x: 0.5, y: 0.4, z: 0.5 } },
          { type: 'cylinder', offset: { x: 0, y: -0.1, z: 0 }, color: '#4DB6AC', material: 'glass', scale: { x: 0.3, y: 0.9, z: 0.3 } },
          { type: 'sphere', offset: { x: 0, y: 0.6, z: 0 }, color: '#FFA726', material: 'metal', scale: { x: 0.28, y: 0.28, z: 0.28 } },
          { type: 'cone', offset: { x: 0, y: 1.0, z: 0 }, color: '#EF5350', material: 'metal', scale: { x: 0.22, y: 0.4, z: 0.22 } }
        ])
      },
      {
        id: 'template_orbit',
        name: '轨道星系',
        description: '中心大球+环绕小球',
        parts: Exhibit.buildGeometryParts([
          { type: 'sphere', offset: { x: 0, y: -0.6, z: 0 }, color: '#3F51B5', material: 'matte', scale: { x: 0.5, y: 0.2, z: 0.5 } },
          { type: 'sphere', offset: { x: 0, y: 0, z: 0 }, color: '#FFEB3B', material: 'metal', scale: { x: 0.45, y: 0.45, z: 0.45 } },
          { type: 'sphere', offset: { x: 0.7, y: 0, z: 0 }, color: '#E91E63', material: 'glass', scale: { x: 0.18, y: 0.18, z: 0.18 } },
          { type: 'sphere', offset: { x: -0.5, y: 0.3, z: 0.3 }, color: '#2196F3', material: 'glass', scale: { x: 0.13, y: 0.13, z: 0.13 } }
        ])
      },
      {
        id: 'template_zen',
        name: '禅石堆叠',
        description: '不规则椭圆叠放',
        parts: Exhibit.buildGeometryParts([
          { type: 'cube', offset: { x: 0, y: -0.8, z: 0 }, color: '#795548', material: 'matte', scale: { x: 0.9, y: 0.3, z: 0.6 } },
          { type: 'sphere', offset: { x: 0, y: -0.4, z: 0 }, color: '#8D6E63', material: 'matte', scale: { x: 0.55, y: 0.3, z: 0.4 } },
          { type: 'sphere', offset: { x: -0.1, y: 0.0, z: 0.05 }, color: '#A1887F', material: 'matte', scale: { x: 0.45, y: 0.28, z: 0.35 } },
          { type: 'sphere', offset: { x: 0.1, y: 0.4, z: -0.05 }, color: '#BCAAA4', material: 'glass', scale: { x: 0.3, y: 0.22, z: 0.25 } }
        ])
      }
    ];
  }

  // ------------------------------------------------------------
  // 每帧更新 - 数据流向：main.ts 渲染循环调用
  // ------------------------------------------------------------

  public update(deltaTime: number): void {
    this.lightAnimationTime += deltaTime;
    for (const ex of this.exhibits) {
      ex.update(deltaTime);
    }
  }

  // ------------------------------------------------------------
  // 展品增删接口
  // ------------------------------------------------------------

  public getMaxExhibits(): number {
    return MAX_EXHIBITS;
  }

  public getExhibits(): readonly Exhibit[] {
    return this.exhibits;
  }

  public getExhibitById(id: string): Exhibit | undefined {
    return this.exhibits.find(e => e.id === id);
  }

  public getSelectedExhibit(): Exhibit | null {
    return this.selectedExhibitId ? (this.getExhibitById(this.selectedExhibitId) ?? null) : null;
  }

  /**
   * 选中/取消选中展品
   * 数据流向：interaction.ts 点击检测 -> main.ts -> gallery.selectExhibit()
   */
  public selectExhibit(id: string | null): void {
    for (const ex of this.exhibits) {
      ex.selected = (ex.id === id);
    }
    this.selectedExhibitId = id;
  }

  /**
   * 在下一个空闲展台添加展品
   * 返回新展品ID或null（已满）
   */
  public addExhibitFromTemplate(template: ExhibitTemplate): string | null {
    if (this.exhibits.length >= MAX_EXHIBITS) return null;

    const slotIndex = this.findNextEmptyPlatformSlot();
    const pos: Vec3 = slotIndex >= 0
      ? { ...this.platformSlots[slotIndex] }
      : this.findFreeRandomPosition();

    const exhibit = new Exhibit({
      templateId: template.id,
      name: template.name,
      position: pos,
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1.0,
      parts: template.parts.map(p => ({
        type: p.type,
        position: { ...p.position },
        rotation: { ...p.rotation },
        scale: { ...p.scale },
        color: p.color,
        material: p.material
      })),
      isRotating: false,
      rotationSpeed: 1.0
    });
    this.registerExhibitCallbacks(exhibit);
    this.exhibits.push(exhibit);
    return exhibit.id;
  }

  /**
   * 在指定展品位添加或替换展品
   */
  public placeTemplateOnSlot(template: ExhibitTemplate, slotIndex: number): string | null {
    if (slotIndex < 0 || slotIndex >= this.platformSlots.length) return null;
    const slot = this.platformSlots[slotIndex];

    const existing = this.exhibits.findIndex(e =>
      Math.abs(e.position.x - slot.x) < 0.1 &&
      Math.abs(e.position.z - slot.z) < 0.1
    );
    if (existing >= 0) {
      this.exhibits.splice(existing, 1);
    }
    if (this.exhibits.length >= MAX_EXHIBITS) return null;

    const exhibit = new Exhibit({
      templateId: template.id,
      name: template.name,
      position: { x: slot.x, y: 0, z: slot.z },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1.0,
      parts: template.parts.map(p => ({
        type: p.type,
        position: { ...p.position },
        rotation: { ...p.rotation },
        scale: { ...p.scale },
        color: p.color,
        material: p.material
      })),
      isRotating: false,
      rotationSpeed: 1.0
    });
    this.registerExhibitCallbacks(exhibit);
    this.exhibits.push(exhibit);
    return exhibit.id;
  }

  public removeExhibit(id: string): boolean {
    const idx = this.exhibits.findIndex(e => e.id === id);
    if (idx < 0) return false;
    this.exhibits.splice(idx, 1);
    if (this.selectedExhibitId === id) this.selectedExhibitId = null;
    return true;
  }

  public removeSelected(): boolean {
    return this.selectedExhibitId ? this.removeExhibit(this.selectedExhibitId) : false;
  }

  public clearAll(): void {
    this.exhibits = [];
    this.selectedExhibitId = null;
  }

  // ------------------------------------------------------------
  // 展品位置移动接口（供 WASD / Q/E 键盘调用）
  // 数据流向：interaction.ts -> main.ts -> gallery.moveSelected()
  // ------------------------------------------------------------

  /**
   * 移动选中展品
   * @param dx X轴增量（世界空间）
   * @param dy Y轴增量（上下）
   * @param dz Z轴增量（世界空间）
   */
  public moveSelected(dx: number, dy: number, dz: number): boolean {
    const ex = this.getSelectedExhibit();
    if (!ex) return false;
    const oldPos = { ...ex.position };
    ex.move(dx, dy, dz);
    if (this.collidesWithOthers(ex)) {
      ex.setPosition(oldPos.x, oldPos.y, oldPos.z);
      return false;
    }
    return true;
  }

  /**
   * 相机相对方向移动选中展品（XZ平面）
   */
  public moveSelectedXZRelative(forward: number, right: number, cameraYaw: number): boolean {
    const ex = this.getSelectedExhibit();
    if (!ex) return false;
    const oldPos = { ...ex.position };
    ex.moveXZRelative(forward, right, cameraYaw);
    if (this.collidesWithOthers(ex)) {
      ex.setPosition(oldPos.x, oldPos.y, oldPos.z);
      return false;
    }
    return true;
  }

  /**
   * 移动选中展品（步长模式，WASD/QE默认步长0.2）
   */
  public moveSelectedByStep(forward: number, right: number, up: number, cameraYaw: number): boolean {
    const step = EXHIBIT_MOVE_STEP;
    const ex = this.getSelectedExhibit();
    if (!ex) return false;
    const oldPos = { ...ex.position };
    ex.moveXZRelative(forward * step, right * step, cameraYaw);
    ex.move(0, up * step, 0);
    if (this.collidesWithOthers(ex)) {
      ex.setPosition(oldPos.x, oldPos.y, oldPos.z);
      return false;
    }
    return true;
  }

  /**
   * 设置选中展品旋转
   */
  public rotateSelected(drx: number, dry: number, drz: number): boolean {
    const ex = this.getSelectedExhibit();
    if (!ex) return false;
    ex.rotate(drx, dry, drz);
    return true;
  }

  public toggleSelectedRotation(): boolean {
    const ex = this.getSelectedExhibit();
    if (!ex) return false;
    ex.toggleRotation();
    return true;
  }

  public setSelectedRotationSpeed(speed: number): boolean {
    const ex = this.getSelectedExhibit();
    if (!ex) return false;
    ex.setRotationSpeed(speed);
    return true;
  }

  // ------------------------------------------------------------
  // 碰撞检测辅助
  // ------------------------------------------------------------

  private collidesWithOthers(exhibit: Exhibit): boolean {
    for (const other of this.exhibits) {
      if (other.id === exhibit.id) continue;
      if (exhibit.checkCollision(other)) return true;
    }
    return false;
  }

  private findNextEmptyPlatformSlot(): number {
    for (let i = 0; i < this.platformSlots.length; i++) {
      const slot = this.platformSlots[i];
      const occupied = this.exhibits.some(e =>
        Math.abs(e.position.x - slot.x) < 0.5 &&
        Math.abs(e.position.z - slot.z) < 0.5
      );
      if (!occupied) return i;
    }
    return -1;
  }

  private findFreeRandomPosition(): Vec3 {
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 2.0 + Math.random() * 4.0;
      const pos: Vec3 = { x: Math.cos(angle) * r, y: 0, z: Math.sin(angle) * r };
      const testEx = new Exhibit({ position: pos, boundingRadius: 0 } as any);
      (testEx as any).boundingRadius = 1.0;
      if (!this.collidesWithOthers(testEx)) return pos;
    }
    return { x: 0, y: 0, z: 0 };
  }

  // ------------------------------------------------------------
  // 展台位置与灯光时间查询
  // ------------------------------------------------------------

  public getPlatformSlots(): readonly Vec3[] {
    return this.platformSlots;
  }

  public getLightAnimationTime(): number {
    return this.lightAnimationTime;
  }

  // ------------------------------------------------------------
  // 布局保存/加载（JSON序列化）
  // 数据流向：interaction.ts 保存/加载按钮 -> main.ts -> gallery.serialize/load
  // 序列化包含：展品位置(position)、旋转角度(rotation)、几何体类型(parts.type)、
  //             颜色(parts.color)、材质(parts.material)、缩放(scale)、
  //             自转状态(isRotating)、转速(rotationSpeed)
  // ------------------------------------------------------------

  public serializeLayout(cameraYaw: number, cameraPitch: number, cameraFov: number, cameraDistance: number): LayoutData {
    return {
      version: '1.0',
      timestamp: Date.now(),
      camera: { yaw: cameraYaw, pitch: cameraPitch, fov: cameraFov, distance: cameraDistance },
      exhibits: this.exhibits.map(e => e.toJSON())
    };
  }

  public loadLayout(data: LayoutData): { yaw: number; pitch: number; fov: number; distance: number } {
    this.exhibits = [];
    this.selectedExhibitId = null;
    this.sceneDirty = true;
    for (const exData of data.exhibits) {
      if (!exData.rotation) {
        exData.rotation = { x: 0, y: 0, z: 0 };
      }
      if (!exData.parts) {
        exData.parts = [];
      }
      const ex = Exhibit.fromJSON(exData);
      this.registerExhibitCallbacks(ex);
      this.exhibits.push(ex);
    }
    return {
      yaw: data.camera.yaw,
      pitch: data.camera.pitch,
      fov: data.camera.fov,
      distance: data.camera.distance
    };
  }

  /**
   * 导出JSON字符串并触发下载
   */
  public downloadLayoutAsJson(filename: string, cameraYaw: number, cameraPitch: number, cameraFov: number, cameraDistance: number): void {
    const layout = this.serializeLayout(cameraYaw, cameraPitch, cameraFov, cameraDistance);
    const json = JSON.stringify(layout, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 从文件内容解析布局
   */
  public parseAndLoadLayout(jsonText: string): { yaw: number; pitch: number; fov: number; distance: number } | null {
    try {
      const data = JSON.parse(jsonText) as LayoutData;
      if (!data || !Array.isArray(data.exhibits) || !data.camera) {
        console.warn('布局JSON格式无效');
        return null;
      }
      return this.loadLayout(data);
    } catch (err) {
      console.error('解析布局JSON失败:', err);
      return null;
    }
  }
}
