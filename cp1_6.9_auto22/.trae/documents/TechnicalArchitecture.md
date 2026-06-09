## 1. 架构设计

本项目为纯前端3D可视化应用，采用React + Three.js + TypeScript技术栈，无后端服务依赖。

```mermaid
flowchart TB
    subgraph "前端表现层"
        A["React 入口层
        B["StarryNight.tsx 主组件
        C["UI组件 (输入框/重置按钮)
    end
    subgraph "业务逻辑层
        D["TextAnalyzer.ts 文本分析模块
        E["ParticleField.ts 粒子系统类
    end
    subgraph "3D渲染层"
        F["@react-three/fiber Canvas
        G["Three.js 渲染器
        H["BufferGeometry / ShaderMaterial
        I["CSS2DRenderer 标签
    end
    subgraph "工具与构建层
        J["Vite 构建工具
        K["TypeScript 类型系统
    end

    A --> B
    B --> C
    B --> D
    B --> E
    E --> F
    F --> G
    E --> H
    F --> I
    J --> K
    K --> B
```

**文件调用关系与数据流向：

1. 用户输入 → StarryNight.tsx → TextAnalyzer.analyze() → WordData[]
2. WordData[] → StarryNight.tsx → ParticleField.updateParticles()
3. 鼠标事件 → ParticleField → 回调通知 StarryNight.tsx
4. 渲染帧 → @react-three/fiber → ParticleField.animate() → Three.js 更新 BufferGeometry

## 2. 技术描述

- **前端框架**：React@18 + ReactDOM@18
- **3D渲染**：three@0.160、@react-three/fiber@8、@react-three/drei@9、@react-three/postprocessing@2
- **构建工具**：Vite@5 + @vitejs/plugin-react@4
- **类型系统**：TypeScript@5（严格模式，target ES2020）
- **类型声明**：@types/three@0.160、@types/react@18、@types/react-dom@18
- **初始化方式**：手动创建Vite + React + TypeScript项目结构

## 3. 文件结构

| 文件路径 | 职责说明 |
|----------|----------|
| `/package.json` | 项目依赖与启动脚本定义 |
| `/vite.config.js` | Vite构建配置，启用React插件 |
| `/tsconfig.json` | TypeScript严格模式配置 |
| `/index.html` | 入口HTML，挂载点，基础样式 |
| `/src/StarryNight.tsx` | 主组件，场景管理，状态协调，数据流转中枢 |
| `/src/TextAnalyzer.ts` | 文本分词、情感分析、关联度计算 |
| `/src/ParticleField.ts` | 粒子生成、运动、生命周期、交互处理 |

## 4. 核心数据结构

### 4.1 词语数据结构

```typescript
interface WordData {
  word: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  strength: number;
  frequency: number;
  connections: Array<{ targetIndex: number; relevance: number }>;
}
```

### 4.2 粒子数据结构

```typescript
interface ParticleData {
  id: number;
  wordData: WordData | null;
  position: THREE.Vector3;
  targetPosition: THREE.Vector3;
  basePosition: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  targetColor: THREE.Color;
  size: number;
  baseSize: number;
  life: number;
  scale: number;
  phase: number;
  isHovered: boolean;
  isPulsed: boolean;
  pulseTime: number;
}
```

### 4.3 连接线数据结构

```typescript
interface ConnectionData {
  fromIndex: number;
  toIndex: number;
  relevance: number;
  opacity: number;
}
```

## 5. 模块接口定义

### 5.1 TextAnalyzer 模块接口

```typescript
class TextAnalyzer {
  static analyze(text: string): WordData[];
  static calculateSentiment(word: string): { sentiment: 'positive' | 'negative' | 'neutral'; strength: number };
  static calculateConnections(words: WordData[]): void;
  static tokenize(text: string): string[];
}
```

### 5.2 ParticleField 模块接口

```typescript
class ParticleField {
  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer);
  updateParticles(wordData: WordData[]): void;
  resetToIdle(): void;
  animate(deltaTime: number): void;
  handlePointerMove(pointer: THREE.Vector2): void;
  handleClick(pointer: THREE.Vector2, onPulse?: (word: string | null) => void): void;
  dispose(): void;
  onHover: ((word: string | null) => void;
  onClick: ((word: string | null) => void);
}
```

## 6. 性能优化策略

| 优化项 | 具体方案 |
|----------|----------|
| 几何优化 | 使用BufferGeometry统一粒子位置/颜色属性，避免频繁重建 |
| 绘制优化 | 粒子数控制在500-800，连接线≤粒子数×2 |
| 材质优化 | ShaderMaterial自定义着色器，Points + LineSegments |
| 后期优化 | UnrealBloomPass光晕，合理阈值0.1，强度0.8 |
| 交互优化 | Raycaster只检测粒子层，避免全场景遍历 |
| 动画优化 | requestAnimationFrame帧同步，增量时间计算 |
| 内存优化 | 重置时dispose所有Geometry和Material |

## 7. 关键算法

### 7.1 语义关联度计算
- 基于共现频率：同一句子中共现次数越多关联度越高
- 基于情感相似性：情感极性相同的词语关联度加权
- 关联度范围映射到[0,1]区间，用于连线透明度

### 7.2 粒子螺旋运动算法
- 每个粒子维护独立的相位(phase)参数
- 基于球面坐标系转换：半径随时间正弦波动
- 运动速度：2-5单位/秒，随机初相0~2π
- 边界约束：超出半径60单位球面软约束

### 7.3 情感色彩映射
- 正面情感：蓝紫(#8A2BE2) → 青色(#00FFFF)，strength参数插值
- 负面情感：橙红(#FF4500) → 紫红(#C71585)，strength参数插值
- 中性情感：白色(#AAAAAA)

### 7.4 脉冲波算法
- 点击粒子为球心，半径0→30单位，时间0→1秒
- 粒子在脉冲半径内时：颜色临时插值到白色
- 速度临时放大2倍，持续0.3秒后衰减
