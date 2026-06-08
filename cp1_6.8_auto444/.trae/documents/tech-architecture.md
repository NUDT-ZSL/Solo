## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端层"
        "index.html" --> "main.ts"
        "main.ts" --> "canvas.ts"
        "main.ts" --> "brush.ts"
        "main.ts" --> "ink.ts"
        "main.ts" --> "ui.ts"
    end

    subgraph "渲染层"
        "canvas.ts" --> "Canvas 2D API"
        "brush.ts" --> "canvas.ts"
        "ink.ts" --> "canvas.ts"
    end

    subgraph "交互层"
        "ui.ts" --> "DOM事件"
        "鼠标/触屏事件" --> "brush.ts"
        "鼠标/触屏事件" --> "ink.ts"
    end

    subgraph "动画层"
        "canvas.ts" --> "requestAnimationFrame"
        "ink.ts" --> "扩散算法"
        "ink.ts" --> "褪色算法"
    end
```

## 2. 技术说明

- **前端**：纯TypeScript + Canvas 2D API + Vite构建
- **初始化工具**：Vite (vanilla-ts template)
- **后端**：无（纯前端应用）
- **数据库**：无
- **构建工具**：Vite 5.x
- **语言**：TypeScript 5.x，目标ES2020

## 3. 路由定义

本项目为单页面应用，无路由切换。

| 路径 | 用途 |
|------|------|
| / | 唯一页面，包含画布和控制面板 |

## 4. 文件结构

```
project/
├── index.html              # 入口HTML，宣纸背景、布局容器
├── package.json            # 项目依赖和脚本
├── tsconfig.json           # TypeScript配置
├── vite.config.js          # Vite构建配置
└── src/
    ├── main.ts             # 应用入口，初始化Canvas和事件绑定
    ├── canvas.ts           # Canvas渲染引擎，动画循环(requestAnimationFrame)
    ├── brush.ts            # 画笔逻辑：描边生成、压力感应、浓淡控制、边缘锯齿
    ├── ink.ts              # 墨迹系统：扩散算法、褪色算法、爆散聚拢效果
    └── ui.ts               # 控制面板UI：滑块、按钮、响应式切换
```

## 5. 核心数据结构

### 5.1 墨迹点(StrokePoint)

```typescript
interface StrokePoint {
  x: number
  y: number
  pressure: number      // 0-1，模拟压力
  timestamp: number     // 创建时间
  opacity: number       // 当前透明度
  radius: number        // 当前半径
}
```

### 5.2 墨迹对象(InkParticle)

```typescript
interface InkParticle {
  x: number
  y: number
  radius: number        // 基础半径
  currentRadius: number // 当前扩散半径
  opacity: number       // 当前透明度(0-1)
  inkAmount: number     // 墨量(0-1)
  spreadSpeed: number   // 扩散速度
  fadeRate: number      // 褪色速率
  createdAt: number     // 创建时间
  type: 'stroke' | 'splash'  // 类型：笔触或爆散
  merged: boolean       // 是否已融合
}
```

### 5.3 爆散墨点(SplashDot)

```typescript
interface SplashDot {
  x: number
  y: number
  originX: number
  originY: number
  targetX: number       // 爆散目标位置
  targetY: number
  radius: number
  opacity: number
  phase: 'explode' | 'gather'  // 阶段：爆散或聚拢
  progress: number      // 0-1动画进度
  speed: number
}
```

## 6. 核心算法

### 6.1 晕染扩散

- 每帧根据`inkAmount`和`spreadSpeed`计算扩散增量
- 扩散半径增长：`deltaRadius = spreadSpeed * inkAmount * deltaTime * 0.02`
- 墨量递减：`inkAmount -= deltaTime * 0.001`
- 使用径向渐变绘制：中心浓黑，边缘淡蓝灰半透明

### 6.2 褪色算法

- 透明度线性递减：`opacity -= deltaTime * fadeRate * 0.001`
- 保留最低痕迹：`opacity = Math.max(0.08, opacity)`
- 颜色从黑色(#1A1A1A)渐变到浅灰色(#999)

### 6.3 爆散聚拢

- 点击时生成10-20个SplashDot
- 爆散阶段(0-0.4秒)：ease-out曲线，向目标位置移动
- 聚拢阶段(0.4-1.2秒)：ease-in-out曲线，向中心聚拢
- 聚拢完成后融合为较大InkParticle

### 6.4 笔触渲染

- 使用贝塞尔曲线平滑连接StrokePoint
- 线宽根据pressure动态变化：`lineWidth = baseWidth * (0.3 + 0.7 * pressure)`
- 边缘锯齿：对法线方向添加Perlin噪声偏移
- 浓淡控制：opacity = inkDensity * pressure

## 7. 性能优化策略

- 墨迹对象池：限制同时在屏粒子数量(≤500)，超出时移除最旧对象
- 离屏Canvas：已完成的笔触渲染到离屏Canvas，减少每帧重绘量
- 脏区域标记：仅重绘发生变化的区域
- requestAnimationFrame：确保60fps同步刷新
- 移动端：降低粒子数量上限，使用设备像素比适配
