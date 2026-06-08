## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端层"
        "App.tsx [全局状态管理]"
        "WordCloud.tsx [词云渲染]"
        "PoemDisplay.tsx [诗句展示]"
        "InkParticles.tsx [背景粒子]"
    end
    subgraph "工具层"
        "textAnalysis.ts [文本分析]"
        "cloudLayout.ts [螺旋布局]"
    end
    subgraph "数据层"
        "poems.ts [预设诗词库]"
        "store.ts [Zustand状态]"
    end
    "App.tsx [全局状态管理]" --> "WordCloud.tsx [词云渲染]"
    "App.tsx [全局状态管理]" --> "PoemDisplay.tsx [诗句展示]"
    "App.tsx [全局状态管理]" --> "InkParticles.tsx [背景粒子]"
    "WordCloud.tsx [词云渲染]" --> "cloudLayout.ts [螺旋布局]"
    "WordCloud.tsx [词云渲染]" --> "textAnalysis.ts [文本分析]"
    "PoemDisplay.tsx [诗句展示]" --> "poems.ts [预设诗词库]"
    "App.tsx [全局状态管理]" --> "store.ts [Zustand状态]"
```

## 2. 技术说明

- **前端框架**：React 18 + TypeScript
- **构建工具**：Vite
- **样式方案**：Tailwind CSS 3
- **状态管理**：Zustand
- **词云布局**：D3.js（d3-scale 用于词频映射）+ 自研螺旋布局算法
- **动画**：CSS transitions + requestAnimationFrame 粒子系统
- **路由**：单页应用，无需 react-router
- **后端**：无，纯前端项目
- **数据库**：无，使用内存数据 + 预设诗词库

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 主页面，包含所有功能模块 |

## 4. 核心数据结构

```typescript
interface KeywordInfo {
  word: string
  frequency: number
  sentiment: 'positive' | 'neutral' | 'melancholic' | 'heroic'
  sourceLines: string[]
}

interface CloudWord {
  text: string
  x: number
  y: number
  fontSize: number
  rotation: number
  color: string
  frequency: number
  sentiment: string
  sourceLines: string[]
}

interface Poem {
  id: string
  title: string
  author: string
  dynasty: string
  lines: string[]
  fullText: string
}

interface AppState {
  inputText: string
  selectedPoemId: string | null
  keywords: KeywordInfo[]
  cloudWords: CloudWord[]
  activeWord: string | null
  hoveredWord: string | null
}
```

## 5. 文件结构

```
src/
├── main.tsx              # 入口文件
├── App.tsx               # 根组件，管理全局状态和布局
├── components/
│   ├── WordCloud.tsx     # 核心词云组件（SVG + D3）
│   ├── PoemDisplay.tsx   # 诗句展示区域
│   ├── TextInput.tsx     # 文本输入和诗词选择
│   ├── GlassCard.tsx     # 毛玻璃信息卡片
│   └── InkParticles.tsx  # 背景墨点粒子（Canvas）
├── utils/
│   ├── textAnalysis.ts   # 文本分析：关键词提取、情感标签
│   ├── cloudLayout.ts    # 螺旋布局算法
│   └── poems.ts          # 预设诗词库数据
├── store.ts              # Zustand 全局状态
└── index.css             # 全局样式 + Tailwind
```

## 6. 关键算法

### 6.1 螺旋布局算法

使用阿基米德螺旋线（r = a + bθ）计算词条初始位置，然后通过碰撞检测微调避免重叠：

1. 按词频降序排列词条
2. 对每个词条，沿螺旋线搜索第一个不与已放置词条重叠的位置
3. 使用矩形边界框进行碰撞检测
4. 支持旋转（0° 或 90°）

### 6.2 文本分析算法

1. 中文分词：基于预设词典的正向最大匹配法
2. 词频统计：使用 Map 统计并排序
3. 情感标签：基于情感词典映射（积极/中性/悲怆/豪迈）
4. 关键词筛选：取词频 Top 30-50 的词，过滤停用词

### 6.3 粒子系统

- 墨点粒子：80个以内，使用 Canvas 2D 渲染
- 爆散粒子：点击词条时生成 20-30 个粒子，从词条中心向四周扩散，带衰减和透明度渐变
- 使用 requestAnimationFrame 驱动，确保 60fps
