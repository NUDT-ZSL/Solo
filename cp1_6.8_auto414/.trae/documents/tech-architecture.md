## 1. 架构设计

```mermaid
graph TD
    "React App (App.tsx)" --> "GameCanvas (Canvas渲染层)"
    "React App (App.tsx)" --> "ControlPanel (状态栏UI层)"
    "React App (App.tsx)" --> "BeatIndicator (节拍指示器UI层)"
    "GameCanvas (Canvas渲染层)" --> "游戏循环 (requestAnimationFrame)"
    "游戏循环 (requestAnimationFrame)" --> "物理更新"
    "游戏循环 (requestAnimationFrame)" --> "碰撞检测"
    "游戏循环 (requestAnimationFrame)" --> "Canvas渲染"
    "Canvas渲染" --> "轨道渲染"
    "Canvas渲染" --> "主角渲染+粒子"
    "Canvas渲染" --> "障碍物渲染"
    "Canvas渲染" --> "音符碎片渲染"
    "Canvas渲染" --> "特效渲染"
    "React App (App.tsx)" --> "Zustand Store (状态管理)"
    "Zustand Store (状态管理)" --> "游戏状态"
    "Zustand Store (状态管理)" --> "分数/连击/生命值"
    "Zustand Store (状态管理)" --> "节拍序列数据"
```

## 2. 技术说明

- 前端框架：React 18 + TypeScript
- 构建工具：Vite
- 状态管理：Zustand
- 样式方案：Tailwind CSS + CSS变量（霓虹主题色）
- 渲染核心：HTML5 Canvas 2D（requestAnimationFrame 60fps游戏循环）
- 无后端：纯前端游戏，节拍数据由内置算法生成

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 游戏主页面（单页应用） |

## 4. 项目文件结构

| 文件 | 职责 |
|------|------|
| src/main.tsx | 应用入口，挂载React根组件 |
| src/App.tsx | 主组件，管理游戏状态和布局，协调Canvas与UI层 |
| src/components/GameCanvas.tsx | 核心游戏Canvas，处理游戏循环、渲染、碰撞、物理 |
| src/components/BeatIndicator.tsx | 右下角毛玻璃节拍指示器组件 |
| src/components/ControlPanel.tsx | 顶部状态栏（分数/连击/生命值）和暂停按钮 |
| src/store/gameStore.ts | Zustand状态管理，分数/连击/生命/节拍序列 |
| package.json | 项目依赖和脚本 |
| vite.config.ts | Vite构建配置 |
| tsconfig.json | TypeScript配置 |

## 5. 核心数据模型

### 5.1 游戏对象类型定义

```typescript
interface BeatNote {
  time: number;
  lane: 0 | 1 | 2;
  type: 'note' | 'obstacle';
  obstacleType?: 'dodge_left' | 'dodge_right' | 'jump' | 'slide';
  collected: boolean;
  hit: boolean;
}

interface PlayerState {
  lane: 0 | 1 | 2;
  y: number;
  isJumping: boolean;
  isSliding: boolean;
  jumpVelocity: number;
  targetLane: 0 | 1 | 2;
}

interface GameState {
  score: number;
  combo: number;
  maxCombo: number;
  lives: number;
  isPaused: boolean;
  isPlaying: boolean;
  beatNotes: BeatNote[];
  player: PlayerState;
  particles: Particle[];
  screenShake: number;
  flashAlpha: number;
}
```

### 5.2 游戏循环架构

```mermaid
flowchart LR
    "requestAnimationFrame" --> "计算deltaTime"
    "计算deltaTime" --> "更新游戏逻辑"
    "更新游戏逻辑" --> "更新主角位置"
    "更新主角位置" --> "更新障碍物/音符位置"
    "更新障碍物/音符位置" --> "碰撞检测"
    "碰撞检测" --> "更新粒子系统"
    "更新粒子系统" --> "Canvas渲染"
    "Canvas渲染" --> "requestAnimationFrame"
```

### 5.3 节拍生成算法

- BPM: 120（可配置）
- 每拍生成0-2个音符和0-1个障碍
- 音符随机分配到3条轨道
- 障碍类型随机，确保同一时间不会出现无法躲避的组合
- 节拍判断窗口：Perfect ±50ms，Good ±120ms，Miss >120ms
