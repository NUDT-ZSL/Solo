## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端层"
        "UIComponents.tsx" -- "状态管理(zustand)" --> "GameEngine.ts"
        "GameEngine.ts" --> "PuzzleBoard.ts"
        "GameEngine.ts" --> "FragmentManager.ts"
        "GameEngine.ts" --> "ArtGenerator.ts"
        "PuzzleBoard.ts" --> "FragmentManager.ts"
    end
    subgraph "渲染层"
        "ArtGenerator.ts" -- "Canvas 2D API" --> "画作纹理"
        "FragmentManager.ts" -- "碎片切割" --> "碎片图像数据"
    end
```

## 2. 技术说明

- **前端框架**：React 18 + TypeScript + Vite
- **状态管理**：Zustand（游戏状态、关卡进度、计时得分）
- **样式方案**：Tailwind CSS + CSS 自定义属性（主题色）
- **动画方案**：requestAnimationFrame + CSS transitions/animations（弹性缓动用JS实现，UI过渡用CSS）
- **项目模板**：react-ts（Vite + React + TypeScript + Tailwind + Zustand）
- **后端**：无（纯前端游戏）
- **数据库**：无（状态存储在内存和 localStorage）

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 游戏主画板页面（默认进入第1关或上次进度） |
| /levels | 关卡选择页面 |

## 4. 模块职责

### 4.1 ArtGenerator.ts
- 使用 Canvas 2D API 绘制抽象油画
- 支持两种风格：抽象表现主义（大胆色块、不规则形状）和印象派（柔和渐变、点状笔触）
- 每关随机生成不同配色方案和构图
- 画作持续缓慢变化（通过定时重绘微调参数）

### 4.2 FragmentManager.ts
- 将完整画作切割为网格碎片（4/9/16/25/36块）
- 碎片形状不规则化（对网格边界添加随机偏移）
- 为每个碎片添加微弱色调偏移（hue-rotate ±5°）
- 随机旋转部分碎片（±15°）
- 碎片打散到画板随机位置
- 碎片合并动画（微光脉动效果）

### 4.3 PuzzleBoard.ts
- 管理碎片在画板上的位置
- 处理拖拽交互（mousedown/mousemove/mouseup）
- 碰撞检测：碎片接近正确位置时吸附（阈值20px）
- 弹性缓动动画：拖拽释放时碎片平滑回弹或吸附
- 旋转修正：拖拽过程中碎片旋转角度渐变回0°

### 4.4 GameEngine.ts
- 游戏主循环（requestAnimationFrame 驱动）
- 关卡管理：初始化关卡、切换关卡、难度递增
- 计时器：记录每关耗时
- 得分计算：基于完成速度和关卡难度
- 完成检测：判定所有碎片是否归位
- 触发过渡动画：完成后的脉动→闪烁→淡入淡出

### 4.5 UIComponents.tsx
- PuzzleCanvas 组件：渲染画板和碎片（Canvas元素 + HTML覆盖层用于拖拽）
- ControlPanel 组件：毛玻璃控制面板（关卡、耗时、得分）
- LevelSelect 组件：关卡选择界面
- GameApp 根组件：路由和整体布局

## 5. 数据模型

### 5.1 核心数据结构

```typescript
interface Fragment {
  id: number;
  correctX: number;
  correctY: number;
  currentX: number;
  currentY: number;
  rotation: number;
  targetRotation: number;
  hueShift: number;
  width: number;
  height: number;
  isLocked: boolean;
  imageData: ImageData;
}

interface Level {
  levelNumber: number;
  gridCols: number;
  gridRows: number;
  style: 'abstract' | 'impressionist';
  colorPalette: string[];
  isCompleted: boolean;
  bestTime: number | null;
}

interface GameState {
  currentLevel: number;
  fragments: Fragment[];
  elapsedTime: number;
  score: number;
  isPlaying: boolean;
  isTransitioning: boolean;
}
```
