## 1. 架构设计

```mermaid
flowchart TB
    "前端层 React + TypeScript" --> "状态管理 Zustand"
    "状态管理 Zustand" --> "自定义Hook useAudio"
    "自定义Hook useAudio" --> "Web Audio API"
    "Web Audio API" --> "AnalyserNode 频谱数据"
    "AnalyserNode 频谱数据" --> "Canvas 音波可视化"
    "前端层 React + TypeScript" --> "路由 React Router"
    "前端层 React + TypeScript" --> "组件层"
    "组件层" --> "Player 播放控制"
    "组件层" --> "Playlist 播放列表"
    "组件层" --> "Visualizer 音波可视化"
```

## 2. 技术说明

- **前端框架**：React 18 + TypeScript
- **构建工具**：Vite + @vitejs/plugin-react
- **路由**：react-router-dom
- **状态管理**：Zustand（轻量级全局状态）
- **音频处理**：Web Audio API（AudioContext, AnalyserNode, GainNode）
- **样式方案**：纯CSS（index.css全局样式 + CSS变量主题系统）
- **数据**：硬编码虚拟歌曲元数据（无后端）

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 主播放器页面（播放器 + 播放列表） |

## 4. 核心技术实现

### 4.1 音频引擎（useAudio Hook）

- 使用 `AudioContext` 创建音频上下文
- 通过 `AnalyserNode` 获取实时频谱数据（fftSize=128，产生64条频率数据）
- 使用 `GainNode` 实现淡入淡出效果和音量控制
- 模拟播放：使用 OscillatorNode 或定时器模拟音频播放进度

### 4.2 音波可视化（Visualizer组件）

- Canvas 2D 绘制64条频率条形图
- requestAnimationFrame 驱动动画循环
- 弹性缓动函数：`easeOutElastic` 或类似缓动
- 颜色渐变：底部 #00d4ff（蓝）→ 顶部 #a855f7（紫）→ #ff0000（红）

### 4.3 3D封面旋转

- CSS `transform: rotateY()` + `animation` 实现3D旋转
- `perspective` 属性设置3D透视
- 悬停事件暂停动画 + `scale(1.1)` 放大
- 歌曲详情浮层使用绝对定位 + 毛玻璃效果

### 4.4 拖拽排序

- 使用 HTML5 Drag and Drop API
- `onDragStart` / `onDragOver` / `onDrop` 事件处理
- 拖拽过程中添加视觉反馈（半透明、位移）

### 4.5 响应式布局

- CSS Media Queries 实现三断点
- 桌面端：CSS Grid / Flexbox 左右布局
- 平板端：Flexbox 纵向排列
- 手机端：固定定位迷你播放器 + 全屏展开状态

### 4.6 键盘快捷键

- `useEffect` 监听 `keydown` 事件
- 空格键：togglePlayPause
- 左/右箭头：快退/快进5秒
- 上/下箭头：音量增减

## 5. 数据模型

### 5.1 歌曲数据结构

```typescript
interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  duration: number; // 秒
}

interface PlayerState {
  playlist: Song[];
  currentSongIndex: number;
  isPlaying: boolean;
  currentTime: number;
  volume: number; // 0-1
  isFading: boolean;
}
```

### 5.2 虚拟歌曲数据

内置6首虚拟歌曲，包含标题、艺术家、专辑封面占位图（使用picsum或色彩生成）、时长信息。
