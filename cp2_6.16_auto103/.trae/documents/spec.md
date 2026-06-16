# 多波段星图对比应用 - 技术架构文档

## 1. 技术选型

| 层级 | 技术 | 版本 | 说明 |
|-----|------|------|------|
| 前端框架 | React | ^18 | 基于 Hooks 的组件化开发 |
| 前端语言 | TypeScript | ^5 | 静态类型检查，启用严格模式 |
| 构建工具 | Vite | ^5 | 快速开发服务器，HMR 热更新 |
| 前端路由 | react-router-dom | ^6 | URL 参数控制星图区域 |
| 后端框架 | Express | ^4 | 轻量级 REST API 服务 |
| 后端语言 | TypeScript | ^5 | 通过 ts-node 运行 |
| 数据存储 | JSON 文件 | - | 500 颗模拟恒星数据 |
| 跨域处理 | cors | ^2 | 前后端端口分离 |
| 唯一 ID | uuid | ^9 | 历史记录标识 |

---

## 2. 项目文件结构

```
auto103/
├── package.json                          # 项目依赖与启动脚本
├── vite.config.js                        # Vite 配置（端口 5173，React 插件）
├── tsconfig.json                         # TS 配置（严格模式，node 模块解析）
├── index.html                            # 入口 HTML
├── src/
│   ├── App.tsx                           # 主组件：路由分发、状态管理、数据获取
│   ├── api.ts                            # API 模块：封装 fetch 请求
│   ├── hooks/
│   │   └── useStarData.ts                # 自定义 Hook：星体数据获取与缓存
│   ├── components/
│   │   ├── StarChart.tsx                 # 星图 Canvas 组件（核心）
│   │   ├── ControlPanel.tsx              # 控制面板组件
│   │   ├── StarTooltip.tsx               # 恒星信息悬浮提示
│   │   ├── HistoryTags.tsx               # 历史记录标签列表
│   │   ├── StarFieldBackground.tsx       # 星空粒子背景动画
│   │   └── Navbar.tsx                    # 顶部导航栏
│   ├── types/
│   │   └── index.ts                      # 全局 TypeScript 类型定义
│   ├── utils/
│   │   ├── coordinates.ts                # 坐标转换工具（RA/Dec ↔ 像素）
│   │   └── bandMix.ts                    # 波段混合算法
│   └── styles.css                        # 全局样式
└── server/
    ├── server.ts                         # Express 服务端入口
    └── data/
        └── stars.json                    # 500 颗恒星模拟数据
```

---

## 3. 模块调用关系与数据流向

### 3.1 整体数据流图

```mermaid
flowchart LR
    subgraph 前端
        A[App.tsx] -->|调用 fetchStars| B[api.ts]
        B -->|GET /api/stars| C[Express server.ts]
        C -->|读取| D[stars.json]
        D -->|恒星数组| C
        C -->|JSON 响应| B
        B -->|StarData[]| A
        A -->|props 传递| E[StarChart.tsx]
        A -->|state 双向| F[ControlPanel.tsx]
        E -->|hover 事件| G[StarTooltip.tsx]
        A -->|读写| H[(localStorage 历史)]
    end
```

### 3.2 文件间详细调用关系

| 调用方 | 被调用方 | 方式 | 数据传递 |
|-------|---------|------|---------|
| App.tsx | api.ts | 直接 import | 传入 ra, dec 参数 → 接收 StarData[] |
| App.tsx | StarChart.tsx | props | 传递 stars, mixRatio, band |
| App.tsx | ControlPanel.tsx | props + callbacks | 传递当前状态 → 接收用户操作 |
| App.tsx | HistoryTags.tsx | props + callbacks | 传递历史记录 → 接收恢复请求 |
| StarChart.tsx | utils/coordinates.ts | 工具函数 | ra/dec ↔ canvas xy 互转 |
| StarChart.tsx | utils/bandMix.ts | 工具函数 | 像素级波段混合计算 |
| ControlPanel.tsx | StarTooltip.tsx | 渲染子组件 | 传递 hoveredStar |
| api.ts | server.ts | HTTP GET | query: ra, dec, fieldSize |
| server.ts | stars.json | fs.readFileSync | 全量读取后内存过滤 |

---

## 4. 核心数据类型定义

