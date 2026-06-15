## 1. 架构设计

```mermaid
flowchart TB
    "前端展示层" --> "业务逻辑层"
    "前端展示层" --> "状态管理"
    "状态管理" --> "业务逻辑层"
    
    subgraph "前端展示层"
        "App.tsx"
        "DiaryList.tsx"
        "MapView.tsx"
        "DiaryEntry.tsx"
    end
    
    subgraph "业务逻辑层"
        "dataManager.ts"
        "坐标映射函数"
    end
    
    subgraph "状态管理"
        "Zustand Store"
    end
```

## 2. 技术说明

- **前端框架**：React@18 + TypeScript + Vite
- **初始化工具**：vite-init (react-ts模板)
- **状态管理**：Zustand
- **路由**：react-router-dom（客户端路由）
- **样式方案**：CSS Modules + 内联样式（无Tailwind，按用户需求自定义CSS）
- **后端**：无后端，所有数据存储在内存中
- **数据库**：无数据库，使用内存数组 + 单例模式

### 关键依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| react | ^18.x | UI框架 |
| react-dom | ^18.x | DOM渲染 |
| react-router-dom | ^6.x | 客户端路由 |
| typescript | ^5.x | 类型安全 |
| vite | ^5.x | 构建工具 |
| @vitejs/plugin-react | ^4.x | Vite React插件 |
| @types/react | ^18.x | React类型定义 |
| @types/react-dom | ^18.x | ReactDOM类型定义 |
| uuid | ^9.x | 唯一ID生成 |
| @types/uuid | ^9.x | UUID类型定义 |
| zustand | ^4.x | 状态管理 |

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 首页，展示日志列表、搜索筛选、添加日志 |
| /map | 地图页，全屏足迹地图视图 |
| /entry/:id | 详情页，展示单条日志完整内容 |

## 4. API定义

无后端API，所有数据通过 `dataManager.ts` 模块在内存中管理。

### 数据管理接口

```typescript
interface TravelEntry {
  id: string;
  title: string;
  date: string;
  location: string;
  images: string[];
  description: string;
  coordinates: { lat: number; lng: number };
}

interface DataManager {
  addEntry(entry: Omit<TravelEntry, 'id' | 'coordinates'>): TravelEntry;
  deleteEntry(id: string): boolean;
  getAllEntries(): TravelEntry[];
  getEntryById(id: string): TravelEntry | undefined;
  searchEntries(keyword: string): TravelEntry[];
  filterByDateRange(start: string, end: string): TravelEntry[];
  getCoordinates(location: string): { lat: number; lng: number };
}
```

## 5. 服务器架构图

无后端服务器，前端独立运行。

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    "TravelEntry" {
        "string id PK"
        "string title"
        "string date"
        "string location"
        "string[] images"
        "string description"
        "object coordinates"
    }
    "Coordinates" {
        "number lat"
        "number lng"
    }
    "TravelEntry" ||--|| "Coordinates" : "has"
```

### 6.2 数据定义

- 所有数据以 `TravelEntry[]` 数组形式存储在内存中
- 使用单例模式 `DataManager` 保证全局唯一实例
- 坐标通过地点名称映射函数生成模拟坐标
- 预置若干示例数据供首次加载展示

## 7. 文件结构

```
project/
├── package.json
├── vite.config.js
├── tsconfig.json
├── index.html
└── src/
    ├── App.tsx                    # 根组件，路由和全局状态
    ├── main.tsx                   # 入口文件
    ├── App.css                    # 全局样式
    ├── components/
    │   ├── DiaryList.tsx          # 日志列表组件
    │   ├── MapView.tsx            # 足迹地图组件
    │   └── DiaryEntry.tsx         # 日志详情组件
    └── utils/
        └── dataManager.ts         # 数据管理模块（单例）
```
