## 1. 架构设计

```mermaid
flowchart LR
    A["App.tsx (React主组件) --> B["GameEngine.ts (核心逻辑)"]
    A --> C["UIRenderer.ts (Canvas渲染)"]
    B --> D["网格双缓冲数组"]
    B --> E["回合/胜负判定"]
    B --> F["孢子生长/对抗/毒素算法"]
    C --> G["网格/孢子/毒素绘制"]
    C --> H["动画特效绘制"]
    C --> I["折线图绘制"]
    A --> J["DOM UI"]
    J --> K["信息面板"]
    J --> L["颜色选择器"]
    J --> M["操作提示"]
```

## 2. 技术描述
- **前端框架**：React@18 + TypeScript@5 + Vite@5
- **渲染技术**：Canvas 2D API（requestAnimationFrame驱动）
- **初始化工具**：Vite脚手架
- **状态管理**：React useState/useRef（组件状态），GameEngine内部状态
- **后端**：无，纯前端游戏
- **性能优化**：双缓冲网格、每帧最多处理2000格子限制

## 3. 路由定义
| 路由 | 用途 |
|------|------|
| / | 游戏主页面 |

## 4. 数据模型

### 4.1 核心类型定义

```typescript
enum SporeColor { RED, BLUE, GREEN, PURPLE, ORANGE, NONE }

interface Cell {
  color: SporeColor;
  vitality: number;      // 活力值 0-150
  nutrient: number;  // 养分值 0-100
  toxin: number;       // 毒素值 0-100
  glowTimer: number; // 橙色光晕剩余时间
}

interface GameState {
  grid: Cell[][];     // 渲染缓冲
  round: number;           // 当前回合数
  frameInRound: number;  // 当前回合内帧数
  opPoints: number;      // 玩家操作点数
  selectedColor: SporeColor;
  areaHistory: Map<SporeColor, number[]>; // 面积历史
  status: 'playing' | 'win' | 'draw';
  winner: SporeColor;
}

interface SporeConfig {
  initialVitality: number;
  nutrientConsumptionRate: number;  // 每帧养分消耗百分比
  spreadBaseProbability: number;  // 基础扩散概率
  toxinResistance: number;      // 毒素抗性百分比加成
  specialAbility: string;     // 特殊能力标识
}
```

### 4.2 五种孢子配置

| 颜色 | 初始活力 | 养分消耗率 | 扩散概率 | 毒素抗性 | 特殊能力 |
|------|-----------|------------|----------|----------|----------|
| RED | 150 | 0.8%/帧 | 0.3 | 0% | 快速扩张型 |
| BLUE | 80 | 0.3%/帧 | 0.2 | +20% | 持久生存型 |
| GREEN | 60 | 0.5%/帧 | 0.1 | 0% | 每帧清除周围1格2%毒素，解毒光环 |
| PURPLE | 120 | 0.6%/帧 | 0.2 | 0% | 对抗时对方活力-30% |
| ORANGE | 100 | 0.5%/帧 | 0.2 | 0% | 扩散后目标格3秒光晕，邻格养分+2%/帧 |

## 5. 核心算法

### 5.1 扩散概率公式
```
扩散概率 = 基础扩散概率 × (当前活力/100) × (邻格养分/100)
```

### 5.2 对抗判定
当扩散目标格已有其他颜色时：
- 若为紫色：对方活力 × 0.7
- 比较双方当前活力值
- 高者占领，低者消失，被占领格闪烁白光

### 5.3 毒素系统
- 毒素每帧向6邻格传染0.5%
- 非蓝色孢子每帧活力 - 0.5 × (1 - 毒素抗性)
- 绿色孢子每帧清除周围1格2%毒素，触发1秒绿色光环

### 5.4 回合机制
- 每200帧为一大回合
- 计算各颜色面积排名
- 排名末位：随机失去10%领地（格子变空白）
- 操作点数奖励 = 面积排名 × 0.5
- 胜利条件：单一颜色≥240格（60%）
- 平局条件：所有颜色<40格（10%）

## 6. 性能优化策略

### 6.1 双缓冲网格
- 维护两份网格数据：gridRead（当前帧读取）、gridWrite（下一帧写入）
- 每帧结束交换读写指针

### 6.2 计算量限制
- 每帧最多处理2000个格子的扩散/对抗逻辑
- 采用格子采样/轮询调度，确保帧率≥50Hz

### 6.3 渲染优化
- 只重绘变化区域（脏矩形）
- 动画特效对象池复用

## 7. 动画特效
- 放置涟漪：圆形从中心扩散，0→20px，透明度1→0，0.6秒
- 对抗闪烁：被吞噬1帧红色高亮rgba(255,0,0,0.8)
- 毒素扩散：暗紫色multiply混合撕裂动画
- 胜利粒子：获胜孢子向上飘散5秒
- 解毒光环：绿色1秒光环
- 橙色光晕：3秒橙色光晕，邻格养分恢复+2%
