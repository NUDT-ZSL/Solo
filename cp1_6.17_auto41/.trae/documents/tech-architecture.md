## 1. 架构设计

```mermaid
flowchart TD
    subgraph "前端层"
        "index.html" --> "main.ts（入口）"
        "main.ts" --> "scene.ts（Three.js场景）"
        "main.ts" --> "panel.ts（信息面板）"
        "main.ts" --> "tools.ts（钳子工具）"
        "scene.ts" --> "models.ts（分子数据）"
        "tools.ts" --> "models.ts"
        "panel.ts" --> "models.ts"
    end
    subgraph "渲染层"
        "Three.js" --> "WebGL"
        "scene.ts" --> "Three.js"
    end
```

## 2. 技术说明

- **前端**：TypeScript + Three.js + Vite
- **构建工具**：Vite + @vitejs/plugin-react
- **3D渲染**：Three.js（场景、相机、光照、几何体）
- **状态管理**：模块内共享状态，事件回调机制
- **后端**：无

## 3. 路由定义

单页应用，无路由。

## 4. 文件结构

| 文件 | 职责 |
|------|------|
| package.json | 依赖：three, typescript, vite, @vitejs/plugin-react |
| index.html | 入口页面，标题"分子工坊" |
| vite.config.js | React插件配置 |
| tsconfig.json | 严格模式，target ES2020 |
| src/models.ts | 分子数据模型、原子坐标、键连接、CPK颜色映射、createMolecule函数 |
| src/scene.ts | Three.js场景初始化、OrbitControls、光照、渲染循环 |
| src/tools.ts | 钳子工具：Raycaster检测、键断裂动画、粒子效果、useClipper函数 |
| src/panel.ts | 右侧面板DOM控制、原子列表、键计数、实时更新 |
| src/main.ts | 应用入口，初始化各模块 |

## 5. 数据模型

### 5.1 核心类型定义

```typescript
type AtomType = 'C' | 'H' | 'O' | 'N';

interface Atom {
  id: number;
  element: AtomType;
  position: [number, number, number];
}

interface Bond {
  id: number;
  atom1Id: number;
  atom2Id: number;
  order: number;
  broken: boolean;
}

interface Molecule {
  name: string;
  atoms: Atom[];
  bonds: Bond[];
}
```

### 5.2 预设分子

- **咖啡因** C₈H₁₀N₄O₂：24原子，25键
- **葡萄糖** C₆H₁₂O₆：24原子，23键
- **阿司匹林** C₉H₈O₄：21原子，21键

## 6. 性能预算

- 分子模型总顶点数 < 20000
- 常规帧率 ≥ 45 FPS
- 拆解动画帧率 ≥ 30 FPS
