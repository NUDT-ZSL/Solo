## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端层"
        "React UI组件" --> "EventEmitter事件总线"
        "Three.js画布" --> "EventEmitter事件总线"
    end
    subgraph "逻辑层"
        "Simulator模拟器" --> "EventEmitter事件总线"
        "DialogueTreeIO导入导出" --> "EventEmitter事件总线"
    end
    subgraph "数据层"
        "节点状态(React State)" --> "JSON序列化"
        "连线状态(React State)" --> "JSON序列化"
    end
    "EventEmitter事件总线" --> "React UI组件"
    "EventEmitter事件总线" --> "Three.js画布"
```

## 2. 技术说明

- **前端框架**：React 18 + TypeScript + Vite
- **画布渲染**：Three.js（正交相机，2D节点渲染）
- **状态管理**：React useState/useReducer + EventEmitter3事件总线
- **样式方案**：CSS Modules + CSS变量
- **构建工具**：Vite + @vitejs/plugin-react
- **路径别名**：@指向src目录
- **无后端**：纯前端应用，所有数据存储在浏览器内存中

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 单页应用，包含完整编辑器 |

## 4. 数据模型

### 4.1 数据模型定义

```mermaid
erDiagram
    "DialogueNode" {
        "string id PK"
        "NodeType type"
        "number x"
        "number y"
        "string text"
        "string characterName"
        "string condition"
        "string[] optionTexts"
        "string jumpTargetId"
    }
    "Connection" {
        "string id PK"
        "string fromId FK"
        "string toId FK"
        "number fromPort"
    }
    "SimulationState" {
        "string currentNodeId"
        "string[] visitedNodeIds"
        "string[] visitedConnectionIds"
    }
    "DialogueNode" ||--o{ "Connection" : "fromId"
    "DialogueNode" ||--o{ "Connection" : "toId"
```

### 4.2 节点类型枚举

| 类型 | 说明 | 出口数 |
|------|------|--------|
| dialogue | 对话节点，显示角色对话文本 | 1 |
| choice | 选项节点，提供玩家选择 | 最多4 |
| condition | 条件分支节点，根据条件表达式走向不同分支 | 2 |
| jump | 跳转节点，跳转到指定节点 | 1 |
| end | 结束节点，对话终止 | 0 |

## 5. 事件总线通信协议

| 事件名称 | 载荷 | 说明 |
|----------|------|------|
| node:add | {type, x, y} | 添加节点 |
| node:remove | {id} | 删除节点 |
| node:move | {id, x, y} | 移动节点 |
| node:update | {id, ...props} | 更新节点属性 |
| node:select | {id \| null} | 选中节点 |
| connection:add | {fromId, toId, fromPort} | 添加连线 |
| connection:remove | {id} | 删除连线 |
| simulation:start | {} | 开始模拟 |
| simulation:choose | {connectionId} | 模拟中选择选项 |
| simulation:stop | {} | 停止模拟 |
| simulation:path | {visitedNodes, visitedConnections} | 模拟路径更新 |
| tree:export | {} | 导出对话树 |
| tree:import | {data} | 导入对话树 |
| tree:reset | {} | 重置对话树 |

## 6. 文件结构

```
├── package.json
├── index.html
├── vite.config.js
├── tsconfig.json
└── src/
    ├── main.tsx          # 入口，渲染Editor
    ├── Editor.tsx         # 主编辑界面，维护节点/连线状态
    ├── ThreeCanvas.tsx    # Three.js画布封装
    ├── Simulator.ts       # 模拟运行逻辑
    ├── DialogueTreeIO.ts  # 导入导出JSON纯函数
    ├── types.ts           # 类型定义
    └── styles/
        └── editor.css     # 全局样式
```
