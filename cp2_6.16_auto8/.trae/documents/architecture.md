## 1. 架构设计

```mermaid
graph TB
    subgraph "Frontend (React + TypeScript + Vite)"
        A["App.tsx 主组件<br/>状态管理/API调度"]
        B["Timeline.tsx 时间线组件<br/>横向滚动/节点渲染"]
        C["PhotoCard.tsx 照片卡片<br/>缩略图/悬停预览/懒加载"]
        D["MapMarker.tsx 地图组件<br/>SVG绘制/标记联动"]
        E["幕布编辑器<br/>富文本/拖拽排序"]
        F["音乐播放器<br/>播放控件/音量"]
        G["上传区域<br/>多文件/拖拽排序"]
        H["导出模块<br/>HTML生成/base64"]
    end
    subgraph "Backend (Express + TypeScript)"
        I["server.ts API入口<br/>CORS/JSON解析/路由"]
        J["项目控制器<br/>CRUD逻辑"]
        K["照片控制器<br/>上传/元数据"]
    end
    subgraph "数据层 (SQLite)"
        L["projects表<br/>项目元信息"]
        M["photos表<br/>照片元数据/路径"]
        N["narratives表<br/>文字幕布数据"]
    end
    subgraph "数据流方向"
        A -->|fetch| I
        I --> J --> L
        I --> K --> M
        I -->|查询| J & K
        J & K -->|JSON响应| I
        I -->|Response| A
        A -->|props| B
        B -->|props| C & D
    end
```

## 2. 技术说明

- **前端框架**：React 18 + TypeScript 5 + Vite 5
- **状态管理**：React useState/useReducer（轻量级场景，无需额外库）
- **构建工具**：Vite 5，输出目录 dist
- **后端框架**：Express 4 + TypeScript
- **数据库**：SQLite3（文件型数据库，零配置部署）
- **文件处理**：multer中间件处理照片上传、FileReader读取EXIF
- **跨域**：cors中间件允许前端访问API
- **唯一标识**：uuid生成项目ID和照片ID
- **图标**：lucide-react（遵循项目规范）

## 3. 路由定义

| 路由 (前端) | 用途 |
|------------|------|
| / | 主编辑页面，包含所有功能模块 |

## 4. API 定义

### 4.1 类型定义
```typescript
interface Project {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  backgroundMusic?: string; // base64 or file path
}

interface Photo {
  id: string;
  projectId: string;
  filename: string;
  filepath: string;
  thumbnail?: string;
  location: string;
  city: string;
  timestamp: string; // ISO date string
  orderIndex: number;
  exifData?: Record<string, any>;
}

interface Narrative {
  id: string;
  projectId: string;
  title: string;
  content: string;
  orderIndex: number;
  afterPhotoId?: string;
}

interface TimelineNode {
  type: 'photo' | 'narrative';
  data: Photo | Narrative;
  orderIndex: number;
}
```

### 4.2 接口规范

| Method | Endpoint | Request | Response | 用途 |
|--------|----------|---------|----------|------|
| POST | /api/project | { title: string } | { projectId: string, ...Project } | 创建新项目 |
| GET | /api/project/:id | - | Project + photos[] + narratives[] | 获取项目完整数据 |
| POST | /api/project/:id/photo | multipart/form-data | Photo | 上传单张照片 |
| PUT | /api/project/:id/photo/:photoId | { location, city, timestamp, orderIndex } | Photo | 更新照片元数据 |
| DELETE | /api/project/:id/photo/:photoId | - | { success: boolean } | 删除照片 |
| POST | /api/project/:id/narrative | { title, content, afterPhotoId } | Narrative | 创建幕布节点 |
| PUT | /api/project/:id/narrative/:narrativeId | { title, content, orderIndex } | Narrative | 更新幕布 |
| DELETE | /api/project/:id/narrative/:narrativeId | - | { success: boolean } | 删除幕布 |
| GET | /api/project/:id/timeline | - | TimelineNode[] 排序后数据 | 获取时间线排序数据 |
| POST | /api/project/:id/music | multipart/form-data | { musicUrl: string } | 上传背景音乐 |
| GET | /api/project/:id/export | - | HTML Blob | 导出完整HTML文件 |

## 5. 服务器架构图

