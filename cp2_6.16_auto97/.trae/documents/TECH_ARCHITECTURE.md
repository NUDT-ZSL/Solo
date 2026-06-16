## 1. 架构设计

```mermaid
graph TD
    subgraph "前端 (React + TypeScript + Vite)"
        A["App.tsx 主应用组件"] --> B["GameCanvas.tsx 画布组件"]
        A --> C["StatsPanel 统计面板"]
        A --> D["HelpModal 帮助弹窗"]
        B --> E["GameEngine.ts 游戏引擎"]
        A --> F["api.ts API服务"]
    end
    subgraph "后端 (Express + TypeScript)"
        G["server/index.ts Express服务器"]
        G --> H["/api/config 获取配置"]
        G --> I["/api/save-score 保存战绩"]
        G --> J["JSON文件存储"]
    end
    F -->|"HTTP请求"| H
    F -->|"HTTP请求"| I
```

## 2. 技术说明

- **前端框架**：React@18 + TypeScript
- **构建工具**：Vite@5 + @vitejs/plugin-react
- **渲染引擎**：Canvas 2D API
- **状态管理**：React useState/useRef（局部状态）
- **路由**：react-router-dom（预留扩展）
- **后端框架**：Express@4 + TypeScript
- **数据存储**：JSON文件（server/data/*.json）
- **工具库**：uuid（唯一ID生成）、cors（跨域支持）

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 游戏主页（唯一页面） |

## 4. API 定义

### 4.1 获取微生物配置
- **端点**：`GET /api/config`
- **响应**：
```typescript
interface MicrobeConfig {
  initialCount: number;
  minRadius: number;
  maxRadius: number;
  minSpeed: number;
  maxSpeed: number;
  turnFrequency: number;
  energyDecayRate: number;
}

interface GameConfig {
  microbe: MicrobeConfig;
  chemical: {
    maxAttractors: number;
    maxRepellents: number;
    radius: number;
    duration: number;
    highConcentrationThreshold: number;
    speedBoost: number;
    speedBoostDuration: number;
  };
  collision: {
    bounceSpeedFactor: number;
    flashDuration: number;
    flashRadiusMultiplier: number;
    fusionEnergyThreshold: number;
    fusionEnergyFactor: number;
  };
}
```

### 4.2 保存玩家战绩
- **端点**：`POST /api/save-score`
- **请求体**：
```typescript
interface SaveScoreRequest {
  playerName: string;
  maxMicrobeCount: number;
  avgEnergy: number;
  duration: number;
  timestamp: number;
}
```
- **响应**：
```typescript
interface SaveScoreResponse {
  success: boolean;
  id: string;
  rank: number;
}
```

## 5. 服务器架构图

```mermaid
graph TD
    A["Express App"] --> B["CORS Middleware"]
    A --> C["JSON Body Parser"]
    A --> D["Route: GET /api/config"]
    A --> E["Route: POST /api/save-score"]
    D --> F["读取 config.json"]
    E --> G["读取 scores.json"]
    G --> H["追加新战绩"]
    H --> I["写回 scores.json"]
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    MICROBE {
        string id PK "唯一ID"
        number x "X坐标"
        number y "Y坐标"
        number vx "X方向速度"
        number vy "Y方向速度"
        number radius "半径"
        number energy "能量值 0-100"
        string color "颜色"
        number angle "当前朝向"
        number turnTimer "转向计时器"
        number speedBoostTimer "加速计时器"
        number flashTimer "闪烁计时器"
    }
    
    CHEMICAL {
        string id PK "唯一ID"
        string type "attractor/repellent"
        number x "X坐标"
        number y "Y坐标"
        number radius "影响半径"
        number createdAt "创建时间戳"
        number duration "持续时间(ms)"
    }
    
    SCORE {
        string id PK "唯一ID"
        string playerName "玩家名称"
        number maxMicrobeCount "最大微生物数"
        number avgEnergy "平均能量"
        number duration "游戏时长(秒)"
        number timestamp "记录时间戳"
    }
```

### 6.2 项目文件结构

```
.
├── package.json
├── index.html
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── main.tsx          # React应用入口
│   ├── App.tsx           # 主应用组件
│   ├── components/
│   │   └── GameCanvas.tsx # 游戏画布组件
│   ├── engine/
│   │   └── GameEngine.ts  # 游戏引擎核心
│   └── services/
│       └── api.ts         # API服务封装
└── server/
    ├── index.ts           # Express服务器
    └── data/
        ├── config.json    # 游戏配置
        └── scores.json    # 战绩数据
```
