## 1. 架构设计

```mermaid
flowchart TD
    subgraph "前端层"
        "index.html" --> "main.ts"
        "main.ts" --> "CloudManager"
        "main.ts" --> "LightingController"
        "main.ts" --> "ControlPanel (内联UI)"
        "main.ts" --> "SnapshotManager (内联逻辑)"
        "CloudManager" --> "PerlinNoise"
        "LightingController" --> "Three.js DirectionalLight"
    end
    subgraph "渲染层"
        "Three.js Scene" --> "WebGL Renderer"
        "CloudManager" --> "Three.js Points/BufferGeometry"
    end
```

## 2. 技术说明

- 前端：TypeScript + Three.js + Vite（纯前端项目，无后端）
- 初始化工具：Vite
- 构建：Vite + TypeScript（ES2022严格模式）
- 无后端、无数据库

## 3. 文件结构与调用关系

| 文件 | 职责 | 被调用方 | 调用方 |
|------|------|----------|--------|
| package.json | 依赖管理 | - | npm/vite |
| vite.config.js | 构建配置 | - | vite |
| tsconfig.json | TS配置 | - | tsc |
| index.html | 入口页面 | - | vite |
| src/main.ts | 场景初始化、动画循环、UI控制 | CloudManager, LightingController | 浏览器 |
| src/cloudManager.ts | 云层粒子生成、更新、销毁 | Three.js Points | main.ts |
| src/lightingController.ts | 光照方向、强度、颜色控制 | Three.js DirectionalLight | main.ts |
| src/perlinNoise.ts | Perlin噪声算法 | - | cloudManager.ts |

### 数据流向

```
用户交互(滑块/点击) → main.ts(事件处理)
  → CloudManager.update(风速,湿度,温度) → 更新粒子位置/大小/颜色
  → LightingController.update(时间) → 更新光照角度/颜色
  → 动画循环 → 渲染
```

## 4. 核心模块设计

### 4.1 CloudManager

- 使用 Three.js BufferGeometry + Points 渲染粒子
- 1000个粒子，每个粒子包含：位置(x,y,z)、大小、颜色
- Perlin噪声驱动粒子位置偏移，模拟云流动
- 参数影响：风速→移动速度/方向，湿度→密度/大小，温度→颜色冷暖
- Raycaster实现点击检测
- 光晕脉冲效果：点击时创建临时发光Sprite

### 4.2 LightingController

- 单一 DirectionalLight + AmbientLight
- 时间参数控制光照角度（模拟日出到日落）
- 颜色温度随时间变化（暖色→冷色）

### 4.3 快照系统

- 快照数据：{粒子位置数组, 参数值, 缩略图canvas}
- 最多5条，LRU淘汰
- 恢复时使用 lerp 插值，3秒过渡

## 5. 性能策略

- BufferGeometry直接操作属性数组，避免每帧创建对象
- 粒子更新使用批量操作，减少GPU draw call
- 使用 PointsMaterial 减少渲染开销
- requestAnimationFrame + deltaTime 控制帧率
