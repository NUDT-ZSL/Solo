## 1. 架构设计

```mermaid
flowchart TD
    "Frontend[前端 React+TypeScript+Vite]" --> "ThreeJS[Three.js 3D渲染]"
    "Frontend" --> "DataLoader[数据加载模块]"
    "DataLoader" --> "ConfigJSON[config.json 静态数据]"
    "ThreeJS" --> "Earth[3D地球场景]"
    "ThreeJS" --> "Animation[相机动画系统]"
    "Frontend" --> "TimeSlider[时间轴控件]"
    "Frontend" --> "InfoCard[信息卡片组件]"
```

## 2. 技术说明

- **前端框架**：React 18 + TypeScript + Vite
- **3D渲染**：Three.js（场景、渲染器、相机、几何体、材质、动画）
- **状态管理**：React useState/useRef（轻量级，无需zustand）
- **样式**：CSS-in-JS（内联样式）+ CSS模块
- **数据源**：静态JSON文件（public/config.json）
- **动画**：自实现缓动函数（避免额外依赖）
- **后端**：无

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 单页应用，包含3D场景与时间轴 |

## 4. 文件结构

```
├── package.json
├── index.html
├── tsconfig.json
├── vite.config.js
├── public/
│   └── config.json
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── ThreeScene.ts
    ├── TimeSlider.tsx
    └── dataLoader.ts
```

## 5. 核心模块接口

### ThreeScene.ts
- `init(container: HTMLDivElement): void` — 初始化场景、相机、渲染器、星空、地球
- `updateContinents(time: number): void` — 根据时间插值更新大陆位置和板块边界
- `flyToPlate(plateId: string): void` — 相机飞行动画至指定板块中心
- `dispose(): void` — 释放资源

### dataLoader.ts
- `loadConfig(): Promise<ConfigData>` — 从config.json加载配置
- `interpolateContinent(continent: ContinentData, time: number): Float32Array` — 关键帧插值

### TimeSlider.tsx
- Props: `onTimeChange: (time: number) => void`, `currentTime: number`
- 渲染自定义时间轴滑块

### App.tsx
- 管理currentTime状态
- 管理ThreeScene ref
- 渲染3D容器、时间轴、年代标注、信息卡片

## 6. 数据模型

### config.json 结构

```typescript
interface ConfigData {
  epochs: Epoch[];
  continents: ContinentData[];
  plateBoundaries: PlateBoundaryData[];
}

interface Epoch {
  name: string;
  time: number;
}

interface ContinentKeyframe {
  time: number;
  vertices: number[];
}

interface ContinentData {
  id: string;
  name: string;
  color: string;
  keyframes: ContinentKeyframe[];
}

interface PlateBoundaryData {
  id: string;
  type: "convergent" | "divergent" | "transform";
  plateA: string;
  plateB: string;
  description: string;
  segments: number[];
  keyframes: { time: number; segments: number[] }[];
}
```
