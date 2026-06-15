## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端层"
        "App.tsx 状态管理"
        "ImageUploader 组件"
        "PreviewPanel 组件"
        "JsonTree 组件"
    end
    subgraph "算法层"
        "SegmentEngine 分割引擎"
        "ComponentAdjuster 调整工具"
    end
    subgraph "浏览器API层"
        "Canvas API 像素分析"
        "DOM API 交互渲染"
    end

    "ImageUploader 组件" --> "App.tsx 状态管理"
    "App.tsx 状态管理" --> "SegmentEngine 分割引擎"
    "SegmentEngine 分割引擎" --> "Canvas API 像素分析"
    "App.tsx 状态管理" --> "PreviewPanel 组件"
    "App.tsx 状态管理" --> "JsonTree 组件"
    "PreviewPanel 组件" --> "ComponentAdjuster 调整工具"
    "ComponentAdjuster 调整工具" --> "App.tsx 状态管理"
    "PreviewPanel 组件" --> "DOM API 交互渲染"
```

## 2. 技术说明

- 前端：React@18 + TypeScript + Vite
- 初始化工具：vite-init
- 后端：无（纯前端应用）
- 数据库：无（本地状态管理，使用 zustand）
- 图像处理：HTML Canvas API（像素级扫描与分析）
- 状态管理：zustand

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 上传页，图像上传与分割入口 |
| /workspace | 工作台页，预览与调整分割结果 |

## 4. 数据模型

### 4.1 核心类型定义

```typescript
type ComponentType = 'button' | 'input' | 'card' | 'navbar' | 'container' | 'text' | 'image';

interface ComponentNode {
  id: string;
  type: ComponentType;
  x: number;
  y: number;
  width: number;
  height: number;
  children: ComponentNode[];
  imageData?: string;
}

interface SegmentResult {
  root: ComponentNode;
  imageWidth: number;
  imageHeight: number;
  timestamp: number;
}
```

### 4.2 状态管理模型

```typescript
interface AppStore {
  uploadedImage: string | null;
  segmentResult: SegmentResult | null;
  selectedComponentId: string | null;
  isProcessing: boolean;
  leftPanelCollapsed: boolean;
  jsonPanelExpanded: boolean;

  setUploadedImage: (data: string) => void;
  setSegmentResult: (result: SegmentResult) => void;
  setSelectedComponent: (id: string | null) => void;
  updateComponent: (id: string, updates: Partial<ComponentNode>) => void;
  removeComponent: (id: string) => void;
  mergeComponents: (id: string) => void;
  splitComponent: (id: string) => void;
  reIdentifyComponent: (id: string) => void;
  toggleLeftPanel: () => void;
  toggleJsonPanel: () => void;
}
```

## 5. 算法架构

### 5.1 分割算法流程

1. **图像预处理**：将上传图像绘制到 Canvas，获取像素数据
2. **边缘检测**：通过灰度化 + Sobel 算子检测边缘
3. **连通区域分析**：扫描水平/垂直线段，合并为矩形区域
4. **容器层级推断**：根据区域包含关系构建嵌套结构树
5. **组件类型分类**：根据宽高比、位置、内部纹理特征分类
6. **结果输出**：返回 ComponentNode 结构树

### 5.2 性能保障

- 图像分割在 Web Worker 中执行，不阻塞 UI 线程
- 使用 requestAnimationFrame 优化拖拽渲染
- Canvas 像素数据使用 Uint8ClampedArray 直接操作
- 目标：分割≤2s，拖拽帧率>30fps

## 6. 文件组织

```
├── package.json
├── index.html
├── tsconfig.json
├── vite.config.js
└── src/
    ├── App.tsx
    ├── main.tsx
    ├── store.ts
    ├── components/
    │   ├── ImageUploader.tsx
    │   ├── PreviewPanel.tsx
    │   └── JsonTree.tsx
    └── modules/
        └── segmenter/
            ├── SegmentEngine.ts
            └── ComponentAdjuster.ts
```
