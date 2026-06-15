## 1. 架构设计

```mermaid
graph TB
    subgraph "前端 (React + Vite)"
        A["App.tsx<br/>状态管理 + WebSocket客户端"]
        B["IslandCanvas.tsx<br/>Canvas渲染引擎"]
        C["ControlPanel.tsx<br/>控制面板UI"]
        D["canvasUtils.ts<br/>工具函数"]
    end

    subgraph "后端 (Express + ws)"
        E["Express服务器<br/>静态资源托管"]
        F["WebSocket服务<br/>实时笔触广播"]
        G["区域管理<br/>笔触存储 + 点赞"]
    end

    A -->|"WebSocket消息"| F
    F -->|"广播笔触"| A
    B -->|"调用"| D
    A -->|"状态驱动"| B
    A -->|"状态驱动"| C
    E -->|"托管"| A
```

## 2. 技术说明

- 前端：React@18 + TypeScript + Vite + Tailwind CSS + Zustand
- 初始化工具：vite-init（react-express-ts 模板）
- 后端：Express@4 + ws（WebSocket服务端）
- 数据库：内存存储（Map结构，无需持久化数据库）
- 实时通信：WebSocket（ws库），笔触消息即时广播

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 主页面，全屏画布应用 |
| /api/strokes/:regionId | GET 获取某区域笔触数据 |
| /api/regions/:regionId/like | POST 对某区域点赞 |

## 4. API定义

### 4.1 WebSocket消息类型

```typescript
type WSMessage =
  | { type: 'stroke'; payload: { regionId: string; points: Point[]; color: string; size: number; glow: boolean; userId: string } }
  | { type: 'discover'; payload: { regionId: string } }
  | { type: 'like'; payload: { regionId: string } }
  | { type: 'online_count'; payload: { count: number } }
  | { type: 'activity'; payload: { text: string; timestamp: number } }
  | { type: 'region_update'; payload: { regionId: string; likeCount: number; brightness: number } }

interface Point {
  x: number;
  y: number;
  timestamp: number;
}
```

### 4.2 REST API

```typescript
// GET /api/strokes/:regionId
interface StrokesResponse {
  regionId: string;
  strokes: StrokeData[];
}

// POST /api/regions/:regionId/like
interface LikeResponse {
  regionId: string;
  likeCount: number;
  brightness: number;
}

interface StrokeData {
  id: string;
  points: Point[];
  color: string;
  size: number;
  glow: boolean;
  userId: string;
  timestamp: number;
}
```

## 5. 服务端架构图

```mermaid
graph LR
    A["Express路由控制器"] --> B["区域服务<br/>RegionService"]
    B --> C["内存存储<br/>Map<regionId, Region>"]
    A --> D["WebSocket服务<br/>WSService"]
    D --> B
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    Region {
        string id PK
        number seed
        number likeCount
        number brightness
        number createdAt
    }
    Stroke {
        string id PK
        string regionId FK
        string userId
        string color
        number size
        boolean glow
        number timestamp
    }
    Point {
        number x
        number y
        number timestamp
    }
    Region ||--o{ Stroke : "contains"
    Stroke ||--o{ Point : "contains"
```

### 6.2 内存数据结构

```typescript
interface Region {
  id: string;
  seed: number;
  likeCount: number;
  brightness: number;
  createdAt: number;
  strokes: StrokeData[];
}
```
