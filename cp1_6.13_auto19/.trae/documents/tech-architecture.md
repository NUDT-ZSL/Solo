## 1. 架构设计

```mermaid
flowchart TB
    "前端展示层" --> "状态管理层(Zustand)"
    "状态管理层" --> "组件渲染层"
    "组件渲染层" --> "Sidebar"
    "组件渲染层" --> "Canvas"
    "组件渲染层" --> "PropertyPanel"
    "组件渲染层" --> "ExportModal"
    "组件渲染层" --> "Navbar"
```

## 2. 技术说明

- 前端：React@18 + TypeScript + Vite
- 初始化工具：vite-init (react-ts 模板)
- 状态管理：Zustand
- 样式方案：Tailwind CSS + 内联样式（组件绝对定位需要动态样式）
- 后端：无
- 数据库：无

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 主画布页面，包含所有功能模块 |

## 4. 文件结构

```
├── index.html
├── package.json
├── vite.config.js
├── tsconfig.json
├── src/
│   ├── main.tsx
│   ├── App.tsx              # 主组件：全局状态管理、组件列表、选中、画布背景色、导出状态
│   ├── types.ts             # ComponentData 等类型定义
│   ├── store.ts             # Zustand 全局状态管理
│   ├── Canvas.tsx           # 画布渲染：组件绝对定位、拖拽落位、网格吸附、选中高亮、删除动画
│   ├── Sidebar.tsx          # 左侧面板：三个可拖拽组件卡片
│   ├── PropertyPanel.tsx    # 右侧属性面板：色盘、滑块等编辑控件
│   ├── ExportModal.tsx      # 导出模态窗口：CSS代码生成、语法高亮、复制
│   └── index.css            # 全局样式（Tailwind + 自定义动画）
```

## 5. 核心数据模型

```typescript
interface ComponentData {
  id: string;
  type: 'button' | 'card' | 'input';
  x: number;
  y: number;
  zIndex: number;
  props: Record<string, any>;
}

interface ButtonProps {
  backgroundColor: string;  // 默认 #3b82f6
  borderRadius: number;     // 0-32px，默认 8
  fontSize: number;         // 12-24px，默认 14
  textColor: string;        // 默认 #ffffff
  shadowDepth: number;      // 0-16px，默认 0
  width: number;            // 默认 160
  height: number;           // 默认 48
}

interface CardProps {
  backgroundColor: string;  // 默认 #ffffff
  borderColor: string;      // 默认 #e2e8f0
  borderWidth: number;      // 0-8px，默认 1
  borderRadius: number;     // 0-32px，默认 12
  shadowDepth: number;      // 0-16px，默认 4
  width: number;            // 默认 280
  height: number;           // 默认 220
}

interface InputProps {
  borderColor: string;      // 默认 #d1d5db
  borderRadius: number;     // 0-32px，默认 8
  placeholderColor: string; // 默认 #9ca3af
  padding: number;          // 4-20px，默认 12
  width: number;            // 默认 300
  height: number;           // 默认 44
}
```

## 6. 关键技术决策

1. **拖拽实现**：使用HTML5 Drag and Drop API + Pointer Events混合方案，左侧面板用Drag API发起拖拽，画布上用Pointer Events实现组件位置调整和中键叠放
2. **网格吸附**：落位时将坐标对齐到最近的20px网格点（Math.round(x/20)*20）
3. **动画系统**：CSS transition实现属性修改的平滑过渡(0.2s)、弹性落位(0.3s ease-out)、删除缩小淡出(0.25s)
4. **CSS导出**：遍历组件列表，按类型分组生成CSS选择器和属性值，使用span实现语法高亮
5. **响应式**：使用window resize监听 + CSS media query，<1024px时右侧面板转为底部抽屉
6. **性能**：使用requestAnimationFrame优化拖拽，React.memo减少不必要渲染，所有动画使用CSS transition/GPU加速
