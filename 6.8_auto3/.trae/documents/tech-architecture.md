## 1. 架构设计

```mermaid
flowchart TB
    "Frontend Layer" --> "App.tsx"
    "App.tsx" --> "Timeline.tsx"
    "App.tsx" --> "MemoryCard.tsx"
    "App.tsx" --> "animations.ts"
    "Data Layer" --> "Mock Data（内嵌年份数据）"
```

纯前端项目，无后端服务。数据通过 mock 数据内嵌在前端，年份切换、动画过渡均在客户端完成。

## 2. 技术说明

- **前端**：React@18 + TypeScript + Tailwind CSS@3 + Vite
- **初始化工具**：vite-init（react-ts 模板）
- **状态管理**：Zustand
- **动画**：CSS transitions + CSS animations（60fps 硬件加速），封装在 animations.ts
- **后端**：无
- **数据库**：无（使用 mock 数据）

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 首页，展示时间胶囊主页 |

本项目为单页应用，仅一个路由页面。

## 4. 文件结构

```
├── index.html
├── main.tsx
├── App.tsx
├── src/
│   ├── components/
│   │   ├── Timeline.tsx
│   │   └── MemoryCard.tsx
│   ├── utils/
│   │   └── animations.ts
│   ├── store/
│   │   └── useCapsuleStore.ts
│   ├── data/
│   │   └── memories.ts
│   └── index.css
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── postcss.config.js
```

## 5. 核心数据模型

```typescript
interface Memory {
  id: string
  year: number
  title: string
  content: string
  fullContent: string
  imageUrl: string
  date: string
  tags: string[]
}

interface YearTheme {
  year: number
  color: string
  gradient: string
  label: string
}
```

## 6. 动画策略

- **年份切换**：背景色 transition 0.8s ease-in-out，卡片 fadeOut → fadeIn + slideUp
- **卡片入场**：opacity 0→1 + translateY 30px→0，staggered delay 每张 0.06s
- **卡片展开**：max-height 过渡 + opacity，配合 backdrop-filter 遮罩
- **导航 hover**：transform scale(1.08)，transition 0.2s
- **全部使用 CSS transform/opacity** 触发 GPU 合成层，保证 60fps
