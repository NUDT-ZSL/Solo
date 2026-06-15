## 1. 架构设计

```mermaid
flowchart TB
    "用户上传文件" --> "parser.ts"
    "parser.ts" --> "AST(acorn)"
    "AST(acorn)" --> "函数节点+调用边数据"
    "函数节点+调用边数据" --> "graph.tsx"
    "函数节点+调用边数据" --> "editor.tsx"
    "graph.tsx" --> "d3-graphviz渲染SVG"
    "editor.tsx" --> "源码展示+高亮"
    "graph.tsx --> 点击事件" --> "editor.tsx滚动高亮"
    "App.tsx状态管理" --> "parser.ts"
    "App.tsx状态管理" --> "graph.tsx"
    "App.tsx状态管理" --> "editor.tsx"
```

## 2. 技术说明

- **前端框架**：React 18 + TypeScript
- **构建工具**：Vite（@vitejs/plugin-react）
- **状态管理**：zustand
- **AST解析**：acorn + acorn-walk
- **图可视化**：d3-graphviz（基于Graphviz dot语言渲染有向图）
- **样式方案**：CSS Modules + CSS变量（暗色主题）
- **字体**：Fira Code（源码区）

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 主页面（单页应用，无路由切换） |

## 4. 数据模型

### 4.1 核心数据结构

```typescript
interface FunctionNode {
  id: string;
  name: string;
  startLine: number;
  endLine: number;
  statementCount: number;
  complexity: 'low' | 'medium' | 'high';
  isEntryPoint: boolean;
  isRecursive: boolean;
}

interface CallEdge {
  from: string;
  to: string;
  isRecursive: boolean;
}

interface ParseResult {
  nodes: FunctionNode[];
  edges: CallEdge[];
  sourceCode: string;
  sourceLines: string[];
}
```

## 5. 文件结构

```
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.js
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── App.css
    ├── parser.ts
    ├── graph.tsx
    ├── graph.css
    ├── editor.tsx
    ├── editor.css
    └── store.ts
```
