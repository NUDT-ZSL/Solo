## 1. 架构设计

```mermaid
graph TD
    A["React 前端 (TypeScript)"] --> B["Vite 构建工具"]
    A --> C["React Router 路由"]
    A --> D["Axios HTTP 客户端"]
    A --> E["Framer Motion 动画"]
    F["Express 后端"] --> G["SQLite 数据库"]
    F --> H["CORS 中间件"]
    A --"/api 代理"--> F
```

## 2. 技术说明

- 前端：React 18 + TypeScript + Vite
- 状态管理：React Hooks (useState, useEffect)
- 路由：React Router DOM
- HTTP 客户端：Axios
- 动画库：Framer Motion
- 后端：Express 4 + Node.js
- 数据库：SQLite (better-sqlite3)
- 唯一标识：uuid
- 代理配置：Vite dev server proxy (/api → 后端 3001 端口)

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 书会列表首页 |
| /bookclub/:id | 书会详情页 |

## 4. API 定义

### 4.1 书会模块
- `GET /api/bookclubs` - 获取所有书会列表
- `GET /api/bookclubs/:id` - 获取单个书会详情
- `POST /api/bookclubs/:id/register` - 报名参加书会

### 4.2 书评模块
- `GET /api/bookclubs/:id/reviews?page=1&limit=10` - 分页获取书评列表
- `POST /api/bookclubs/:id/reviews` - 提交书评

### 4.3 投票模块
- `GET /api/bookclubs/:id/candidates` - 获取候选书目
- `POST /api/bookclubs/:id/vote` - 投票

### 类型定义
```typescript
interface BookClub {
  id: string;
  name: string;
  description: string;
  date: string;
  time: string;
  location: string;
  coverBg: string;
  coverIcon: string;
  registeredCount: number;
  registeredUsers: User[];
}

interface User {
  id: string;
  name: string;
  avatar: string;
  avatarBorder: string;
}

interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  rating: number;
  content: string;
  createdAt: string;
}

interface BookCandidate {
  id: string;
  title: string;
  author: string;
  coverBg: string;
  votes: number;
}
```

## 5. 服务器架构图

```mermaid
graph LR
    A["API 路由层 (server.js)"] --> B["书会模块处理"]
    A --> C["书评模块处理"]
    A --> D["投票模块处理"]
    B --> E["SQLite 数据库操作"]
    C --> E
    D --> E
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    BOOK_CLUB {
        string id PK
        string name
        string description
        string date
        string time
        string location
        string coverBg
        string coverIcon
        int registeredCount
    }
    
    USER {
        string id PK
        string name
        string avatar
        string avatarBorder
    }
    
    REGISTRATION {
        string id PK
        string bookClubId FK
        string userId FK
        datetime createdAt
    }
    
    REVIEW {
        string id PK
        string bookClubId FK
        string userId FK
        string userName
        string userAvatar
        int rating
        string content
        datetime createdAt
    }
    
    BOOK_CANDIDATE {
        string id PK
        string bookClubId FK
        string title
        string author
        string coverBg
        int votes
    }
    
    VOTE {
        string id PK
        string bookClubId FK
        string userId
        string candidateId FK
        datetime createdAt
    }
    
    BOOK_CLUB ||--o{ REGISTRATION : has
    USER ||--o{ REGISTRATION : joins
    BOOK_CLUB ||--o{ REVIEW : has
    USER ||--o{ REVIEW : writes
    BOOK_CLUB ||--o{ BOOK_CANDIDATE : has
    BOOK_CANDIDATE ||--o{ VOTE : receives
```

### 6.2 数据库初始化
- 使用 better-sqlite3 同步创建表结构
- 初始化示例数据用于演示
- 表包含：book_clubs, users, registrations, reviews, book_candidates, votes
