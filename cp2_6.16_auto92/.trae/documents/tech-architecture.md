## 1. 架构设计

```mermaid
graph TD
    subgraph "前端层"
        A["React + TypeScript + Vite"]
        B["React Router 路由"]
        C["Zustand 状态管理"]
        D["组件：MovieCard / BarChart"]
        E["页面：HomePage / SchedulePage / VotePage"]
    end
    subgraph "后端层"
        F["Express + TypeScript"]
        G["CORS 中间件"]
        H["API 路由处理"]
    end
    subgraph "数据层"
        I["JSON 文件存储"]
        J["movies.json - 电影数据"]
        K["schedules.json - 排片数据"]
        L["votes.json - 投票记录"]
    end
    A --> F
    F --> I
```

## 2. 技术说明

- **前端**：React 18 + TypeScript + Vite + React Router DOM + Zustand
- **后端**：Express 4 + TypeScript + CORS
- **数据存储**：JSON 文件（movies.json, schedules.json, votes.json）
- **工具库**：uuid（唯一ID生成）
- **构建工具**：Vite 配置 React 插件

## 3. 路由定义

| 前端路由 | 页面 | 用途 |
|----------|------|------|
| / | HomePage | 首页，浏览电影和排片预览 |
| /schedule/:id | SchedulePage | 排片页面，管理排片和查看结果 |
| /vote/:id | VotePage | 投票页面，好友投票 |

| 后端API | 方法 | 用途 |
|---------|------|------|
| /api/movies | GET | 获取所有电影列表 |
| /api/schedules | POST | 创建新排片 |
| /api/schedules/:id | GET | 获取指定排片信息 |
| /api/schedules/:id | PUT | 更新排片信息 |
| /api/schedules/:id/close | POST | 截止投票 |
| /api/votes/:scheduleId | GET | 获取指定排片的投票记录 |
| /api/votes/:scheduleId | POST | 提交投票 |

## 4. API 定义

### 类型定义

```typescript
type MovieGenre = '动作' | '喜剧' | '科幻' | '悬疑' | '动画';

interface Movie {
  id: string;
  title: string;
  posterEmoji: string;
  posterColor: string;
  duration: number;
  genre: MovieGenre;
  synopsis: string;
}

interface ScheduleItem {
  movieId: string;
  order: number;
  scheduledDate?: string;
  scheduledTime?: string;
}

interface Schedule {
  id: string;
  items: ScheduleItem[];
  createdAt: string;
  closedAt?: string;
  isClosed: boolean;
}

interface Vote {
  id: string;
  scheduleId: string;
  voterId: string;
  movieIds: string[];
  createdAt: string;
}

interface VoteResult {
  movieId: string;
  count: number;
}
```

## 5. 服务器架构图

```mermaid
graph TD
    A["客户端请求"] --> B["Express 服务器"]
    B --> C["CORS 中间件"]
    C --> D["路由分发器"]
    D --> E["Movies Controller"]
    D --> F["Schedules Controller"]
    D --> G["Votes Controller"]
    E --> H["JSON File Store"]
    F --> H
    G --> H
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    MOVIE {
        string id PK "UUID"
        string title "电影标题"
        string posterEmoji "海报emoji"
        string posterColor "海报背景色"
        number duration "时长(分钟)"
        string genre "类型标签"
        string synopsis "剧情概要"
    }
    SCHEDULE {
        string id PK "UUID"
        string createdAt "创建时间"
        string closedAt "截止时间"
        boolean isClosed "是否已截止"
    }
    SCHEDULE_ITEM {
        string scheduleId FK "排片ID"
        string movieId FK "电影ID"
        number order "播放顺序"
        string scheduledDate "放映日期"
        string scheduledTime "放映时间"
    }
    VOTE {
        string id PK "UUID"
        string scheduleId FK "排片ID"
        string voterId "投票者ID"
        string movieIds "投票电影ID数组(JSON)"
        string createdAt "投票时间"
    }
    SCHEDULE ||--o{ SCHEDULE_ITEM : contains
    MOVIE ||--o{ SCHEDULE_ITEM : references
    SCHEDULE ||--o{ VOTE : has
```

### 6.2 初始数据

电影库包含至少20部预设电影，涵盖动作、喜剧、科幻、悬疑、动画五种类型，每部电影时长90-180分钟，使用UUID标识。

