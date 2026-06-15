## 1. 架构设计

```mermaid
flowchart LR
    subgraph "前端 React + Vite"
        A["App.tsx 全局状态与路由"]
        B["GlassJar.tsx 玻璃罐容器"]
        C["ScentCard.tsx 气味试管卡片"]
        D["ScentModal.tsx 编辑/详情模态窗"]
        E["SearchFilter.tsx 搜索筛选栏"]
        F["StatsChart.tsx Canvas统计图表"]
        G["StarRating.tsx 星级评分"]
        H["ImageUploader.tsx 图片上传裁剪"]
    end
    
    subgraph "后端 Node.js + Express"
        I["index.ts Express服务器"]
        J["CRUD API 处理器"]
        K["Multer 文件上传"]
    end
    
    subgraph "数据层"
        L["data/scents.json 数据存储"]
        M["uploads/ 图片存储"]
    end
    
    A --> B
    B --> C
    B --> E
    B --> F
    C --> D
    D --> G
    D --> H
    A --> I
    I --> J
    J --> L
    I --> K
    K --> M
```

## 2. 技术说明

- **前端框架**：React@18 + TypeScript
- **构建工具**：Vite@5
- **后端框架**：Express@4 + TypeScript
- **运行时**：tsx（TypeScript执行器）
- **并发启动**：concurrently
- **文件上传**：multer
- **ID生成**：uuid
- **跨域支持**：cors
- **图标库**：lucide-react

## 3. 路由定义

| 路由 | 说明 |
|------|------|
| / | 主页，展示玻璃罐容器和所有功能模块 |

## 4. API定义

### 4.1 类型定义

```typescript
interface Scent {
  id: string;
  name: string;
  type: 'floral' | 'fruity' | 'woody' | 'spicy' | 'marine' | 'smoky' | 'gourmand' | 'other';
  typeLabel: string;
  date: string;
  rating: number;
  memory: string;
  imageUrl: string | null;
  createdAt: string;
}
```

### 4.2 接口列表

| 方法 | 路径 | 参数 | 说明 |
|------|------|------|------|
| GET | /api/scents | ?type=&search= | 获取所有气味，支持类型和关键词筛选 |
| POST | /api/scents | FormData(name,type,date,rating,memory,image) | 添加新气味（multipart表单） |
| PUT | /api/scents/:id | 同POST | 更新指定气味 |
| DELETE | /api/scents/:id | - | 删除指定气味 |

## 5. 服务端架构

```mermaid
flowchart TD
    A["Express 服务器 (port 3001)"] --> B["CORS 中间件"]
    B --> C["JSON解析中间件"]
    C --> D["静态资源服务 (/uploads)"]
    D --> E["Multer 上传中间件"]
    E --> F["路由处理器"]
    F --> G["GET /api/scents - 查询筛选"]
    F --> H["POST /api/scents - 新增"]
    F --> I["PUT /api/scents/:id - 更新"]
    F --> J["DELETE /api/scents/:id - 删除"]
    G --> K["data/scents.json 读写"]
    H --> K
    I --> K
    J --> K
    H --> L["uploads/ 图片存储"]
    I --> L
```

## 6. 数据模型

### 6.1 数据结构

```mermaid
erDiagram
    SCENT {
        string id PK
        string name
        string type
        string typeLabel
        string date
        number rating
        string memory
        string imageUrl
        string createdAt
    }
```

### 6.2 数据文件

JSON文件存储于 `data/scents.json`，结构：
```json
{
  "scents": [
    {
      "id": "uuid",
      "name": "雨后泥土",
      "type": "woody",
      "typeLabel": "木质",
      "date": "2024-01-15",
      "rating": 5,
      "memory": "夏日雷雨后的泥土清香，混合青草气息...",
      "imageUrl": "/uploads/xxx.jpg",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### 6.3 气味类型映射

| type值 | 标签 | 主题色 |
|--------|------|--------|
| floral | 花香 | #F4A7BB |
| fruity | 果香 | #F7DC6F |
| woody | 木质 | #A67B5B |
| spicy | 辛香 | #E67E22 |
| marine | 海洋 | #85C1E9 |
| smoky | 烟熏 | #7F8C8D |
| gourmand | 美食 | #D4A574 |
| other | 其他 | #BB8FCE |
