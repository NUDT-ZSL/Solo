## 1. 架构设计

```mermaid
graph TD
    A["App.tsx (主组件) --> B["Three.js 3D场景"]
    A --> C["Controls.tsx (控制面板)"]
    A --> D["城市选择UI"]
    B --> E["particles.ts (粒子系统)"]
    E --> F["OrbitControls"]
    E --> G["帧率检测 & 自动降级"]
```

## 2. 技术描述

- **前端框架**：React 18 + TypeScript

- **构建工具**：Vite 5 + @vitejs/plugin-react

- **3D渲染**：Three.js + @types/three

- **状态管理**：React useState/useRef

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 主页面（单页应用） |

## 4. 文件结构

```
src/
├── App.tsx          # 主组件，管理城市选择和状态
├── particles.ts    # 粒子系统逻辑
├── controls.tsx    # 控制面板UI组件
└── main.tsx        # 入口文件
```

## 5. 数据模型

### 5.1 城市数据

```typescript
interface City {
  name: string;
  center: [number, number, number]; // 3D位置
  windPaths: WindPath[]; // 风场路径
}

interface WindPath {
  controlPoints: [number, number, number][]; // 贝塞尔曲线控制点
  speed: number; // 风速
}

interface Particle {
  position: THREE.Vector3;
  pathIndex: number;
  progress: number; // 0-1 路径进度
  speed: number;
}
```

### 5.2 颜色主题

```typescript
type ColorTheme = 'aurora' | 'fire' | 'neon';

interface ThemeColors {
  start: string;
  end: string;
}
```
