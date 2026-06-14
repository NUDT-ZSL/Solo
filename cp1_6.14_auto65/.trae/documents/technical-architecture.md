## 1. 架构设计

```mermaid
flowchart TB
    subgraph Frontend["前端 React+Vite"]
        A["React Router"] --> B["Home 页面"]
        A --> C["Player 页面"]
        C --> D["Waveform 组件"]
        C --> E["SentimentChart 组件"]
        C --> F["TranscriptSync 工具"]
    end

    subgraph Backend["后端 Express+Socket.io"]
        G["REST API"] --> H["播客列表 /api/podcasts"]
        G --> I["音频流 /api/podcasts/:id/audio"]
        G --> J["转录数据 /api/podcasts/:id/transcript"]
        G --> K["评论 /api/podcasts/:id/comments"]
        G --> L["精彩时刻 /api/highlights"]
        M["Socket.io"] --> N["progress 事件广播"]
    end

    subgraph Data["数据层"]
        O["better-sqlite3"]
        O --> P["podcasts 表"]
        O --> Q["transcript_segments 表"]
        O --> R["comments 表"]
        O --> S["highlights 表"]
    end

    Frontend -- "axios HTTP" --> Backend
    Frontend -- "socket.io WebSocket" --> Backend
    Backend -- "better-sqlite3" --> Data
```

## 2. 技术说明

- 前端：React@18 + TypeScript + Vite + TailwindCSS + Zustand
- 初始化工具：vite-init（react-express-ts 模板）
- 后端：Express@4 + TypeScript + better-sqlite3 + socket.io
- 数据库：SQLite（better-sqlite3 嵌入式，无需外部服务）
- 实时通信：socket.io（播放进度同步、评论广播）
- HTTP 客户端：axios

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 首页，播客列表展示 |
| /podcast/:id | 播客详情页，播放器+转录+情感曲线+精彩时刻 |

## 4. API 定义

### 4.1 播客列表

```
GET /api/podcasts
Response: { id: string; title: string; author: string; duration: number; coverUrl: string }[]
```

### 4.2 音频流

```
GET /api/podcasts/:id/audio
Response: audio/mpeg stream
```

### 4.3 转录数据

```
GET /api/podcasts/:id/transcript
Response: { id: string; startTime: number; endTime: number; text: string; sentiment: number }[]
```

### 4.4 评论

```
GET /api/podcasts/:id/comments
Response: { id: string; podcastId: string; timestamp: number; text: string; author: string; createdAt: string }[]

POST /api/podcasts/:id/comments
Body: { timestamp: number; text: string; author: string }
Response: { id: string; podcastId: string; timestamp: number; text: string; author: string; createdAt: string }
```

### 4.5 精彩时刻

```
GET /api/podcasts/:id/highlights
Response: { id: string; podcastId: string; text: string; timestamp: number; createdAt: string }[]

POST /api/podcasts/:id/highlights
Body: { text: string; timestamp: number }
Response: { id: string; podcastId: string; text: string; timestamp: number; createdAt: string }

DELETE /api/highlights/:id
Response: { success: boolean }
```

### 4.6 Socket.io 事件

```
emit: progress { podcastId: string; currentTime: number }
on: progress { podcastId: string; currentTime: number }
```

## 5. 服务端架构图

```mermaid
flowchart LR
    A["Express Router"] --> B["PodcastController"]
    A --> C["TranscriptController"]
    A --> D["CommentController"]
    A --> E["HighlightController"]
    B --> F["Database Service"]
    C --> F
    D --> F
    E --> F
    F --> G["better-sqlite3"]
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    "podcasts" {
        string id PK
        string title
        string author
        number duration
        string coverUrl
        string audioUrl
    }
    "transcript_segments" {
        string id PK
        string podcastId FK
        number startTime
        number endTime
        string text
        number sentiment
    }
    "comments" {
        string id PK
        string podcastId FK
        number timestamp
        string text
        string author
        string createdAt
    }
    "highlights" {
        string id PK
        string podcastId FK
        string text
        number timestamp
        string createdAt
    }
    "podcasts" ||--o{ "transcript_segments" : "has"
    "podcasts" ||--o{ "comments" : "has"
    "podcasts" ||--o{ "highlights" : "has"
```

### 6.2 数据定义语言

```sql
CREATE TABLE podcasts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  duration INTEGER NOT NULL,
  coverUrl TEXT NOT NULL,
  audioUrl TEXT NOT NULL
);

CREATE TABLE transcript_segments (
  id TEXT PRIMARY KEY,
  podcastId TEXT NOT NULL REFERENCES podcasts(id),
  startTime REAL NOT NULL,
  endTime REAL NOT NULL,
  text TEXT NOT NULL,
  sentiment REAL NOT NULL
);

CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  podcastId TEXT NOT NULL REFERENCES podcasts(id),
  timestamp REAL NOT NULL,
  text TEXT NOT NULL,
  author TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE highlights (
  id TEXT PRIMARY KEY,
  podcastId TEXT NOT NULL REFERENCES podcasts(id),
  text TEXT NOT NULL,
  timestamp REAL NOT NULL,
  createdAt TEXT NOT NULL
);
```
