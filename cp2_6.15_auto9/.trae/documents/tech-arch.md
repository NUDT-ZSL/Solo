## 1. 架构设计

```mermaid
flowchart TD
    subgraph "前端层"
        A["React + TypeScript + Vite"]
        B["讨论模块 (DiscussionPanel)"]
        C["荐书模块 (RecommendPanel)"]
        D["WebSocket客户端"]
        E["荐书引擎 (RecommendEngine)"]
    end
    
    subgraph "后端层"
        F["Express + TypeScript"]
        G["REST API (小组/帖子/回复)"]
        H["WebSocket服务"]
        I["荐书API"]
        J["定时分析任务 (30分钟)"]
    end
    
    subgraph "数据层"
        K["SQLite数据库"]
        L["用户表/小组表/帖子表/回复表/荐书表"]
    end
    
    B -->|REST| G
    D <-->|WebSocket| H
    E -->|REST| I
    G --> K
    H --> G
    I --> J
    J --> K
```

## 2. 技术描述

- 前端：React@18 + TypeScript + Vite + framer-motion + react-markdown + socket.io-client
- 后端：Express@4 + TypeScript + SQLite3 + ws (WebSocket)
- 构建工具：Vite
- 状态管理：zustand
- 样式：CSS Modules + CSS Variables
- 图标：lucide-react

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 首页，小组列表 |
| /group/:id | 小组主页 |
| /group/:id/discussion | 讨论帖列表页 |
| /recommendations | 我的荐书页面 |

## 4. API 定义

```typescript
// 小组相关
interface Group {
  id: number;
  name: string;
  description: string;
  memberCount: number;
  createdAt: string;
}

// 帖子相关
interface Post {
  id: number;
  groupId: number;
  userId: number;
  chapter: string;
  title: string;
  content: string;
  replyCount: number;
  createdAt: string;
  author: User;
}

// 回复相关
interface Reply {
  id: number;
  postId: number;
  userId: number;
  content: string;
  createdAt: string;
  author: User;
}

// 用户相关
interface User {
  id: number;
  name: string;
  avatar?: string;
}

// 荐书相关
interface BookRecommendation {
  id: number;
  userId: number;
  bookId: string;
  title: string;
  author: string;
  coverUrl: string;
  reason: string;
  score: number;
  createdAt: string;
}

// API Endpoints
GET    /api/groups                  // 获取小组列表
GET    /api/groups?search=xxx       // 搜索小组
POST   /api/groups                  // 创建小组
POST   /api/groups/:id/join         // 加入小组
GET    /api/groups/:id              // 小组详情+成员+热帖
GET    /api/groups/:id/posts        // 获取小组帖子
POST   /api/groups/:id/posts        // 发布新帖
GET    /api/posts/:id/replies       // 获取帖子回复
POST   /api/posts/:id/replies       // 发表回复
GET    /api/recommendations/:userId // 获取用户荐书
POST   /api/reading-list            // 添加待读
DELETE /api/reading-list/:id        // 取消待读
GET    /api/reading-list/:userId    // 获取待读清单
```

## 5. 服务器架构图

```mermaid
flowchart TD
    A["HTTP/WebSocket Server (Express + ws)"]
    B["REST API Controllers"]
    C["WebSocket Handlers"]
    D["定时任务调度器 (node-cron)"]
    E["业务服务层"]
    F["数据库操作层"]
    G["SQLite 数据库"]
    
    A --> B
    A --> C
    B --> E
    C --> E
    D --> E
    E --> F
    F --> G
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    USER ||--o{ GROUP_MEMBER : "加入"
    GROUP ||--o{ GROUP_MEMBER : "拥有"
    USER ||--o{ POST : "发布"
    GROUP ||--o{ POST : "包含"
    POST ||--o{ REPLY : "有"
    USER ||--o{ REPLY : "回复"
    USER ||--o{ RECOMMENDATION : "收到"
    USER ||--o{ READING_LIST : "收藏"
    
    USER {
        int id PK
        string name
        string avatar
        datetime created_at
    }
    
    GROUP {
        int id PK
        string name
        string description
        int creator_id FK
        datetime created_at
    }
    
    GROUP_MEMBER {
        int id PK
        int group_id FK
        int user_id FK
        datetime joined_at
    }
    
    POST {
        int id PK
        int group_id FK
        int user_id FK
        string chapter
        string title
        string content
        int reply_count
        datetime created_at
    }
    
    REPLY {
        int id PK
        int post_id FK
        int user_id FK
        string content
        datetime created_at
    }
    
    RECOMMENDATION {
        int id PK
        int user_id FK
        string book_title
        string book_author
        string book_cover
        string reason
        float score
        datetime created_at
    }
    
    READING_LIST {
        int id PK
        int user_id FK
        string book_title
        string book_author
        string douban_url
        datetime added_at
    }
```

### 6.2 DDL 语句

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  avatar TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  creator_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS group_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  chapter TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  reply_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS recommendations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  book_title TEXT NOT NULL,
  book_author TEXT NOT NULL,
  book_cover TEXT,
  reason TEXT,
  score REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS reading_list (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  book_title TEXT NOT NULL,
  book_author TEXT NOT NULL,
  douban_url TEXT,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, book_title, book_author)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_posts_group_id ON posts(group_id);
CREATE INDEX IF NOT EXISTS idx_replies_post_id ON replies(post_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_list_user_id ON reading_list(user_id);
```