```mermaid
graph LR
    subgraph "Express Server"
        A["入口 server.ts<br/>中间件注册/路由挂载"]
        B["项目路由组 /api/project/*"]
        C["照片路由组 /api/project/:id/photo/*"]
        D["幕布路由组 /api/project/:id/narrative/*"]
        E["导出路由 /api/project/:id/export"]
    end
    subgraph "业务逻辑层"
        F["项目服务<br/>CRUD/序列化"]
        G["照片服务<br/>上传处理/EXIF提取"]
        H["时间线服务<br/>排序/聚合"]
        I["导出服务<br/>HTML模板/base64"]
    end
    subgraph "数据访问层"
        J["SQLite连接池<br/>better-sqlite3同步API"]
        K["项目Repository"]
        L["照片Repository"]
        M["幕布Repository"]
    end
    subgraph "文件存储"
        N["uploads/ 照片原文件"]
        O["thumbnails/ 缩略图"]
    end
    A --> B --> F --> K --> J
    A --> C --> G --> L --> J
    G --> N & O
    A --> D --> F --> M --> J
    A --> E --> I
    I --> H
    H --> K & L & M
```

## 6. 数据模型

### 6.1 ER 图

```mermaid
erDiagram
    PROJECTS ||--o{ PHOTOS : contains
    PROJECTS ||--o{ NARRATIVES : contains
    PHOTOS ||--o{ NARRATIVES : "positioned after"
    
    PROJECTS {
        string id PK "uuid主键"
        string title "项目标题"
        text background_music "base64音乐数据"
        datetime created_at "创建时间"
        datetime updated_at "更新时间"
    }
    
    PHOTOS {
        string id PK "uuid主键"
        string project_id FK "所属项目ID"
        string filename "原始文件名"
        string filepath "存储路径"
        string thumbnail_path "缩略图路径"
        string location "详细地点"
        string city "城市名称（用于地图）"
        datetime timestamp "拍摄时间"
        int order_index "排序序号"
        text exif_data "JSON格式EXIF"
    }
    
    NARRATIVES {
        string id PK "uuid主键"
        string project_id FK "所属项目ID"
        string title "幕布标题"
        text content "幕布内容(HTML)"
        int order_index "排序序号"
        string after_photo_id FK "锚定照片ID"
    }
```

### 6.2 DDL 语句

```sql
-- 项目表
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '我的旅行纪录片',
    background_music TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 照片表
CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    thumbnail_path TEXT,
    location TEXT DEFAULT '',
    city TEXT DEFAULT '',
    timestamp DATETIME NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    exif_data TEXT
);
CREATE INDEX IF NOT EXISTS idx_photos_project ON photos(project_id);
CREATE INDEX IF NOT EXISTS idx_photos_order ON photos(project_id, order_index);

-- 幕布表
CREATE TABLE IF NOT EXISTS narratives (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT DEFAULT '',
    content TEXT DEFAULT '',
    order_index INTEGER NOT NULL DEFAULT 0,
    after_photo_id TEXT REFERENCES photos(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_narratives_project ON narratives(project_id);
```

### 6.3 初始数据（演示用）

```sql
-- 插入示例项目
INSERT INTO projects (id, title, created_at) VALUES 
('demo-001', '2024云南深度游', '2024-05-01 10:00:00');

-- 插入示例照片
INSERT INTO photos (id, project_id, filename, filepath, location, city, timestamp, order_index) VALUES
('p1', 'demo-001', 'kunming.jpg', 'uploads/demo/kunming.jpg', '滇池海埂大坝', '昆明', '2024-05-01 09:30:00', 0),
('p2', 'demo-001', 'dali.jpg', 'uploads/demo/dali.jpg', '大理古城南门', '大理', '2024-05-02 14:20:00', 1),
('p3', 'demo-001', 'erhai.jpg', 'uploads/demo/erhai.jpg', '洱海双廊古镇', '大理', '2024-05-03 08:15:00', 2),
('p4', 'demo-001', 'lijiang.jpg', 'uploads/demo/lijiang.jpg', '丽江古城四方街', '丽江', '2024-05-04 16:45:00', 3),
('p5', 'demo-001', 'yulong.jpg', 'uploads/demo/yulong.jpg', '玉龙雪山4680平台', '丽江', '2024-05-05 11:00:00', 4);

-- 插入示例幕布
INSERT INTO narratives (id, project_id, title, content, order_index, after_photo_id) VALUES
('n1', 'demo-001', '春城初探', '抵达昆明，感受四季如春的气候，喂海鸥看日落。', 1, 'p1'),
('n2', 'demo-001', '风花雪月', '大理的慢生活：苍山洱海，古城骑行，三道茶。', 3, 'p2');
```
