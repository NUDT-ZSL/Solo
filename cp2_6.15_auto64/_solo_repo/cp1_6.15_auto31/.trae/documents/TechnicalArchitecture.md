## 1. 架构设计

```mermaid
flowchart TD
    "A[前端 React + TypeScript]" --> "B[状态管理 Zustand]"
    "A" --> "C[CSS 动画层]"
    "A" --> "D[拖拽交互层]"
    "B" --> "E[全局状态：当前放置物品、选中主题]"
    "C" --> "F[弹性动画 / 淡入淡出 / 主题过渡]"
    "D" --> "G[拖拽阴影 / 吸附检测 / 位置重置]"
```

## 2. 技术说明

- **前端框架**：React 18 + TypeScript（严格模式）
- **构建工具**：Vite + @vitejs/plugin-react
- **状态管理**：Zustand
- **样式方案**：CSS Modules + CSS Variables（主题色切换）
- **动画方案**：CSS transitions + CSS animations（弹性缓动）
- **唯一标识**：uuid
- **后端**：无（纯前端项目）
- **数据库**：无

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 模拟器主页（唯一页面） |

## 4. 数据模型

### 4.1 核心类型定义

```typescript
interface FurnitureItem {
  id: string;
  category: 'sofa' | 'chandelier' | 'painting';
  name: string;
  thumbnail: string;
  color: string;
}

interface PlacedItem {
  itemId: string;
  category: 'sofa' | 'chandelier' | 'painting';
  position: { x: number; y: number };
}

interface ThemeConfig {
  id: string;
  name: string;
  wallColor: string;
  accentColor: string;
  shadowColor: string;
  itemColorOverrides: Record<string, string>;
}
```

## 5. 文件结构

```
├── package.json
├── vite.config.js
├── tsconfig.json
├── index.html
├── src/
│   ├── main.tsx           # React根组件，挂载App
│   ├── App.tsx            # 主布局，组合侧边栏和画布区，管理全局状态和主题切换
│   ├── components/
│   │   ├── Toolbar.tsx    # 左侧工具面板，展示物品列表，处理点击选中事件
│   │   └── CatalogueView.tsx  # 中央房间画布，渲染预设背景和当前放置的物品，处理拖拽吸附逻辑与布局动画
│   └── utils/
│       └── constants.ts   # 定义物品数据、预设位置坐标和主题颜色映射
```

## 6. 关键交互逻辑

### 6.1 物品放置流程

1. 用户点击工具栏物品卡片 → 触发 `selectItem` action
2. 检查该分类位置是否已有物品
3. 若有：旧物品播放0.2秒淡出 → 移除 → 新物品0.3秒弹性动画出现
4. 若无：新物品直接0.3秒弹性动画出现在预设位置

### 6.2 拖拽吸附流程

1. mousedown 在已放置物品上 → 进入拖拽模式，生成半透明阴影副本
2. mousemove → 阴影跟随鼠标
3. mouseup → 检测是否在预设位置范围内
4. 吸附成功：物品移动到预设位置 + 0.2秒缩放回弹动画
5. 吸附失败：物品0.3秒返回原位

### 6.3 主题切换流程

1. 用户点击底部主题色块 → 触发 `setTheme` action
2. CSS变量通过transition 0.5s平滑过渡
3. 物品颜色、阴影、背景墙色同步变化
4. 使用requestAnimationFrame确保帧率≥30fps
