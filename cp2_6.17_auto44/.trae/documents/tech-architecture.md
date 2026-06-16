## 1. 架构设计

```mermaid
graph TB
    subgraph "前端应用层"
        App["App.tsx 游戏状态管理"]
        GG["GameGrid.tsx 网格渲染与交互"]
        TS["TideSystem.ts 潮汐计算引擎"]
        Types["types.ts 类型定义"]
    end
    
    subgraph "数据流"
        Raf["requestAnimationFrame 游戏循环"]
        Tide["潮汐状态 潮高+洋流"]
        Energy["能量计算 各塔效率汇总"]
    end
    
    Raf --> App
    App --> GG
    App --> TS
    TS --> Tide
    Tide --> Energy
    Types --> App
    Types --> GG
    Types --> TS
```

## 2. 技术说明

- 前端：React@18 + TypeScript + Vite
- 初始化工具：Vite
- 后端：无
- 数据库：无（纯前端状态管理）
- 渲染：Canvas绘制六边形网格与塔图标，React管理UI层

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 游戏主页面（单页应用） |

## 4. 数据模型

### 4.1 核心数据结构

```mermaid
erDiagram
    GameState ||--o{ Tower : contains
    GameState ||--|| TideState : tracks
    GameState ||--|| CurrentState : tracks
    Tower ||--|| TowerType : has
    Tower ||--|| HexCoord : placed_at
    
    GameState {
        number energyCoins
        number totalEnergy
        boolean paused
        number elapsedTime
        Map towers
    }
    
    Tower {
        TowerType type
        number level
        number efficiency
        number accumulatedEnergy
        HexCoord position
    }
    
    TideState {
        number tideHeight
        number currentSpeed
        number currentDirection
        number cycleTime
    }
    
    TowerType {
        string name
        string color
        number baseOutput
    }
    
    HexCoord {
        number row
        number col
        number pixelX
        number pixelY
    }
```

### 4.2 文件结构

```
├── package.json
├── vite.config.js
├── tsconfig.json
├── index.html
└── src/
    ├── App.tsx          # 主应用组件，游戏状态、游戏循环、整体布局
    ├── types.ts         # 所有TypeScript类型定义
    ├── GameGrid.tsx     # Canvas网格渲染、交互处理
    └── TideSystem.ts    # 纯函数潮汐计算模块
```

### 4.3 性能策略

- 游戏循环使用 requestAnimationFrame，帧率锁定60fps
- Canvas批量绘制所有六边形和塔，避免DOM操作
- 潮汐计算为纯函数，无副作用
- 状态更新使用React setState批量处理
- 悬浮信息卡和放置菜单使用DOM元素（绝对定位），覆盖在Canvas之上
