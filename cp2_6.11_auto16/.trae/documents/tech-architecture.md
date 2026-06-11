## 1. 架构设计

```mermaid
graph TB
    "Frontend[前端 React + TypeScript]" --> "Backend[后端 Express + TypeScript]"
    "Frontend" --> "Canvas[无限画布引擎]"
    "Canvas" --> "ElementSystem[元素系统]"
    "ElementSystem" --> "ImageElement[图片元素]"
    "ElementSystem" --> "TextElement[文字元素]"
    "Frontend" --> "Toolbar[工具栏组件]"
    "Backend" --> "UploadAPI[图片上传 API]"
    "Backend" --> "StaticFiles[静态文件托管]"
    "UploadAPI" --> "LocalStorage[本地文件存储]"
```

## 2. 技术说明

- 前端：React@18 + TypeScript + Vite（HMR支持）
- 初始化工具：vite-init（react-express-ts模板）
- 后端：Express@4 + TypeScript + CORS
- 状态管理：Zustand
- 样式方案：Tailwind CSS + 自定义CSS变量
- 导出方案：html2canvas（将画布DOM渲染为PNG）
- 数据库：无（纯前端状态管理，无需持久化）

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 主画布页面，包含工具栏和无限画布 |

## 4. API定义

### 4.1 图片上传

```typescript
// POST /api/upload
// Request: multipart/form-data, field: "image", 限制PNG/JPG/SVG, ≤5MB
interface UploadResponse {
  id: string;        // uuid
  url: string;       // 访问路径 /uploads/{filename}
  thumbnail: string; // 缩略图路径
}

// Response: 200 { id, url, thumbnail }
// Error: 400 { error: "Invalid file type" | "File too large" }
// Error: 500 { error: "Upload failed" }
```

### 4.2 类型定义

```typescript
interface CanvasElement {
  id: string;
  type: 'image' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  selected: boolean;
}

interface ImageElement extends CanvasElement {
  type: 'image';
  src: string;
  originalWidth: number;
  originalHeight: number;
}

interface TextElement extends CanvasElement {
  type: 'text';
  content: string;
  fontFamily: string;
  fontSize: number;
  color: string;
}

interface CanvasState {
  elements: CanvasElement[];
  zoom: number;       // 0.25 - 4
  panX: number;
  panY: number;
  selectedId: string | null;
  bgColor: string;    // 默认 #FAFAFA
}
```

## 5. 服务器架构图

```mermaid
graph LR
    "Controller[Express Router]" --> "Middleware[multer + CORS]"
    "Middleware" --> "UploadHandler[上传处理]"
    "UploadHandler" --> "FileStorage[文件系统存储]"
    "Controller" --> "StaticServer[静态文件服务]"
```

## 6. 文件结构

```
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── server/
│   └── index.ts          # Express服务器
├── src/
│   ├── App.tsx            # 应用主组件
│   ├── Canvas.tsx         # 画布组件
│   ├── Toolbar.tsx        # 工具栏组件
│   ├── store.ts           # Zustand状态管理
│   ├── types.ts           # 类型定义
│   ├── main.tsx           # 入口
│   └── index.css          # 全局样式
└── uploads/               # 上传文件目录
```
