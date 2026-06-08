## 1. 架构设计

```mermaid
flowchart TD
    subgraph "前端层"
        A["index.html 入口页面"]
        B["main.ts 初始化"]
        C["StarCanvas.ts 3D画布组件"]
        D["ControlPanel.ts 控制面板"]
        E["interaction.ts 交互逻辑"]
        F["starParticle.ts 粒子系统"]
        G["types.ts 类型定义"]
    end

    subgraph "渲染层 (Three.js)"
        H["Scene 场景"]
        I["PerspectiveCamera 相机"]
        J["WebGLRenderer 渲染器"]
        K["OrbitControls 轨道控制"]
        L["UnrealBloomPass 泛光"]
    end

    subgraph "粒子系统"
        M["StarParticle 星星粒子"]
        N["Trail 轨迹系统"]
        O["BurstParticle 爆散粒子"]
        P["BackgroundStar 背景星点"]
    end

    B --> C
    B --> D
    C --> H
    C --> I
    C --> J
    C --> K
    C --> L
    C --> F
    C --> E
    F --> M
    F --> N
    F --> O
    F --> P
    E --> C
    D --> C
```

## 2. 技术说明

- 前端：TypeScript + Three.js + Vite
- 初始化工具：Vite
- 后端：无
- 数据库：无

### 核心依赖

| 依赖 | 版本 | 用途 |
|-----|------|------|
| three | ^0.170.0 | 3D 渲染引擎 |
| @types/three | ^0.170.0 | Three.js 类型定义 |

### 开发依赖

| 依赖 | 版本 | 用途 |
|-----|------|------|
| typescript | ^5.6.0 | TypeScript 编译器 |
| vite | ^6.0.0 | 构建工具 |

## 3. 路由定义

| 路由 | 用途 |
|-----|------|
| / | 星空画布主页（单页应用，无路由） |

## 4. API 定义

无后端 API，纯前端项目。

## 5. 服务器架构图

无后端服务器。

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
classDiagram
    class StarParticle {
        +Vector3 position
        +Vector3 velocity
        +number life
        +number maxLife
        +number size
        +Color color
        +boolean isAlive
        +Trail trail
        +update(dt: number) void
        +burst() BurstParticle[]
    }

    class Trail {
        +Vector3[] points
        +Color color
        +number opacity
        +boolean isBursting
        +addPoint(point: Vector3) void
        +burst() BurstParticle[]
    }

    class BurstParticle {
        +Vector3 position
        +Vector3 velocity
        +number life
        +number maxLife
        +number size
        +Color color
        +number angle
        +number spiralRadius
        +boolean isAlive
        +update(dt: number) void
    }

    class BackgroundStar {
        +Vector3 position
        +number size
        +number opacity
        +number twinkleSpeed
        +number twinklePhase
        +update(dt: number) void
    }

    class AppConfig {
        +number starSize
        +number burstSpeed
    }

    StarParticle --> Trail : 拥有
    Trail --> BurstParticle : 产生
```

### 6.2 文件结构

```
src/
├── main.ts                  # 入口：初始化场景、相机、渲染器
├── components/
│   ├── StarCanvas.ts        # 核心3D画布组件
│   └── ControlPanel.ts      # 控制面板UI组件
├── utils/
│   ├── starParticle.ts      # 星星粒子类
│   └── interaction.ts       # 鼠标交互逻辑
├── types.ts                 # 类型定义
index.html                   # 入口HTML
package.json                 # 依赖和脚本
tsconfig.json                # TypeScript配置
vite.config.js               # 构建配置
```
