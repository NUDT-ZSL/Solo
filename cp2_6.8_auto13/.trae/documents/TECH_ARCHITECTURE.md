## 1. 架构设计
纯前端单页应用，无后端依赖。采用TypeScript面向对象设计，将粒子物理逻辑与UI渲染分离。

```mermaid
graph TD
    "index.html" --> "UI层（DOM元素、按钮、画布）"
    "UI层" --> "src/main.ts（主控制器、事件绑定、主循环）"
    "src/main.ts" --> "src/grid.ts（网格管理器、碰撞检测、状态转换）"
    "src/grid.ts" --> "src/particle.ts（Particle接口、各类粒子实现）"
    "src/particle.ts" --> "粒子物理更新（重力、流动、燃烧）"
```

## 2. 技术栈说明
- **前端语言**：TypeScript（严格模式，ES模块）
- **渲染技术**：HTML5 Canvas 2D API
- **构建工具**：Vite
- **物理引擎**：自研网格细胞自动机（非刚体物理，基于网格的粒子系统）
- **动画驱动**：requestAnimationFrame
- **无后端、无数据库**：纯客户端运行

## 3. 项目文件结构
```
/
├── package.json          # 依赖: typescript, vite；启动脚本: npm run dev
├── index.html            # 入口页面，含画布、工具栏、状态栏DOM结构和CSS样式
├── vite.config.js        # Vite构建配置
├── tsconfig.json         # TypeScript严格模式配置
└── src/
    ├── main.ts           # 初始化画布、UI事件绑定、requestAnimationFrame主循环
    ├── particle.ts       # Particle接口 + Sand/Water/Fire/Wood类实现
    └── grid.ts           # Grid类：二维数组网格、粒子管理、碰撞、状态转换
```

## 4. 核心数据结构

### 4.1 Particle 接口
```typescript
interface Particle {
    type: 'sand' | 'water' | 'fire' | 'wood' | 'steam' | 'ash';
    x: number;
    y: number;
    updated: boolean;  // 本帧是否已更新（防止重复更新）
    update(grid: Grid): void;
}
```

### 4.2 Grid 类
```typescript
class Grid {
    width: number;   // 400列（800px / 2px每颗粒）
    height: number;  // 300行（600px / 2px每颗粒）
    cells: (Particle | null)[][];  // 二维网格数组
    particleCount: number;
    
    getCell(x: number, y: number): Particle | null;
    setCell(x: number, y: number, p: Particle | null): void;
    isInBounds(x: number, y: number): boolean;
    spawnParticle(type: ParticleType, x: number, y: number, brushSize: number): void;
    removeAt(x: number, y: number, brushSize: number): void;
    clear(): void;
    updateAll(): void;  // 遍历所有粒子调用update()
}
```

### 4.3 颗粒类型行为
| 类型 | 颜色 | 物理行为 |
|------|------|----------|
| 沙(Sand) | #e6c86e（黄色，微随机） | 受重力下落，可堆叠，稳定土堆，遇水静止 |
| 水(Water) | #5a9fd4（蓝色，微随机） | 流动性、左右扩散、向下渗透，灭火 |
| 火(Fire) | #ff6b35（橙红色，微随机） | 向上飘动，有寿命，遇木点燃木头，遇水熄灭 |
| 木(Wood) | #8b5a2b（棕色，微随机） | 静止，遇火燃烧，燃烧后化为灰烬 |
| 蒸汽(Steam) | #cccccc（灰白） | 向上飘散，逐渐消失 |
| 灰烬(Ash) | #666666（灰色） | 类似沙子，但颜色较暗 |

## 5. 渲染与性能优化

### 5.1 渲染策略
- 每个颗粒渲染为2x2像素方块
- 使用 ImageData 批量写入像素，避免逐像素绘制
- 仅重绘有变化的区域（或整帧重绘，取决于性能表现）

### 5.2 物理更新优化
- **顺序随机化**：每帧从底部向上遍历，或随机选择遍历方向，避免更新顺序导致的偏置
- **updated标记**：每颗粒每帧只更新一次，防止新位置的粒子被重复更新
- **网格索引**：直接通过二维数组下标访问，O(1)查找邻居
- **边界检测**：数组下标检查，简单高效

### 5.3 性能目标
- 单帧更新时间 < 16ms（60FPS）
- 10000颗粒时 < 33ms（30FPS）
- 使用 requestAnimationFrame 驱动，独立于UI渲染

## 6. 交互逻辑

### 6.1 绘制
- 鼠标按下 + 移动：按 brushSize 正方形区域生成粒子
- 粒子生成频率：每像素间隔生成，避免过度密集
- 右键：擦除指定区域粒子

### 6.2 画笔大小
- 1x1, 3x3, 5x5 三种可选
- 绘制时以鼠标位置为中心

### 6.3 暂停机制
- 暂停标志位控制 updateAll() 调用
- 暂停时绘制/擦除仍可用
- 恢复时从当前状态继续
