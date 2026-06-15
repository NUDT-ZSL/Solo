## 1. 架构设计

```mermaid
graph TB
    "前端展示层" --> "状态管理层"
    "状态管理层" --> "核心算法层"
    "核心算法层" --> "Canvas渲染层"
    
    subgraph "前端展示层"
        "App.tsx"
        "CalligraphyCanvas.tsx"
        "ControlPanel.tsx"
    end
    
    subgraph "状态管理层"
        "Zustand Store"
    end
    
    subgraph "核心算法层"
        "calligraphyEngine.ts"
    end
    
    subgraph "Canvas渲染层"
        "HTML5 Canvas API"
    end
```

## 2. 技术说明
- 前端框架：React 18 + TypeScript
- 构建工具：Vite
- 样式方案：Tailwind CSS 3
- 状态管理：Zustand
- 渲染引擎：HTML5 Canvas 2D API
- 图标库：lucide-react
- 初始化工具：vite-init (react-ts 模板)

## 3. 路由定义
| 路由 | 用途 |
|------|------|
| / | 书法创作主页，全屏画布+控制面板 |

## 4. 文件结构
```
src/
├── main.tsx                    # 入口文件，挂载React应用
├── App.tsx                     # 主组件，管理画布状态和界面布局
├── CalligraphyCanvas.tsx       # Canvas渲染引擎组件
├── ControlPanel.tsx            # 控制面板组件
├── store.ts                    # Zustand状态管理
└── utils/
    └── calligraphyEngine.ts    # 核心算法模块
```

## 5. 核心算法设计

### 5.1 笔画平滑算法
- 使用 Catmull-Rom 样条插值对原始鼠标轨迹进行平滑处理
- 采样间隔：每4ms采集一个点，通过插值生成平滑曲线
- 输入：鼠标轨迹点数组 [{x, y, pressure, timestamp}]
- 输出：平滑后的贝塞尔曲线控制点数组

### 5.2 速度感应系统
- 计算相邻两点的速度 v = distance / deltaTime
- 速度映射到笔画宽度：width = maxWidth - (v / maxSpeed) * (maxWidth - minWidth)
- 速度映射到墨色浓度：opacity = maxOpacity - (v / maxSpeed) * (maxOpacity - minOpacity)
- 加入高斯抖动模拟笔锋：offsetX/Y = gaussianRandom(0, jitterAmount)

### 5.3 字体风格转换
- 楷书模式：笔画方正工整，转角明显，lineJoin = 'miter'，宽高比接近1:1
- 行书模式：笔画行云流水，转角圆滑，lineJoin = 'round'，笔画略带倾斜
- 草书模式：笔画流畅飘逸，lineJoin = 'round'，增大平滑因子，笔画连绵不断

### 5.4 墨迹晕染模拟
- 主笔画层：正常绘制平滑后的笔画
- 晕染层：使用 shadowBlur + shadowColor 模拟边缘扩散
- 多层叠加：主笔画 + 轻晕染层 + 重晕染层，通过 globalAlpha 控制透明度
- 墨色：深棕黑 rgba(44, 24, 16, opacity)

### 5.5 宣纸纹理生成
- 基础底色：#F5E6C8（米黄色）
- 纤维纹理：随机生成细线段，模拟宣纸纤维走向
- 使用离屏Canvas预渲染纹理，避免每帧重复计算
- 纹理参数：纤维密度、长度范围、角度分布、透明度

### 5.6 纹理混合
- 导出时将宣纸纹理层和墨迹层合成为最终图像
- 使用 Canvas globalCompositeOperation 进行混合
- 导出分辨率：与画布实际尺寸一致

## 6. 性能优化策略
- 宣纸纹理预渲染到离屏Canvas，仅生成一次
- 墨迹绘制使用 requestAnimationFrame 保证60fps
- 笔画数据增量更新，避免全量重绘
- 速度计算使用滑动窗口平均，避免突变
- Canvas 分层：底层纹理Canvas + 顶层墨迹Canvas，减少重绘范围
