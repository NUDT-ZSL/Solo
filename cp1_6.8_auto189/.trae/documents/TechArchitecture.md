## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端层"
        "UILayer.tsx<br/>React组件+Zustand状态"
        "Renderer.ts<br/>Canvas 2D渲染引擎"
    end
    subgraph "核心引擎层"
        "FragmentEngine.ts<br/>碎片管理+碰撞检测+磁性吸附"
        "ImageProcessor.ts<br/>图片处理+亮度分析+碎片生成"
    end
    subgraph "数据层"
        "Zustand Store<br/>全局状态管理"
        "Canvas API<br/>2D绘图上下文"
    end
    "UILayer.tsx<br/>React组件+Zustand状态" --> "Renderer.ts<br/>Canvas 2D渲染引擎"
    "UILayer.tsx<br/>React组件+Zustand状态" --> "FragmentEngine.ts<br/>碎片管理+碰撞检测+磁性吸附"
    "Renderer.ts<br/>Canvas 2D渲染引擎" --> "Canvas API<br/>2D绘图上下文"
    "FragmentEngine.ts<br/>碎片管理+碰撞检测+磁性吸附" --> "ImageProcessor.ts<br/>图片处理+亮度分析+碎片生成"
    "FragmentEngine.ts<br/>碎片管理+碰撞检测+磁性吸附" --> "Zustand Store<br/>全局状态管理"
```

## 2. 技术说明

- **前端框架**：React 18 + TypeScript
- **构建工具**：Vite
- **样式方案**：Tailwind CSS 3
- **状态管理**：Zustand
- **图标**：lucide-react
- **后端**：无（纯前端应用）
- **数据库**：无（所有数据在内存中处理）

## 3. 路由定义

本应用为单页面应用，无需路由：

| 路由 | 用途 |
|------|------|
| / | 主页面，包含画布和工具栏 |

## 4. 文件结构

```
src/
  ImageProcessor.ts    # 图片上传、灰度转换、亮度分析、碎片多边形数据生成
  FragmentEngine.ts    # 碎片位置/旋转管理、碰撞检测、磁性吸附逻辑
  Renderer.ts          # Canvas 2D渲染：碎片绘制、光晕、闪光、连接纹理、粒子动画
  UILayer.tsx          # React组件：工具栏、上传按钮、进度条、完成提示
  App.tsx              # 应用入口，组合所有模块
  main.tsx             # ReactDOM挂载
  index.css            # Tailwind基础样式+自定义CSS
  store.ts             # Zustand全局状态
```

## 5. 核心模块接口设计

### 5.1 ImageProcessor

```typescript
interface FragmentData {
  id: number;
  vertices: { x: number; y: number }[];  // 多边形顶点（相对碎片中心）
  center: { x: number; y: number };       // 在原图中的正确位置
  color: string;                           // 主色HEX
  imageData: ImageData;                    // 碎片对应的像素数据
  width: number;
  height: number;
}

// 上传图片 → 灰度分析 → 切割碎片
function processImage(image: HTMLImageElement, gridSize: number): FragmentData[]
```

### 5.2 FragmentEngine

```typescript
interface FragmentState {
  id: number;
  x: number;          // 当前x位置
  y: number;          // 当前y位置
  rotation: number;    // 当前旋转角度
  targetX: number;     // 弹性缓动目标x
  targetY: number;     // 弹性缓动目标y
  snapped: boolean;    // 是否已吸附
  flashAlpha: number;  // 闪光透明度
  connectionAlpha: number; // 连接纹理透明度
}

// 初始化碎片散落位置
function scatterFragments(fragments: FragmentData[], canvasWidth: number, canvasHeight: number): FragmentState[]
// 更新碎片位置（弹性缓动）
function updateFragmentPosition(state: FragmentState, dt: number): FragmentState
// 碰撞检测：判断鼠标是否点击到碎片
function hitTest(x: number, y: number, fragments: FragmentState[], fragmentData: FragmentData[]): number | null
// 磁性吸附检测
function checkSnap(state: FragmentState, correctPos: { x: number; y: number }, threshold: number): boolean
```

### 5.3 Renderer

```typescript
// 渲染所有碎片
function renderFragments(ctx: CanvasRenderingContext2D, states: FragmentState[], data: FragmentData[]): void
// 渲染碎片光晕
function renderGlow(ctx: CanvasRenderingContext2D, state: FragmentState, data: FragmentData): void
// 渲染闪光动画
function renderFlash(ctx: CanvasRenderingContext2D, state: FragmentState): void
// 渲染连接纹理
function renderConnection(ctx: CanvasRenderingContext2D, state: FragmentState, data: FragmentData): void
// 渲染粒子庆祝动画
function renderParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void
// 渲染完成模式（原图+淡出边界）
function renderCompletion(ctx: CanvasRenderingContext2D, image: HTMLImageElement, alpha: number): void
```

## 6. 性能优化策略

1. **Canvas渲染优化**：使用requestAnimationFrame，仅重绘变化区域
2. **碰撞检测优化**：碎片按空间位置建立网格索引，快速排除远距离碎片
3. **弹性缓动**：使用弹簧阻尼模型，避免每帧大量计算
4. **粒子系统**：对象池复用粒子对象，减少GC压力
5. **碎片渲染**：预渲染碎片到离屏Canvas，主Canvas仅做drawImage
