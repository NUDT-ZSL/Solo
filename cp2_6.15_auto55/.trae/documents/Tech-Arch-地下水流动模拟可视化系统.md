## 1. 架构设计

```mermaid
flowchart TB
    subgraph Frontend["前端层"]
        A1["React + TypeScript"]
        A2["React Three Fiber (Three.js封装)"]
        A3["Zustand 状态管理"]
        A4["Vite 构建工具"]
    end
    
    subgraph Components["组件层"]
        B1["App.tsx 主组件"]
        B2["GeologyLayer.tsx 地质层"]
        B3["WaterParticles.tsx 粒子系统"]
        B4["ControlPanel.tsx 控制面板"]
        B5["InfoPanel 信息展示"]
        B6["Compass 指南针"]
    end
    
    subgraph API["API服务层"]
        C1["dataService.ts REST客户端"]
    end
    
    subgraph Backend["后端层"]
        D1["Express 4 服务 (端口3001)"]
        D2["SQLite 内存数据库"]
    end
    
    A1 --> B1
    B1 --> B2
    B1 --> B3
    B1 --> B4
    B1 --> B5
    B1 --> B6
    A3 --> B1
    A2 --> B2
    A2 --> B3
    C1 --> B1
    D1 --> C1
    D2 --> D1
```

## 2. 技术描述

- **前端框架**：React@18 + TypeScript@5
- **3D渲染**：Three.js + @react-three/fiber@8 + @react-three/drei@9
- **状态管理**：Zustand@4
- **构建工具**：Vite@5 + @vitejs/plugin-react@4
- **后端服务**：Express@4 (端口3001)
- **数据库**：SQLite3 (内存数据库)
- **样式方案**：CSS-in-JS / 内联样式 + CSS动画
- **开发模式**：concurrently 同时启动前端Vite和后端Express

## 3. 路由定义

| 路由 | 用途 |
|-------|---------|
| / | 主可视化页面，包含3D场景和控制面板 |
| /api/layers | 获取地层结构数据 |
| /api/particles | 根据时间获取粒子位置数据 |
| /api/query | 查询指定坐标的流速和方向数据 |

## 4. API定义

### 4.1 类型定义

```typescript
// 地层数据
interface GeologyLayer {
  id: number;
  name: string;
  depth: number;
  height: number;
  color: string;
  lithology: string;
}

// 粒子数据
interface ParticleData {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

// 查询结果
interface QueryResult {
  x: number;
  y: number;
  z: number;
  speed: number;
  direction: {
    horizontal: number;  // 水平角度（正北为0度）
    vertical: number;    // 俯仰角度
  };
  lithology: string;
  layerId: number;
}

// 应用状态
interface AppState {
  simulationTime: number;
  particleSize: number;
  speedMultiplier: number;
  layers: GeologyLayer[];
  particles: ParticleData[];
  selectedPoint: QueryResult | null;
  setSimulationTime: (time: number) => void;
  setParticleSize: (size: number) => void;
  setSpeedMultiplier: (multiplier: number) => void;
  setSelectedPoint: (point: QueryResult | null) => void;
  fetchLayers: () => Promise<void>;
  fetchParticles: (time: number) => Promise<void>;
  queryPoint: (x: number, y: number, z: number) => Promise<void>;
}
```

### 4.2 API响应格式

```typescript
// GET /api/layers
// Response: { success: boolean; data: GeologyLayer[] }

// GET /api/particles?time=number
// Response: { success: boolean; data: ParticleData[] }

// GET /api/query?x=number&y=number&z=number
// Response: { success: boolean; data: QueryResult }
```

## 5. 服务器架构图

