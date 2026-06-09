## 1. 架构设计

```mermaid
graph TD
    A["React 组件层 (App.tsx)"] --> B["UI/HUD 层<br/>进度条/计数器/按钮"]
    A --> C["游戏容器 (Canvas)"]
    C --> D["核心游戏循环 (game.ts)"]
    D --> E["输入处理<br/>键盘/鼠标"]
    D --> F["状态更新<br/>潮汐计时/石碑/能量链"]
    D --> G["渲染调度 (renderer.ts)"]
    G --> H["实体绘制<br/>潮水/石碑/符文/能量链"]
    G --> I["特效绘制<br/>粒子/波纹/传送门"]
    E --> J["实体层 (entities.ts)<br/>类型定义+碰撞检测"]
    F --> J
    J --> K["Web Audio API<br/>音效合成"]
```

## 2. 技术说明

- **前端框架**：React@18 + ReactDOM@18
- **开发语言**：TypeScript@5（严格模式 strict:true，ESNext目标）
- **构建工具**：Vite@5 + @vitejs/plugin-react，支持路径别名@/→src/与polyfill
- **渲染引擎**：Canvas 2D Context（游戏实体+流体特效）+ CSS 3D Transform（石碑透视）
- **音频**：原生 Web Audio API（OscillatorNode方波合成石头摩擦音）
- **无后端**：纯前端单页应用，状态全部内存管理

## 3. 路由定义
| 路由 | 用途 |
|------|------|
| / | 游戏主页面（单页应用，无其他路由） |

## 6. 数据模型

### 6.1 数据模型定义
```mermaid
classDiagram
    class GameState {
        +TidalLevel tidal
        +GlyphStone[3][3] stones
        +EnergyLink[] links
        +Particle[] particles
        +number energyCount
        +boolean portalOpen
        +number portalAnimTime
        +boolean resetFlash
        +AudioContext audioCtx
    }
    class TidalLevel {
        +number progress 0~1
        +string phase 'flood'|'ebb'
        +number elapsedMs
    }
    class GlyphStone {
        +number row
        +number col
        +number currentFace 0~3
        +Glyph[4] faces
        +boolean isFlipping
        +number flipProgress 0~1
        +boolean locked
    }
    class Glyph {
        +GlyphType type
        +string baseColor
    }
    class EnergyLink {
        +number row1 col1
        +number row2 col2
        +number pulsePhase
    }
    class Particle {
        +number x y
        +number vx vy
        +number life maxLife
        +number radius
        +string color
        +ParticleType type
    }
```

### 6.2 核心常量定义
- 潮汐周期：涨潮30000ms，退潮10000ms
- 可操作阈值：水位 < 0.5
- 石碑尺寸：120×160px，网格间距20px
- 翻转动画：800ms，easeInOutCubic缓动
- 能量链胜利阈值：6条
- 帧率目标：60FPS
- 粒子上限：100个
