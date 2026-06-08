## 1. 架构设计

```mermaid
flowchart TD
    "subgraph 前端层"
    "A[App.tsx 主组件]" --> "B[ParticleCanvas.tsx Canvas渲染]"
    "A --> C[ControlPanel.tsx 控制面板]"
    "A --> D[AudioAnalyzer.ts 音频分析]"
    end
    "subgraph 浏览器API"
    "E[Web Audio API AudioContext]"
    "F[Canvas 2D API]"
    "G[File API / URL]"
    end
    "D --> E"
    "B --> F"
    "A --> G"
```

## 2. 技术说明
- **前端框架**：React 18 + TypeScript + Vite
- **样式方案**：Tailwind CSS 3 + CSS Modules（毛玻璃特效需自定义CSS）
- **状态管理**：Zustand（管理音频状态、可视化参数）
- **音频处理**：Web Audio API（AnalyserNode获取频谱和波形数据）
- **渲染引擎**：Canvas 2D API + requestAnimationFrame（60fps渲染循环）
- **图标库**：lucide-react
- **后端**：无（纯前端应用）
- **数据库**：无

## 3. 路由定义
| 路由 | 用途 |
|------|------|
| / | 主页面，包含画布渲染和控制面板 |

单页应用，无路由切换需求。

## 4. 数据流设计

### 4.1 Zustand Store 结构
```typescript
interface AudioStore {
  isPlaying: boolean;
  sensitivity: number;        // 1-100
  particleCount: number;      // 50-500
  colorTheme: 'aurora' | 'lava' | 'ocean';
  audioSource: 'upload' | 'demo' | null;
  demoTrack: string | null;
}
```

### 4.2 频谱数据流
```mermaid
flowchart LR
    "A[AudioElement / Mic]" --> "B[AudioContext]"
    "B --> C[AnalyserNode]"
    "C --> D[getByteFrequencyData 频谱]"
    "C --> E[getByteTimeDomainData 波形]"
    "D --> F[低频段 0-150Hz]"
    "D --> G[中频段 150-2000Hz]"
    "D --> H[高频段 2000Hz+]"
    "F --> I[波纹半径/振幅]"
    "G --> J[粒子速度/扩散半径]"
    "H --> K[几何图形颜色/旋转速度]"
```

## 5. 文件结构
```
src/
  main.tsx           # 入口，挂载React应用到DOM
  App.tsx             # 主组件，管理音频状态、UI布局、画布渲染调度
  AudioAnalyzer.ts    # 音频分析模块，封装Web Audio API
  ParticleCanvas.tsx  # Canvas渲染组件，绘制波纹/粒子/几何图形
  ControlPanel.tsx    # 控制面板组件，包含滑块、主题选择器、按钮
  store.ts            # Zustand状态管理
  index.css           # 全局样式（毛玻璃、渐变背景、自定义滑块）
```

## 6. 核心模块设计

### 6.1 AudioAnalyzer.ts
- `createAnalyzer(audioElement)`: 创建AudioContext和AnalyserNode
- `getFrequencyData()`: 返回Uint8Array频谱数据
- `getWaveformData()`: 返回Uint8Array波形数据
- `getLowFrequency()`: 计算低频段平均值
- `getMidFrequency()`: 计算中频段平均值
- `getHighFrequency()`: 计算高频段平均值
- `destroy()`: 清理AudioContext资源

### 6.2 ParticleCanvas.tsx
- Canvas全屏渲染，使用requestAnimationFrame
- 三层渲染：波纹层（底层）→ 粒子层（中层）→ 几何层（顶层）
- 波纹：同心圆从中心扩散，半径随低频振幅变化
- 粒子：从中心向四周扩散的粒子群，速度和密度受中频影响
- 几何图形：旋转多边形/线条，颜色和旋转速度受高频影响
- 每帧从AudioAnalyzer获取频谱数据，根据sensitivity参数缩放

### 6.3 ControlPanel.tsx
- 灵敏度滑块：range input，1-100，自定义样式
- 粒子数量滑块：range input，50-500
- 颜色主题选择器：三个色块按钮
- 播放/暂停按钮：图标切换
- 音频上传：file input + 拖拽区域
- Demo选择：内置3首demo音轨
