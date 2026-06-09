## 1. 架构设计

```mermaid
graph TD
    subgraph "Frontend (React + TypeScript + Vite)"
        A["App.tsx - 根组件<br/>全局状态管理"]
        B["MapView.tsx - 地图组件<br/>Leaflet地图渲染"]
        C["ChestModal.tsx - 宝箱弹窗<br/>拍照与开箱"]
        D["状态: 用户位置/宝箱列表/积分/弹窗"]
    end
    
    subgraph "Backend (Node.js + Express)"
        E["POST /api/chests<br/>根据坐标返回宝箱列表"]
        F["POST /api/open-chest<br/>验证照片+返回奖励"]
        G["内存存储<br/>宝箱数据（3分钟有效期）"]
    end
    
    subgraph "外部服务"
        H["OpenStreetMap<br/>底图瓦片服务"]
        I["getUserMedia API<br/>浏览器摄像头"]
    end
    
    A --> B
    A --> C
    B -->|点击宝箱| C
    C -->|HTTP请求| E
    C -->|HTTP请求+图片| F
    B -->|加载瓦片| H
    C -->|拍照| I
```

## 2. 技术描述
- **前端**：React 18 + TypeScript + Vite
- **UI框架**：原生CSS + CSS Modules样式（不使用UI组件库，自定义暗色主题）
- **地图库**：Leaflet 1.9 + OpenStreetMap瓦片
- **状态管理**：React useState/useReducer（轻量级状态，无需zustand）
- **后端**：Express 4.x
- **文件上传**：Multer
- **跨域**：CORS中间件
- **唯一标识**：UUID
- **数据存储**：内存变量（宝箱列表，3分钟过期清理）

## 3. 路由定义
| 路由 | 用途 |
|------|------|
| / | 首页，地图与游戏主界面 |

## 4. API 定义

### 4.1 POST /api/chests
根据用户坐标返回附近宝箱列表。

**请求体：**
```typescript
interface GetChestsRequest {
  latitude: number;
  longitude: number;
}
```

**响应体：**
```typescript
interface Chest {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  createdAt: number;
  expiresAt: number;
}

interface GetChestsResponse {
  success: boolean;
  chests: Chest[];
}
```

### 4.2 POST /api/open-chest
验证照片位置偏移并返回开箱结果。

**请求体（multipart/form-data）：**
```
image: 文件（640x480 JPEG/PNG）
chestId: string
latitude: number（用户拍摄时的坐标）
longitude: number（用户拍摄时的坐标）
```

**响应体：**
```typescript
interface OpenChestResponse {
  success: boolean;
  message: string;
  coins?: number;  // 5-15随机金币
  reward?: {
    type: 'coins' | 'skin_fragment' | 'points';
    amount: number;
    name: string;
  };
}
```

## 5. 服务器架构图

```mermaid
graph TD
    A["Express App"] --> B["CORS Middleware"]
    A --> C["Multer Middleware<br/>处理图片上传"]
    A --> D["JSON Body Parser"]
    
    D --> E["POST /api/chests"]
    C --> F["POST /api/open-chest"]
    
    E --> G["ChestService<br/>宝箱生成与管理"]
    F --> G
    F --> H["PhotoValidator<br/>位置偏移校验（50米内，5秒超时）"]
    
    G --> I["内存存储<br/>Map<string, Chest>"]
    G --> J["定时清理任务<br/>每30秒清理过期宝箱"]
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    CHEST {
        string id PK "UUID"
        string name "宝箱名称，如'后海宝藏'"
        float latitude "纬度"
        float longitude "经度"
        number createdAt "创建时间戳"
        number expiresAt "过期时间戳（创建后5分钟）"
    }
    
    USER_SESSION {
        string id PK "会话ID（内存中）"
        number coins "累积金币"
        number totalChestsOpened "已开宝箱数"
    }
```

### 6.2 数据定义语言
（内存存储，无数据库DDL，以下为TypeScript接口定义）

```typescript
interface Chest {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  createdAt: number;
  expiresAt: number;
}

interface UserState {
  coins: number;
  position: {
    latitude: number;
    longitude: number;
  } | null;
  openedChests: string[];
}
```
