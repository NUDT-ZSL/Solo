# 星轨棋盘 - 技术架构文档

## 1. 技术选型

| 类别 | 技术 | 说明 |
|------|------|------|
| 语言 | TypeScript | 严格类型检查，目标 ES2020 |
| 构建工具 | Vite | 快速开发服务器，HMR支持 |
| 渲染 | Canvas 2D | 高性能粒子和动画渲染 |

---

## 2. 项目结构

```
auto42/
├── package.json
├── vite.config.js
├── tsconfig.json
├── index.html
└── src/
    ├── board.ts      # 棋盘逻辑
    ├── pieces.ts     # 棋子逻辑
    ├── effects.ts    # 粒子效果系统
    └── main.ts       # 主循环和游戏状态机
```

---

## 3. 模块设计

### 3.1 board.ts - 棋盘逻辑模块

**职责**：
- 8x8网格数据结构管理
- 格子状态（空置/玩家1/玩家2）
- 轨迹数据存储
- 轨迹交叉检测算法
- 封闭区域面积计算（胜利判定）

**核心数据结构**：
```typescript
type CellOwner = 0 | 1 | 2; // 0:空置, 1:玩家1, 2:玩家2
interface Cell {
  row: number;
  col: number;
  owner: CellOwner;
  trails: Trail[];
}
interface Trail {
  playerId: 1 | 2;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  timestamp: number;
}
```

**核心方法**：
- `generateBoard()`: 初始化8x8网格
- `getCell(row, col)`: 获取格子
- `addTrail(playerId, from, to)`: 添加轨迹
- `detectCrossing()`: 检测轨迹交叉
- `calculateArea(playerId)`: 计算玩家占领面积
- `checkVictory()`: 检查胜利条件
- `resetArea(centerRow, centerCol, radius)`: 重置指定区域

### 3.2 pieces.ts - 棋子逻辑模块

**职责**：
- 棋子位置管理
- 选中状态
- 可达路径计算（直线移动）
- 移动动画插值
- 轨迹光带数据
- 光晕效果触发

**核心数据结构**：
```typescript
interface Piece {
  id: string;
  playerId: 1 | 2;
  row: number;
  col: number;
  isSelected: boolean;
  moveAnimation: MoveAnimation | null;
  trailBand: TrailBand[];
}
interface MoveAnimation {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  startTime: number;
  duration: number;
}
```

**核心方法**：
- `selectPiece(pieceId)`: 选中棋子
- `deselectPiece()`: 取消选中
- `getReachableCells()`: 获取可达格子（直线方向）
- `movePiece(toRow, toCol)`: 移动棋子
- `update(deltaTime)`: 更新动画状态
- `render(ctx, boardOffset)`: 渲染棋子和光带

### 3.3 effects.ts - 粒子效果系统

**职责**：
- 星尘粒子环管理和渲染
- 选中光圈动画
- 移动光晕扩散
- 轨迹交叉漩涡爆炸
- 胜利粒子雨动画
- 统一粒子对象池管理

**核心数据结构**：
```typescript
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  type: 'stardust' | 'explosion' | 'victory' | 'glow';
}
```

**核心方法**：
- `createStardustRing(centerX, centerY, radius)`: 创建星尘环
- `createGlowPulse(x, y, color)`: 创建光晕脉冲
- `createExplosion(x, y)`: 创建爆炸漩涡
- `createVictoryParticles()`: 创建胜利粒子雨
- `update(deltaTime)`: 更新所有粒子
- `render(ctx)`: 渲染所有粒子

### 3.4 main.ts - 主循环模块

**职责**：
- 游戏状态机管理（等待/进行中/胜利）
- 回合管理和倒计时
- 事件分发
- 日志记录
- Canvas渲染循环
- UI元素绘制（计时器、日志、胜利文字）
- 响应式布局处理

**核心数据结构**：
```typescript
type GameState = 'waiting' | 'playing' | 'victory';
interface GameLog {
  type: 'move' | 'cross' | 'explosion';
  message: string;
  timestamp: number;
}
```

**核心方法**：
- `initGame()`: 初始化游戏
- `nextTurn()`: 切换回合
- `updateTimer(deltaTime)`: 更新倒计时
- `addLog(type, message)`: 添加日志
- `handleClick(x, y)`: 处理点击事件
- `gameLoop()`: 主游戏循环
- `renderUI(ctx)`: 渲染UI元素
- `checkVictory()`: 检查并处理胜利

---

## 4. 坐标系统

### 4.1 菱形棋盘坐标
- 采用轴向坐标系统 (row, col)
- 屏幕坐标转换：
  - `screenX = offsetX + (col - row) * cellWidth / 2`
  - `screenY = offsetY + (col + row) * cellHeight / 2`

### 4.2 Canvas布局
- 桌面端：棋盘居中，左侧日志面板，右上角计时器
- 移动端：棋盘居中缩小50%，日志折叠为抽屉

---

## 5. 性能优化

### 5.1 粒子对象池
- 预分配粒子数组，避免频繁GC
- 最大500个粒子限制
- 粒子死亡后立即复用

### 5.2 渲染优化
- 棋盘背景离屏Canvas缓存
- 仅重绘变化区域
- requestAnimationFrame 驱动

### 5.3 碰撞检测
- 空间哈希优化轨迹交叉检测
- 仅检测新添加轨迹与其他轨迹的交叉

---

## 6. 动画规范

- 统一缓动函数：`cubic-bezier(0.25, 0.46, 0.45, 0.94)`
- 过渡时长：0.3s
- 帧率目标：≥ 45fps
