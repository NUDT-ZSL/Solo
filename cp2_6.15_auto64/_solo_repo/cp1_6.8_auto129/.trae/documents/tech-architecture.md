## 1. 架构设计

```mermaid
flowchart TD
    "React App (UILayer.tsx)" --> "Canvas 渲染层"
    "Canvas 渲染层" --> "MazeRenderer.ts"
    "Canvas 渲染层" --> "MagneticField.ts"
    "Canvas 渲染层" --> "GameEngine.ts"
    "GameEngine.ts" --> "MazeRenderer.ts"
    "GameEngine.ts" --> "MagneticField.ts"
    "GameEngine.ts" --> "物理模拟"
    "物理模拟" --> "摩擦力计算"
    "物理模拟" --> "反弹计算"
    "物理模拟" --> "磁场力计算"
    "MagneticField.ts" --> "粒子系统"
    "MagneticField.ts" --> "流线可视化"
```

## 2. 技术说明
- 前端：React@18 + TypeScript + Vite
- 初始化工具：vite-init (react-ts 模板)
- 渲染：Canvas 2D API
- 状态管理：Zustand
- 样式：Tailwind CSS + 自定义 CSS
- 后端：无
- 数据库：无（关卡数据内置）

## 3. 文件结构

```
src/
├── GameEngine.ts      # 主循环、物理模拟、关卡状态管理、胜负判定
├── MazeRenderer.ts    # 迷宫网格渲染、墙壁碰撞检测、出口标记、路径高亮
├── MagneticField.ts   # 磁场极性切换、强度渐变、作用力计算、粒子流线可视化
├── UILayer.tsx        # React UI 组件：步数、时间、极性指示器、滑块、重置按钮
├── App.tsx            # 主应用入口，组合 Canvas + UI
├── main.tsx           # React 挂载点
└── index.css          # 全局样式 + 赛博朋克主题
```

## 4. 核心模块设计

### 4.1 GameEngine.ts
- `GameEngine` 类：管理游戏主循环（requestAnimationFrame）
- 物理模拟：摩擦系数 0.98，反弹系数 0.6，速度上限 5px/帧
- 关卡状态：当前关卡索引、步数计数、倒计时（60秒）
- 胜负判定：小球到达出口区域→胜利，倒计时归零→失败
- 屏幕震动：碰壁时 Canvas offset 抖动（±4px, 100ms 衰减）
- 烟花粒子：到达出口时触发 200 个粒子爆发

### 4.2 MazeRenderer.ts
- 迷宫数据：二维网格数组（0=通道，1=墙壁，2=出口）
- 渲染：深色墙壁 + 荧光边缘线条（glow 效果）
- 出口：绿色闪烁方块（alpha 脉冲动画）
- 碰撞检测：AABB 矩形检测，小球与墙壁碰撞后反弹
- 路径高亮：记录小球轨迹，半透明渐变线条

### 4.3 MagneticField.ts
- 极性状态：'N' | 'S'，N极向上施力，S极向下施力
- 强度：0-100 渐变，影响加速度大小
- 力计算：F = strength * 0.05 * polarityDirection
- 粒子流线：最多 500 个粒子，沿磁场方向流动
- 极性切换动画：箭头旋转 180 度（200ms 过渡）
- 强度变化：粒子密度和长度同步变化

### 4.4 UILayer.tsx
- 步数显示：每次极性切换/强度变化 +1
- 倒计时：60 秒倒计时，红色闪烁 <10 秒
- 极性指示器：大字母 N(蓝色渐变) / S(红色渐变)
- 强度滑块：0-100，带数值显示
- 重置按钮：圆形图标，点击旋转动画

## 5. 路由定义
| 路由 | 用途 |
|------|------|
| / | 游戏主页面（单页应用） |

## 6. 状态管理 (Zustand)
```typescript
interface GameState {
  currentLevel: number;
  steps: number;
  timeRemaining: number;
  polarity: 'N' | 'S';
  strength: number;
  gameStatus: 'playing' | 'won' | 'lost';
}
```
