# 多波段星图对比应用 - 开发任务清单

## 阶段一：项目初始化
- [x] TASK-001: 创建 PRD 文档
- [x] TASK-002: 创建技术架构文档
- [ ] TASK-003: 创建 package.json（含所有依赖和启动脚本）
- [ ] TASK-004: 创建 vite.config.js（端口 5173）
- [ ] TASK-005: 创建 tsconfig.json（严格模式）
- [ ] TASK-006: 创建 index.html（入口页面）

## 阶段二：后端开发
- [ ] TASK-007: 创建 server/data/stars.json（500 颗恒星模拟数据）
- [ ] TASK-008: 创建 server/server.ts（Express API 服务）

## 阶段三：前端基础
- [ ] TASK-009: 创建 src/types/index.ts（全局类型定义）
- [ ] TASK-010: 创建 src/api.ts（API 封装模块）
- [ ] TASK-011: 创建 src/utils/coordinates.ts（坐标转换工具）
- [ ] TASK-012: 创建 src/hooks/useStarData.ts（自定义数据 Hook）
- [ ] TASK-013: 创建 src/styles.css（全局样式）

## 阶段四：UI 组件
- [ ] TASK-014: 创建 src/components/StarFieldBackground.tsx（星空粒子背景）
- [ ] TASK-015: 创建 src/components/Navbar.tsx（顶部导航栏）
- [ ] TASK-016: 创建 src/components/StarTooltip.tsx（恒星信息悬浮提示）
- [ ] TASK-017: 创建 src/components/HistoryTags.tsx（历史记录标签）
- [ ] TASK-018: 创建 src/components/StarChart.tsx（核心星图 Canvas 组件）
- [ ] TASK-019: 创建 src/components/ControlPanel.tsx（控制面板）
- [ ] TASK-020: 创建 src/App.tsx（主组件，整合所有模块）

## 阶段五：验证
- [ ] TASK-021: 安装依赖 npm install
- [ ] TASK-022: 启动服务验证功能 npm run dev
