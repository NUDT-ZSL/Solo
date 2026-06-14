## 1. 架构设计

```mermaid
graph TD
    subgraph "前端层"
        A["React 应用 (Vite)"]
        B["路由管理 (React Router)"]
        C["HTTP模块 (axios封装)"]
        D["UI组件库"]
    end
    
    subgraph "后端层"
        E["Express API服务 (端口3001)"]
        F["端点管理API (CRUD)"]
        G["模拟请求处理器"]
        H["文件持久化模块"]
    end
    
    subgraph "数据层"
        I["JSON数据文件 (endpoints.json)"]
    end
    
    A --> B
    A --> C
    A --> D
    C -->|/api/*| E
    E --> F
    E --> G
    F --> H
    G --> H
    H --> I
```

## 2. 技术描述

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite 5
- **前端路由**: React Router DOM 6
- **HTTP客户端**: Axios
- **样式方案**: 原生CSS + CSS变量 + CSS Modules
- **后端框架**: Express 4
- **后端语言**: JavaScript (Node.js)
- **数据持久化**: JSON文件（endpoints.json）
- **跨域处理**: cors中间件
- **代理配置**: Vite开发服务器代理 /api → http://localhost:3001

## 3. 前端路由定义

| 路由路径 | 页面组件 | 用途说明 |
|----------|----------|----------|
| / | HomePage | 端点列表首页，展示所有模拟端点卡片 |
| /endpoint/new | EndpointEditor | 创建新的模拟端点 |
| /endpoint/:id | EndpointEditor | 编辑已有模拟端点 |

## 4. API接口定义

### 4.1 TypeScript 类型定义

```typescript
interface Endpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  statusCode: number;
  responseBody: string;
  delay: number;
  createdAt: number;
  updatedAt: number;
}

interface EndpointCreateRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  statusCode: number;
  responseBody: string;
  delay: number;
}

interface EndpointUpdateRequest extends EndpointCreateRequest {
  id: string;
}

interface TestResponse {
  status: number;
  statusText: string;
  data: any;
  time: number;
}
```

### 4.2 后端API端点

| HTTP方法 | 路径 | 功能描述 | 请求体 | 响应体 |
|----------|------|----------|--------|--------|
| GET | /api/endpoints | 获取所有端点列表 | 无 | Endpoint[] |
| GET | /api/endpoints/:id | 获取单个端点详情 | 无 | Endpoint |
| POST | /api/endpoints | 创建新端点 | EndpointCreateRequest | Endpoint |
| PUT | /api/endpoints/:id | 更新端点 | EndpointUpdateRequest | Endpoint |
| DELETE | /api/endpoints/:id | 删除端点 | 无 | { success: boolean } |
| ANY | /mock/* | 模拟请求处理 | 任意 | 根据端点配置返回JSON |

## 5. 服务端架构

```mermaid
graph TD
    A["Express Server (3001)"] --> B["CORS中间件"]
    B --> C["JSON解析中间件"]
    C --> D["API路由处理器"]
    C --> E["Mock路由处理器"]
    
    D --> F["GET /api/endpoints"]
    D --> G["GET /api/endpoints/:id"]
    D --> H["POST /api/endpoints"]
    D --> I["PUT /api/endpoints/:id"]
    D --> J["DELETE /api/endpoints/:id"]
    
    F --> K["文件操作模块"]
    G --> K
    H --> K
    I --> K
    J --> K
    
    E --> L["匹配端点配置"]
    L --> M["延迟处理 (delay ms)"]
    M --> N["返回响应"]
    
    K --> O["endpoints.json"]
    L --> O
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    ENDPOINT {
        string id PK "唯一标识"
        string method "HTTP方法: GET/POST/PUT/DELETE"
        string path "接口路径，如/api/users"
        int statusCode "响应状态码，如200"
        string responseBody "JSON响应体字符串"
        int delay "延迟响应时间(ms)，0-5000"
        number createdAt "创建时间戳"
        number updatedAt "更新时间戳"
    }
```

### 6.2 endpoints.json 数据结构示例

```json
{
  "endpoints": [
    {
      "id": "uuid-1",
      "method": "GET",
      "path": "/api/users",
      "statusCode": 200,
      "responseBody": "{\"users\": [{\"id\": 1, \"name\": \"John\"}]}",
      "delay": 500,
      "createdAt": 1718000000000,
      "updatedAt": 1718000100000
    }
  ]
}
```

## 7. 项目文件结构

```
stubbubble/
├── package.json
├── index.html
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── http.ts
│   ├── types/
│   │   └── index.ts
│   ├── components/
│   │   ├── EndpointCard.tsx
│   │   ├── JsonEditor.tsx
│   │   ├── Sidebar.tsx
│   │   └── MethodBadge.tsx
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   └── EndpointEditor.tsx
│   └── styles/
│       ├── global.css
│       └── variables.css
└── server/
    ├── index.js
    ├── endpoints.json
    └── package.json
```

## 8. 性能优化策略

1. **虚拟滚动/懒加载**：端点列表超过50项时考虑虚拟滚动
2. **防抖处理**：JSON编辑器键盘事件使用100ms防抖
3. **状态管理优化**：使用React.memo优化卡片组件重渲染
4. **并发请求**：前端HTTP请求支持并发和取消
5. **文件缓存**：后端读取endpoints.json时使用内存缓存，写入后失效
6. **CSS优化**：使用CSS变量和类选择器，避免复杂选择器
7. **构建优化**：Vite开启代码分割和tree shaking
