## 1. 架构设计

```mermaid
graph TD
    subgraph "表现层"
        A["src/main.ts (主入口)
        B["src/ui/ControlPanel.tsx (控制面板)"]
    end
    
    subgraph "生态系统层"
        C["src/ecosystem/Ecosystem.ts (生态引擎)
    end
    
    subgraph "实体层"
        D["src/entities/Fish.ts (小鱼)"]
        E["src/entities/Predator.ts (大鱼)"]
        F["src/entities/Algae.ts (海藻)"]
    end
    
    subgraph "渲染层"
        G["Canvas API"]
    end
    
    A -->|协调| B
    A -->|管理| C
    C -->|更新| D
    C -->|更新| E
    C -->|更新| F
    A -->|渲染| G
    B -->|用户操作| C
    C -->|回调更新UI| A
    D -->|继承| E
```

## 2. 技术描述

- **前端框架**：React 18 + TypeScript 5 + Vite 5
- **渲染引擎**：Canvas 2D API
- **初始化工具**：vite-init
- **状态管理**：React useState/useRef（轻量级状态）
- **动画系统**：requestAnimationFrame 60fps渲染循环
- **算法实现**：Boids群游算法、碰撞检测、生态稳定性算法

## 3. 模块职责

### 3.1 实体模块 (src/entities/)
- **Fish.ts**：小鱼类，实现Boids群游算法、碰撞检测、吃海藻行为
- **Predator.ts**：大鱼类，继承Fish，实现追逐小鱼群、捕食行为
- **Algae.ts**：海藻类，实现生长、繁殖行为

### 3.2 生态系统模块 (src/ecosystem/)
- **Ecosystem.ts**：生态引擎，管理所有生物数组，每帧更新生物状态，计算种群统计、稳定性评分，检测生态事件

### 3.3 UI模块 (src/ui/)
- **ControlPanel.tsx**：React组件，右侧控制面板，投放按钮和状态显示

### 3.4 主模块 (src/)
- **main.ts**：应用入口，初始化Canvas、渲染循环、UI挂载、连接各模块

## 4. 核心数据结构

### 4.1 生物基类属性
```typescript
interface Entity {
  x: number;
  y: number;
  radius: number;
}
```

### 4.2 小鱼属性
```typescript
interface Fish extends Entity {
  vx: number;
  vy: number;
  groupID: number;
  eatTimer: number;
}
```

### 4.3 大鱼属性
```typescript
interface Predator extends Fish {
  target: Fish | null;
  eatCount: number;
}
```

### 4.4 海藻属性
```typescript
interface Algae extends Entity {
  age: number;
  reproduceTimer: number;
}
```

### 4.5 生态状态
```typescript
interface EcosystemStats {
  fishCount: number;
  predatorCount: number;
  algaeCount: number;
  stabilityScore: number;
  events: EcosystemEvent[];
}
```

## 5. 核心算法

### 5.1 Boids群游算法
- 分离原则：避免与群内其他鱼保持最小距离
- 对齐原则：与群内其他鱼速度方向对齐
- 凝聚原则：向群内其他鱼平均位置移动

### 5.2 生态稳定性评分
- 基于三种生物数量比例计算：
  - 理想比例：小鱼:大鱼:海藻 ≈ 5:1:10
  - 评分 = 100 - Σ|实际比例 - 理想比例| × 权重
  - 低于30分时触发警告

### 5.3 碰撞检测
- 圆形碰撞检测：距离 < 半径之和

## 6. 性能优化
- 使用对象池管理生物实体
- 空间分区优化碰撞检测
- requestAnimationFrame确保60fps流畅渲染
- 限制最大生物数量防止性能下降
