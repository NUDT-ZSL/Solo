## 1. 架构设计

```mermaid
graph TD
    subgraph "前端 (React + TypeScript"
        A["BrowserRouter 路由管理
        B["StageListPage 舞台列表页
        C["StageDetailPage 舞台详情页
        D["StageCard 卡片组件
        E["TicketSVG 门票组件
        F["ParticleBackground 粒子背景
        G["ChatArea 聊天区域
        H["SpectrumVisualizer 频谱可视化
    end

    subgraph "后端 (Express + TypeScript"
        I["RESTful API 接口
        J["WebSocket 实时通信
        K["数据库操作层
    end

    subgraph "数据层 (SQLite)"
        L["stages 舞台表
        M["tickets 门票表
    end

    subgraph "外部服务"
        N["Web Audio API
        O["Canvas API
    end

    B --> A
    C --> A
    D --> B
    D --> C
    E --> C
    F --> C
    G --> C
    H --> C
    A --> I
    A --> J
    I --> K
    J --> K
    K --> L
    K --> M
    H --> N
    F --> O
```

## 2. 技术描述

- **前端**：React@18 + TypeScript + Vite
- **初始化工具**：Vite
- **后端**：Express@4 + TypeScript + ts-node
- **数据库**：SQLite3
- **WebSocket**：ws 库
- **状态管理**：React Context
- **HTTP客户端**：原生 fetch API
- **音频处理**：Web Audio API
- **图形渲染**：Canvas API

### 核心依赖：
- react, react-dom
- express, sqlite3, cors, uuid, ws
- typescript, vite, @vitejs/plugin-react
- @types/react, @types/react-dom, @types/express, @types/sqlite3, @types/cors, @types/uuid, @types/ws
- concurrently

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| `/` | 舞台列表页 |
| `/stage/:id` | 舞台详情页 / 演出互动页 |
| `/admin` | 后台管理页 |

## 4. API 定义

### RESTful API:

```typescript
// 舞台数据类型
interface Stage {
  id: string;
  name: string;
  artistName: string;
  artistAvatar: string;
  performanceTime: string;
  audioUrl: string;
  backgroundColor: string;
  particlePreset: string;
  createdAt: string;
}

// 门票数据类型
interface Ticket {
  id: string;
  id: string;
  userId: string;
  stageId: string;
  nickname: string;
  hash: string;
  seatNumber: string;
  createdAt: string;
}

// 聊天消息类型
interface ChatMessage {
  id: string;
  userId: string;
  nickname: string;
  avatar: string;
  content: string;
  timestamp: string;
  stageId: string;
}

// GET /api/stages
// 返回: Stage[]

// GET /api/stages/:id
// 返回: Stage

// POST /api/tickets
// 请求: { userId: string; stageId: string; nickname: string }
// 返回: Ticket
```

## 5. 服务端架构图

```mermaid
graph TD
    A["Express App"] --> B["API Controller
    A --> C["WebSocket Manager
    B --> D["Database Layer"]
    C --> D["Database Layer"]
    D --> E["SQLite Database"]
    
    subgraph "API Controller"
    B1["GET /api/stages
    B2["GET /api/stages/:id
    B3["POST /api/tickets
    end
    
    subgraph "WebSocket Manager"
    C1["连接管理"]
    C2["房间管理"]
    C3["消息广播"]
    end
    
    subgraph "Database Layer"
    D1["stages CRUD
    D2["tickets CRUD"]
    end
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    STAGES ||--o{ TICKETS : has
    STAGES {
        string id PK
        string name
        string artistName
        string artistAvatar
        string performanceTime
        string audioUrl
        string backgroundColor
        string particlePreset
        datetime createdAt
    }
    TICKETS {
        string id PK
        string userId
        string stageId FK
        string nickname
        string hash
        string seatNumber
        datetime createdAt
    }
```

### 6.2 数据定义语言

```sql
-- stages 表
CREATE TABLE IF NOT EXISTS stages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  artistName TEXT NOT NULL,
  artistAvatar TEXT,
  performanceTime TEXT NOT NULL,
  audioUrl TEXT,
  backgroundColor TEXT,
  particlePreset TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- tickets 表
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  stageId TEXT NOT NULL,
  nickname TEXT NOT NULL,
  hash TEXT NOT NULL,
  seatNumber TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (stageId) REFERENCES stages(id)
);

-- 初始数据
INSERT INTO stages (id, name, artistName, artistAvatar, performanceTime, audioUrl, backgroundColor, particlePreset) VALUES
('1', 'Electric Dreams', 'Neon Pulse', 'https://api.dicebear.com/7.x/avataaars/svg?seed=neon', '2026-06-20T20:00:00', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', '#6a1b9a', 'nebula'),
('2', 'Synthwave Nights', 'RetroWave', 'https://api.dicebear.com/7.x/avataaars/svg?seed=retro', '2026-06-20T21:30:00', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', '#006064', 'cosmic'),
('3', 'Bass Drop Arena', 'Subsonic', 'https://api.dicebear.com/7.x/avataaars/svg?seed=bass', '2026-06-20T23:00:00', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', '#4a148c', 'galaxy'),
('4', 'Ambient Space', 'Echo Chamber', 'https://api.dicebear.com/7.x/avataaars/svg?seed=echo', '2026-06-21T20:00:00', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', '#1a237e', 'stars');
```
