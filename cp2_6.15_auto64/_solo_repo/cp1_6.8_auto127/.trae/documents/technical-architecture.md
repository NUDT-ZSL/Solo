## 1. 架构设计

```mermaid
graph TB
    subgraph "前端层"
        "React UI" --> "ControlPanel.tsx"
        "React UI" --> "MeteorInfoPanel.tsx"
        "Zustand Store" --> "ControlPanel.tsx"
        "Zustand Store" --> "MeteorEngine.ts"
    end
    subgraph "3D引擎层"
        "main.tsx" --> "Three.js 场景"
        "Three.js 场景" --> "MeteorEngine.ts"
        "Three.js 场景" --> "StarBackground.ts"
        "Three.js 场景" --> "ExplosionEffect.ts"
        "MeteorEngine.ts" --> "拖尾粒子系统"
        "ExplosionEffect.ts" --> "爆炸粒子系统"
    end
    subgraph "渲染层"
        "Three.js 场景" --> "WebGLRenderer"
        "WebGLRenderer" --> "Canvas"
    end
```

## 2. 技术说明

- 前端框架：React 18 + TypeScript
- 3D引擎：Three.js + @react-three/fiber + @react-three/drei
- 状态管理：Zustand
- 构建工具：Vite
- 样式方案：Tailwind CSS + CSS Modules（毛玻璃面板）
- 初始化工具：vite-init（react-ts 模板）

## 3. 路由定义

本项目为单页3D交互应用，无多页路由。

| 路由 | 用途 |
|------|------|
| / | 星空3D场景主页面 |

## 4. 核心模块设计

### 4.1 main.tsx — 入口与场景编排

- 初始化 Three.js 场景、透视相机、WebGLRenderer
- 使用 @react-three/fiber 的 Canvas 组件封装3D渲染
- 集成 OrbitControls（拖拽旋转、滚轮缩放、自动旋转）
- 动画循环：每帧更新 MeteorEngine、ExplosionEffect、StarBackground
- 集成 React UI 覆盖层（控制面板、信息面板）

### 4.2 MeteorEngine.ts — 流星核心引擎

- 管理流星对象池：生成、运动、回收
- 每颗流星属性：位置、速度向量、颜色、生命周期、拖尾粒子数组
- 拖尾粒子系统：使用 BufferGeometry + Points 渲染，AdditiveBlending 发光效果
- 粒子生命周期：大小从大到小，颜色从亮白→冰蓝→透明，透明度渐变
- 点击检测：Raycaster 射线检测，判断用户点击的流星
- 参数响应：从 Zustand Store 读取生成频率和粒子寿命

### 4.3 ExplosionEffect.ts — 爆炸特效

- 管理爆炸粒子池：生成、扩散动画、销毁
- 爆炸时从流星位置生成粒子，球形随机方向扩散
- 粒子动画：向外加速→减速，亮度闪烁（正弦波调制透明度），逐渐消失
- 动画完成后自动从场景移除并释放资源

### 4.4 StarBackground.ts — 星空背景

- 星云贴图：使用 ShaderMaterial 渲染渐变星云效果（程序化生成，无需外部贴图）
- 恒星层：大量远景点光源，随机亮度与大小，闪烁动画（正弦波调制透明度）
- 星空缓慢自转，增强深空沉浸感
- 适配自动旋转速度参数

### 4.5 ControlPanel.tsx — 控制面板

- 右下角固定定位，毛玻璃效果（backdrop-filter: blur(20px)）
- 三个滑块组件：流星生成频率（1-20/s）、拖尾粒子寿命（1-10s）、自动旋转速度（0-5）
- 重置按钮：清空所有流星和特效，重置参数为默认值
- 状态通过 Zustand 共享

### 4.6 MeteorInfoPanel.tsx — 流星信息面板

- 点击流星时弹出，毛玻璃半透明面板
- 显示：速度（单位 km/s）、颜色（色块+HEX值）、消失倒计时（秒）
- 点击空白区域或关闭按钮关闭

## 5. 数据模型

### 5.1 Zustand Store 定义

```typescript
interface AppStore {
  meteorFrequency: number;
  trailLifetime: number;
  autoRotateSpeed: number;
  selectedMeteor: MeteorData | null;
  setMeteorFrequency: (v: number) => void;
  setTrailLifetime: (v: number) => void;
  setAutoRotateSpeed: (v: number) => void;
  setSelectedMeteor: (m: MeteorData | null) => void;
  resetAll: () => void;
}

interface MeteorData {
  id: string;
  speed: number;
  color: string;
  remainingTime: number;
  position: [number, number, number];
}
```

### 5.2 流星内部数据结构

```typescript
interface Meteor {
  id: string;
  position: Vector3;
  velocity: Vector3;
  color: Color;
  lifetime: number;
  maxLifetime: number;
  trailParticles: Float32Array;
  trailCount: number;
}
```

## 6. 性能优化策略

- 粒子系统使用 BufferGeometry + Points 批量渲染，避免逐粒子创建 Mesh
- 使用 AdditiveBlending 实现发光效果，无需后处理 Bloom（降低GPU开销）
- 流星与爆炸粒子设置最大数量上限，超出时回收最旧粒子
- 使用 requestAnimationFrame 驱动动画循环，确保帧率稳定
- OrbitControls 阻尼启用，提升交互流畅感
- 响应式适配：监听 resize 事件更新相机和渲染器
