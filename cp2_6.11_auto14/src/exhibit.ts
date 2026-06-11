// ============================================================
// 展品类 (Exhibit)
// 数据流向：
//   1. 被 gallery.ts 创建和管理（gallery.ts -> new Exhibit()）
//   2. 被 renderer.ts 读取数据进行渲染（renderer.ts -> exhibit.*）
//   3. 被 interaction.ts 间接调用，通过 gallery.ts 的方法
// 职责：
//   - 每个展品的几何体组合构建
//   - 位置/旋转/缩放变换
//   - 动态光影效果模拟
//   - 碰撞检测（球体包围盒）
// ============================================================

import type { Vec3, GeometryPart, ExhibitData, GeometryType, MaterialType } from './types.js';

const DEG_TO_RAD = Math.PI / 180;

export class Exhibit {
  public id: string;
  public templateId: string;
  public name: string;
  public position: Vec3;
  public rotation: Vec3;
  public scale: number;
  public parts: GeometryPart[];
  public isRotating: boolean;
  public rotationSpeed: number;
  public selected: boolean;
  public boundingRadius: number;
  public dirty: boolean = true;

  private _onChange: (() => void) | null = null;

  constructor(data: Partial<ExhibitData> = {}) {
    this.id = data.id ?? Exhibit.generateId();
    this.templateId = data.templateId ?? 'custom';
    this.name = data.name ?? '未命名展品';
    this.position = { ...data.position ?? { x: 0, y: 0, z: 0 } };
    this.rotation = { ...data.rotation ?? { x: 0, y: 0, z: 0 } };
    this.scale = data.scale ?? 1.0;
    this.parts = data.parts ? data.parts.map(p => ({ ...p, position: { ...p.position }, rotation: { ...p.rotation }, scale: { ...p.scale } })) : [];
    this.isRotating = data.isRotating ?? false;
    this.rotationSpeed = data.rotationSpeed ?? 1.0;
    this.selected = data.selected ?? false;
    this.boundingRadius = this.calculateBoundingRadius();
  }

  public setOnChange(cb: (() => void) | null): void {
    this._onChange = cb;
  }

  private markDirty(): void {
    this.dirty = true;
    if (this._onChange) this._onChange();
  }

  public clearDirty(): void {
    this.dirty = false;
  }

