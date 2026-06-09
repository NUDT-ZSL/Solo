## 1. 架构设计

```mermaid
graph TD
    subgraph "前端 (React 18 + TypeScript + Vite)"
        A["App.tsx - 状态管理/路由/WebSocket"]
        B["ProjectBoard.tsx - 角色墙/排期面板/拖拽"]
        C["ContactModal.tsx - 通讯录模态框"]
        D["WebSocket客户端 (ws)"]
    end
    subgraph "后端 (Node.js Express + ws)"
        E["server/index.js - Express服务"]
        F["WebSocket服务端"]
        G["内存存储 (项目/角色/演员/排期)"]
    end
    subgraph "通信层"
        H["HTTP API (/api)"]
        I["WebSocket (/ws)"]
    end
    A --> D
    D --> I
    A --> H
    H --> E
    I --> F
    E --> G
    F --> G
```

## 2. 技术描述

- **前端**：React 18 + TypeScript + Vite
- **后端**：Node.js Express 4 + ws（WebSocket库）
- **状态管理**：React useState/useReducer + WebSocket实时同步
- **数据存储**：内存存储（使用Map对象，服务端维护全局状态）
- **构建工具**：Vite，代理/api和/ws至localhost:3001
- **依赖库**：react、react-dom、express、ws、uuid、vite、concurrently

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 首页 - 项目创建与加入入口 |
| /project/:code | 项目主页 - 角色墙、排期管理 |

## 4. API定义

### HTTP API

```typescript
// 创建项目
POST /api/projects
Request: { name: string; playTitle: string; performanceDate: string }
Response: { code: string; projectId: string }

// 加入项目
GET /api/projects/:code
Response: {
  id: string;
  code: string;
  name: string;
  playTitle: string;
  performanceDate: string;
  roles: Role[];
  actors: Actor[];
  schedule: ScheduleEntry[];
}
```

### WebSocket消息协议

```typescript
// 客户端发送
type ClientMessage =
  | { type: 'JOIN_PROJECT'; projectCode: string }
  | { type: 'ADD_ROLE'; projectCode: string; role: Omit<Role, 'id'> }
  | { type: 'ADD_ACTOR'; projectCode: string; actor: Omit<Actor, 'id'> }
  | { type: 'SCHEDULE'; projectCode: string; entry: Omit<ScheduleEntry, 'id'> }
  | { type: 'UNSCHEDULE'; projectCode: string; entryId: string }
  | { type: 'ASSIGN_ROLE'; projectCode: string; roleId: string; actorId: string | null };

// 服务端广播
type ServerMessage =
  | { type: 'PROJECT_STATE'; state: ProjectState }
  | { type: 'ROLE_ADDED'; role: Role }
  | { type: 'ACTOR_ADDED'; actor: Actor }
  | { type: 'SCHEDULED'; entry: ScheduleEntry }
  | { type: 'UNSCHEDULED'; entryId: string }
  | { type: 'ROLE_ASSIGNED'; roleId: string; actorId: string | null }
  | { type: 'CONFLICT'; message: string };
```

## 5. 服务端架构

```mermaid
flowchart LR
    A["Express HTTP服务"] --> B["项目API路由"]
    C["WebSocket服务"] --> D["连接管理"]
    B --> E["内存数据存储 (projects Map)"]
    D --> F["消息广播"]
    F --> E
    D --> G["冲突检测逻辑"]
    G --> E
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    PROJECT ||--o{ ROLE : contains
    PROJECT ||--o{ ACTOR : contains
    PROJECT ||--o{ SCHEDULE_ENTRY : contains
    ROLE ||--o| ACTOR : "assigned to"
    ACTOR ||--o{ SCHEDULE_ENTRY : booked
    ROLE ||--o{ SCHEDULE_ENTRY : has

    PROJECT {
        string id PK
        string code UK
        string name
        string playTitle
        string performanceDate
    }
    ROLE {
        string id PK
        string projectId FK
        string name
        string type
        string assignedActorId FK
    }
    ACTOR {
        string id PK
        string projectId FK
        string name
        string phone
        string availableSlots
    }
    SCHEDULE_ENTRY {
        string id PK
        string projectId FK
        string roleId FK
        string actorId FK
        string date
        string slot
    }
```

### 6.2 TypeScript 类型定义

```typescript
type RoleType = '主角' | '配角' | '群演';
type TimeSlot = '上午' | '下午' | '晚上';

interface Role {
  id: string;
  name: string;
  type: RoleType;
  assignedActorId: string | null;
}

interface Actor {
  id: string;
  name: string;
  phone: string;
  availableSlots: string[];
}

interface ScheduleEntry {
  id: string;
  roleId: string;
  actorId: string;
  date: string;
  slot: TimeSlot;
}

interface Project {
  id: string;
  code: string;
  name: string;
  playTitle: string;
  performanceDate: string;
  roles: Role[];
  actors: Actor[];
  schedule: ScheduleEntry[];
}
```
