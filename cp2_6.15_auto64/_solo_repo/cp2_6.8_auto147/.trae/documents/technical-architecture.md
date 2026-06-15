## 1. 架构设计

```mermaid
graph TD
    A["HTML入口 (index.html)"] --> B["main.ts - 入口与游戏循环"]
    B --> C["game.ts - 游戏核心逻辑"]
    B --> D["renderer.ts - Canvas渲染"]
    B --> E["input.ts - 键盘输入管理"]
    C --> F["状态: 虫身、障碍物、食物、分数、粒子"]
    D --> G["绘制: 网格、虫身、食物、障碍物、粒子、UI"]
    E --> H["方向键、Shift闪烁模式"]
    C --> I["localStorage - 最高分存储"]
```

## 2. 技术描述

- 前端：TypeScript + HTML5 Canvas + Vite
- 构建工具：Vite 5.x
- 包管理：npm
- 无后端服务，纯前端实现
- 数据存储：localStorage（历史最高分）

## 3. 文件结构

```
项目根目录/
├── package.json          # 项目依赖和脚本
├── index.html            # 入口HTML页面
├── vite.config.js        # Vite构建配置
├── tsconfig.json         # TypeScript配置
└── src/
    ├── main.ts           # 游戏入口，主循环，状态管理
    ├── game.ts           # 游戏逻辑：碰撞检测、食物生成、计分等
    ├── renderer.ts       # Canvas渲染：所有视觉元素绘制
    └── input.ts          # 键盘输入管理
```

## 4. 核心数据模型

### 4.1 类型定义

```typescript
interface Position {
  x: number;
  y: number;
}

interface SnakeSegment {
  position: Position;
  color: string;
}

interface Obstacle {
  position: Position;
  size: number;
  opacity: number;
  fading: boolean;
}

interface Food {
  position: Position;
}

interface Particle {
  position: Position;
  velocity: Position;
  color: string;
  radius: number;
  life: number;
  maxLife: number;
}

interface TrailPoint {
  position: Position;
  color: string;
  life: number;
  maxLife: number;
}

type Direction = 'up' | 'down' | 'left' | 'right';
type GameState = 'ready' | 'playing' | 'gameover';
```

## 5. 性能优化

- 固定60FPS游戏循环，使用requestAnimationFrame
- 粒子数量峰值限制在500个以内，超过时自动清理过期粒子
- 使用离屏绘制优化网格背景
- 避免在渲染循环中创建新对象，复用对象池