```typescript
// src/types/index.ts

export type Band = 'visible' | 'infrared' | 'ultraviolet' | 'xray';

export interface StarBrightness {
  visible: number;      // 0-100 亮度值
  infrared: number;
  ultraviolet: number;
  xray: number;
}

export interface StarData {
  id: string;
  name: string;
  ra: number;           // 赤经（十进制度数）
  dec: number;          // 赤纬（十进制度数）
  brightness: StarBrightness;
  distance: number;     // 距离（光年）
}

export interface QueryParams {
  ra: string;           // HH:MM:SS 格式
  dec: string;          // DD:MM:SS 格式
  fieldSize?: number;   // 视场大小（度），默认 5
}

export interface HistoryRecord {
  id: string;
  ra: string;
  dec: string;
  mixRatio: number;
  timestamp: number;
}
```

---

## 5. API 接口设计

### 5.1 GET /api/stars

**描述**：根据坐标查询视场内的恒星数据

**Query 参数**：
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|-----|------|------|--------|------|
| ra | number | 否 | 82.5 | 赤经（十进制度数，猎户座 5.5h × 15） |
| dec | number | 否 | 0 | 赤纬（十进制度数） |
| fieldSize | number | 否 | 5 | 视场边长（度） |

**响应格式**：
```json
{
  "stars": [
    {
      "id": "uuid-string",
      "name": "Betelgeuse",
      "ra": 88.7929,
      "dec": 7.4071,
      "brightness": {
        "visible": 85,
        "infrared": 95,
        "ultraviolet": 30,
        "xray": 15
      },
      "distance": 640
    }
  ]
}
```

---

## 6. 前端状态管理

App.tsx 作为顶层容器，维护以下核心 state：

| State | 类型 | 说明 |
|-------|------|------|
| ra | string | 当前赤经 HH:MM:SS |
| dec | string | 当前赤纬 DD:MM:SS |
| stars | StarData[] | 后端返回的恒星数据 |
| mixRatio | number | 混合比例 0-100 |
| hoveredStar | StarData \| null | 当前悬停的恒星 |
| fullscreenBand | Band \| null | 全屏显示的波段 |
| isMobilePanelOpen | boolean | 移动端控制面板是否展开 |
| history | HistoryRecord[] | 最近 5 条历史记录 |

---

## 7. Canvas 渲染与性能策略

### 7.1 StarChart 渲染流程

1. **接收 props**：stars、band、mixRatio
2. **坐标映射**：将 RA/Dec → 像素坐标（使用 utils/coordinates.ts）
3. **双缓冲策略**：离屏 canvas 预渲染，完成后一次性拷贝到显示 canvas
4. **恒星绘制**：
   - 根据 band 获取亮度值
   - 亮度 → 半径映射：`r = 3 + (brightness / 100) * 9`
   - 使用径向渐变（中心亮 → 边缘透）模拟发光效果
5. **缩放平移**：维护 transform（translateX, translateY, scale），wheel 事件缩放，drag 事件平移

### 7.2 混合模式实现

- 四张星图分别渲染到各自的离屏 canvas
- 混合 canvas 使用 `globalAlpha` 依次绘制四个离屏 canvas
- 混合权重根据 mixRatio 分配：
  - mixRatio = 0：全可见光
  - mixRatio = 33：可见光+红外+紫外
  - mixRatio = 66：四波段平均
  - mixRatio = 100：全 X 射线
- 使用 `requestAnimationFrame` 节流，确保滑块拖动流畅

### 7.3 恒星拾取（Hover 检测）

- 维护一个按像素坐标排序的恒星空间索引
- mousemove 事件中进行四叉树/网格查询，快速找到命中恒星
- 命中检测半径设为恒星绘制半径 + 4px（扩大热区）

---

## 8. 星空粒子背景动画

- `StarFieldBackground` 组件：200 个粒子
- 粒子属性：{ x, y, size, opacity, speedX, speedY }
- 使用单一 canvas + requestAnimationFrame 渲染
- 粒子超出边界后从对侧重新进入（环形循环）

---

## 9. 响应式策略

- 断点：768px
- **桌面端（≥ 768px）**：
  - 布局：左侧主体（星图网格） + 右侧固定控制面板（280px）
  - 星图：CSS Grid `grid-template-columns: repeat(2, 1fr)`
- **移动端（< 768px）**：
  - 布局：垂直堆叠
  - 星图：单列 `grid-template-columns: 1fr`
  - 控制面板：折叠为底部抽屉，点击展开（高度 200px，动画 0.3s ease-out）

---

## 10. localStorage 历史记录管理

- key: `starMap_history`
- 保存时机：成功获取恒星数据后
- 去重逻辑：相同 RA/Dec 不重复保存（比较十进制度数，误差 < 0.01°）
- 数量限制：超过 5 条时丢弃最早的

---

## 11. 启动方式

```bash
# 安装依赖
npm install

# 同时启动前端 (Vite 5173) 和后端 (Express 3001)
npm run dev
```

使用 `concurrently` 同时启动前后端。
