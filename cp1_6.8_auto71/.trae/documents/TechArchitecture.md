## 1. 架构设计

```mermaid
flowchart TD
    "React前端层" --> "CharacterEngine"
    "React前端层" --> "AnimationController"
    "React前端层" --> "StyleGallery组件"
    "React前端层" --> "ControlPanel组件"
    "CharacterEngine" --> "内置字形数据集"
    "AnimationController" --> "Canvas 2D渲染"
    "AnimationController" --> "墨滴粒子系统"
```

纯前端架构，无后端服务。字形数据以内置JSON数据集形式存储在前端，Canvas 2D负责笔画绘制和动画渲染。

## 2. 技术说明

- **前端**：React@18 + TypeScript + Tailwind CSS@3 + Vite
- **初始化工具**：vite-init（react-ts模板）
- **后端**：无
- **数据库**：无，使用内置mock字形数据
- **状态管理**：Zustand
- **图标库**：lucide-react

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 单页应用，所有功能集成在主页 |

## 4. 文件结构

```
src/
├── CharacterEngine.ts       # 核心引擎：字符查询、笔画分解、字形数据
├── AnimationController.ts   # 动画控制器：笔画动画时间轴、缓动、播放控制
├── StyleGallery.tsx         # 书法风格卡片矩阵组件
├── ControlPanel.tsx         # 控制面板组件（搜索、风格选择、速度、随机）
├── App.tsx                  # 主应用组件
├── main.tsx                 # 入口文件
├── store.ts                 # Zustand状态管理
├── data/
│   └── characters.ts        # 内置字形数据集（含笔画路径、名称、风格变体）
├── components/
│   ├── BrushCanvas.tsx      # Canvas画布组件（笔画绘制+粒子效果）
│   └── StrokeTooltip.tsx    # 笔画悬停提示组件
├── hooks/
│   └── useAnimation.ts      # 动画控制Hook
├── utils/
│   └── easing.ts            # 缓动函数库
└── index.css                # 全局样式（宣纸纹理、毛玻璃等）
```

## 5. 核心数据结构

### 5.1 字形数据模型

```typescript
interface StrokeData {
  name: string;           // 笔画名称（横、竖、撇、捺等）
  path: number[][];       // 笔画路径点坐标序列
  width: number;          // 笔画宽度曲线
  pressure: number[];     // 压感数据（模拟毛笔力度）
}

interface CharacterVariant {
  style: 'kaishu' | 'xingshu' | 'caoshu';  // 楷书/行书/草书
  strokes: StrokeData[];   // 笔画数组
  bounds: { width: number; height: number };  // 字形边界
}

interface CharacterData {
  char: string;                          // 汉字
  variants: CharacterVariant[];          // 风格变体
  pinyin: string;                        // 拼音
  strokeCount: number;                   // 总笔画数
}
```

### 5.2 动画状态模型

```typescript
interface AnimationState {
  isPlaying: boolean;
  currentStrokeIndex: number;
  progress: number;          // 0-1 当前笔画进度
  speed: number;             // 动画速度倍率
  completedStrokes: number[]; // 已完成笔画索引
}
```

## 6. 关键技术实现

### 6.1 笔画动画

- 使用Canvas 2D API的`bezierCurveTo`绘制贝塞尔曲线笔画
- 通过压感数据控制笔画宽度变化，模拟毛笔提按效果
- 笔画起始处墨迹渐浓（opacity从0.3到1.0过渡）
- 笔画收尾处笔锋效果（宽度递减+透明度递减）
- 使用requestAnimationFrame驱动动画循环

### 6.2 墨滴粒子系统

- 笔画绘制时在笔尖位置生成墨滴粒子
- 粒子具有随机大小、方向和生命周期
- 粒子使用缓动函数控制运动轨迹，模拟墨滴在宣纸上晕染扩散
- 粒子透明度随生命周期递减

### 6.3 笔画悬停检测

- 记录每个笔画在Canvas上的绘制区域边界
- 鼠标移动时检测是否落在某个已完成笔画的边界内
- 命中时高亮该笔画并显示StrokeTooltip组件

### 6.4 风格切换过渡

- 切换书法风格时，当前画布内容以淡出动画消失
- 新风格的笔画以淡入动画开始绘制
- 使用CSS transition + Canvas alpha混合实现平滑过渡
