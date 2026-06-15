## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端层"
        "index.html" --> "main.ts（入口）"
        "main.ts" --> "StardustEngine.ts（核心引擎）"
        "main.ts" --> "SoundSynthesizer.ts（音频合成）"
        "StardustEngine.ts" --> "ParticleUnit.ts（粒子单元）"
    end
    subgraph "渲染层"
        "Three.js Scene" --> "PerspectiveCamera"
        "Three.js Scene" --> "WebGLRenderer + BloomPass"
        "OrbitControls" --> "PerspectiveCamera"
        "Raycaster" --> "点击检测"
    end
    subgraph "音频层"
        "Web Audio API" --> "AudioContext"
        "AudioContext" --> "OscillatorNode + GainNode"
    end
    "main.ts" --> "Three.js Scene"
    "SoundSynthesizer.ts" --> "Web Audio API"
    "StardustEngine.ts" --> "Raycaster"
```

## 2. 技术说明

- 前端：TypeScript + Three.js + Vite
- 初始化工具：Vite
- 后端：无
- 数据库：无
- 音频：Web Audio API（浏览器原生）
- 3D 后处理：Three.js EffectComposer + UnrealBloomPass

## 3. 文件结构

```
/
├── index.html              # 入口页面，引入 main.ts
├── package.json            # 依赖：three, @types/three, vite
├── tsconfig.json           # TypeScript strict 模式配置
├── vite.config.js          # Vite 基本配置，target es2020
└── src/
    ├── main.ts             # 入口：初始化场景、相机、渲染器、UI、动画循环
    ├── StardustEngine.ts   # 核心引擎：粒子系统管理、分组、引力、碰撞、脉冲
    ├── ParticleUnit.ts     # 粒子单元：外观、发光、生命周期、坍缩动画
    └── SoundSynthesizer.ts # 音频合成：Web Audio API 生成音符
```

## 4. 模块职责

### 4.1 main.ts
- 初始化 Three.js Scene、PerspectiveCamera、WebGLRenderer
- 配置 EffectComposer + UnrealBloomPass 后处理
- 创建 OrbitControls 实现鼠标拖拽旋转和滚轮缩放
- 创建 StardustEngine 和 SoundSynthesizer 实例
- 创建远景星点（Points 几何体）
- 渲染 HTML 控制面板和信息卡片的 DOM 交互
- 动画循环：requestAnimationFrame，每帧调用引擎 update
- Raycaster 点击检测，调用引擎和音频模块响应

### 4.2 StardustEngine.ts
- 管理 5 组粒子（蓝/紫/粉/青/橙），每组有独立旋转速度和引力中心
- 生成粒子并分配到 ParticleUnit 实例
- 每帧更新所有粒子位置（旋转 + 引力计算）
- 碰撞检测：粒子间距离小于阈值时触发排斥力
- 随机触发引力坍缩事件（概率控制）
- 管理光晕效果（点击后扩散的环形光）
- 提供旋转速度、粒子密度的动态调整接口

### 4.3 ParticleUnit.ts
- 每个粒子的 Three.js Mesh（SphereGeometry + MeshStandardMaterial，emissive 发光）
- 粒子属性：颜色分组、大小、位置、速度、引力中心
- 发光效果：通过 BloomPass 增强 emissive 颜色实现
- 引力坍缩动画状态机：正常 → 坍缩中（向中心加速）→ 爆发（向外扩散）→ 恢复
- 记录最近一次引力坍缩时间
- 更新方法：根据当前状态计算新位置

### 4.4 SoundSynthesizer.ts
- 创建 AudioContext 实例（懒初始化，需用户交互后激活）
- 根据粒子颜色映射到不同音高范围：
  - 蓝：C4-E4（低音区）
  - 紫：F4-A4（中低音区）
  - 粉：B4-D5（中高音区）
  - 青：E5-G5（高音区）
  - 橙：A5-C6（超高音区）
- 根据粒子位置微调音高（X 坐标偏移半音）
- 使用 OscillatorNode（正弦波 + 三角波混合）生成音符
- GainNode 控制音量包络（快起慢衰）
- 音量滑块控制主增益

## 5. 关键数据结构

```typescript
type ParticleColorGroup = 'blue' | 'purple' | 'pink' | 'cyan' | 'orange';

interface ParticleGroup {
  color: ParticleColorGroup;
  hexColor: number;
  center: THREE.Vector3;
  rotationSpeed: number;
  particles: ParticleUnit[];
}

interface CollapseEvent {
  particle: ParticleUnit;
  startTime: number;
  duration: number;
  phase: 'collapsing' | 'exploding' | 'recovering';
}

interface HaloEffect {
  position: THREE.Vector3;
  color: THREE.Color;
  startTime: number;
  duration: number;
  mesh: THREE.Mesh;
}
```

## 6. 性能策略

- 粒子使用 InstancedMesh 或独立小几何体（根据密度动态选择）
- 引力计算仅在组内进行，避免全局 O(n²) 碰撞检测
- Bloom 后处理适度参数避免 GPU 过载
- 引力坍缩同时仅允许少量实例运行
- 使用 requestAnimationFrame 确保 60fps 同步
- 远景星点使用 Points 而非独立 Mesh
