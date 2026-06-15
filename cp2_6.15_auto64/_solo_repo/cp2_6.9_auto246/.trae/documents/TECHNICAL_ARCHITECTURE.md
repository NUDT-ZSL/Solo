## 1. 架构设计

```mermaid
graph TD
    A["index.html<br/>入口页面"] --> B["main.ts<br/>应用入口"]
    B --> C["audio.ts<br/>音频输入模块"]
    B --> D["painter.ts<br/>声纹渲染模块"]
    C -->|AudioData{volume, frequencies}| B
    B -->|AudioData + Canvas| D
    D -->|绘制指令| E["Canvas 2D Context"]
    C -->|Web Audio API| F["浏览器麦克风"]
```

### 数据流向
1. 用户点击授权 → main.ts 调用 audio.ts 的 requestPermission()
2. audio.ts 通过 Web Audio API 获取 AnalyserNode，每帧提取音量和32频段频率数据
3. audio.ts 通过回调将 AudioData 传给 main.ts
4. main.ts 以30FPS帧率驱动动画循环，将 AudioData 传给 painter.ts
5. painter.ts 根据音频数据在 Canvas 上绘制声纹、特效、UI元素
6. 用户交互（空格键、清除按钮）→ main.ts → painter.ts 执行清空动画

## 2. 技术描述
- 前端技术栈：TypeScript + Canvas 2D + Vite
- 构建工具：Vite（支持HMR热更新）
- 音频API：Web Audio API (AudioContext, AnalyserNode, MediaStreamSource)
- 无后端、无数据库、纯前端实现

### 依赖配置
- typescript：严格模式，目标ES2020，模块ESNext
- vite：构建工具，dev服务器

## 3. 文件结构与职责

| 文件路径 | 职责 | 依赖/被依赖 |
|----------|------|-------------|
| package.json | 项目依赖配置，启动脚本 | 无 |
| vite.config.js | Vite构建配置，HMR支持 | 无 |
| tsconfig.json | TypeScript编译配置 | 无 |
| index.html | 入口HTML，Canvas容器，权限浮层 | 引入 src/main.ts |
| src/audio.ts | 麦克风权限请求、AudioContext管理、AnalyserNode频谱数据提取 | 被 main.ts 调用 |
| src/painter.ts | Canvas声纹渲染、线条绘制、色彩爆破、水泡特效、频谱UI、控制面板UI、清空动画 | 被 main.ts 调用，操作 Canvas |
| src/main.ts | 应用入口，Canvas创建、模块初始化、30FPS动画循环、权限UI协调、键盘事件 | 调用 audio.ts 和 painter.ts |

## 4. 核心数据结构

### AudioData（音频数据）
```typescript
interface AudioData {
  volume: number;        // 0-255 音量值
  frequencies: number[]; // 32个频段的能量值，每个 0-255
}
```

### LineSegment（声纹线段）
```typescript
interface LineSegment {
  x1: number; y1: number;  // 起点坐标
  x2: number; y2: number;  // 终点坐标
  color: string;           // HSL颜色字符串
  width: number;           // 线宽(px)
  opacity: number;         // 透明度 0-1
  fadeStartTime?: number;  // 清空动画开始时间戳
  blurRadius: number;      // 模糊半径
  blurStartTime?: number;  // 模糊开始时间戳
}
```

### Bubble（水泡）
```typescript
interface Bubble {
  x: number; y: number;  // 当前位置
  radius: number;        // 半径 5-15px
  speed: number;         // 下落速度 0.5-2px/帧
  opacity: number;       // 透明度 0.4
  active: boolean;       // 是否活跃
}
```

### BurstEffect（色彩爆破）
```typescript
interface BurstEffect {
  x: number; y: number;    // 中心坐标
  startTime: number;       // 开始时间戳
  duration: number;        // 持续时间 500ms
  waves: BurstWave[];      // 10条波浪线
}
```

## 5. 性能优化策略
1. **帧率锁定**：使用 requestAnimationFrame + 时间戳计算，严格锁定30FPS（每帧约33.3ms）
2. **离屏Canvas**：可使用离屏Canvas缓存已绘制的静态线条，避免每帧重绘全部内容
3. **对象池**：声纹线段和水泡对象使用对象池复用，减少GC压力
4. **批量绘制**：相同颜色/宽度的线段批量绘制，减少Canvas状态切换
5. **节流控制**：音频数据分析与渲染解耦，确保渲染时间预算
