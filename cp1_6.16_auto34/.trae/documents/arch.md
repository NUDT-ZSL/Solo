## 1. 架构设计

```mermaid
flowchart TD
    subgraph "前端层 (React + TypeScript + Vite)"
        A["main.tsx (入口)"] --> B["App.tsx (根组件)"]
        B --> C["RecipeEditor.tsx (配方编辑器)"]
        B --> D["RecipeCard.tsx (配方卡片)"]
        C --> E["calculator.ts (计算逻辑)"]
        C --> F["IngredientSearch.tsx (食材搜索)"]
        C --> G["StepCard.tsx (步骤卡片)"]
        C --> H["Timer.tsx (定时器组件)"]
    end

    subgraph "业务逻辑层 (纯TypeScript)"
        E
    end

    subgraph "后端层 (Express + TypeScript)"
        I["server/index.ts"]
        J["GET /api/ingredients"]
        K["GET /api/templates"]
        L["POST /api/save"]
        I --> J
        I --> K
        I --> L
    end

    subgraph "数据流向"
        M["预设食材库 (Mock)"] --> J
        N["配方模板 (Mock)"] --> K
        O["本地存储"] --> L
        J --> C
        K --> C
        C --> L
    end

    C -->|调用计算| E
    E -->|返回结果| C
    C -->|传递数据| D
```

---

## 2. 技术描述

- **前端框架**：React 18 + TypeScript 5 + Vite 5
- **初始化工具**：Vite 内置 React 模板
- **样式方案**：CSS Modules + 内联样式（动画使用 CSS keyframes）
- **状态管理**：React useState/useReducer（本地状态，无需 Redux）
- **拖拽库**：原生 HTML5 Drag and Drop API（避免额外依赖）
- **后端**：Express 4 + TypeScript
- **HTTP 客户端**：原生 fetch API
- **唯一ID**：uuid 库
- **CORS**：cors 中间件（后端）+ Vite 代理（开发环境）
- **Mock 数据**：后端内置静态数据，无需数据库

---

## 3. 文件结构与调用关系

```
auto34/
├── package.json                 # 依赖配置
├── vite.config.js               # Vite配置，路径别名，API代理
├── tsconfig.json                # TypeScript配置
├── index.html                   # HTML入口
├── src/
│   ├── main.tsx                 # React入口，加载初始数据
│   │   └── 调用: App.tsx
│   ├── App.tsx                  # 根组件，管理视图切换
│   │   ├── 调用: RecipeEditor.tsx
│   │   └── 调用: RecipeCard.tsx
│   ├── components/
│   │   ├── RecipeEditor.tsx     # 核心编辑器
│   │   │   ├── 调用: calculator.ts (calculatePercentages)
│   │   │   ├── 调用: StepCard.tsx
│   │   │   ├── 调用: IngredientSearch.tsx
│   │   │   ├── 调用: Timer.tsx
│   │   │   └── API: GET /api/ingredients, POST /api/save
│   │   ├── RecipeCard.tsx       # 配方卡片展示
│   │   │   └── 调用: calculator.ts (formatToRecipeCard)
│   │   ├── StepCard.tsx         # 步骤卡片组件
│   │   │   ├── 调用: IngredientSearch.tsx
│   │   │   └── 调用: Timer.tsx
│   │   ├── IngredientSearch.tsx # 食材搜索下拉框
│   │   │   └── 调用: 防抖搜索函数
│   │   └── Timer.tsx            # 定时器组件
│   ├── lib/
│   │   ├── calculator.ts        # 纯业务逻辑（无依赖）
│   │   │   ├── calculatePercentages()
│   │   │   └── formatToRecipeCard()
│   │   └── types.ts             # TypeScript类型定义
│   └── styles/
│       └── global.css           # 全局样式和动画
└── server/
    ├── index.ts                 # Express入口
    │   ├── GET /api/ingredients
    │   ├── GET /api/templates
    │   └── POST /api/save
    └── data/
        ├── ingredients.ts       # 预设食材数据
        └── templates.ts         # 配方模板数据
```

---

## 4. 类型定义

