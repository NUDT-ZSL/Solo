## 1. 架构设计

```mermaid
graph TD
    subgraph "前端层"
        A["App.tsx 主布局组件] --> B["ControlPanel.tsx 参数面板"]
        A --> C["Canvas 渲染层"]
        C --> D["PlantEngine.ts 生长引擎"]
        C --> E["ParticleSystem.ts 粒子系统"]
        D --> F["绘制指令数组"]
        E --> G["粒子绘制指令"]
    end
    subgraph "状态管理层"
        H["React useState/useRef"]
        H --> I["植物列表 plants[]"]
        H --> J["环境参数 light/water/fertility"]
        H --> K["风动状态 windState"]
    end
    subgraph "渲染循环"
        L["requestAnimationFrame"] --> M["每帧更新"]
        M --> D
        M --> E
    end
```

## 2. 技术说明

- **前端框架**：React@18 + TypeScript@5
- **构建工具**：Vite@5 + @vitejs/plugin-react
- **渲染技术**：Canvas 2D API（原生实现，无第三方渲染库）
- **状态管理**：React Hooks（useState管理植物列表，useRef管理Canvas和渲染循环）
- **核心算法**：L-system分形（4层迭代）、贝塞尔曲线绘制、线性插值平滑过渡
- **粒子系统**：对象池管理、辉光粒子+花瓣凋落
- **性能优化**：30fps目标帧率、单株粒子≤50、requestAnimationFrame、增量渲染

## 3. 项目文件结构

```
auto185/
├── package.json
├── vite.config.js
├── tsconfig.json
├── index.html
└── src/
    ├── App.tsx              # 主布局、响应式、画布管理、植物列表状态
    ├── PlantEngine.ts      # L-system、阶段更新、环境插值、风动计算
    ├── ParticleSystem.ts   # 辉光粒子、花瓣凋落
    ├── ControlPanel.tsx    # 滑块、植物列表、清空按钮
    └── index.css        # 全局样式
```

## 4. 核心类型定义

```typescript
// 环境参数
interface EnvironmentParams {
  light: number;      // 0-100
  water: number;      // 0-100
  fertility: number;  // 0-100
}

// 生长阶段
type GrowthStage = 'seed' | 'sprout' | 'seedling' | 'mature' | 'flowering' | 'wilting';

// L-system 分支节点
interface BranchNode {
  x: number;
  y: number;
  angle: number;
  length: number;
  thickness: number;
  depth: number;
  children: BranchNode[];
  hasLeaves: boolean;
}

// 叶片
interface Leaf {
  x: number;
  y: number;
  angle: number;
  width: number;
  length: number;
  veinSeed: number;
}

// 花瓣
interface Petal {
  x: number;
  y: number;
  angle: number;
  radius: number;
  color: string;
  falling: boolean;
  fallStartTime?: number;
  rotationSpeed?: number;
}

// 植物
interface Plant {
  id: string;
  x: number;           // 根部X坐标
  y: number;           // 根部Y坐标
  stage: GrowthStage;
  stageProgress: number;    // 当前阶段进度 0-1
  totalProgress: number;       // 总体进度 0-1
  stageDuration: number;   // 当前阶段时长(ms)
  stageStartTime: number;  // 当前阶段开始时间
  plantedAt: number;      // 种植时间戳
  params: EnvironmentParams;   // 种植时的参数
  targetParams: EnvironmentParams;  // 目标参数(用于插值)
  paramsInterpolationStartTime: number; // 插值开始时间
  rootSystem: BranchNode | null;  // L-system生成的根系
  leaves: Leaf[];
  petals: Petal[];
  flowerCount: number;
  isWilting: boolean;
  wiltingProgress: number;    // 枯萎进度 0-1
  floweringEndTime: number;    // 开花结束时间
  petalDropIndex: number;      // 下一片要凋落的花瓣索引
  lastPetalDropTime: number;  // 上一次花瓣凋落时间
}

// 绘制指令
type DrawCommand =
  | { type: 'bezier'; x1: number; y1: number; cx: number; cy: number; x2: number; y2: number; thickness: number; color: string }
  | { type: 'ellipse'; x: number; y: number; rx: number; ry: number; angle: number; fillColor: string; veinSeed?: number }
  | { type: 'circle'; x: number; y: number; r: number; fillColor: string }
  | { type: 'seed'; x: number; y: number; r: number; fillColor: string };

// 风动状态
interface WindState {
  currentSway: number;     // 当前摆动角度(弧度)
  targetSway: number;       // 目标摆动角度
  swayAmplitude: number;    // 振幅
  swayPeriod: number;      // 周期(秒)
  lastMouseMoveTime: number;  // 上次鼠标移动时间
  lastMouseX: number;       // 上次鼠标X坐标
}

// 粒子
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
  color: string;
  alpha: number;
}
```

## 5. 核心模块设计

### 5.1 PlantEngine 生长引擎

**职责**：
- L-system分形算法生成植物结构
- 生长阶段更新与进度计算
- 环境参数插值过渡（1秒平滑过渡）
- 风动摇摆计算
- 生成绘制指令数组

**关键方法**：
- `generateLSystem(plant, stageProgress)`：根据阶段进度生成L-system结构
- `updatePlantStage(plant, currentTime)`：更新生长阶段
- `interpolateParams(plant, currentTime)`：参数插值计算
- `calculateWindSway(windState, dt, currentTime)`：风动计算
- `generateDrawCommands(plant, windSway, currentTime)`：生成Canvas绘制指令

### 5.2 ParticleSystem 粒子系统

**职责**：
- 根部辉光粒子创建、更新、回收
- 花瓣凋落动画（自由落体+旋转）
- 对象池管理（避免GC）

**关键方法**：
- `emitGlowParticles(plant, count)`：发射辉光粒子
- `updateParticles(dt)`：更新所有粒子
- `drawParticles(ctx)`：绘制粒子
- `dropPetal(plant, petal, currentTime)`：触发花瓣凋落

### 5.3 ControlPanel 参数面板

**职责**：
- 三个定制滑块（光照/水分/肥沃度）
- 植物记录列表（时间/阶段/参数/进度条）
- 清空花园按钮
- 参数变化回调

### 5.4 App 主组件

**职责**：
- 响应式布局（768px断点）
- Canvas挂载与尺寸管理
- 鼠标事件处理（种植/点击枯萎/风动）
- 植物列表状态管理
- 渲染循环（requestAnimationFrame）
- 帧率控制（30fps目标）
```
