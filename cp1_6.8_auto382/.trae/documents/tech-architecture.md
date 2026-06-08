## 1. 架构设计

```mermaid
graph TB
    subgraph "前端 (React + TypeScript + Vite)"
        "App.tsx 路由管理" --> "GalleryPage.tsx 画廊广场"
        "App.tsx 路由管理" --> "DetailPage.tsx 图片详情"
        "GalleryPage.tsx" --> "UploadModal 上传弹窗"
        "DetailPage.tsx" --> "CommentSection 评论区"
    end

    subgraph "后端 (FastAPI + Python)"
        "main.py FastAPI入口" --> "gallery_router.py 画廊路由"
        "gallery_router.py" --> "图片上传处理"
        "gallery_router.py" --> "短链接生成"
        "gallery_router.py" --> "评论保存"
        "gallery_router.py" --> "画廊查询"
    end

    subgraph "数据存储"
        "SQLite 数据库" --- "images 图片表"
        "SQLite 数据库" --- "comments 评论表"
        "本地文件系统" --- "uploads/ 图片文件"
    end

    "前端" -- "HTTP API" --> "后端"
    "后端" -- "读写" --> "数据存储"
```

## 2. 技术说明

- **前端**：React@18 + TypeScript + Tailwind CSS + Vite
- **初始化工具**：vite-init（react-ts 模板）
- **后端**：FastAPI (Python 3.10+)
- **数据库**：SQLite（轻量级，无需额外部署）
- **状态管理**：Zustand
- **路由**：react-router-dom@6
- **图标库**：lucide-react

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| `/` | 画廊广场 - 瀑布流展示所有图片 |
| `/detail/:id` | 图片详情 - 查看图片、描述和评论 |

## 4. API 定义

### 4.1 图片上传

```
POST /api/upload
Content-Type: multipart/form-data

请求：
  - file: 图片文件（支持 jpg/png/gif/webp，最大 10MB）
  - description: 文字描述（可选，最多200字）

响应：
{
  "id": "string",
  "short_url": "string",
  "image_url": "string",
  "description": "string | null",
  "created_at": "ISO8601 string"
}
```

### 4.2 获取画廊列表

```
GET /api/gallery?page=1&page_size=20

响应：
{
  "items": [
    {
      "id": "string",
      "thumbnail_url": "string",
      "description": "string | null",
      "comment_count": 0,
      "created_at": "ISO8601 string"
    }
  ],
  "total": 0,
  "page": 1,
  "page_size": 20
}
```

### 4.3 获取图片详情

```
GET /api/gallery/{image_id}

响应：
{
  "id": "string",
  "image_url": "string",
  "description": "string | null",
  "short_url": "string",
  "comments": [
    {
      "id": "string",
      "content": "string",
      "created_at": "ISO8601 string"
    }
  ],
  "created_at": "ISO8601 string"
}
```

### 4.4 提交评论

```
POST /api/gallery/{image_id}/comments

请求：
{
  "content": "string"  // 最多50字
}

响应：
{
  "id": "string",
  "content": "string",
  "created_at": "ISO8601 string"
}
```

## 5. 后端架构图

```mermaid
graph LR
    "main.py" --> "挂载 gallery_router"
    "gallery_router.py" --> "上传图片 --> 保存到 uploads/"
    "gallery_router.py" --> "生成短链接 --> 8位随机字符串"
    "gallery_router.py" --> "查询画廊 --> 分页返回"
    "gallery_router.py" --> "查询详情 --> 关联评论"
    "gallery_router.py" --> "保存评论 --> 50字限制"
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    "images" {
        "string id PK"
        "string filename"
        "string short_url"
        "string description"
        "datetime created_at"
    }
    "comments" {
        "string id PK"
        "string image_id FK"
        "string content"
        "datetime created_at"
    }
    "images" ||--o{ "comments" : "has"
```

### 6.2 数据定义语言

```sql
CREATE TABLE IF NOT EXISTS images (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    short_url TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    image_id TEXT NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK(length(content) <= 50 AND length(content) > 0),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_comments_image_id ON comments(image_id);
CREATE INDEX IF NOT EXISTS idx_images_created_at ON images(created_at DESC);
```
