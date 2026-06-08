## 1. 架构设计

```mermaid
graph TB
    subgraph "前端层"
        "React UI" --> "UIOverlay.tsx"
        "Canvas 渲染" --> "GameRenderer.ts"
    end
    subgraph "游戏核心层"
        "GameEngine.ts" --> "回合循环/胜负判定"
        "GridManager.ts" --> "网格地图/路径/道具"
        "UnitManager.ts" --> "单位属性/移动/攻击"
        "AIController.ts" --> "AI 决策逻辑"
    end
    subgraph "状态管理层"
        "Zustand Store" --> "游戏状态同步"
    end
    "React UI" --> "Zustand Store"
    "Canvas 渲染" --> "Zustand Store"
    "GameEngine.ts" --> "GridManager.ts"
    "GameEngine.ts" --> "UnitManager.ts"
    "GameEngine.ts" --> "AIController.ts"
    "GameEngine.ts" --> "Zustand Store"
```

## 2. 技术说明

- **前端框架**：React 18 + TypeScript
- **构建工具**：Vite
- **样式方案**：Tailwind CSS 3
- **状态管理**：Zustand（游戏状态与 React UI 同步）
- **渲染引擎**：Canvas 2D + requestAnimationFrame（60fps 游戏循环）
- **动画**：自研缓动系统 + 粒子系统
- **后端**：无（纯前端单机游戏）

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| `/` | 游戏主页面（包含开始/战斗/结算三个阶段） |

## 4. 文件结构

```
src/
  core/
    GameEngine.ts        # 游戏主循环、回合管理、胜负判定
    GridManager.ts       # 8×8 网格管理、障碍物/道具生成、寻路
    UnitManager.ts       # 单位属性、移动/攻击逻辑、职业系统
    AIController.ts      # AI 决策：优先攻击低血、包围策略
    types.ts             # 所有游戏类型定义
  render/
    GameRenderer.ts      # Canvas 渲染主类，管理渲染循环
    SpriteRenderer.ts    # 单位精灵渲染（图标+光晕+描边）
    ParticleSystem.ts    # 粒子系统（冲击波/拾取/消散）
    AnimationManager.ts  # 缓动动画管理（移动/攻击/过渡）
  store/
    gameStore.ts         # Zustand 游戏状态 Store
  components/
    UIOverlay.tsx        # 主 UI 覆盖层（状态栏+操作面板+回合提示）
    StartScreen.tsx      # 开始界面
    ResultScreen.tsx     # 结算界面
    GameBoard.tsx        # Canvas 容器组件
  App.tsx
  main.tsx
  index.css
```

## 5. 核心数据模型

### 5.1 数据模型定义

```mermaid
erDiagram
    "Game" ||--o{ "Unit" : "包含"
    "Game" ||--|| "Grid" : "拥有"
    "Grid" ||--o{ "Cell" : "包含"
    "Cell" ||--o| "Item" : "持有"
    "Unit" {
        "string id PK"
        "string name"
        "UnitType type"
        "number hp"
        "number maxHp"
        "number attack"
        "number moveRange"
        "number attackRange"
        "Position position"
        "boolean hasActed"
        "Skill skill"
    }
    "Cell" {
        "number row"
        "number col"
        "CellType type"
        "boolean isOccupied"
    }
    "Item" {
        "ItemType type"
        "number value"
        "Position position"
    }
    "Position" {
        "number row"
        "number col"
    }
```

### 5.2 类型定义

```typescript
type UnitType = 'warrior' | 'archer' | 'mage' | 'enemy'
type CellType = 'normal' | 'obstacle' | 'item'
type ItemType = 'attackBoost' | 'moveBoost'
type GamePhase = 'start' | 'playerTurn' | 'enemyTurn' | 'victory' | 'defeat'
type TurnStep = 'select' | 'move' | 'attack' | 'done'

interface Position { row: number; col: number }

interface Skill {
  name: string
  damageMultiplier: number
  range: number
  aoe: number
  cooldown: number
  currentCooldown: number
}

interface Unit {
  id: string
  name: string
  type: UnitType
  hp: number
  maxHp: number
  attack: number
  moveRange: number
  attackRange: number
  position: Position
  hasActed: boolean
  skill: Skill
  isAlive: boolean
}

interface Cell {
  row: number
  col: number
  type: CellType
  occupant: Unit | null
  item: Item | null
}

interface Item {
  type: ItemType
  value: number
  position: Position
}

interface GameState {
  phase: GamePhase
  turnStep: TurnStep
  turnNumber: number
  grid: Cell[][]
  playerUnits: Unit[]
  enemyUnits: Unit[]
  selectedUnit: Unit | null
  moveableCells: Position[]
  attackableCells: Position[]
  animationQueue: Animation[]
}
```

### 5.3 渲染管线

1. **清屏** → 深色背景
2. **绘制网格** → 银色发光线条
3. **绘制障碍物** → 深色方块 + 纹理
4. **绘制道具** → 发光图标
5. **绘制移动范围** → 蓝色虚线格子
6. **绘制攻击范围** → 红色半透明格子
7. **绘制单位** → 像素图标 + 呼吸光晕 + 选中描边 + 血条
8. **绘制动画** → 移动缓动 / 攻击特效 / 粒子系统
9. **绘制过渡** → 回合切换白光

### 5.4 AI 策略

1. **优先级排序**：可攻击的低血量单位 > 可攻击的任意单位 > 向最近玩家单位移动
2. **包围策略**：当多个敌人可移动时，尝试从不同方向接近同一目标
3. **技能使用**：当范围内有多个玩家单位时，法师型敌人优先使用范围攻击
