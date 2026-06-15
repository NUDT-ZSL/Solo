## 1. 架构设计

```mermaid
graph TD
    subgraph "前端 (React + TypeScript)"
        A["主应用 App.tsx"] --> B["展厅布局模块"]
        A --> C["艺术品管理模块"]
        B --> B1["LayoutEditor.tsx"]
        B --> B2["FloorPlan.tsx (Canvas)"]
        C --> C1["ArtworkManager.tsx"]
        C --> C2["ArtworkGrid.tsx"]
        D["状态管理 (Zustand)"]
        E["react-dnd 拖拽系统"]
    end
    
    subgraph "后端 (Express + TypeScript)"
        F["server.ts (API 入口)"]
        G["database.ts (SQLite 操作)"]
        F --> G
    end
    
    subgraph "数据存储"
        H["SQLite 数据库"]
        I["文件系统 (上传文件/缩略图)"]
    end
    
    subgraph "外部服务"
        J["sharp (图片处理)"]
        K["multer (文件上传)"]
    end
    
    B -->|REST API| F
    C -->|REST API| F
    G --> H
    F --> I
    F --> J
    F --> K
```

## 2. 技术描述

- **前端**：React 18 + TypeScript + Vite 5
- **前端框架**：使用官方 Vite React TypeScript 模板初始化
- **状态管理**：Zustand 4（轻量级状态管理）
- **拖拽库**：react-dnd + react-dnd-html5-backend
- **UI 框架**：Tailwind CSS 3
- **图标库**：lucide-react
- **后端**：Express 4 + TypeScript
- **数据库**：SQLite 3（文件型数据库）
- **文件上传**：multer 1.4
- **图片处理**：sharp 0.33
- **HTTP 客户端**：fetch API（原生）

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 主策展页面（唯一页面，单页应用） |

## 4. API 定义

### 类型定义

```typescript
// 布局元素类型
type LayoutElement = {
  id: string;
  type: 'wall' | 'stand';
  x: number;
  y: number;
  width: number;
  height: number;
  artworkId?: string;
  artworkColor?: string;
  artworkName?: string;
};

// 展厅布局
type GalleryLayout = {
  id: string;
  name: string;
  width: number;
  height: number;
  elements: LayoutElement[];
  updatedAt: string;
};

// 艺术品
type Artwork = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  originalUrl: string;
  thumbnailUrl: string;
  averageColor: string;
  uploadedAt: string;
};

// 邀请
type Invitation = {
  id: string;
  email: string;
  status: 'pending' | 'accepted';
  createdAt: string;
};
```

### API 接口

| 方法 | 路径 | 请求 | 响应 |
|------|------|------|------|
| GET | /api/layout | 无 | `GalleryLayout` |
| PUT | /api/layout/:id | `{ elements: LayoutElement[] }` | `GalleryLayout` |
| POST | /api/artwork/upload | `multipart/form-data (file, name, description, tags)` | `Artwork` |
| GET | /api/artwork | 无 | `Artwork[]` |
| POST | /api/invite | `{ email: string }` | `{ success: boolean, invitation: Invitation }` |

## 5. 服务器架构图

```mermaid
graph LR
    A[客户端请求] --> B[Express 服务器]
    B --> C[API 路由层]
    C --> D[业务逻辑层]
    D --> E[数据访问层 database.ts]
    E --> F[SQLite 数据库]
    C --> G[文件上传中间件 multer]
    G --> H[图片处理 sharp]
    H --> I[文件系统存储]
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    GALLERY_LAYOUT ||--o{ LAYOUT_ELEMENT : contains
    LAYOUT_ELEMENT }o--o| ARTWORK : assigned
    GALLERY_LAYOUT ||--o{ INVITATION : has

    GALLERY_LAYOUT {
        string id PK
        string name
        int width
        int height
        string elements_json
        datetime updated_at
    }

    LAYOUT_ELEMENT {
        string id PK
        string layout_id FK
        string type
        int x
        int y
        int width
        int height
        string artwork_id FK
    }

    ARTWORK {
        string id PK
        string name
        string description
        string tags_json
        string original_url
        string thumbnail_url
        string average_color
        datetime uploaded_at
    }

    INVITATION {
        string id PK
        string layout_id FK
        string email
        string status
        datetime created_at
    }
```

### 6.2 数据定义语言

```sql
-- 展厅布局表
CREATE TABLE IF NOT EXISTS gallery_layout (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Main Gallery',
  width INTEGER NOT NULL DEFAULT 600,
  height INTEGER NOT NULL DEFAULT 400,
  elements_json TEXT NOT NULL DEFAULT '[]',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 艺术品表
CREATE TABLE IF NOT EXISTS artwork (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  tags_json TEXT DEFAULT '[]',
  original_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  average_color TEXT DEFAULT '#6c63ff',
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 邀请表
CREATE TABLE IF NOT EXISTS invitation (
  id TEXT PRIMARY KEY,
  layout_id TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (layout_id) REFERENCES gallery_layout(id)
);

-- 初始化默认布局
INSERT OR IGNORE INTO gallery_layout (id, name, width, height, elements_json) 
VALUES ('default', 'Main Gallery', 600, 400, '[]');
```

## 7. 项目文件结构

```
.
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── store/
│   │   └── useStore.ts
│   ├── types/
│   │   └── index.ts
│   ├── layout/
│   │   ├── LayoutEditor.tsx
│   │   ├── FloorPlan.tsx
│   │   └── Toolbar.tsx
│   ├── artwork/
│   │   ├── ArtworkManager.tsx
│   │   ├── ArtworkGrid.tsx
│   │   └── UploadArea.tsx
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── PropertyPanel.tsx
│   │   ├── InviteModal.tsx
│   │   └── Tooltip.tsx
│   ├── hooks/
│   │   ├── useDragDrop.ts
│   │   └── useLayoutPolling.ts
│   └── utils/
│       ├── api.ts
│       └── colorUtils.ts
└── server/
    ├── server.ts
    ├── database.ts
    └── types.ts
```
