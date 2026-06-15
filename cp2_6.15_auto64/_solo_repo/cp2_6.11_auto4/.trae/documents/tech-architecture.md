## 1. 架构设计

```mermaid
flowchart TD
    subgraph "前端层"
        "index.html" --> "src/main.ts"
        "src/main.ts" --> "src/orchestrator.ts"
        "src/orchestrator.ts" --> "src/star.ts"
    end
    subgraph "渲染层"
        "src/main.ts" --> "Canvas 2D Context"
        "Canvas 2D Context" --> "星空背景"
        "Canvas 2D Context" --> "星轨与轨迹"
        "Canvas 2D Context" --> "连线与粒子"
    end
    subgraph "输入层"
        "键盘事件(1-7)" --> "src/main.ts"
        "点击/触摸事件" --> "src/main.ts"
        "控制面板" --> "src/main.ts"
    end
```

## 2. 技术说明

- 前端：TypeScript + Canvas 2D API + Vite
- 初始化工具：Vite（npm create vite）
- 后端：无
- 数据库：无
- 构建工具：Vite，支持HMR热更新
- 语言：TypeScript严格模式，目标ES2020

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 单页应用，全屏Canvas可视化主界面 |

## 4. 文件结构与调用关系

```
├── package.json              # 依赖：typescript、vite；脚本：npm run dev
├── vite.config.js            # Vite基础配置，支持HMR
├── tsconfig.json             # 严格模式，目标ES2020
├── index.html                # 入口页面，加载全局样式和main.ts
├── src/
│   ├── main.ts               # 应用主循环
│   │   ├── 创建Canvas并挂载
│   │   ├── 初始化Orchestrator
│   │   ├── 驱动requestAnimationFrame帧循环
│   │   ├── 监听resize响应式更新
│   │   ├── 接收键盘/点击输入 → 分发至Orchestrator
│   │   └── 渲染星空背景（静态星光点）
│   ├── orchestrator.ts       # 星轨控制器
│   │   ├── 管理Star数组
│   │   ├── 根据音符输入创建Star
│   │   ├── 检测碰撞（连线/融合逻辑）
│   │   ├── 管理粒子爆裂效果
│   │   ├── 控制密度和衰减参数
│   │   └── 每帧遍历调用Star.update() / Star.draw()
│   └── star.ts               # 单个星轨类
│       ├── 属性：位置、速度、颜色、轨迹数组、生命周期、亮度
│       ├── update()：更新位置、衰减亮度、缩短轨迹
│       └── draw()：渲染发光圆点+渐隐轨迹块
```

**数据流向：**

```
用户输入(键盘/点击) → main.ts(解析音符) → orchestrator.ts(创建Star/调整参数)
                                                         ↓
main.ts(每帧) → orchestrator.update() → star.update()×N
              → orchestrator.draw()   → star.draw()×N + 连线 + 粒子
              → main.ts(渲染背景)
```

## 5. 核心类型定义

```typescript
interface NoteInput {
  pitch: number;       // 1-7 七声音阶
  velocity: number;    // 0-1 力度
  x: number;           // 生成位置x
  y: number;           // 生成位置y
}

interface TrailPoint {
  x: number;
  y: number;
  radius: number;      // 4px → 1px
  alpha: number;       // 1.0 → 0
  color: string;       // 随时间变暗至灰色
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;      // 3-5px
  alpha: number;       // 衰减至0
  life: number;        // 2秒
  color: string;       // 浅金色
}

interface Connection {
  starA: Star;
  starB: Star;
  alpha: number;       // 0.6 → 0
  duration: number;    // 0.5秒
}

class Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  trail: TrailPoint[];
  brightness: number;
  lifetime: number;
  age: number;
  alive: boolean;
  update(dt: number): void;
  draw(ctx: CanvasRenderingContext2D): void;
}

class Orchestrator {
  stars: Star[];
  particles: Particle[];
  connections: Connection[];
  maxDensity: number;      // 30-80，默认50
  decayTime: number;       // 5-20秒，默认10
  addStar(note: NoteInput): void;
  checkCollisions(): void;
  update(dt: number): void;
  draw(ctx: CanvasRenderingContext2D): void;
  reset(): void;
}
```

## 6. 性能优化策略

- 星空背景（静态星光+渐变）预渲染到离屏Canvas，每帧直接drawImage
- 轨迹块数量限制（每颗星轨最多12个），超出则移除最早点
- 碰撞检测仅在距离阈值内进行，使用简单的双循环+距离平方比较（避免开方）
- 死亡Star及时从数组移除
- 连线对象池复用
- requestAnimationFrame时间戳计算dt，保证帧率无关的物理更新
