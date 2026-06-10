## 1. 架构设计

```mermaid
graph TB
    "index.html 入口页面" --> "main.ts 初始化"
    "main.ts 初始化" --> "EcoBottleManager 瓶体管理"
    "main.ts 初始化" --> "DragDropPanel 拖拽面板"
    "main.ts 初始化" --> "EcoIndicatorChart 指标图表"
    "EcoBottleManager 瓶体管理" --> "EcoElementFactory 元素工厂"
    "EcoElementFactory 元素工厂" --> "树木组"
    "EcoElementFactory 元素工厂" --> "石头组"
    "EcoElementFactory 元素工厂" --> "水源组"
    "EcoElementFactory 元素工厂" --> "小型动物组"
    "EcoElementFactory 元素工厂" --> "大型动物组"
    "EcoElementFactory 元素工厂" --> "天气粒子组"
    "DragDropPanel 拖拽面板" --> "EcoBottleManager 瓶体管理"
    "EcoBottleManager 瓶体管理" --> "EcoIndicatorChart 指标图表"
```

## 2. 技术说明

- 前端框架：TypeScript + Three.js（纯原生，不使用React/Vue）
- 构建工具：Vite + HMR
- 三维渲染：Three.js（含OrbitControls）
- 图表绘制：Canvas 2D API
- 包管理：npm
- 目标浏览器：现代浏览器（Chrome、Firefox、Edge）

## 3. 文件结构

| 文件路径 | 职责 |
|----------|------|
| `package.json` | 依赖管理：three、typescript、vite、@types/three |
| `vite.config.js` | Vite构建配置，HMR，别名@/指向src/ |
| `tsconfig.json` | TypeScript严格模式，target ES2020 |
| `index.html` | 入口页面，深色墨绿背景，标题"生态瓶微缩世界" |
| `src/main.ts` | 初始化场景、相机、渲染器、OrbitControls，启动动画循环 |
| `src/EcoBottleManager.ts` | 核心管理器：瓶体网格、底座、元素列表、生态指标、天气粒子 |
| `src/DragDropPanel.ts` | 左侧抽屉工具栏：DOM事件、拖拽逻辑、图标生成、坐标计算 |
| `src/EcoElementFactory.ts` | 工厂类：按类型生成Three.js组对象、几何体、材质、动画 |
| `src/EcoIndicatorChart.ts` | Canvas 2D折线图：实时数据更新、三色曲线绘制 |

## 4. 核心数据模型

### 4.1 元素类型定义

```typescript
type EcoElementType = 'tree' | 'rock' | 'water' | 'smallAnimal' | 'largeAnimal' | 'weather';

interface EcoElement {
  type: EcoElementType;
  position: THREE.Vector3;
  group: THREE.Group;
  id: string;
}

interface EcoIndicators {
  humidity: number;
  temperature: number;
  biodiversity: number;
}
```

### 4.2 生态指标计算规则

| 元素类型 | 湿度影响 | 温度影响 | 生物多样性影响 |
|----------|----------|----------|----------------|
| 树木 | +5 | -2 | +8 |
| 石头 | 0 | +1 | +1 |
| 水源 | +15 | -3 | +5 |
| 小型动物 | 0 | +1 | +10 |
| 大型动物 | 0 | +2 | +12 |
| 天气粒子 | +10 | -5 | +3 |

## 5. 关键技术方案

### 5.1 瓶体渲染
- 使用 `THREE.SphereGeometry` + `THREE.MeshPhysicalMaterial`（transmission、roughness、thickness参数）实现半透明玻璃质感
- 底座使用 `THREE.TorusGeometry` + `THREE.CylinderGeometry`
- 底座上使用 `THREE.CanvasTexture` 渲染指标数值文字

### 5.2 拖拽系统
- DOM层拖拽：mousedown/mousemove/mouseup事件
- 拖拽时图标半透明跟随鼠标
- 射线投射（Raycaster）计算放置位置
- 放置位置显示预览圆圈（`THREE.RingGeometry`）

### 5.3 树木系统
- 树干：`THREE.CylinderGeometry`，1秒内scale从0到1动画
- 枝杈：3-4个 `THREE.CylinderGeometry` 随机角度
- 树叶粒子：`THREE.Points` + `THREE.PointsMaterial`，闪烁效果
- 根须：3条 `THREE.Line` 向水源方向贝塞尔曲线路径

### 5.4 动物系统
- 小型动物：`THREE.Points` 发光圆点，随机路径游走
- 大型动物：`THREE.Mesh`（`THREE.SphereGeometry`拉伸椭圆体），沿瓶边界巡行
- 碰撞检测：与石头/水源的距离判断

### 5.5 天气粒子系统
- 统一 `THREE.Points` 管理，根据云朵数量切换模式
- 雨：垂直下落蓝色半透明粒子
- 闪电：每2秒生成折线光柱 + `THREE.PointLight` 爆闪
- 雪：白色六边形粒子缓慢旋转飘落

### 5.6 光照系统
- 主方向光跟随鼠标位置计算方向
- 环境光提供基础照明
- 底座区域微弱点光源

### 5.7 生态指标图表
- 独立Canvas 2D绘制
- 三条折线：湿度（蓝）、温度（橙）、生物多样性（绿）
- X轴时间标签，Y轴数值
- 数据点每秒采样，保留最近60秒数据
- 平滑贝塞尔曲线连接

## 6. 性能优化策略

- 粒子池化：所有粒子预分配，复用不销毁
- 视锥剔除：Three.js内置frustum culling
- 元素LOD：远距离元素简化几何体
- 粒子上限：硬限制2000个，超出时回收最旧粒子
- 天气粒子按需激活/停用
