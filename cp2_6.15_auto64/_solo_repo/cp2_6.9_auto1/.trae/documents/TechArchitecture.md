## 1. 架构设计

```mermaid
flowchart TD
    subgraph "表现层"
        A["index.html (全屏Canvas容器)"]
        B["src/ui.ts (HUD控制面板)"]
    end
    subgraph "应用层"
        C["src/main.ts (入口初始化)"]
    end
    subgraph "核心模块"
        D["src/CityManager.ts (城市建筑管理)"]
        E["src/WeatherSystem.ts (天气系统)"]
    end
    subgraph "渲染引擎层"
        F["Three.js 渲染引擎"]
    end
    A --> C
    B -->|用户交互事件
    C -->|调用
    C --> D
    C --> E
    D --> F
    E --> F
    B -->|事件通知| D
    B -->|事件通知| E
```

## 2. 技术栈说明

- **前端框架**: 原生TypeScript (无React/Vue，纯Three.js应用)
- **3D引擎**: three@^0.160.0
- **类型定义**: @types/three@^0.160.0
- **构建工具**: vite@^5.0.0
- **开发语言**: TypeScript@^5.0.0 (严格模式，ESNext)
- **初始化方式**: 手动创建项目结构（非React/Vue模板）

## 3. 文件结构与职责

| 文件路径 | 职责说明 | 输入 | 输出/调用关系 |
|-----------|----------|------|---------------|
| package.json | 项目依赖与脚本配置 | - | 启动脚本 "dev": "vite" |
| vite.config.js | Vite构建配置 | - | 基础构建配置 |
| tsconfig.json | TypeScript编译配置 | - | strict: true, target: ESNext |
| index.html | 入口页面，提供全屏canvas容器 | - | DOM容器 |
| src/main.ts | 入口：初始化场景、相机、渲染器，启动动画循环 | - | 调用CityManager和WeatherSystem |
| src/CityManager.ts | 生成城市建筑群，管理建筑材质和阴影 | 时钟时间 → 更新光照和阴影 | 数据流向：接收时钟时间 |
| src/WeatherSystem.ts | 管理雨/雪粒子系统、雾浓度、天空盒颜色 | 天气模式参数 → 更新粒子、雾和背景 | 数据流向：接收天气模式 |
| src/ui.ts | 渲染HUD控制面板，事件通知其他模块 | 用户交互 → 触发数据更新 | 通过事件Emitter通知CityManager和WeatherSystem |

## 4. 事件与数据流向

```mermaid
sequenceDiagram
    participant U as 用户
    participant UI as src/ui.ts
    participant M as src/main.ts
    participant CM as src/CityManager.ts
    participant WS as src/WeatherSystem.ts
    participant T as Three.js

    U->>UI: 拖动时间滑块
    UI->>CM: emit('timeChange', hour)
    CM->>CM: 更新太阳位置
    CM->>T: DirectionalLight.position更新
    CM->>CM: 更新建筑窗口灯光(18:00-6:00亮灯)
    CM->>T: Mesh材质emissive更新

    U->>UI: 点击天气按钮
    UI->>WS: emit('weatherChange', mode)
    WS->>WS: 更新粒子系统
    WS->>T: Points系统更新
    WS->>WS: 更新雾浓度
    WS->>T: Scene.fog更新
    WS->>WS: 更新天空盒颜色
    WS->>T: Scene.background更新

    loop 动画循环
        M->>M: requestAnimationFrame
        M->>CM: update(deltaTime)
        M->>WS: update(deltaTime)
        M->>T: renderer.render()
    end
```

## 5. 数据模型

### 5.1 类型定义

```typescript
// 天气模式类型
type WeatherMode = 'sunny' | 'rain' | 'snow';

// 时间数据
interface TimeData {
  hour: number;           // 0-24小时
  isNight: boolean;    // 是否夜间
  sunPosition: { x: number; y: number; z: number };
  skyColor: string;
}

// 建筑数据
interface Building {
  mesh: THREE.Mesh;
  height: number;
  windows: Array<{
    mesh: THREE.Mesh;
    isLit: boolean;
  }>;
}

// 粒子数据
interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  age: number;
  maxAge: number;
}
```

## 6. 性能优化策略

### 6.1 粒子管理
- 粒子总数限制：≤2000个
- 粒子生命周期：每帧检查age > maxAge，自动移除超龄粒子
- 使用BufferGeometry批量渲染粒子

### 6.2 渲染优化
- 启用阴影映射但限制阴影贴图尺寸适中 (1024x1024
- 建筑使用合并几何体减少draw call
- 雾效用于视锥剔除优化

### 6.3 帧率监控
- 使用performance.now()监控帧率
- 粒子数量根据帧率动态调整
