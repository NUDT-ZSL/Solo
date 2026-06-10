## 1. 架构设计

```mermaid
flowchart TB
    "UI层[index.html + 控制面板]" --> "主控制[src/main.ts]"
    "主控制[src/main.ts]" --> "粒子服饰[src/particleCloth.ts]"
    "主控制[src/main.ts]" --> "文字解析[src/textParser.ts]"
    "文字解析[src/textParser.ts]" --> "粒子服饰[src/particleCloth.ts]"
    "粒子服饰[src/particleCloth.ts]" --> "Three.js渲染管线"
    "Three.js渲染管线" --> "WebGL Canvas"
```

## 2. 技术说明

- 前端：TypeScript + Three.js + Vite
- 初始化工具：Vite
- 后端：无
- 数据库：无（本地JSON录制文件）

### 核心依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| three | ^0.160.0 | 3D渲染引擎 |
| @types/three | ^0.160.0 | Three.js类型定义 |
| typescript | ^5.3.0 | 类型安全的开发语言 |
| vite | ^5.0.0 | 构建工具，支持HMR |

## 3. 文件结构

| 文件路径 | 职责 |
|----------|------|
| package.json | 依赖声明与启动脚本 |
| vite.config.js | Vite构建配置，HMR支持 |
| tsconfig.json | TypeScript严格模式，目标ES2020 |
| index.html | 入口HTML，全屏3D场景 |
| src/main.ts | 场景初始化、相机控制、动画循环、录制/回放逻辑 |
| src/particleCloth.ts | 粒子服饰核心：人体模型生成、粒子映射、三种模式动态更新 |
| src/textParser.ts | 文字分词、情感强度计算、节奏间隔分析 |

## 4. 数据流设计

### 4.1 文字→粒子映射

```
用户文字 → textParser分词 → 每词{情感类型, 强度, 节奏间隔}
→ particleCloth映射 → 粒子颜色(暖/冷/灰白) + 粒子运动参数(速度/曲率)
```

### 4.2 录制数据格式

```typescript
interface RecordedFrame {
  positions: Float32Array
  colors: Float32Array
  opacities: Float32Array
}

interface Recording {
  particleCount: number
  fps: number
  duration: number
  frames: RecordedFrame[]
}
```

## 5. 性能策略

- 粒子使用BufferGeometry + Points材质，GPU端渲染
- 每帧仅更新position/color buffer数据，避免重建几何体
- 录制时仅存储变化的粒子数据，压缩JSON体积
- 使用requestAnimationFrame保持60FPS
- 相机阻尼使用线性插值实现平滑缓动
