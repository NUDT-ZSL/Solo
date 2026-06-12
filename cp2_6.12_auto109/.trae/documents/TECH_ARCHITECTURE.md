## 1. 架构设计
```mermaid
graph TD
    subgraph "前端 (React + TypeScript)"
        A["App.tsx (主入口)"]
        B["CanvasEngine.ts<br/>画布渲染与操作管理"]
        C["SyncManager.ts<br/>WebSocket通信"]
        D["InteractionOverlay.ts<br/>光标与表情互动层"]
        E["Toolbar.tsx<br/>工具栏组件"]
        F["UserList.tsx<br/>在线用户列表"]
        G["HistorySlider.tsx<br/>历史回放滑块"]
    end
    
    subgraph "后端 (Express + Socket.io)"
        H["server/index.ts<br/>服务器主入口"]
        I["RoomManager<br/>房间状态管理"]
        J["db.ts<br/>SQLite数据持久化"]
    end
    
    A --> B
    A --> C
    A --> D
    B -->|增量操作| C
    C -->|远端操作| B
    C -->|互动数据| D
    H <-->|WebSocket| C
    H --> I
    I --> J
```

## 2. 技术描述
- **前端**：React@18 + TypeScript + Vite + socket.io-client
- **后端**：Express@4 + Socket.io + better-sqlite3
- **构建工具**：Vite@5
- **状态管理**：React useState/useRef 局部状态管理
- **数据通信**：WebSocket (socket.io) 实现增量同步
- **数据库**：SQLite (better-sqlite3) 存储房间快照和用户记录

## 3. 路由定义
| 路由 | 用途 |
|------|------|
| / | 主应用入口，根据是否有昵称显示输入页或画布页 |
| /api/room/:id/history | GET 获取房间历史操作序列 |
| /api/room/:id/snapshot | POST 保存房间涂鸦快照 |

## 4. API 定义

### 4.1 WebSocket 事件
```typescript
// 客户端 -> 服务器
interface ClientToServerEvents {
  join: (data: { roomId: string; nickname: string }) => void;
  leave: (data: { roomId: string }) => void;
  operation: (data: { roomId: string; operation: DrawOperation }) => void;
  cursor: (data: { roomId: string; x: number; y: number; isDrawing: boolean }) => void;
  reaction: (data: { roomId: string; emoji: string }) => void;
  undo: (data: { roomId: string }) => void;
  clear: (data: { roomId: string }) => void;
  getHistory: (data: { roomId: string }) => void;
}

// 服务器 -> 客户端
interface ServerToClientEvents {
  userJoined: (data: { userId: string; nickname: string; color: string }) => void;
  userLeft: (data: { userId: string }) => void;
  usersList: (data: User[]) => void;
  operation: (data: { operation: DrawOperation; userId: string }) => void;
  cursor: (data: { userId: string; x: number; y: number; isDrawing: boolean }) => void;
  reaction: (data: { userId: string; emoji: string }) => void;
  undo: (data: { userId: string }) => void;
  clear: (data: { userId: string }) => void;
  history: (data: { operations: DrawOperation[] }) => void;
}
```

### 4.2 数据类型定义
```typescript
interface Point {
  x: number;
  y: number;
  timestamp: number;
}

interface DrawOperation {
  id: string;
  type: 'pen' | 'eraser' | 'emoji' | 'text';
  userId: string;
  timestamp: number;
  points?: Point[];
  color?: string;
  width?: number;
  emoji?: string;
  text?: string;
  fontFamily?: string;
  x?: number;
  y?: number;
}

interface User {
  id: string;
  nickname: string;
  color: string;
  socketId: string;
}

interface CursorPosition {
  userId: string;
  x: number;
  y: number;
  isDrawing: boolean;
  lastUpdate: number;
}
```

## 5. 服务器架构图
```mermaid
graph TD
    A["Express HTTP Server"] --> B["Socket.io WebSocket Server"]
    B --> C["Room Manager"]
    C --> D["房间状态<br/>- 用户列表<br/>- 操作序列缓存"]
    C --> E["增量广播机制<br/>- 操作序列号<br/>- 确认机制"]
    D --> F["DB Module (SQLite)"]
    F --> G["表: rooms<br/>房间快照"]
    F --> H["表: users<br/>用户记录"]
    F --> I["表: operations<br/>操作历史"]
    A --> J["REST API<br/>- /api/room/:id/history<br/>- /api/room/:id/snapshot"]
    J --> F
```

## 6. 数据模型

### 6.1 数据模型定义
```mermaid
erDiagram
    ROOMS ||--o{ OPERATIONS : has
    ROOMS ||--o{ USERS : has
    ROOMS {
        string id PK
        string name
        string snapshot_data
        datetime created_at
        datetime updated_at
    }
    USERS {
        string id PK
        string room_id FK
        string nickname
        string color
        datetime joined_at
    }
    OPERATIONS {
        string id PK
        string room_id FK
        string user_id FK
        int sequence
        string operation_type
        string operation_data
        datetime timestamp
    }
```

### 6.2 数据定义语言
```sql
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  name TEXT,
  snapshot_data BLOB,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  color TEXT NOT NULL,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);

CREATE TABLE IF NOT EXISTS operations (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  operation_type TEXT NOT NULL,
  operation_data TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(room_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_operations_room_sequence ON operations(room_id, sequence);
```
