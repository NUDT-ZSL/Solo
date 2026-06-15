
## 1. 架构设计

```mermaid
graph TD
    "index.html" --> "main.ts"
    "main.ts" --> "solarSystem.ts"
    "main.ts" --> "interaction.ts"
    "solarSystem.ts" --> "Three.js Scene"
    "interaction.ts" --> "Three.js Camera/Controls"
    "gsap" --> "interaction.ts"
    "Three.js" --> "main.ts"
    "Three.js" --> "solarSystem.ts"
    "Vite" --> "Build System"
    "TypeScript" --> "Type Checking"
```

## 2. 技术描述
- **前端**：TypeScript + Three.js + Vite
- **动画库**：GSAP（用于fly-to相机插值动画）
- **构建工具**：Vite 5.x
- **类型系统**：TypeScript 严格模式

## 3. 文件结构
| 文件路径 | 用途 |
|-------|---------|
| /package.json | 项目依赖和脚本配置 |
| /index.html | 入口HTML页面，全屏渲染容器 |
| /tsconfig.json | TypeScript严格模式配置 |
| /vite.config.js | Vite构建配置（路径别名@） |
| /src/main.ts | 场景、相机、渲染器初始化，动画循环，星空背景，控制面板 |
| /src/solarSystem.ts | 太阳、行星、卫星、轨道创建，位置更新逻辑 |
| /src/interaction.ts | 鼠标拖拽、点击检测、fly-to动画、信息面板渲染 |

## 4. 数据模型

### 4.1 行星数据
```typescript
interface PlanetData {
  name: string;
  nameCN: string;
  color: number;
  radius: number;          // 视觉渲染半径
  realRadius: string;      // 实际半径（展示用）
  orbitRadius: number;     // 轨道半径（AU换算的视觉单位）
  orbitSpeed: number;      // 公转角速度（rad/s，基于开普勒第三定律）
  rotationSpeed: number;   // 自转角速度
  description: string;
  moons: MoonData[];
  hasRing?: boolean;
}

interface MoonData {
  name: string;
  radius: number;
  orbitRadius: number;
  orbitSpeed: number;
  color: number;
}
```

### 4.2 公转速度计算公式
基于开普勒第三定律：T² ∝ r³，角速度 ω = 2π / T ∝ 1 / r^(3/2)
```typescript
// 水星轨道速度设为基准值，其他行星按 1/(r^1.5) 比例计算
const baseAngularVelocity = 0.8; // rad/s（水星基准）
orbitSpeed = baseAngularVelocity / Math.pow(orbitRadiusInAU, 1.5);
```

## 5. 关键实现要点

### 5.1 场景层级结构
```
Scene
├── Sun (Object3D) - 自转
│   ├── SunMesh + SunParticlesHalo
│   ├── MercuryPivot - 公转
│   │   └── Mercury - 自转
│   ├── VenusPivot
│   │   └── Venus
│   ├── EarthPivot
│   │   ├── Earth
│   │   └── MoonPivot
│   │       └── Moon
│   ├── MarsPivot
│   ├── JupiterPivot
│   │   ├── Jupiter
│   │   ├── IoPivot → Io
│   │   ├── EuropaPivot → Europa
│   │   ├── GanymedePivot → Ganymede
│   │   └── CallistoPivot → Callisto
│   ├── SaturnPivot
│   │   ├── Saturn + RingParticles
│   ├── UranusPivot
│   └── NeptunePivot
├── OrbitLines (8条椭圆线)
└── StarField (1000个Points)
```

### 5.2 性能优化
- 粒子总数控制：星空1000 + 太阳光晕~200 + 土星光环~200 = ≤1500
- 星星亮度每2秒批量更新，而非每帧
- 使用BufferGeometry减少Draw Call
- 轨道线使用LineLoop静态几何体
