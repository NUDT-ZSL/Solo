## 1. 架构设计

```mermaid
flowchart TD
    subgraph "前端"
        A["App.tsx 状态管理"] --> B["ColorEditor.tsx 色彩编辑面板"]
        A --> C["PreviewPanel.tsx 预览画布"]
        A --> D["ReferencePanel 浮动参考面板"]
        A --> E["ExportModal 导出模态框"]
        B -->|"颜色更新"| A
        A -->|"色值props"| C
        A -->|"CSS变量列表"| D
        A -->"导出触发"| E
        F["colorUtils.ts 颜色工具"] --> B
        F --> C
        F --> E
    end
```

## 2. 技术说明

- 前端：React@18 + TypeScript + Vite
- 样式方案：CSS Modules + CSS Variables（动态主题注入）
- 状态管理：React useState/useCallback（状态简单，无需zustand）
- 初始化工具：Vite
- 后端：无（纯前端工具应用）
- 数据库：无

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 单页应用，所有功能在一个页面中 |

## 4. 数据模型

### 4.1 核心数据结构

```typescript
interface ColorSlot {
  id: string
  name: string
  hex: string
  shades: string[]
}

interface ThemeColors {
  primary: ColorSlot
  secondary: ColorSlot
  neutral: ColorSlot
  success: ColorSlot
  warning: ColorSlot
  error: ColorSlot
}

interface ExportFormat {
  type: 'css' | 'tailwind'
  content: string
}
```

### 4.2 颜色计算流程

输入颜色(HEX/RGB/HSL) → 统一转为HSL → 调节亮度生成10个色阶(50-950) → 转回HEX → 存入状态 → 驱动UI更新

## 5. 文件结构

```
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── App.tsx          # 主布局，左右分栏，状态管理，导出逻辑
    ├── App.css          # 全局样式和CSS变量
    ├── main.tsx         # 入口
    ├── components/
    │   ├── ColorEditor.tsx   # 色彩编辑面板
    │   └── PreviewPanel.tsx  # 预览画布
    └── utils/
        └── colorUtils.ts    # 颜色工具函数
```
