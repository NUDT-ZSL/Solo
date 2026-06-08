## 1. 架构设计

```mermaid
flowchart TD
    "index.html 入口" --> "main.tsx React 根组件"
    "main.tsx React 根组件" --> "App.tsx 应用容器"
    "App.tsx 应用容器" --> "Canvas 3D 画布"
    "App.tsx 应用容器" --> "UIControl.tsx 控制面板+卡片"
    "Canvas 3D 画布" --> "LavaEngine.ts 场景管理"
    "LavaEngine.ts 场景管理" --> "LavaNetwork.ts 熔岩网络"
    "LavaEngine.ts 场景管理" --> "ParticleSystem.ts 粒子系统"
    "LavaEngine.ts 场景管理" --> "火山地形+灯光+后处理"
    "UIControl.tsx" --> "参数状态管理"
    "参数状态管理" --> "LavaEngine.ts"
```

## 2. 技术说明

- **前端框架**：React 18 + TypeScript
- **3D 渲染**：Three.js + @react-three/fiber + @react-three/drei + @react-three/postprocessing
- **样式方案**：CSS Modules + Tailwind CSS
- **构建工具**：Vite
- **包管理器**：npm
- **后端**：无（纯前端项目）
- **数据库**：无

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 唯一页面，3D 火山场景 + 控制面板 |

## 4. 文件结构

```
├── index.html                 # 入口 HTML
├── package.json               # 依赖和脚本
├── tsconfig.json              # TypeScript 配置
├── vite.config.js             # Vite 配置
├── src/
│   ├── main.tsx               # React 入口
│   ├── App.tsx                # 应用容器（3D画布 + UI）
│   ├── App.css                # 全局样式
│   ├── LavaEngine.ts          # 场景管理、视角控制、渲染循环
│   ├── LavaNetwork.ts         # 熔岩路径生成、流动动画、分支逻辑
│   ├── ParticleSystem.ts      # 粒子生成、动画、帧率控制
│   └── UIControl.tsx          # React 组件：控制面板 + 信息卡片
```

## 5. 核心模块设计

### 5.1 LavaEngine.ts — 场景管理

- 初始化 Three.js 场景、相机（PerspectiveCamera）、渲染器（WebGLRenderer）
- 集成 OrbitControls 实现拖拽旋转、滚轮缩放
- 创建火山锥体几何体（ConeGeometry）+ 地面平面（PlaneGeometry）
- 配置雾化效果（FogExp2）营造阴暗氛围
- 添加点光源模拟熔岩发光
- 挂载 UnrealBloomPass 后处理泛光效果
- 渲染循环中调用 LavaNetwork 和 ParticleSystem 的 update 方法
- Raycaster 实现点击检测，识别熔岩支流

### 5.2 LavaNetwork.ts — 熔岩网络

- 从火山口出发，使用随机分形路径算法生成多条熔岩支流
- 每条支流用 TubeGeometry 或自定义 BufferGeometry（条带状网格）渲染
- 自定义 ShaderMaterial：红橙到暗红渐变 + UV 偏移实现流动波纹
- 分支逻辑：支流在随机位置产生子分支，递归深度由分支密度参数控制
- 每条支流存储元数据：流速、温度、分支数
- 喷涌效果：被点击支流的发光强度急速增大，触发粒子喷射事件
- 脉动效果：周围支流发光强度周期性波动

### 5.3 ParticleSystem.ts — 粒子系统

- 使用 Points + BufferGeometry 实现高效粒子渲染
- 火花粒子：橙黄色，从熔岩表面向上飞溅，重力下落，短生命周期
- 烟雾粒子：灰色半透明，缓慢上升扩散，长生命周期
- 喷涌粒子：点击触发时大量橙黄色粒子从支流喷射
- 粒子池管理：预分配固定大小缓冲区，动态回收
- 帧率控制：每帧更新粒子位置/透明度，60fps 目标

### 5.4 UIControl.tsx — React UI

- **控制面板**：右侧固定定位，毛玻璃背景（backdrop-filter: blur）
  - 熔岩流速 range 滑块（0.1 ~ 3.0，默认 1.0）
  - 发光强度 range 滑块（0.1 ~ 2.0，默认 1.0）
  - 分支密度 range 滑块（1 ~ 5，默认 3）
  - 重置按钮
- **信息卡片**：点击熔岩支流时在鼠标位置附近弹出
  - 半透明毛玻璃背景
  - 显示：流速、温度、分支数
  - 点击其他区域关闭
- 使用 React 状态管理参数，通过回调传递给 3D 场景

## 6. 数据模型

### 6.1 熔岩支流数据结构

```typescript
interface LavaBranch {
  id: string;
  points: THREE.Vector3[];
  speed: number;
  temperature: number;
  childCount: number;
  mesh: THREE.Mesh;
  glowIntensity: number;
  isErupting: boolean;
}

interface LavaParams {
  flowSpeed: number;
  glowIntensity: number;
  branchDensity: number;
}
```

### 6.2 粒子数据结构

```typescript
interface Particle {
  position: Float32Array;
  velocity: Float32Array;
  life: Float32Array;
  maxLife: Float32Array;
  type: 'spark' | 'smoke' | 'eruption';
}
```