```typescript
// src/lib/types.ts

export interface Ingredient {
  id: string;
  name: string;
  weight: number;
  temperature?: number;
  time?: number;
  percentage?: number;
}

export interface RecipeStep {
  id: string;
  title: string;
  description: string;
  timerHours: number;
  timerMinutes: number;
  ingredients: Ingredient[];
}

export interface Recipe {
  id?: string;
  name: string;
  steps: RecipeStep[];
  totalWeight: number;
  createdAt?: string;
}

export interface PresetIngredient {
  name: string;
  density: number;
  unit: string;
  category: string;
}

export interface RecipeTemplate {
  id: string;
  name: string;
  steps: RecipeStep[];
  stepCount: number;
}
```

---

## 5. API 定义

### 5.1 GET /api/ingredients

**描述**：获取预设食材列表

**响应格式**：
```typescript
interface IngredientsResponse {
  success: boolean;
  data: PresetIngredient[];
}
```

**响应示例**：
```json
{
  "success": true,
  "data": [
    { "name": "面粉", "density": 0.52, "unit": "g", "category": "粉类" },
    { "name": "细砂糖", "density": 0.85, "unit": "g", "category": "糖类" },
    ...
  ]
}
```

### 5.2 GET /api/templates

**描述**：获取配方模板列表

**响应格式**：
```typescript
interface TemplatesResponse {
  success: boolean;
  data: RecipeTemplate[];
}
```

### 5.3 POST /api/save

**描述**：保存配方

**请求格式**：
```typescript
interface SaveRecipeRequest {
  name: string;
  steps: RecipeStep[];
  totalWeight: number;
  ingredientPercentages: { name: string; percentage: number }[];
}
```

**响应格式**：
```typescript
interface SaveRecipeResponse {
  success: boolean;
  message: string;
  id: string;
}
```

---

## 6. 核心数据流

### 6.1 食材比例计算流

```mermaid
sequenceDiagram
    participant User as 用户
    participant Editor as RecipeEditor
    participant Calc as calculator.ts
    
    User->>Editor: 添加/修改食材重量
    Editor->>Calc: 收集所有步骤食材调用 calculatePercentages()
    Calc->>Calc: 校验总重量 != 0
    Calc->>Calc: 计算每个食材百分比
    Calc-->>Editor: 返回 { ingredient, percentage }[]
    Editor->>Editor: 更新UI进度条和百分比显示
```

### 6.2 配方保存流

```mermaid
sequenceDiagram
    participant User as 用户
    participant Editor as RecipeEditor
    participant Server as Express后端
    
    User->>Editor: 点击保存按钮
    Editor->>Editor: 收集配方数据
    Editor->>Server: POST /api/save (配方JSON)
    Server->>Server: 生成UUID，模拟存储
    Server-->>Editor: 返回 { success: true, id }
    Editor->>Editor: 显示保存成功动画
    Editor->>Editor: 更新右侧收藏列表
```

### 6.3 配方卡片生成流

```mermaid
sequenceDiagram
    participant User as 用户
    participant Editor as RecipeEditor
    participant Card as RecipeCard
    participant Calc as calculator.ts
    
    User->>Editor: 点击生成卡片
    Editor->>Card: 传递配方数据
    Card->>Calc: 调用 formatToRecipeCard()
    Calc-->>Card: 返回格式化文本
    Card->>Card: 渲染卡片预览
    User->>Card: 点击导出文本
    Card->>Card: 复制到剪贴板
    Card->>User: 显示"已复制"提示
```

---

## 7. 性能约束实现方案

| 约束 | 实现方案 |
|------|----------|
| 百分比计算 ≤ 50ms | 纯函数计算，O(n) 复杂度，使用 useMemo 缓存 |
| 拖拽响应 ≤ 100ms | 原生 HTML5 Drag API，避免 React 重渲染，使用 CSS transform |
| 食材加载 ≤ 200ms | 本地 Mock 数据，无网络延迟，后端直接返回 |
| 搜索防抖 | 200ms lodash-style 防抖函数，避免频繁过滤 |

---

## 8. 路由定义

| 视图 | 触发方式 | 描述 |
|------|----------|------|
| 编辑器视图 | 默认 | 主编辑界面，左右分栏 |
| 卡片预览 | 点击"生成卡片" | 全屏配方卡片预览 |
