## 1. 架构设计

```mermaid
flowchart TB
    "前端层 React+TypeScript+Vite" --> "组件层"
    "组件层" --> "Toolbar 工具栏"
    "组件层" --> "PreviewPanel 预览面板"
    "组件层" --> "Timeline 时间轴"
    "组件层" --> "DiffPanel 差异面板"
    "工具层" --> "screenshot.ts 截图+像素对比"
    "工具层" --> "exportPDF.ts PDF导出"
    "外部库" --> "html2canvas 截图"
    "外部库" --> "pixelmatch 像素对比"
    "外部库" --> "jsPDF PDF生成"
    "组件层" --> "工具层"
    "工具层" --> "外部库"
```

## 2. 技术说明

- **前端**：React@18 + TypeScript + Vite（无Tailwind，使用自定义CSS）
- **初始化工具**：vite-init (react-ts模板)
- **后端**：无
- **状态管理**：Zustand
- **图标库**：lucide-react
- **截图**：html2canvas
- **像素对比**：pixelmatch
- **PDF导出**：jsPDF
- **其他工具**：blob-util

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 主页面，包含所有功能模块 |

本项目为单页面应用，所有功能集成在一个页面中。

## 4. 文件结构

```
├── package.json
├── index.html
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── PreviewPanel.tsx
│   │   └── Toolbar.tsx
│   ├── utils/
│   │   ├── screenshot.ts
│   │   └── exportPDF.ts
│   └── styles/
│       └── index.css
```

## 5. 核心数据流

1. **URL加载流**：用户输入URL → Zustand store更新 → 4个PreviewPanel各自加载iframe
2. **十字准线流**：鼠标移动事件 → 计算归一化坐标 → 广播至所有面板 → 各面板渲染十字准线overlay
3. **录制流**：定时器(1s) → html2canvas截取各面板 → 生成缩略图存入store → 时间轴渲染
4. **差异检测流**：选取两断点截图 → pixelmatch逐像素对比(RGB阈值30) → 生成差异蒙版+差异列表
5. **导出流**：收集截图+差异图+统计数据 → jsPDF组装PDF → 触发下载

## 6. 关键类型定义

```typescript
interface Viewport {
  name: string;
  width: number;
  height: number;
  icon: string;
}

interface CaptureFrame {
  timestamp: number;
  screenshots: Map<string, string>; // viewport name -> data URL
}

interface DiffRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  diffPercentage: number;
  domPath: string;
}

interface DiffResult {
  diffImage: string;
  regions: DiffRegion[];
  totalDiffPixels: number;
  maxRegionArea: number;
}
```
