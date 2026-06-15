## 1. 架构设计

```mermaid
graph TD
    "A[React App] --> B[ColorPanel 颜色面板]"
    "A --> C[DashboardPreview 仪表盘预览]"
    "A --> D[CompareView 对比视图]"
    "A --> E[ExportModal 导出弹窗]"
    "A --> F[useTheme Hook 主题管理]"
    "F --> G[theme.css CSS变量]"
    "B --> H[拖拽状态管理]"
    "C --> G"
    "D --> G"
```

## 2. 技术说明

- 前端框架：React 18 + TypeScript
- 构建工具：Vite
- 状态管理：React useState/useReducer（项目规模较小，无需zustand）
- 样式方案：CSS变量 + 内联样式（核心颜色通过CSS变量动态更新）
- 依赖：react, react-dom, vite, @vitejs/plugin-react, typescript, @types/react, @types/react-dom, copy-to-clipboard
- 无后端服务

## 3. 文件结构

| 文件路径 | 用途 |
|---------|------|
| package.json | 项目依赖和启动脚本 |
| index.html | 入口页面，包含根容器和全局样式重置 |
| tsconfig.json | TypeScript配置（严格模式，ESNext模块，jsx: react-jsx） |
| vite.config.js | Vite配置（@vitejs/plugin-react插件，base: './'） |
| src/main.tsx | React应用入口 |
| src/App.tsx | 主组件，管理全局状态 |
| src/components/ColorPanel.tsx | 左侧颜色面板组件 |
| src/components/DashboardPreview.tsx | 中央仪表盘示例组件 |
| src/hooks/useTheme.ts | 主题管理Hook |
| src/styles/theme.css | 全局CSS变量定义 |

## 4. CSS变量体系

| 变量名 | 用途 | 默认值（暗黑主题） |
|--------|------|-------------------|
| --bg-primary | 主背景色 | #121220 |
| --bg-secondary | 次背景色 | #1e1e2e |
| --bg-card | 卡片背景色 | #2a2a3e |
| --text-primary | 主文本色 | #e0e0e0 |
| --text-secondary | 次文本色 | #a0a0b0 |
| --accent-primary | 主强调色 | #6c5ce7 |
| --accent-secondary | 次强调色 | #00cec9 |
| --border-color | 边框色 | #3a3a4e |
| --shadow-color | 阴影色 | rgba(0,0,0,0.3) |
| --progress-bg | 进度条背景 | #3a3a4e |
| --progress-fill | 进度条填充 | #6c5ce7 |
| --btn-primary | 按钮主色 | #6c5ce7 |
| --btn-hover | 按钮悬停色 | #5a4bcf |
| --table-row-alt | 表格交替行色 | #252538 |

## 5. 主题数据结构

```typescript
interface ThemeColors {
  '--bg-primary': string;
  '--bg-secondary': string;
  '--bg-card': string;
  '--text-primary': string;
  '--text-secondary': string;
  '--accent-primary': string;
  '--accent-secondary': string;
  '--border-color': string;
  '--shadow-color': string;
  '--progress-bg': string;
  '--progress-fill': string;
  '--btn-primary': string;
  '--btn-hover': string;
  '--table-row-alt': string;
}

type ThemeName = 'light' | 'dark' | 'forest' | 'ocean' | 'cyberpunk';
```

## 6. 关键交互实现

### 6.1 拖拽色块
- 使用HTML5 Drag & Drop API（dragstart/dragover/drop）
- 拖拽时创建自定义拖拽预览（48px半透明圆形）
- Drop时根据目标元素的data-attribute确定要覆盖的CSS变量

### 6.2 主题切换过渡
- 通过document.documentElement.style.setProperty更新CSS变量
- 所有使用CSS变量的元素自动获得transition: all 0.4s ease-in-out
- 在theme.css中为根元素设置transition

### 6.3 对比模式
- 使用CSS Grid或Flex实现左右分屏
- 分割线通过mousedown/mousemove/mouseup实现拖拽调整
- 左侧使用独立的CSS变量作用域（通过style属性覆盖）

### 6.4 导出功能
- 使用copy-to-clipboard库复制文本
- 颜色格式转换：十六进制 → HSL（纯函数实现）
- 弹窗使用React Portal渲染

### 6.5 FPS监控
- 使用requestAnimationFrame计算帧率
- 右上角固定定位显示