```mermaid
flowchart LR
    A["API Controller"] --> B["业务逻辑层"]
    B --> C["数据访问层"]
    C --> D["SQLite 内存数据库"]
    
    subgraph Endpoints["API端点"]
        E1["GET /api/layers"]
        E2["GET /api/particles"]
        E3["GET /api/query"]
    end
    
    Endpoints --> A
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    GEOLOGY_LAYERS {
        INTEGER id PK
        TEXT name
        REAL depth
        REAL height
        TEXT color
        TEXT lithology
    }
    
    PARTICLE_DATA {
        INTEGER id PK
        REAL time
        REAL x
        REAL y
        REAL z
        REAL vx
        REAL vy
        REAL vz
    }
    
    VECTOR_FIELD {
        INTEGER id PK
        REAL x
        REAL y
        REAL z
        REAL vx
        REAL vy
        REAL vz
    }
```

### 6.2 DDL语句

```sql
-- 地层表
CREATE TABLE IF NOT EXISTS geology_layers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  depth REAL NOT NULL,
  height REAL NOT NULL,
  color TEXT NOT NULL,
  lithology TEXT NOT NULL
);

-- 粒子数据表（按时间索引）
CREATE TABLE IF NOT EXISTS particle_data (
  id INTEGER PRIMARY KEY,
  time REAL NOT NULL,
  x REAL NOT NULL,
  y REAL NOT NULL,
  z REAL NOT NULL,
  vx REAL NOT NULL,
  vy REAL NOT NULL,
  vz REAL NOT NULL
);

-- 三维矢量场表
CREATE TABLE IF NOT EXISTS vector_field (
  id INTEGER PRIMARY KEY,
  x REAL NOT NULL,
  y REAL NOT NULL,
  z REAL NOT NULL,
  vx REAL NOT NULL,
  vy REAL NOT NULL,
  vz REAL NOT NULL
);

-- 初始化地层数据
INSERT INTO geology_layers (id, name, depth, height, color, lithology) VALUES
(1, '表层土', 0, 5, '#d4a373', '粉质黏土'),
(2, '黏土层', 5, 6, '#bc8f5a', '黏土'),
(3, '砂土层', 11, 4, '#a0714b', '细砂'),
(4, '基岩层', 15, 5, '#8b5e3c', '花岗岩');

-- 初始化矢量场数据（服务启动时自动生成）
-- 初始化粒子数据（服务启动时自动生成1500个粒子的时间序列）
```

## 7. 数据流向图

```mermaid
sequenceDiagram
    participant User as 用户
    participant Frontend as 前端React
    participant Store as Zustand Store
    participant API as dataService
    participant Server as Express
    participant DB as SQLite
    
    User->>Frontend: 打开应用
    Frontend->>Store: 初始化状态
    Store->>API: fetchLayers()
    API->>Server: GET /api/layers
    Server->>DB: SELECT * FROM geology_layers
    DB-->>Server: 地层数据
    Server-->>API: JSON响应
    API-->>Store: 更新layers
    
    Store->>API: fetchParticles(time=0)
    API->>Server: GET /api/particles?time=0
    Server->>DB: SELECT * FROM particle_data WHERE time=0
    DB-->>Server: 粒子位置数据
    Server-->>API: JSON响应
    API-->>Store: 更新particles
    
    Frontend->>Frontend: Three.js渲染场景
    User->>Frontend: 拖动时间滑块
    Frontend->>Store: setSimulationTime(time)
    Store->>API: fetchParticles(time)
    API->>Server: GET /api/particles?time=...
    Server-->>API: 插值计算后的粒子位置
    API-->>Store: 更新particles
    Frontend->>Frontend: 重新渲染粒子位置
    
    User->>Frontend: 点击3D场景
    Frontend->>Frontend: 射线拾取计算坐标
    Frontend->>Store: queryPoint(x,y,z)
    Store->>API: queryPoint(x,y,z)
    API->>Server: GET /api/query?x=...&y=...&z=...
    Server->>DB: 查询矢量场和地层
    DB-->>Server: 流速和岩性数据
    Server-->>API: JSON响应
    API-->>Store: 更新selectedPoint
    Frontend->>Frontend: 显示信息面板
```