  private static generateId(): string {
    return 'exhibit_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  // ------------------------------------------------------------
  // 位置更新接口 - 满足 WASD / Q/E 键盘微调需求
  // 数据流向：interaction.ts -> gallery.moveExhibit() -> 这里
  // ------------------------------------------------------------

  /**
   * 设置展品绝对位置
   * @param x X轴坐标（世界空间，向右为正）
   * @param y Y轴坐标（世界空间，向上为正）
   * @param z Z轴坐标（世界空间，向前为正）
   */
  public setPosition(x: number, y: number, z: number): void {
    this.position.x = x;
    this.position.y = y;
    this.position.z = z;
    this.boundingRadius = this.calculateBoundingRadius();
    this.markDirty();
  }

  /**
   * 相对位移移动展品（步长模式）
   * @param dx X轴增量
   * @param dy Y轴增量
   * @param z Z轴增量
   */
  public move(dx: number, dy: number, dz: number): void {
    this.position.x += dx;
    this.position.y += dy;
    this.position.z += dz;
    this.boundingRadius = this.calculateBoundingRadius();
    this.markDirty();
  }

  /**
   * 在XZ平面移动（相机空间对齐）
   * @param forward 前后方向增量（相机朝向的前方）
   * @param right 左右方向增量（相机朝向的右方）
   * @param cameraYaw 相机Yaw角度（弧度）
   */
  public moveXZRelative(forward: number, right: number, cameraYaw: number): void {
    const sinY = Math.sin(cameraYaw);
    const cosY = Math.cos(cameraYaw);
    const dx = right * cosY + forward * sinY;
    const dz = -right * sinY + forward * cosY;
    this.position.x += dx;
    this.position.z += dz;
    this.boundingRadius = this.calculateBoundingRadius();
    this.markDirty();
  }

  // ------------------------------------------------------------
  // 旋转接口
  // ------------------------------------------------------------

  public setRotation(rx: number, ry: number, rz: number): void {
    this.rotation.x = rx;
    this.rotation.y = ry;
    this.rotation.z = rz;
    this.markDirty();
  }

  public rotate(drx: number, dry: number, drz: number): void {
    this.rotation.x += drx;
    this.rotation.y += dry;
    this.rotation.z += drz;
    this.markDirty();
  }

  public toggleRotation(enabled?: boolean): void {
    this.isRotating = enabled ?? !this.isRotating;
    this.markDirty();
  }

  public setRotationSpeed(speed: number): void {
    this.rotationSpeed = Math.max(0.5, Math.min(3.0, speed));
    this.markDirty();
  }

  // ------------------------------------------------------------
  // 每帧更新（动画步进）
  // 数据流向：gallery.update() -> exhibit.update()
  // ------------------------------------------------------------

  public update(deltaTime: number): void {
    if (this.isRotating) {
      this.rotation.y += this.rotationSpeed * DEG_TO_RAD * deltaTime * 60;
    }
  }

  // ------------------------------------------------------------
  // 碰撞检测（简化的球体包围盒）
  // 数据流向：gallery.addExhibit() -> checkCollision()
  // ------------------------------------------------------------

  private calculateBoundingRadius(): number {
    let maxDist = 0;
    for (const part of this.parts) {
      const partRadius = Exhibit.getPartRadius(part);
      const dx = this.position.x + part.position.x;
      const dy = this.position.y + part.position.y;
      const dz = this.position.z + part.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + partRadius;
      if (dist > maxDist) maxDist = dist;
    }
    if (this.parts.length === 0) maxDist = 1.0;
    return maxDist * this.scale;
  }

  private static getPartRadius(part: GeometryPart): number {
    const s = part.scale;
    const maxDim = Math.max(s.x, s.y, s.z);
    switch (part.type) {
      case 'cube': return maxDim * 0.87;
      case 'sphere': return maxDim;
      case 'cone': return maxDim;
      case 'cylinder': return maxDim;
      case 'torus': return maxDim * 1.2;
      default: return maxDim;
    }
  }

  public checkCollision(other: Exhibit, margin: number = 0.3): boolean {
    const dx = this.position.x - other.position.x;
    const dy = this.position.y - other.position.y;
    const dz = this.position.z - other.position.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    const rSum = this.boundingRadius + other.boundingRadius + margin;
    return distSq < rSum * rSum;
  }

  // ------------------------------------------------------------
  // 几何体构建方法
  // ------------------------------------------------------------

  public static buildGeometryParts(
    template: { type: GeometryType; offset?: Vec3; color?: string; material?: MaterialType; scale?: Vec3 }[]
  ): GeometryPart[] {
    return template.map(spec => ({
      type: spec.type,
      position: spec.offset ?? { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: spec.scale ?? { x: 1, y: 1, z: 1 },
      color: spec.color ?? '#4FC3F7',
      material: spec.material ?? 'metal'
    }));
  }

  // ------------------------------------------------------------
  // 序列化/反序列化（用于保存/加载布局）
  // 数据流向：gallery.serialize() -> toJSON() / fromJSON()
  // ------------------------------------------------------------

  public toJSON(): ExhibitData {
    return {
      id: this.id,
      templateId: this.templateId,
      name: this.name,
      position: { ...this.position },
      rotation: { ...this.rotation },
      scale: this.scale,
      parts: this.parts.map(p => ({
        type: p.type,
        position: { ...p.position },
        rotation: { ...p.rotation },
        scale: { ...p.scale },
        color: p.color,
        material: p.material
      })),
      isRotating: this.isRotating,
      rotationSpeed: this.rotationSpeed,
      selected: false
    };
  }

  public static fromJSON(data: ExhibitData): Exhibit {
    return new Exhibit(data);
  }
}
