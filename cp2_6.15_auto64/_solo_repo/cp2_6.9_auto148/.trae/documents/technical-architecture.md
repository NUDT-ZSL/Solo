## 1. 架构设计

```mermaid
graph TD
    subgraph "前端浏览器"
        "React 18" --> "Three.js 3D渲染"
        "React 18" --> "UI组件层"
        "UI组件层" --> "ExhibitionRoom.tsx"
        "UI组件层" --> "InfoPanel.tsx"
        "Three.js 3D渲染" --> "场景/相机/灯光"
        "Three.js 3D渲染" --> "展品/展台管理"
        "Three.js 3D渲染" --> "交互拾取(Raycaster)"
        "Socket.IO Client" --> "WebSocket实时通信"
    end
    subgraph "后端服务器"
        "Express" --> "静态文件托管"
        "WebSocket服务" --> "连接管理"
        "WebSocket服务" --> "消息广播"
        "WebSocket服务" --> "状态同步"
    end
    "前端浏览器" -- "WebSocket" --> "后端服务器"
```

## 2. 技术描述
- **前端**：React 18 + TypeScript + Three.js + Vite
- **状态管理**：React Hooks (useState, useEffect, useRef)
- **构建工具**：Vite 5
- **后端**：Express 4 + ws (WebSocket库)
- **实时通信**：WebSocket (原生ws库，前后端自定义协议)
- **3D渲染**：Three.js + OrbitControls

## 3. 路由定义
| 路由 | 用途 |
|------|------|
| / | 主页面，3D展览场景 + UI面板 |

## 4. API与消息协议定义

### 4.1 WebSocket消息类型
```typescript
interface PlaceExhibitMsg {
  type: 'place-exhibit';
  timestamp: number;
  payload: {
    gridX: number;
    gridZ: number;
    exhibitType: string;
    color: string;
    rotation: number;
  };
}

interface UpdateDescriptionMsg {
  type: 'update-description';
  timestamp: number;
  payload: {
    gridX: number;
    gridZ: number;
    description: string;
  };
}

interface ResetAllMsg {
  type: 'reset-all';
  timestamp: number;
}

interface SyncStateMsg {
  type: 'sync-state';
  payload: {
    exhibits: ExhibitData[];
  };
}

interface ExhibitData {
  gridX: number;
  gridZ: number;
  exhibitType: string;
  color: string;
  rotation: number;
  description: string;
}
```

## 5. 服务器架构

```mermaid
graph TD
    "WebSocket连接" --> "消息解析器"
    "消息解析器" --> "冲突检测(时间戳)"
    "冲突检测" --> "状态管理器"
    "状态管理器" --> "内存存储(展品状态)"
    "状态管理器" --> "广播器"
    "广播器" --> "所有在线客户端"
    "新客户端连接" --> "发送全量同步状态"
```

## 6. 数据模型

### 6.1 数据结构
```typescript
interface Exhibit {
  gridX: number;
  gridZ: number;
  exhibitType: 'sphere' | 'torus' | 'cone' | 'cylinder' | 'box' | 'tetrahedron' | 'octahedron' | 'icosahedron';
  color: string;
  rotation: number;
  description: string;
}

interface ServerState {
  exhibits: Map<string, Exhibit>; // key: `${gridX},${gridZ}`
  clients: Set<WebSocket>;
}
```

### 6.2 常量配置
```typescript
const GRID_SIZE = 1.5; // 1.2单位边长 + 0.3间隔
const BASE_SIZE = 1.2;
const PALETTE = ['#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C', '#E91E63', '#00BCD4', '#FF5722', '#8BC34A'];
const EXHIBIT_TYPES = ['sphere', 'torus', 'cone', 'cylinder', 'box', 'tetrahedron', 'octahedron', 'icosahedron'];
```
