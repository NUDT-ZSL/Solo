## 1. 架构设计

```mermaid
flowchart TB
    "main.tsx 入口" --> "App 组件"
    "App 组件" --> "InkEngine 核心引擎"
    "App 组件" --> "UILayer UI层"
    "InkEngine 核心引擎" --> "Canvas 画布管理"
    "InkEngine 核心引擎" --> "墨迹粒子系统"
    "InkEngine 核心引擎" --> "扩散算法"
    "InkEngine 核心引擎" --> "爆散粒子"
    "InkEngine 核心引擎" --> "背景粒子"
    "InkEngine 核心引擎" --> "鼠标/触摸事件"
    "UILayer UI层" --> "工具栏"
    "UILayer UI层" --> "诗歌卡片"
    "UILayer UI层" --> "颜色选择器"
    "PoetryMatcher 诗歌匹配" --> "UILayer UI层"
```

## 2. 技术说明

- **前端框架**：React 18 + TypeScript + Vite
- **样式方案**：Tailwind CSS 3
- **状态管理**：Zustand（管理当前墨色、画布状态等）
- **字体**：Google Fonts - Ma Shan Zheng
- **动画引擎**：原生 Canvas 2D API + requestAnimationFrame
- **无后端**：纯前端应用，所有数据本地处理

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 主画布页面（单页应用） |

## 4. 核心模块设计

### 4.1 InkEngine.ts — 核心引擎

**职责**：管理Canvas画布、墨迹粒子生成、扩散算法、鼠标/触摸事件处理

**核心类/接口**：
- `InkEngine`：主引擎类，持有Canvas引用和动画循环
- `InkStroke`：单次笔触数据（点的数组、颜色、时间戳）
- `InkParticle`：扩散粒子（位置、半径、透明度、生命周期）
- `BurstParticle`：爆散粒子（位置、速度、方向、生命周期）
- `BackgroundParticle`：背景飘浮粒子（位置、速度、透明度）

**扩散算法**：
- 每个墨迹点生成时记录初始半径和透明度
- 每帧：半径 += 扩散速率 * deltaTime，透明度 -= 衰减速率 * deltaTime
- 透明度 <= 0 时移除粒子
- 使用径向渐变模拟墨迹边缘柔和效果

**笔触粗细**：
- 记录连续两点的距离计算速度
- 速度映射到笔触宽度：慢速 → 粗（max 20px），快速 → 细（min 2px）
- 使用线性插值平滑过渡

### 4.2 PoetryMatcher.ts — 诗歌匹配

**职责**：根据笔画特征（长度、方向、曲率）从预设库匹配短诗

**匹配策略**：
- 分析笔触总长度、方向分布、曲率
- 将特征映射到预设的"意境类别"（山水、花鸟、风雨、禅意、月夜、春色）
- 从对应类别中随机选取一首短诗

**预设库**：包含约30首唐宋诗词片段，分为6个意境类别

### 4.3 UILayer.tsx — UI层

**职责**：React组件，渲染工具栏、颜色选择器、重置按钮、导出按钮、诗歌展示卡片

**组件结构**：
- `Toolbar`：右侧浮动工具栏
- `ColorPicker`：三个色块按钮（墨黑/朱红/石青）
- `ResetButton`：重置画布
- `ExportButton`：导出PNG
- `PoetryCard`：毛玻璃诗歌展示卡片

### 4.4 状态管理（Zustand）

```typescript
interface InkStore {
  inkColor: 'black' | 'vermilion' | 'azurite'
  isDrawing: boolean
  currentPoem: string | null
  setInkColor: (color: InkColor) => void
  setIsDrawing: (drawing: boolean) => void
  setCurrentPoem: (poem: string | null) => void
}
```

## 5. 文件结构

```
src/
  InkEngine.ts        — 核心引擎
  PoetryMatcher.ts    — 诗歌匹配
  UILayer.tsx         — UI组件层
  store.ts            — Zustand状态管理
  main.tsx            — 入口
  index.css           — 全局样式
```

## 6. 性能策略

- 使用 requestAnimationFrame 驱动60fps动画循环
- 离屏Canvas缓存已完成扩散的墨迹，减少每帧绘制量
- 粒子池复用，避免频繁GC
- Canvas尺寸跟随窗口resize，使用devicePixelRatio适配高清屏
- 扩散完成的粒子及时清理
