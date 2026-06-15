## 1. 架构设计

```mermaid
flowchart TB
    "用户交互层" --> "ToolManager"
    "ToolManager" --> "CanvasEngine"
    "ToolManager" --> "LayerPanel"
    "LayerPanel" --> "CanvasEngine"
    "CanvasEngine" --> "Canvas 2D Context"
    "CanvasEngine" --> "元素数据模型"
    "元素数据模型" --> "自由画笔数据"
    "元素数据模型" --> "矩形数据"
    "元素数据模型" --> "文本便签数据"
```

## 2. 技术说明

- 前端: TypeScript + Canvas 2D API + Vite
- 初始化工具: Vite (vanilla-ts模板)
- 后端: 无（纯前端应用）
- 数据库: 无（内存数据，后续可扩展）

### 核心依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| vite | ^5.x | 开发服务器与构建 |
| typescript | ^5.x | 类型安全 |
| @types/node | ^20.x | Node.js类型定义 |

## 3. 文件结构

| 文件路径 | 用途 |
|----------|------|
| package.json | 项目依赖和启动脚本 |
| vite.config.js | Vite基础配置 |
| tsconfig.json | TypeScript配置，严格模式，target ES2020 |
| index.html | 入口页面 |
| src/canvas-engine.ts | 核心Canvas渲染引擎，绘制/缩放/平移逻辑 |
| src/tool-manager.ts | 工具状态管理，工具切换/鼠标事件分发 |
| src/layer-panel.ts | 图层管理面板UI，元素定位和层级排序 |
| src/main.ts | 入口文件，初始化各模块，协调交互 |

## 4. 模块API定义

### CanvasEngine API

```typescript
interface CanvasEngine {
  init(container: HTMLElement): void;
  addElement(element: CanvasElement): void;
  removeElement(id: string): void;
  updateElement(id: string, updates: Partial<CanvasElement>): void;
  getElements(): CanvasElement[];
  panTo(x: number, y: number, animated?: boolean): void;
  setZoom(scale: number, centerX?: number, centerY?: number): void;
  getZoom(): number;
  getOffset(): { x: number; y: number };
  screenToCanvas(screenX: number, screenY: number): { x: number; y: number };
  canvasToScreen(canvasX: number, canvasY: number): { x: number; y: number };
  getElementsAtPoint(x: number, y: number): CanvasElement[];
  getElementsInRect(rect: DOMRect): CanvasElement[];
  reorderElements(ids: string[], newIndex: number): void;
  render(): void;
  on(event: string, callback: Function): void;
  destroy(): void;
}
```

### 元素数据模型

```typescript
type ElementType = 'freehand' | 'rectangle' | 'sticky-note';

interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: { x: number; y: number }[];
  text?: string;
  color: string;
  strokeWidth: number;
  scale: number;
  rotation: number;
  zIndex: number;
  opacity: number;
  createdAt: number;
}
```

### ToolManager API

```typescript
type ToolType = 'freehand' | 'rectangle' | 'sticky-note' | 'select';

interface ToolManager {
  setActiveTool(tool: ToolType): void;
  getActiveTool(): ToolType;
  setStrokeWidth(width: number): void;
  getStrokeWidth(): number;
  setColor(color: string): void;
  getColor(): string;
  getSelectedElements(): string[];
  selectElement(id: string, multi?: boolean): void;
  deselectAll(): void;
  deleteSelected(): void;
  on(event: string, callback: Function): void;
}
```

### LayerPanel API

```typescript
interface LayerPanel {
  init(container: HTMLElement): void;
  refresh(): void;
  focusElement(id: string): void;
  on(event: string, callback: Function): void;
  destroy(): void;
}
```

## 5. 渲染策略

### 5.1 渲染管线

1. requestAnimationFrame驱动渲染循环
2. 清空画布 → 应用变换(平移+缩放) → 按zIndex排序绘制所有元素 → 绘制选中框
3. 非活动状态下跳过渲染以节省性能

### 5.2 性能优化

- 脏矩形检测：仅重绘发生变化的区域
- 元素包围盒预计算：快速剔除视口外元素
- 缩放级别低于0.5时跳过细节渲染（画笔路径降采样）
- 事件节流：鼠标移动事件使用requestAnimationFrame节流

### 5.3 坐标系统

- 屏幕坐标 → 画布坐标转换: `canvasX = (screenX - offsetX) / zoom`
- 画布坐标 → 屏幕坐标转换: `screenX = canvasX * zoom + offsetX`
