## 1. 架构设计

```mermaid
graph TD
    A["入口层 (main.ts)"] --> B["场景管理"]
    A --> C["状态管理"]
    A --> D["动画循环"]
    B --> E["输入控制 (WASD/鼠标)
    B --> F["渲染器 (Three.js)"]
    C --> G["迷宫生成器 (labyrinth.ts)"]
    G --> H["记忆房间 (memoryRoom.ts)"]
    H --> I["粒子墙壁系统"]
    H --> J["3D文本动画"]
    H --> K["交互逻辑"]
    D --> L["粒子更新 (布朗运动/凸起效果"]
    D --> M["碰撞检测"]
    D --> N["截图系统"]
```

## 2. 技术描述

- **前端框架**：TypeScript + Three.js + Vite
- **构建工具**：Vite (支持HMR)
- **状态管理**：内置简单状态机管理记忆播放状态
- **3D引擎**：Three.js r160+
- **数据来源**：内置模拟记忆数据（6-8条）

## 3. 项目结构

| 文件路径 | 用途 |
|----------|------|
| `package.json` | 项目依赖和脚本 |
| `vite.config.js` | Vite构建配置 |
| `tsconfig.json` | TypeScript配置 |
| `index.html` | 入口页面 |
| `src/main.ts` | 应用入口，场景初始化，动画循环 |
| `src/labyrinth.ts` | 迷宫生成算法 |
| `src/memoryRoom.ts` | 记忆房间类 |

## 4. 数据模型

### 4.1 记忆条目类型

```typescript
type EmotionType = 'happy' | 'sad' | 'angry' | 'calm' | 'anxious';

interface MemoryEntry {
  id: string;
  title: string;
  date: string;
  emotion: EmotionType;
  description: string;
  weather: string;
  people: string[];
  mood: string;
}
```

### 4.2 迷宫数据结构

```typescript
interface Room {
  id: string;
  x: number;
  z: number;
  memory: MemoryEntry;
  connections: string[];
}

interface Corridor {
  from: string;
  to: string;
  corners: { x: number; z: number }[];
}

interface LabyrinthData {
  rooms: Map<string, Room>;
  corridors: Corridor[];
}
```

### 4.3 情绪色彩配置

```typescript
const EMOTION_COLORS: Record<EmotionType, { h: number; s: number; l: number }> = {
  happy:   { h: 45,  s: 60, l: 85 }, // 暖黄
  sad:     { h: 200, s: 60, l: 85 }, // 冰蓝
  angry:   { h: 0,   s: 60, l: 85 }, // 猩红
  calm:    { h: 160, s: 60, l: 85 }, // 薄荷
  anxious: { h: 270, s: 40, l: 75 }, // 紫灰
};
```

## 5. 核心算法

### 5.1 迷宫生成算法
- 采用递归回溯法生成迷宫
- 确保6-8个房间全部连通
- 每个房间4x4单位，走廊宽度2单位
- 无死胡同设计

### 5.2 粒子系统优化
- 使用BufferGeometry批量渲染所有粒子
- 每面墙3000-5000粒子
- 总粒子数控制在4万以内
- GPU instancing优化性能

### 5.3 碰撞检测
- 基于AABB碰撞检测
- 相机与墙壁的距离检测
- 房间入口触发检测

## 6. 性能优化策略

1. **粒子优化**：使用BufferGeometry + PointsMaterial
2. **视锥剔除**：Three.js内置视锥剔除
3. **帧率控制**：requestAnimationFrame + deltaTime
4. **内存管理**：及时dispose不再使用的几何体和材质
5. **LOD策略**：远距离粒子降低更新频率
