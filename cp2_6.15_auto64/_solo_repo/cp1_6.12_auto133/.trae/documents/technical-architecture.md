## 1. 架构设计

```mermaid
flowchart TB
    subgraph Frontend["前端 React+Vite+TypeScript"]
        A["App.tsx 主容器"] --> B["EditorPanel.tsx"]
        A --> C["GraphPanel.tsx"]
        A --> D["ShareDialog.tsx"]
        B --> E["prismjs 语法高亮"]
        C --> F["dagre-d3 布局"]
        C --> G["d3 力导向渲染"]
    end
    subgraph Backend["后端 Express+nedb"]
        H["server.ts"] --> I["/post-save"]
        H --> J["/get-snippet/:code"]
        H --> K["nedb-promises 存储"]
    end
    Frontend -->|API请求| Backend
    Backend -->|JSON响应| Frontend
```

## 2. 技术说明
- 前端：React@18 + TypeScript + Vite + prismjs + dagre-d3 + d3
- 初始化工具：vite-init (react-express-ts模板)
- 后端：Express@4 + nedb-promises + uuid
- 数据库：nedb（嵌入式文档数据库，文件存储）
- 状态管理：useReducer（代码提交历史）+ 局部state
- 样式：CSS Modules / 内联样式（深色主题）

## 3. 路由定义
| 路由 | 用途 |
|------|------|
| / | 主编辑器页面（代码编辑+关系图） |
| /?code=分享码 | 通过分享码加载已保存的代码和关系图 |

## 4. API定义

### 4.1 POST /post-save
保存代码片段和关系图数据

请求体：
```typescript
interface SaveRequest {
  code: string;
  language: 'javascript' | 'python' | 'html';
  graphData: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
}

interface GraphNode {
  id: string;
  label: string;
  type: 'function' | 'variable' | 'module';
  line: number;
  inDegree: number;
}

interface GraphEdge {
  source: string;
  target: string;
  type: 'call' | 'dependency' | 'import';
}

interface SaveResponse {
  success: boolean;
  code: string; // 6位分享码
}
```

### 4.2 GET /get-snippet/:code
通过分享码查询代码片段

响应体：
```typescript
interface SnippetResponse {
  success: boolean;
  data: {
    code: string;
    language: 'javascript' | 'python' | 'html';
    graphData: {
      nodes: GraphNode[];
      edges: GraphEdge[];
    };
    createdAt: string;
  } | null;
}
```

## 5. 服务端架构图

```mermaid
flowchart LR
    A["Express Router"] --> B["POST /post-save"]
    A --> C["GET /get-snippet/:code"]
    B --> D["uuid生成分享码"]
    D --> E["nedb-promises插入"]
    C --> F["nedb-promises查询"]
    F --> G["返回JSON"]
    E --> G
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    Snippet {
        string _id PK
        string shareCode "6位分享码"
        string code "代码内容"
        string language "javascript/python/html"
        object graphData "关系图数据"
        string createdAt "创建时间"
    }
```

### 6.2 数据定义语言

nedb集合：snippets
- 字段：_id(自增), shareCode(索引,唯一), code, language, graphData(JSON对象), createdAt
- 自动加载文件：data/snippets.db
