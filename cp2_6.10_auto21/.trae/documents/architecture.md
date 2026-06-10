## 1. 架构设计

```mermaid
graph TD
    "App.tsx" --> "Board.tsx"
    "App.tsx" --> "GameEngine.ts"
    "GameEngine.ts" --> "AIPlayer.ts"
    "App.tsx" --> "StatusPanel"
    "App.tsx" --> "ResultModal"
    "Board.tsx" --> "Cell"
    "Board.tsx" --> "ParticleEffect"
    "Board.tsx" --> "PathRenderer"
    "styles.css" --> "全局样式"
```

**数据流向：**
- 玩家点击 → Board.tsx → 坐标传给 GameEngine.ts → 更新棋盘状态 → 返回给 App.tsx → 重新渲染 Board
- AI 移动触发：App.tsx 定时器 → 调用 GameEngine → AIPlayer 决策 → 返回移动位置 → GameEngine 更新状态 → App 重新渲染

## 2. 技术描述

- **前端框架**：React 18 + TypeScript
- **构建工具**：Vite 5（端口 3000）
- **状态管理**：React useState/useReducer（轻量场景，无需额外状态库）
- **样式方案**：纯 CSS + CSS 变量（深色主题、动画关键帧）
- **路径寻路**：A* 算法（实现于 GameEngine 内部 Pathfinder）
- **AI 策略**：随机 + 贪婪混合策略（每步决策 < 50ms）

## 3. 目录结构

```
src/
├── main.tsx              # React 挂载入口
├── App.tsx               # 根组件，全局状态 & 游戏循环
├── styles.css            # 全局样式 & 动画
└── game/
    ├── Board.tsx         # 棋盘组件（React.memo 优化）
    ├── Cell.tsx          # 单元格组件（React.memo + 浅比较）
    ├── ParticleEffect.tsx  # 粒子特效组件
    ├── GameEngine.ts     # 游戏逻辑引擎
    ├── AIPlayer.ts       # AI 对手模拟
    └── types.ts          # 类型定义
```

## 4. 核心类型定义

```typescript
// types.ts
export type CellType = 'empty' | 'trap' | 'player' | 'ai' | 'goal';

export interface Position {
  x: number;
  y: number;
}

export interface CellState {
  type: CellType;
  isFlashing?: boolean;
  isExploding?: boolean;
  isPulsing?: boolean;
}

export interface GameState {
  board: CellState[][];
  aiPosition: Position;
  playerPosition: Position;
  goalPosition: Position;
  turn: number;
  score: number;
  aiStepsRemaining: number;
  path: Position[];
  gameOver: boolean;
  winner: 'player' | 'ai' | null;
  aiPausedTurns: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}
```

## 5. 性能优化方案

| 优化点 | 实现方式 |
|--------|----------|
| 棋盘渲染 | Board.tsx 使用 React.memo，Cell.tsx 使用 React.memo + 自定义比较函数 |
| 游戏循环 | 使用 requestAnimationFrame 确保 60FPS，状态更新批量处理 |
| AI 决策 | 限制在 50ms 内，使用 Web Worker 或 setTimeout 低优先级执行 |
| 重渲染控制 | 使用 useCallback 包装事件处理函数，useMemo 缓存计算结果 |
| 粒子动画 | 使用 CSS transform 而非 top/left，开启 GPU 加速 |

## 6. 动画实现清单

| 动画 | 实现方式 | 持续时间 |
|------|----------|----------|
| 格子闪烁 | @keyframes flash | 0.5s（2次循环） |
| 粒子扩散 | @keyframes particleSpread + 10个 div | 0.4s |
| 爆炸动画 | @keyframes explode | 0.8s |
| 脉冲光晕 | @keyframes pulseGlow | 0.3s |
| 弹窗淡入+缩放 | @keyframes modalIn | 0.3s ease-out |
| 重置过渡 | @keyframes fadeInOut | 0.5s |
| AI 路径滑动 | CSS transition transform | 0.3s |

## 7. 响应式适配

```css
@media (max-width: 768px) {
  .cell { width: 50px; height: 50px; }
  .status-panel { flex-direction: column; gap: 8px; }
}
```
