## 1. 架构设计

```mermaid
graph TD
    "React App (UILayer.tsx)" --> "GameEngine.ts"
    "GameEngine.ts" --> "LavaCave.ts"
    "GameEngine.ts" --> "DragonPlayer.ts"
    "GameEngine.ts" --> "Canvas 渲染层"
    "LavaCave.ts" --> "地图网格数据"
    "LavaCave.ts" --> "火把位置数据"
    "LavaCave.ts" --> "岩浆动画系统"
    "LavaCave.ts" --> "暗影怪物AI"
    "DragonPlayer.ts" --> "飞行物理系统"
    "DragonPlayer.ts" --> "龙息粒子系统"
    "DragonPlayer.ts" --> "生命值与天赋"
    "Canvas 渲染层" --> "黑暗遮罩"
    "Canvas 渲染层" --> "光照系统"
    "Canvas 渲染层" --> "粒子系统"
    "React App (UILayer.tsx)" --> "生命值HUD"
    "React App (UILayer.tsx)" --> "龙鳞计数HUD"
    "React App (UILayer.tsx)" --> "小地图HUD"
    "React App (UILayer.tsx)" --> "天赋菜单面板"
```

## 2. 技术说明

- 前端框架：React@18 + TypeScript
- 构建工具：Vite
- 样式方案：CSS Modules + CSS Variables（主题色管理）
- 渲染方案：HTML5 Canvas 2D（游戏主画面）+ React DOM（HUD覆盖层）
- 动画：requestAnimationFrame 主循环，60fps 目标帧率
- 状态管理：游戏状态由 GameEngine 单例管理，通过回调通知 React 层更新
- 无后端，纯前端单页应用
- 初始化工具：Vite

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 游戏主页面（唯一页面，包含游戏Canvas和HUD覆盖层） |

## 4. 文件结构

```
project-root/
├── index.html              # 入口HTML
├── package.json            # 依赖配置
├── vite.config.js          # Vite配置
├── tsconfig.json           # TypeScript配置
└── src/
    ├── main.tsx            # React入口
    ├── App.tsx             # 根组件
    ├── GameEngine.ts       # 主循环、地图生成、碰撞检测、状态管理
    ├── LavaCave.ts         # 洞穴网格生成、火把位置、岩浆动画、怪物AI
    ├── DragonPlayer.ts     # 烛龙飞行、龙息喷吐、生命值、天赋解锁
    └── UILayer.tsx         # React HUD组件（生命值、龙鳞、小地图、天赋菜单）
```

## 5. 核心模块设计

### 5.1 GameEngine.ts — 游戏引擎

**职责**：
- 管理 requestAnimationFrame 主循环
- 协调 LavaCave、DragonPlayer 的更新与渲染
- 碰撞检测（烛龙 vs 岩浆、烛龙 vs 怪物、龙息 vs 火把）
- 黑暗遮罩与光照系统渲染
- 游戏状态管理（当前层、生命值、龙鳞数）
- 通过回调通知 React 层状态变化

**核心接口**：
```typescript
interface GameState {
  level: number;
  health: number;
  maxHealth: number;
  scales: number;
  talents: Talent[];
  exploredTiles: Set<string>;
  gameOver: boolean;
}

type StateCallback = (state: GameState) => void;
```

### 5.2 LavaCave.ts — 熔岩洞穴

**职责**：
- 随机生成洞穴网格（使用元胞自动机或随机漫步算法）
- 放置火把、岩浆池、龙鳞、出口位置
- 管理暗影怪物（蝙蝠）的生成与AI行为
- 岩浆流动动画渲染
- 火把点燃状态与光照范围

**核心数据结构**：
```typescript
type TileType = 'wall' | 'floor' | 'lava' | 'torch' | 'exit';

interface CaveMap {
  width: number;
  height: number;
  tiles: TileType[][];
  torches: Torch[];
  monsters: Monster[];
  scales: Scale[];
}

interface Torch {
  x: number;
  y: number;
  lit: boolean;
  lightRadius: number;
}

interface Monster {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'bat';
  active: boolean;
}
```

### 5.3 DragonPlayer.ts — 烛龙玩家

**职责**：
- WASD/触摸方向键控制飞行（带惯性缓动）
- 空格/按钮喷吐扇形龙息
- 龙息粒子系统（扇形火焰效果）
- 生命值管理（受伤闪烁、死亡判定）
- 天赋系统（飞行速度、喷吐范围、生命上限等）
- 身体微光光晕渲染

**核心数据结构**：
```typescript
interface DragonState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  health: number;
  maxHealth: number;
  breathActive: boolean;
  breathAngle: number;
  breathRange: number;
  scales: number;
  talents: Map<string, number>;
}

interface Talent {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  costPerLevel: number[];
  effect: string;
}
```

### 5.4 UILayer.tsx — HUD界面

**职责**：
- 左上角：心形生命值图标 + 龙鳞金币计数
- 右上角：小地图（已探索区域 + 火把位置）
- 底部：天赋菜单按钮
- 天赋树面板：毛玻璃背景，树状节点，龙鳞解锁
- 移动端：虚拟方向键 + 喷吐按钮

**React组件结构**：
```
UILayer
├── HealthBar        // 心形生命值
├── ScaleCounter     // 龙鳞计数
├── MiniMap          // 小地图
├── TalentButton     // 天赋菜单入口按钮
├── TalentPanel      // 天赋树弹窗面板
└── MobileControls   // 移动端虚拟按键（条件渲染）
```

## 6. 渲染管线

每帧渲染顺序：
1. 清空Canvas
2. 绘制洞穴地面和墙壁（仅可见区域）
3. 绘制岩浆池（动态流动贴图）
4. 绘制龙鳞拾取物
5. 绘制火把（点燃态：暖光粒子 + 光照；未点燃：暗淡图标）
6. 绘制暗影怪物
7. 绘制烛龙（微光光晕 + 鳞片发光）
8. 绘制龙息粒子（如果激活）
9. 绘制黑暗遮罩（全屏黑色，火把和烛龙位置挖洞渐变）
10. React HUD层更新

## 7. 响应式策略

- Canvas 尺寸跟随窗口 resize 事件自适应
- 桌面端：监听 keydown/keyup 事件
- 移动端：检测触摸事件，渲染虚拟方向键和喷吐按钮
- HUD 元素使用 rem/vw 单位，适配不同屏幕
- 小地图尺寸按比例缩放
