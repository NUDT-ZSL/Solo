## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端层"
        "index.html" --> "main.ts"
        "main.ts" --> "orchestrator.ts"
        "orchestrator.ts" --> "star.ts"
    end
    subgraph "用户输入层"
        "键盘事件(1-7)" --> "main.ts"
        "鼠标/触摸事件" --> "main.ts"
        "控制面板事件" --> "main.ts"
    end
    subgraph "渲染层"
        "main.ts" --> "Canvas 2D Context"
        "star.ts" --> "Canvas 2D Context"
    end
```

### 数据流向

```
用户输入(键盘/点击) → main.ts(接收事件) → orchestrator.ts(创建/调整星轨) → star.ts(update位置/draw渲染)
控制面板(滑块/按钮) → main.ts(更新参数) → orchestrator.ts(调整密度/衰减)
main.ts(每帧循环) → orchestrator.ts(遍历stars调用update/draw) → star.ts(位置更新+绘制)
orchestrator.ts(碰撞检测) → star.ts(融合/连线) → Canvas渲染
```

## 2. 技术说明

- 前端框架：Vanilla TypeScript + Canvas 2D API（无React/Vue，纯Canvas渲染）
- 构建工具：Vite + TypeScript
- 初始化工具：Vite vanilla-ts 模板
- 后端：无
- 数据库：无

### 依赖列表

| 依赖 | 版本 | 用途 |
|------|------|------|
| typescript | ^5.0 | TypeScript编译 |
| vite | ^5.0 | 构建工具，HMR支持 |

## 3. 文件结构与职责

| 文件路径 | 职责 |
|----------|------|
| package.json | 项目依赖(typescript, vite)和启动脚本(npm run dev) |
| vite.config.js | Vite构建配置，支持HMR |
| tsconfig.json | TypeScript严格模式，目标ES2020 |
| index.html | 入口页面，加载main.ts，全局样式 |
| src/main.ts | 应用主循环：Canvas创建、星空背景、帧动画、输入事件分发、响应式布局、控制面板 |
| src/star.ts | 星轨类：位置/速度/颜色/轨迹/生命周期管理，提供update和draw方法 |
| src/orchestrator.ts | 星轨控制器：star数组管理、音符→星轨生成、碰撞融合、密度/衰变控制 |

### 模块间调用关系

```
main.ts
  ├── 创建 Orchestrator 实例
  ├── 每帧调用 orchestrator.update(dt) → 遍历star.update(dt)
  ├── 每帧调用 orchestrator.draw(ctx) → 遍历star.draw(ctx) + 连线/爆裂渲染
  ├── 接收键盘/点击事件 → orchestrator.spawnNote(note, velocity, position)
  ├── 接收控制面板事件 → orchestrator.setDensity() / orchestrator.setDecayTime() / orchestrator.reset()
  └── 窗口resize → 更新Canvas尺寸

star.ts
  ├── update(dt): 更新位置、轨迹、亮度、生命周期
  └── draw(ctx): 渲染发光圆点 + 渐隐轨迹块

orchestrator.ts
  ├── spawnNote(): 创建新Star
  ├── update(dt): 遍历stars.update + 碰撞检测 + 衰减管理
  ├── draw(ctx): 遍历stars.draw + 连线 + 爆裂粒子
  └── reset(): 清空所有stars
```

## 4. 核心算法

### 4.1 颜色插值

力度值0.0-1.0映射到青色(#00D4FF)→橙红(#FF6B35)的线性RGB插值。

### 4.2 碰撞检测

每帧遍历所有星轨对，计算欧几里得距离：
- 距离 < 30px：生成连线（记录连线和计时器，0.5秒后移除）
- 距离 < 10px：融合（合并为一颗，半径翻倍，颜色平均，速度×0.7，轨迹+50%），触发金色粒子爆裂

### 4.3 生命周期管理

每颗星轨创建时随机8-12秒寿命，到期后brightness每帧减0.02，轨迹长度相应缩短，brightness≤0时移除。

### 4.4 星空背景

- 径向渐变：中心#0A0E1A→边缘#0A1628
- 60-100颗静态星光：位置随机，亮度0.3-1.0正弦波动(周期2-4s随机)
