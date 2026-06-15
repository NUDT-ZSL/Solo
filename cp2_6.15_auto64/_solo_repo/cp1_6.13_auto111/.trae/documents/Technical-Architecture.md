# AeroScope - 技术架构文档

## 1. 技术栈选型

### 1.1 前端技术栈
| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.x | UI组件框架 |
| TypeScript | 5.x | 类型安全 |
| Vite | 5.x | 构建工具与开发服务器 |
| Three.js | 0.160+ | 3D场景渲染引擎 |
| @react-three/fiber | 8.x | React-Three.js桥接 |
| @react-three/drei | 9.x | Three.js辅助组件库 |
| D3.js | 7.x | 数据可视化工具 |
| Chart.js | 4.x | 2D图表绘制 |
| react-chartjs-2 | 5.x | Chart.js React封装 |
| Axios | 1.x | HTTP请求库 |

### 1.2 后端技术栈
| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | 18+ | 运行环境 |
| Express | 4.x | Web框架 |
| nedb-promises | 6.x | 嵌入式文档数据库 |
| uuid | 9.x | 唯一ID生成 |

---

## 2. 项目文件结构

```
AeroScope/
├── package.json              # 项目依赖与脚本配置
├── vite.config.js            # Vite构建配置
├── tsconfig.json             # TypeScript配置
├── index.html                # HTML入口
├── backend/
│   └── server.ts             # Express后端服务
└── src/
    ├── config.ts             # 全局配置（污染物枚举、颜色、站点数据）
    ├── apiService.ts         # API数据请求模块
    ├── threeMap.ts           # Three.js 3D场景核心
    ├── chartModule.ts        # Chart.js图表模块
    ├── uiPanel.tsx           # React UI控制面板
    ├── App.tsx               # React应用根组件
    └── main.tsx              # React应用入口
```

---

## 3. 模块职责与调用关系

### 3.1 src/config.ts - 全局配置模块
- **职责**：定义污染物类型枚举、颜色映射表、初始站点数据、地图范围参数
- **被依赖**：所有其他模块
- **核心导出**：
  - `PollutantType` 枚举
  - `POLLUTANT_COLORS` 颜色映射
  - `INITIAL_STATIONS` 站点初始数据
  - `MAP_CONFIG` 地图参数

### 3.2 backend/server.ts - Express后端
- **职责**：提供REST API接口，使用nedb存储模拟数据
- **API端点**：
  - `GET /api/stations` - 返回所有站点基础信息和当前浓度
  - `GET /api/timeseries?stationId=X` - 返回指定站点24小时各污染物数据
  - `GET /api/weather?stationId=X` - 返回指定站点气象数据（风向、风速）
- **数据初始化**：启动时自动生成随机模拟数据存入nedb

### 3.3 src/apiService.ts - 数据请求模块
- **职责**：封装axios请求，向后端获取数据
- **依赖**：axios
- **被依赖**：threeMap.ts, chartModule.ts, uiPanel.tsx
- **核心方法**：
  - `fetchStations(hour: number)` - 获取指定小时所有站点数据
  - `fetchTimeSeries(stationId: string)` - 获取指定站点时间序列
  - `fetchWeather(stationId: string, hour: number)` - 获取指定站点气象数据

### 3.4 src/threeMap.ts - 3D场景核心
- **职责**：Three.js场景管理、站点柱子渲染、粒子风向系统、动画控制
- **依赖**：three, @react-three/fiber, @react-three/drei, config.ts, apiService.ts
- **被依赖**：App.tsx
- **核心功能**：
  - 网格地面渲染
  - 站点基座与浓度柱体渲染
  - 柱体高度/颜色平滑过渡动画
  - 500粒子风向飘移系统
  - OrbitControls视角操控
- **数据流**：apiService → 转换高度/颜色 → Three.js场景渲染

### 3.5 src/chartModule.ts - 图表渲染模块
- **职责**：封装Chart.js折线图配置与渲染
- **依赖**：chart.js, react-chartjs-2, config.ts, apiService.ts
- **被依赖**：uiPanel.tsx（详情弹窗）
- **核心功能**：
  - 24小时4污染物折线图配置
  - 根据Toggle状态动态显示/隐藏曲线
  - 数据点显示具体数值

### 3.6 src/uiPanel.tsx - React UI控制面板
- **职责**：侧边栏UI、站点列表、时间滑块、污染物筛选、详情弹窗
- **依赖**：React, config.ts, apiService.ts, chartModule.ts
- **被依赖**：App.tsx
- **状态管理**：
  - `currentHour` 当前小时
  - `selectedPollutants` 选中的污染物集合
  - `selectedStation` 当前选中的站点
  - `isPlaying` 自动播放状态
- **数据流**：用户交互 → 更新状态 → 通知threeMap.ts更新场景

---

## 4. 数据结构定义

### 4.1 站点数据 Station
```typescript
interface Station {
  id: string;
  name: string;
  x: number;      // 地图X坐标 (0-300)
  y: number;      // 地图Y坐标 (0-300)
  concentrations: {
    PM25: number;  // 0-300
    PM10: number;
    O3: number;
    NO2: number;
  };
}
```

### 4.2 时间序列数据 TimeSeriesPoint
```typescript
interface TimeSeriesPoint {
  hour: number;   // 0-23
  PM25: number;
  PM10: number;
  O3: number;
  NO2: number;
}
```

### 4.3 气象数据 WeatherData
```typescript
interface WeatherData {
  stationId: string;
  hour: number;
  windDirection: number;  // 0-360度
  windSpeed: number;      // m/s
}
```

---

## 5. 关键算法与映射关系

### 5.1 浓度到高度映射
```
高度 = (浓度值 / 300) × 50 单位
范围：浓度0→高度0，浓度300→高度50
```

### 5.2 浓度到颜色插值
- 低浓度(0)：#22c55e（浅绿）
- 高浓度(300)：#dc2626（深红）
- 使用RGB线性插值

### 5.3 综合指数计算
```
综合指数 = (PM25_norm + PM10_norm + O3_norm + NO2_norm) / 4
其中 各污染物_norm = min(浓度/300, 1)
```

### 5.4 粒子风向运动
```
粒子位置 += 风向单位向量 × 飘移速度(2单位/秒) × deltaTime
粒子超出边界时从对侧重新进入（循环边界）
```

---

## 6. 开发与构建

### 6.1 启动命令
```bash
npm run dev    # 启动前后端并发开发服务
```

### 6.2 开发服务器
- Vite前端：端口3000
- Express后端：通过Vite代理配置，端口可自定义

### 6.3 性能保障措施
1. Three.js使用BufferGeometry优化粒子渲染
2. 柱体动画使用requestAnimationFrame + 线性插值
3. Chart.js使用响应式配置避免不必要重绘
4. React使用memo/useMemo/useCallback优化渲染
5. API请求使用缓存策略避免重复请求
