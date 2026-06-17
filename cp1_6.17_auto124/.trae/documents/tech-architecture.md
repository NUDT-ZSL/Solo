## 1. 架构设计

```mermaid
flowchart TB
    "App.tsx 全局状态管理" --> "GradientEditor.tsx 编辑器"
    "App.tsx 全局状态管理" --> "PreviewBackground.tsx 预览区"
    "GradientEditor.tsx" --> "types.ts 类型定义"
    "PreviewBackground.tsx" --> "types.ts 类型定义"
    "App.tsx" --> "types.ts 类型定义"
```

## 2. 技术说明
- 前端：React 18 + TypeScript + Vite
- 状态管理：React useState/useCallback（组件内状态提升至App）
- 样式方案：CSS-in-JS（内联样式 + CSS变量）
- 动画方案：requestAnimationFrame + CSS transition
- 初始化工具：vite-init（react-ts模板）
- 后端：无
- 数据库：无

## 3. 路由定义
| 路由 | 用途 |
|------|------|
| / | 单页应用，包含编辑器和预览区 |

## 4. 文件结构
```
├── package.json
├── index.html
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── App.tsx          # 主组件，全局渐变状态管理
│   ├── GradientEditor.tsx # 编辑器组件
│   ├── PreviewBackground.tsx # 预览背景组件
│   └── types.ts         # 类型定义
```

## 5. 数据模型

### 5.1 类型定义

```typescript
type GradientType = 'linear' | 'radial';

interface ColorStop {
  id: string;
  color: string;
  position: number; // 0-1
}

interface GradientConfig {
  type: GradientType;
  angle: number;       // 线性渐变角度 0-360
  radius: number;      // 径向渐变半径 0-100
  colorStops: ColorStop[];
  animationEnabled: boolean;
}

interface PresetGradient {
  name: string;
  config: GradientConfig;
}
```

### 5.2 预设色板数据
- 日落：FF6B6B → FEEA9E → FFB347
- 海洋：00B4DB → 0083B0 → 005C97
- 极光：43E97B → 38F9D7
- 薰衣草：A18CD1 → FBC2EB
- 火焰：F7971E → FF0844
- 森林：11998E → 38EF7D
