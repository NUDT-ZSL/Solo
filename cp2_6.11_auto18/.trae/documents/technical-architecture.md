## 1. 架构设计

```mermaid
flowchart TD
    "index.html" --> "main.ts"
    "main.ts" --> "GameManager.ts"
    "GameManager.ts" --> "Renderer.ts"
    "用户输入(点击/滑动)" --> "main.ts"
    "main.ts" --> "事件分发"
    "事件分发" --> "GameManager.ts"
    "GameManager.ts" --> "游戏状态更新"
    "游戏状态更新" --> "Renderer.ts"
    "Renderer.ts" --> "Canvas绘制"
```

**数据流向**：用户输入 → main.ts（事件监听）→ GameManager.ts（状态更新/碰撞检测/难度计算）→ Renderer.ts（图形绘制）→ Canvas

## 2. 技术说明

- 前端：TypeScript + Canvas 2D API + Vite
- 构建工具：Vite（支持HMR热更新）
- 无后端、无数据库、纯前端单页游戏
- 无第三方UI框架，全部使用Canvas原生绘制

## 3. 文件结构

| 文件路径 | 职责 | 调用关系 |
|----------|------|----------|
| package.json | 项目依赖与脚本 | 被npm/vite读取 |
| vite.config.js | Vite构建配置，支持HMR | 被vite读取 |
| tsconfig.json | TypeScript配置(严格模式,ES2020) | 被tsc读取 |
| index.html | 入口页面，深绿到深蓝渐变背景 | 加载main.ts |
| src/main.ts | 入口脚本：初始化Canvas、创建游戏实例、启动主循环、监听用户输入 | 调用GameManager |
| src/GameManager.ts | 游戏核心逻辑：状态管理、图腾柱生成、碰撞检测、得分计算、难度递增 | 调用Renderer |
| src/Renderer.ts | 所有图形绘制：背景星空、图腾柱旋转/缩放、手抓点光晕、玩家小人、粒子效果、UI元素 | 被GameManager调用 |

## 4. 核心数据模型

### 4.1 图腾柱环层

```typescript
interface RingLayer {
  color: string;
  gripPoints: GripPoint[];
  y: number;
}

interface GripPoint {
  x: number;
  y: number;
  color: string;
  radius: number;
  glowRadius: number;
  scaleAnim: number;
}
```

### 4.2 玩家状态

```typescript
interface Player {
  x: number;
  y: number;
  radius: number;
  isFalling: boolean;
  fallSpeed: number;
  comboCount: number;
  isCombo: boolean;
  pulseTimer: number;
}
```

### 4.3 游戏状态

```typescript
interface GameState {
  score: number;
  layerIndex: number;
  targetColor: string;
  rotation: number;
  rotationSpeed: number;
  scale: number;
  isGameOver: boolean;
  isRunning: boolean;
  particles: Particle[];
  stars: Star[];
}
```

## 5. 性能策略

- 主循环使用requestAnimationFrame保持60FPS
- 帧率监控：每秒计算实际FPS，低于40FPS时自动降低粒子数量（20→8）
- 粒子池复用：预分配粒子对象，避免频繁GC
- Canvas分层：单Canvas但在绘制时按层次清空重绘
- 几何缓存：图腾柱的圆点位置在生成时计算，旋转通过Canvas变换实现

## 6. 关键算法

- **图腾柱生成**：随机5-8层，每层随机选2-4个位置放置手抓点，颜色从6色中随机选但保证至少2种颜色且相邻层颜色不同
- **碰撞检测**：将鼠标/触摸坐标转换到图腾柱坐标系（考虑旋转和缩放），检测点击位置是否在某个手抓点圆内
- **难度曲线**：旋转速度 = 0.5 + score/100 * 0.1；缩放 = max(0.7, 1.0 - layerIndex * 0.005)；每10层新增环层
- **坠落动画**：玩家变为红色光点，以加速度下落，每帧生成粒子，粒子1秒后淡出消失
