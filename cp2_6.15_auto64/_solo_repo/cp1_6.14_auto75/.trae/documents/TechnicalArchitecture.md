## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端层"
        A["App.tsx - 主组件状态管理"]
        B["Toolbar.tsx - 顶部工具栏"]
        C["Sidebar.tsx - 左侧工具面板"]
        D["EditorCanvas.tsx - Three.js画布"]
        E["EditorState.ts - 状态管理类"]
    end
    
    subgraph "渲染层"
        F["Three.js 正交相机"]
        G["网格渲染"]
        H["元素渲染(平台/尖刺/终点)"]
        I["交互系统(拖拽/缩放/放置)"]
    end
    
    subgraph "数据层"
        J["元素列表数据"]
        K["JSON导出"]
    end
    
    A --> B
    A --> C
    A --> D
    D --> E
    D --> F
    D --> G
    D --> H
    D --> I
    E --> J
    E --> K
    B --> E
```

## 2. 技术说明
- 前端：React@18 + TypeScript + Vite
- 渲染引擎：Three.js（2D正交投影）
- 状态管理：自定义EditorState类（非Zustand，因需与Three.js紧密耦合）
- 初始化工具：Vite
- 后端：无
- 数据库：无（纯前端，数据通过JSON导出）

## 3. 路由定义
| 路由 | 用途 |
|------|------|
| / | 关卡编辑器（单页面应用） |

## 4. API定义
无后端API

## 5. 服务器架构图
无后端服务

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    Level ||--o{ Platform : contains
    Level ||--o{ Spike : contains
    Level ||--o{ Goal : contains
    
    Level {
        string name
        number version
    }
    
    Platform {
        string id
        string type
        number x
        number y
        number width
        number height
    }
    
    Spike {
        string id
        string type
        number x
        number y
    }
    
    Goal {
        string id
        string type
        number x
        number y
    }
```

### 6.2 数据定义语言

```typescript
interface LevelData {
  name: string;
  version: number;
  elements: ElementData[];
}

interface PlatformData {
  id: string;
  type: 'platform';
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SpikeData {
  id: string;
  type: 'spike';
  x: number;
  y: number;
}

interface GoalData {
  id: string;
  type: 'goal';
  x: number;
  y: number;
}

type ElementData = PlatformData | SpikeData | GoalData;
```

## 7. 文件组织
- package.json - 项目依赖和启动脚本
- index.html - 入口HTML
- tsconfig.json - TypeScript配置
- vite.config.js - Vite配置
- src/main.tsx - React入口
- src/App.tsx - 主组件
- src/editor/EditorCanvas.tsx - Three.js画布组件
- src/editor/EditorState.ts - 状态管理类
- src/editor/Toolbar.tsx - 顶部工具栏
- src/editor/Sidebar.tsx - 左侧工具面板
