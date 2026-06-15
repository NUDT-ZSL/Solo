## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端层"
        "main.ts" --> "terrainLoader.ts"
        "main.ts" --> "terrainRenderer.ts"
        "main.ts" --> "interaction.ts"
        "main.ts" --> "uiPanel.ts"
    end
    subgraph "数据层"
        "terrain_1024.csv" --> "terrainLoader.ts"
    end
    subgraph "渲染层"
        "terrainRenderer.ts" --> "Three.js Scene"
        "interaction.ts" --> "Three.js Scene"
    end
    subgraph "UI层"
        "uiPanel.ts" --> "DOM面板"
    end
```

## 2. 技术说明

- 前端框架：TypeScript + Three.js + Vite（纯前端，无后端）
- 构建工具：Vite
- 三维渲染：Three.js + OrbitControls + Raycaster
- 初始化工具：Vite + 手动配置（非React/Vue模板，因用户指定纯Three.js项目）
- 数据源：本地CSV文件模拟高度数据

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 唯一页面，包含三维地形场景与信息面板 |

## 4. 文件结构与模块职责

```
project/
├── package.json           # 依赖：three, @types/three, vite, typescript
├── index.html             # 入口页面，全屏布局
├── tsconfig.json          # 严格模式，ESNext目标
├── vite.config.js         # 基础构建配置
├── data/
│   └── terrain_1024.csv   # 模拟地形高度数据
└── src/
    ├── main.ts            # 应用入口：初始化场景、相机、渲染器，模块调度
    ├── terrainLoader.ts   # CSV解析，生成BufferGeometry，返回地形对象
    ├── terrainRenderer.ts # 创建带纹理Mesh，添加光照，管理LOD切换
    ├── interaction.ts     # Raycaster拾取、高度探查、等高线、视角控制
    └── uiPanel.ts         # 右侧信息面板DOM，按钮事件，数据更新
```

## 5. 模块间数据流

```mermaid
flowchart LR
    "CSV数据" -->|"解析"| "terrainLoader"
    "terrainLoader" -->|"TerrainObject"| "terrainRenderer"
    "terrainRenderer" -->|"TerrainGroup"| "main.ts"
    "main.ts" -->|"场景挂载"| "interaction.ts"
    "interaction.ts" -->|"交互事件"| "main.ts"
    "main.ts" -->|"状态数据"| "uiPanel.ts"
    "uiPanel.ts" -->|"重置事件"| "main.ts"
```

## 6. 数据模型

### 6.1 核心类型定义

```typescript
interface TerrainData {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
  width: number;
  height: number;
  minElevation: number;
  maxElevation: number;
  vertexCount: number;
}

interface TerrainObject {
  geometry: THREE.BufferGeometry;
  data: TerrainData;
}

interface ContourConfig {
  interval: number;
  enabled: boolean;
  colorLow: THREE.Color;
  colorHigh: THREE.Color;
}

interface ProbeResult {
  position: THREE.Vector3;
  elevation: number;
  isValid: boolean;
}

interface LODState {
  currentLevel: 'high' | 'medium';
  vertexCount: number;
  switchTime: number;
}
```

### 6.2 CSV数据格式

- 每行代表一个采样行的所有列高度值，以逗号分隔
- 1024列 x 1000行（用户要求1000行随机海拔值）
- 数值范围：0-1000（模拟米级海拔）
