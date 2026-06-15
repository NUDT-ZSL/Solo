## 「时光手账·电子札记」开发任务清单

### 阶段一：项目初始化与配置

| 任务ID | 任务描述 | 优先级 | 预计工时 | 前置依赖 | 验收标准 |
|--------|---------|--------|---------|---------|---------|
| T1-1 | 创建 package.json，定义依赖（react, react-dom, typescript, vite, @vitejs/plugin-react, express, ts-node, @types/express, uuid, @types/uuid, concurrently）和dev启动脚本 | 高 | 10min | 无 | `npm install` 成功安装全部依赖 |
| T1-2 | 创建 vite.config.js，配置React插件、路径别名 @/→src/、开发服务器代理 /api → 后端3001端口 | 高 | 10min | T1-1 | Vite启动无报错，路径别名生效 |
| T1-3 | 创建 tsconfig.json，开启严格模式、ES2020模块、baseUrl和paths路径别名配置 | 高 | 10min | T1-2 | tsc编译无类型错误 |
| T1-4 | 创建 index.html，设置中文lang、UTF-8编码、响应式viewport、id=root挂载点 | 高 | 5min | 无 | 浏览器可正常访问入口页 |
| T1-5 | 读取 web-dev-guideline.md 设计指引 | 高 | 15min | 无 | 理解字体/配色/动画设计原则 |

### 阶段二：Express 后端服务

| 任务ID | 任务描述 | 优先级 | 预计工时 | 前置依赖 | 验收标准 |
|--------|---------|--------|---------|---------|---------|
| T2-1 | 创建 server/index.ts，定义 Diary、Mood 类型，初始化内存 Map 存储和初始示例数据 | 高 | 30min | T1-1 | 类型定义完整，初始数据加载成功 |
| T2-2 | 实现 GET /api/diaries 接口：返回全部日记，按日期降序排列 | 高 | 15min | T2-1 | Postman/curl 可获取 JSON 数组 |
| T2-3 | 实现 POST /api/diaries 接口：校验标题≤50、正文≤2000、情绪枚举合法，UUID生成ID，时间戳自动填充 | 高 | 20min | T2-2 | 成功创建并返回新日记，校验失败返回400错误 |
| T2-4 | 实现 PUT /api/diaries/:id 接口：按ID查找，部分字段更新，更新updatedAt | 高 | 20min | T2-3 | 更新成功，不存在返回404 |
| T2-5 | 实现 DELETE /api/diaries/:id 接口：按ID删除，返回204 | 高 | 10min | T2-4 | 删除成功，不存在返回404 |
| T2-6 | 配置 CORS 中间件 + express.json 解析，错误处理中间件统一格式 | 高 | 15min | T2-5 | 前端跨域请求正常，错误响应格式统一 |

### 阶段三：前端类型、工具与样式基础

| 任务ID | 任务描述 | 优先级 | 预计工时 | 前置依赖 | 验收标准 |
|--------|---------|--------|---------|---------|---------|
| T3-1 | 创建 src/types.ts：Diary、Mood、FilterOptions 共享类型定义 | 高 | 10min | T1-3 | 类型导出无错误 |
| T3-2 | 创建 src/utils/helpers.ts：日期格式化、情绪→配色映射、情绪→中文名称、本周日期范围计算 | 高 | 20min | T3-1 | 工具函数单元验证通过 |
| T3-3 | 创建 src/utils/audio.ts：Web Audio API 实现翻页白噪声音效（0.3s） | 中 | 20min | T3-1 | 调用函数可播放轻微纸页摩擦声 |
| T3-4 | 创建 src/styles/global.css：CSS变量定义（主色/情绪色/字体/间距），全局reset，纸张纹理背景，body样式 | 高 | 30min | T1-4 | 全局样式应用正确，无默认样式污染 |
| T3-5 | 创建 src/styles/paper.css：卡片磨损圆角、阴影、3D透视、翻页rotateY动画关键帧、亚麻纹理背面 | 高 | 40min | T3-4 | 3D翻页动画流畅稳定≥30fps |
| T3-6 | 创建 src/main.tsx：React入口，挂载App，引入全局CSS | 高 | 5min | T3-1 | React树正确挂载 |

### 阶段四：核心组件实现

| 任务ID | 任务描述 | 优先级 | 预计工时 | 前置依赖 | 验收标准 |
|--------|---------|--------|---------|---------|---------|
| T4-1 | 创建 src/App.tsx：useState管理diaries/currentIndex/filter/editorOpen状态，useEffect初始加载，fetch封装CRUD调用，计算筛选列表和周统计数据，布局渲染所有子组件 | 高 | 60min | T2-6, T3-2 | 数据流完整，CRUD操作同步更新本地状态 |
| T4-2 | 创建 src/components/DiaryCard.tsx：接收diary props，渲染正面（标题/日期/正文/情绪图标）和背面（亚麻纹理+装饰），实现翻页按钮点击触发rotateY 180°动画+音效，0.6s后回调切换到下一篇 | 高 | 60min | T3-3, T3-5 | 3D翻页流畅，情绪图标悬停光晕放大 |
| T4-3 | 创建 src/components/DiaryEditor.tsx：模态框遮罩，标题输入（字数统计0/50），正文textarea（0/2000），日期默认今日可改，5个情绪chip选中态，保存按钮调用POST/PUT，取消关闭模态框 | 高 | 50min | T4-1 | 表单验证有效，保存成功刷新列表 |
| T4-4 | 创建 src/components/CalendarView.tsx：7×6网格当月日历，计算有日记日期的情绪圆点（颜色+大小），今日高亮边框，点击日期触发跳转，悬停显示tooltip | 高 | 50min | T3-2 | 圆点正确显示，跳转功能正常 |
| T4-5 | 创建 src/components/MoodBoard.tsx：横条7柱子柱状图，柱高=当日日记数（最大高度归一化），柱色=当日主导情绪，悬停显示tooltip（情绪+篇数明细） | 高 | 40min | T4-1 | 统计数据准确，悬停详情显示 |
| T4-6 | 创建 src/components/SearchFilter.tsx：关键词输入框（防抖300ms），情绪下拉选择器，开始/结束日期选择器，组合筛选回调 | 高 | 30min | T4-1 | 搜索响应≤300ms，组合筛选正确 |

### 阶段五：响应式适配与集成测试

| 任务ID | 任务描述 | 优先级 | 预计工时 | 前置依赖 | 验收标准 |
|--------|---------|--------|---------|---------|---------|
| T5-1 | 响应式适配：<600px单列+手风琴，600-1023px双栏，≥1024px三栏，所有组件媒体查询 | 中 | 40min | T4-6 | 三种断点下布局正确无错乱 |
| T5-2 | 启动后端+前端，完整流程测试：创建→浏览→翻页→搜索→编辑→删除→统计 | 高 | 30min | T5-1 | 全流程无报错，数据一致 |
| T5-3 | 性能验证：Chrome DevTools Performance面板检查翻页FPS≥30，搜索Network/CPU时间≤300ms | 中 | 20min | T5-2 | 性能指标达标 |
| T5-4 | TypeScript类型检查 `tsc --noEmit` 零错误，修复所有类型告警 | 高 | 20min | T5-2 | 编译零错误 |

### 里程碑

1. **M1 配置完成**：T1全部完成，可启动空壳项目
2. **M2 后端就绪**：T2全部完成，API联调可用
3. **M3 基础完成**：T3全部完成，样式和工具就绪
4. **M4 功能完备**：T4全部完成，核心功能可用
5. **M5 交付上线**：T5全部完成，通过测试可交付
