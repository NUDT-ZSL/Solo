## 1. 架构设计

```mermaid
graph TD
    "index.html" --> "main.ts"
    "main.ts" --> "board.ts"
    "main.ts" --> "player.ts"
    "main.ts" --> "gameUI.ts"
    "main.ts" --> "gameLogic.ts"
    "gameUI.ts" --> "board.ts"
    "gameUI.ts" --> "player.ts"
    "player.ts" --> "board.ts"
    "gameLogic.ts" --> "board.ts"
    "gameLogic.ts" --> "player.ts"
```

数据流向：
- 用户点击 → main.ts → gameLogic.ts → player.ts → board.ts → gameUI.ts → Canvas渲染
- main.ts作为调度中心，协调board、player、gameUI、gameLogic四个模块
- board.ts管理棋盘状态，被player.ts和gameUI.ts读取
- player.ts管理棋子和行动，被gameLogic.ts调用
- gameUI.ts负责Canvas渲染，读取board和player状态
- gameLogic.ts处理游戏规则、回合管理、AI决策

## 2. 技术说明
- 前端：TypeScript + Canvas 2D API + Vite
- 初始化工具：Vite
- 后端：无
- 数据库：无（纯前端游戏）

## 3. 文件结构

```
/
├── package.json          # 依赖：typescript、vite，脚本：npm run dev
├── vite.config.js        # Vite构建配置，支持HMR
├── tsconfig.json         # 严格模式，目标ES2020
├── index.html            # 入口页面，全屏渐变背景
└── src/
    ├── main.ts           # 游戏循环和初始化入口
    ├── board.ts          # 棋盘生成与管理
    ├── player.ts         # 玩家与AI控制逻辑
    ├── gameUI.ts         # 界面渲染和交互反馈
    └── gameLogic.ts      # 游戏规则、回合管理、AI决策
```

## 4. 核心数据结构

### 4.1 格子类型
```typescript
enum CellType {
  EMPTY = 0,    // 空地
  SPIRIT = 1,   // 灵脉
  THORN = 2     // 荆棘
}

enum FogState {
  FULL = 0,      // 完全迷雾
  FADING = 1,    // 消散中
  CLEAR = 2,     // 已探索可见
  RETURNING = 3  // 迷雾回覆盖中
}

interface Cell {
  type: CellType;
  fogState: FogState;
  fogAlpha: number;        // 0-1，迷雾透明度
  owner: PlayerSide | null; // 灵脉占领方
  captureProgress: number;  // 占领倒计时进度
  pulsePhase: number;      // 灵脉脉冲相位
}
```

### 4.2 棋子
```typescript
enum PlayerSide {
  GREEN = 0,   // 翠绿方 #3CB371
  AMBER = 1    // 琥珀方 #FFB347
}

interface Piece {
  side: PlayerSide;
  row: number;
  col: number;
  entangled: number; // 藤蔓缠绕剩余回合数
}
```

### 4.3 游戏状态
```typescript
interface GameState {
  board: Cell[][];
  pieces: Piece[];
  currentSide: PlayerSide;
  turn: number;
  maxTurns: number;
  mana: [number, number];    // 双方法力值
  scores: [number, number];  // 双方占领灵脉数
  turnTimer: number;         // 回合剩余秒数
  selectedPiece: Piece | null;
  selectedCell: {row: number, col: number} | null;
  isAnimating: boolean;
  phase: GamePhase;
}

enum GamePhase {
  TURN_TRANSITION,  // 回合切换提示
  PLAYER_TURN,      // 玩家回合
  AI_THINKING,      // AI思考中
  GAME_OVER         // 游戏结束
}
```

## 5. 模块调用关系

### 5.1 main.ts
- 初始化Canvas和所有模块
- 运行requestAnimationFrame游戏循环
- 接收Canvas点击事件，传递给gameLogic处理
- 每帧调用gameUI.render()更新画面

### 5.2 board.ts
- 导出：createBoard(size) → Cell[][]
- 导出：updateFog(pieces, board) → void（根据棋子位置更新迷雾）
- 导出：getCellAt(board, row, col) → Cell
- 导出：countSpiritNodes(board) → {green: number, amber: number}
- 事件：监听格子被选中

### 5.3 player.ts
- 导出：movePiece(piece, direction, board) → boolean
- 导出：summonPiece(side, cell, mana) → {success, newMana}
- 导出：castVine(side, targetPiece, mana) → {success, newMana}
- 导出：getAIAction(board, pieces, mana) → Action
- 读取board.ts的格子状态，返回行动结果

### 5.4 gameUI.ts
- 导出：render(ctx, gameState, deltaTime) → void
- 导出：drawBoard(ctx, board) → void
- 导出：drawPieces(ctx, pieces) → void
- 导出：drawFog(ctx, board) → void
- 导出：drawUI(ctx, gameState) → void（倒计时、按钮、提示等）
- 读取board.ts和player.ts状态渲染到Canvas

### 5.5 gameLogic.ts
- 导出：handleClick(x, y, gameState) → GameState
- 导出：advanceTurn(gameState) → GameState
- 导出：checkGameOver(gameState) → {over, winner}
- 导出：runAITurn(gameState) → GameState
- 协调board和player模块执行游戏逻辑
