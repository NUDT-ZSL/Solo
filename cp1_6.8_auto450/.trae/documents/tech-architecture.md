## 1. 架构设计
纯前端Canvas游戏，无后端服务。所有逻辑在浏览器端运行。

```mermaid
flowchart TD
    "index.html" --> "main.ts 入口初始化"
    "main.ts 入口初始化" --> "game.ts 游戏主循环"
    "game.ts 游戏主循环" --> "player.ts 玩家控制"
    "game.ts 游戏主循环" --> "environment.ts 环境渲染"
    "game.ts 游戏主循环" --> "ui.ts 界面渲染"
    "player.ts 玩家控制" --> "game.ts 状态更新"
    "environment.ts 环境渲染" --> "game.ts 状态更新"
    "ui.ts 界面渲染" --> "game.ts 状态更新"
```

## 2. 技术说明
- 前端：TypeScript + Canvas 2D API
- 构建工具：Vite
- 无框架依赖，纯Canvas渲染
- 目标帧率：60fps，使用requestAnimationFrame

## 3. 文件结构
| 文件 | 用途 |
|------|------|
| index.html | HTML入口，包含Canvas元素 |
| package.json | 项目依赖和脚本 |
| tsconfig.json | TypeScript配置 |
| vite.config.js | Vite构建配置 |
| src/main.ts | 入口和初始化，创建Canvas和游戏实例 |
| src/game.ts | 游戏主循环(requestAnimationFrame)、状态管理、关卡数据、碰撞检测 |
| src/player.ts | 玩家小球控制、移动逻辑、咒印激活逻辑、拖尾粒子 |
| src/environment.ts | 平台渲染、符文纹理、光桥/光门/光柱机关渲染与动画、背景渲染 |
| src/ui.ts | 咒印序列指示器、暂停/重置按钮、当前咒印徽章渲染 |

## 4. 核心数据结构

### 4.1 咒印类型
```typescript
type SealColor = 'red' | 'blue' | 'green' | 'gold';

interface Seal {
  color: SealColor;
  rgb: [number, number, number];
  mechanism: 'bridge_up' | 'bridge_down' | 'door_open' | 'teleport';
}
```

### 4.2 关卡数据
```typescript
interface Level {
  platforms: Platform[];
  mechanisms: Mechanism[];
  sequence: SealColor[];
  startPos: { x: number; y: number };
  endPos: { x: number; y: number };
}
```

### 4.3 游戏状态
```typescript
interface GameState {
  phase: 'playing' | 'paused' | 'complete';
  activatedSeals: SealColor[];
  currentSealIndex: number;
  activeSeal: SealColor | null;
}
```

## 5. 渲染层次（从底到顶）
1. **背景层**：渐变背景 + 星尘粒子
2. **平台层**：石板平台 + 符文纹理 + 边缘光晕
3. **机关层**：光桥、光门、光柱（含粒子效果）
4. **小球层**：发光球体 + 光晕 + 拖尾
5. **UI层**：咒印序列、按钮、徽章

## 6. 交互映射
| 操作 | 效果 |
|------|------|
| 方向键/AD | 小球左右移动 |
| 空格 | 激活当前选中咒印 |
| 1键 | 选择红色咒印 |
| 2键 | 选择蓝色咒印 |
| 3键 | 选择绿色咒印 |
| 4键 | 选择金色咒印 |
| 长按空格 | 小球发光变亮 + 环形光波扩散 |
| 鼠标点击暂停按钮 | 暂停/恢复游戏 |
| 鼠标点击重置按钮 | 重置当前关卡 |
