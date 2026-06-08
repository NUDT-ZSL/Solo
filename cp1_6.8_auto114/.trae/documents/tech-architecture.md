## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端层"
        "index.html" --> "App.tsx"
        "App.tsx" --> "GameCanvas.tsx"
        "App.tsx" --> "UILayer.tsx"
    end

    subgraph "游戏引擎层"
        "GameEngine.ts" --> "MazeGenerator.ts"
        "GameEngine.ts" --> "Totem.ts"
        "GameEngine.ts" --> "ParticleSystem.ts"
        "GameEngine.ts" --> "AudioManager.ts"
        "GameEngine.ts" --> "Renderer.ts"
    end

    subgraph "渲染层"
        "Renderer.ts" --> "Canvas 2D API"
    end
```

## 2. 技术说明

- **前端框架**：React@18 + TypeScript + Vite
- **初始化工具**：vite-init（react-ts模板）
- **状态管理**：zustand（管理游戏状态：关卡、碎片数、玩家位置）
- **后端**：无（纯前端游戏）
- **数据库**：无（状态保存在内存中）

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 游戏主页面（唯一的路由，游戏完全在单页运行） |

## 4. 文件结构

```
src/
├── App.tsx                    # 根组件，挂载游戏Canvas和UI层
├── main.tsx                   # 入口文件
├── index.css                  # 全局样式
├── GameEngine.ts              # 主循环、迷宫状态管理、碰撞检测、关卡切换
├── Totem.ts                   # 图腾眼睛图案生成、旋转动画、颜色方向状态
├── MazeGenerator.ts           # 随机迷宫地图生成、图腾放置、出口触发条件
├── ParticleSystem.ts          # 粒子系统（拖尾、爆发效果，上限150个）
├── AudioManager.ts            # Web Audio API音效管理
├── Renderer.ts                # Canvas 2D渲染器（背景、墙壁、图腾、玩家、粒子）
├── UILayer.tsx                # React组件：关卡信息、碎片计数、规则提示、重置按钮
├── store.ts                   # zustand状态管理
└── types.ts                   # TypeScript类型定义
```

## 5. 核心数据模型

### 5.1 类型定义

```typescript
type EyeColor = 'red' | 'blue' | 'green' | 'yellow'
type EyeDirection = 'up' | 'down' | 'left' | 'right'
type CellType = 'empty' | 'wall' | 'totem' | 'exit' | 'fragment'

interface TotemState {
  id: string
  gridX: number
  gridY: number
  eyeColor: EyeColor
  eyeDirection: EyeDirection
  isMatched: boolean
  rotationAngle: number
  targetAngle: number
  isChainSource: boolean
}

interface MazeCell {
  type: CellType
  totem?: TotemState
  isWalkable: boolean
}

interface PlayerState {
  gridX: number
  gridY: number
  pixelX: number
  pixelY: number
  targetPixelX: number
  targetPixelY: number
  moving: boolean
}

interface LevelConfig {
  level: number
  mazeWidth: number
  mazeHeight: number
  totemCount: number
  rule: LevelRule
  chainEnabled: boolean
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}
```

### 5.2 游戏状态模型（zustand）

```typescript
interface GameState {
  currentLevel: number
  fragments: number
  player: PlayerState
  maze: MazeCell[][]
  totems: TotemState[]
  isLevelComplete: boolean
  isGameComplete: boolean
  showRules: boolean
  
  // Actions
  rotateTotem: (totemId: string) => void
  movePlayer: (dx: number, dy: number) => void
  collectFragment: () => void
  resetLevel: () => void
  nextLevel: () => void
  toggleRules: () => void
  checkWinCondition: () => void
}
```

## 6. 核心算法

### 6.1 迷宫生成算法

使用递归回溯法（Recursive Backtracker）生成迷宫：
1. 从起点开始，随机选择一个未访问的相邻单元格
2. 移除两个单元格之间的墙壁
3. 递归继续，直到所有单元格都被访问
4. 在特定位置放置图腾和碎片

### 6.2 碰撞检测

基于网格的碰撞检测：
- 玩家移动时检查目标格子是否可通行（非墙壁）
- 图腾格子不可通行，需先完成配对才能通行
- 出口格子需碎片>=3才可通行

### 6.3 关卡规则验证

- **第一关**：遍历所有图腾，检查颜色是否全部相同且方向指向迷宫中心
- **第二关**：检查相邻图腾颜色互补（红↔绿、蓝↔黄），且方向朝内
- **第三关**：旋转一个图腾时，相邻图腾同步旋转90度，验证条件同第二关

### 6.4 粒子系统

- 对象池模式，上限150个粒子
- 每帧更新粒子位置和生命周期
- 生命周期结束的粒子回收到对象池
- 图腾旋转时从旋转位置发射5-10个粒子
- 配对成功时从图腾中心爆发20-30个金色粒子

## 7. 渲染管线

每帧渲染顺序（从底到顶）：
1. 清空画布
2. 绘制岩石纹理背景
3. 绘制迷宫墙壁
4. 绘制碎片（发光闪烁）
5. 绘制图腾（石柱+眼睛图案，配对的带光晕）
6. 绘制玩家角色（发光眼睛图标）
7. 绘制粒子效果
8. 绘制出口（金色光柱）
