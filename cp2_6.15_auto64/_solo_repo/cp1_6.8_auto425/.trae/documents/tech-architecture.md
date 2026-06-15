## 1. 架构设计

```mermaid
flowchart TD
    subgraph "前端层"
        "index.html" --> "Canvas画布"
        "index.html" --> "HUD叠加层"
        "src/game.js" --> "游戏主循环(requestAnimationFrame)"
        "src/game.js" --> "状态管理(菜单/游戏/暂停/过关)"
        "src/player.js" --> "魔法师移动逻辑"
        "src/player.js" --> "踩踏检测与触发"
        "src/level.js" --> "关卡数据配置"
        "src/level.js" --> "地图生成与方块管理"
        "src/effects.js" --> "像素粒子系统"
        "src/effects.js" --> "光晕扩散动画"
        "src/effects.js" --> "Web Audio API音效"
    end
```

## 2. 技术说明

- **前端**：纯JavaScript + Canvas API，无第三方框架
- **构建工具**：Vite（仅用于开发构建，非运行时依赖）
- **音频**：Web Audio API 生成音效（正弦波/方波合成）
- **渲染**：Canvas 2D上下文，requestAnimationFrame 60fps
- **初始化工具**：npm init + 手动配置

## 3. 文件结构

| 文件路径 | 职责 |
|----------|------|
| index.html | 入口文件，包含Canvas元素和HUD叠加UI |
| src/game.js | 游戏主循环、状态机、输入处理、渲染调度 |
| src/player.js | 魔法师角色：网格移动、踩踏检测、状态管理 |
| src/level.js | 关卡数据定义、地图生成、方块激活逻辑 |
| src/effects.js | 粒子系统、光晕动画、音效生成 |
| package.json | 项目配置，vite开发依赖 |
| vite.config.js | Vite构建配置，入口为index.html |

## 4. 游戏状态机

```mermaid
stateDiagram-v2
    [*] --> "菜单"
    "菜单" --> "游戏中" : 开始游戏
    "游戏中" --> "暂停" : 按ESC/暂停按钮
    "暂停" --> "游戏中" : 继续游戏
    "暂停" --> "菜单" : 返回菜单
    "游戏中" --> "过关" : 全部方块激活+进入传送门
    "过关" --> "游戏中" : 下一关
    "游戏中" --> "游戏中" : R键重开
```

## 5. 关卡数据结构

```javascript
{
  id: 1,
  name: "觉醒之庭",
  width: 10,
  height: 8,
  playerStart: { x: 1, y: 1 },
  portalPos: { x: 8, y: 6 },
  sequence: ['fire', 'water', 'earth', 'wind'],
  blocks: [
    { x: 3, y: 2, element: 'fire' },
    { x: 5, y: 4, element: 'water' },
    { x: 2, y: 5, element: 'earth' },
    { x: 7, y: 3, element: 'wind' }
  ],
  walls: [[4,0],[4,1],[4,2],[6,4],[6,5]],
  starThresholds: { time: 30, steps: 20, perfect: true }
}
```

## 6. 核心交互流程

1. **移动**：WASD按键 → 平滑插值移动到目标格 → 碰撞检测（墙壁/边界）
2. **踩踏**：到达元素方块格 → 检查是否为当前序列下一个 → 正确则激活（高亮+音效+粒子） → 错误则重置序列
3. **过关**：所有方块激活 → 传送门出现闪烁光效 → 玩家移至传送门位置 → 过关动画 → 星级评价
4. **音效**：火(低频方波)、水(中频正弦波)、土(低频三角波)、风(高频正弦波+颤音)
