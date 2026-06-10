## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端"
        "index.html" --> "src/main.ts"
        "src/main.ts" --> "src/generator.ts"
        "src/main.ts" --> "src/ui.ts"
        "src/ui.ts --> "src/main.ts"
    end
```

数据流向：
- `ui.ts` 监听用户操作（滑块变化、模板切换、按钮点击）→ 调用 `main.ts` 更新参数
- `main.ts` 接收参数 → 调用 `generator.ts` 生成拼贴画
- `generator.ts` 在 Canvas 上绘制 → 返回图片数据给 `main.ts`
- `main.ts` 更新历史记录和画布状态

## 2. 技术说明

- **前端**：TypeScript + Canvas API + Vite（纯前端，无框架）
- **构建工具**：Vite（支持HMR）
- **语言**：TypeScript（严格模式，目标ES2020）
- **后端**：无
- **数据库**：无（状态全部在内存中管理）

### 2.1 文件结构

```
├── package.json          # 依赖：typescript、vite，脚本：npm run dev
├── vite.config.js        # Vite构建配置，支持HMR
├── tsconfig.json         # 严格模式，目标ES2020
├── index.html            # 入口页面
└── src/
    ├── main.ts           # 初始化应用，创建画布和UI，协调模块调用
    ├── generator.ts      # 拼贴生成核心逻辑
    └── ui.ts             # 用户界面控制
```

### 2.2 模块职责与调用关系

| 模块 | 职责 | 输入 | 输出 |
|------|------|------|------|
| main.ts | 应用入口，初始化画布和UI，协调各模块 | 无 | 创建应用实例 |
| generator.ts | 拼贴生成核心，绘制几何形状和纹理 | 配置参数（密度、透明度、饱和度、模板） | 在Canvas上绘制，返回ImageData |
| ui.ts | UI交互控制，创建按钮、滑块等 | 无 | 用户操作事件回调 |

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 主页面，包含画布和控制面板 |

单页应用，无需路由。

## 4. 核心数据结构

### 4.1 生成参数

```typescript
interface GenerateConfig {
  shapeCount: number;
  opacityRange: { min: number; max: number };
  saturation: number;
  template: TemplateType;
}

type TemplateType = 'minimal-bw' | 'neon-cyber' | 'watercolor' | 'geometric' | 'retro-pop';

interface TemplatePreset {
  name: string;
  type: TemplateType;
  shapeWeights: { triangle: number; circle: number; polygon: number };
  textureTypes: string[];
  palette: string[];
  primaryColor: string;
}
```

### 4.2 历史记录

```typescript
interface HistoryEntry {
  id: number;
  thumbnail: string;      // base64缩略图 100x100
  config: GenerateConfig;
  imageData: ImageData;    // 完整画布数据用于恢复
}
```

## 5. 生成器算法设计

### 5.1 绘制流程

1. 清空画布，填充背景色
2. 绘制纹理层（至少3层）：噪点、渐变、条纹等
3. 绘制几何形状（10-40个）：三角形、圆形、多边形
4. 应用色彩滤镜（根据模板预设色调）
5. 返回图片数据

### 5.2 模板预设定义

| 模板 | 形状比例 | 纹理种类 | 主色系 |
|------|----------|----------|--------|
| 极简黑白 | 均匀 | 噪点、细条纹 | 黑白灰 |
| 霓虹赛博 | 圆形多 | 渐变、光晕 | 霓虹粉/青/紫 |
| 水彩晕染 | 圆形多 | 渐变、模糊 | 柔和粉/蓝/绿 |
| 几何构成 | 三角/多边多 | 条纹、网格 | 红/蓝/黄 |
| 复古波普 | 均匀 | 半调、噪点 | 橙/黄/红 |

## 6. 导出规格

- 画布尺寸：1080x1080px
- 白色边框：30px宽
- 水印：底部"拼贴梦境机"文字，12px字号，透明度0.3
- 格式：PNG
