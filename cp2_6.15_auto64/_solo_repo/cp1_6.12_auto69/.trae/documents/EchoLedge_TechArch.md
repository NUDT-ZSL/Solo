## 1. 架构设计

```mermaid
flowchart LR
    subgraph "表现层"
        A["index.html"] --> B["main.ts"]
    end
    
    subgraph "场景层 (Phaser.Scene)"
        B --> C["PreloadScene.ts"]
        C --> D["GameScene.ts"]
    end
    
    subgraph "实体层"
        D --> E["PlayerEntity.ts"]
    end
    
    subgraph "工具层"
        D --> F["EchoWaveUtils.ts"]
    end
    
    subgraph "配置层"
        G["package.json"]
        H["tsconfig.json"]
        I["vite.config.js"]
    end
```

### 数据流与调用关系

```mermaid
sequenceDiagram
    participant M as main.ts
    participant P as PreloadScene.ts
    participant G as GameScene.ts
    participant PE as PlayerEntity.ts
    participant EW as EchoWaveUtils.ts
    
    M->>M: 初始化 Phaser.Game 实例
    M->>P: 启动 PreloadScene
    P->>P: 加载精灵图、音效、背景音乐
    P->>G: 资源加载完成，切换到 GameScene
    G->>G: 初始化物理世界、生成随机关卡
    G->>PE: 创建 PlayerEntity 实例
    G->>G: 启动游戏循环
    
    loop 游戏主循环
        G->>PE: 更新玩家输入与位置
        PE-->>G: 返回玩家状态 (位置、跳跃次数、朝向)
        
        alt 空格键按下 & 冷却完毕
            G->>EW: 调用 calculateWavePath()
            EW-->>G: 返回声波路径与探测到的平台
            G->>G: 显现隐藏平台、播放声波动画
        end
        
        alt 玩家触碰敌人/子弹
            G->>PE: 调用 hit() 减少生命
            PE-->>G: 返回剩余生命
        end
        
        alt 玩家踩踏敌人
            G->>G: 敌人收缩消失、掉落回复道具
        end
        
        alt 玩家拾取宝石
            G->>G: 宝石计数+1、播放音效
        end
        
        alt 玩家到达传送门
            G->>G: 计算星级、进入下一关
        end
    end
```

---

## 2. 技术描述

### 2.1 核心技术栈

| 层级 | 技术选型 | 版本 | 用途 |
|------|----------|------|------|
| 游戏引擎 | Phaser 3 | ^3.80.0 | 2D游戏框架，提供物理引擎、场景管理、动画系统 |
| 开发语言 | TypeScript | ^5.4.0 | 类型安全的JavaScript超集 |
| 构建工具 | Vite | ^5.2.0 | 快速开发服务器与构建工具 |
| 类型定义 | @types/phaser | ^3.80.0 | Phaser的TypeScript类型声明 |

### 2.2 构建与运行

- **初始化命令**：`npm install`
- **开发启动**：`npm run dev` (Vite开发服务器)
- **生产构建**：`npm run build` (输出到 dist 目录)
- **预览构建**：`npm run preview`

### 2.3 目录结构

```
EchoLedge/
├── index.html                    # 入口HTML，全屏渲染容器
├── package.json                  # 项目依赖与脚本
├── tsconfig.json                 # TypeScript配置 (严格模式)
├── vite.config.js                # Vite构建配置
├── public/                       # 静态资源目录
│   ├── assets/
│   │   ├── sprites/              # 精灵图集 (1024x1024)
│   │   ├── audio/                # 音效与背景音乐
│   │   └── textures/             # 背景纹理
└── src/
    ├── main.ts                   # 应用入口，Phaser初始化
    ├── scenes/
    │   ├── PreloadScene.ts       # 资源预加载场景
    │   └── GameScene.ts          # 游戏主场景
    ├── entities/
    │   └── PlayerEntity.ts       # 玩家实体类
    └── utils/
        └── EchoWaveUtils.ts      # 声波计算工具
```

---

## 3. 核心模块设计

### 3.1 声波工具模块 (EchoWaveUtils.ts)

**核心职责**：计算声波发射方向、反弹路径、碰撞检测

```typescript
interface WavePoint {
    x: number;
    y: number;
    angle: number;  // 入射/反射角度
}

interface EchoResult {
    path: WavePoint