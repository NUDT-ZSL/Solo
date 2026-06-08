## 1. 架构设计

```mermaid
flowchart TD
    "index.html 入口" --> "main.ts 游戏启动"
    "main.ts 游戏启动" --> "Phaser.Game 实例"
    "Phaser.Game 实例" --> "MenuScene 菜单场景"
    "Phaser.Game 实例" --> "GameScene 游戏场景"
    "GameScene 游戏场景" --> "Player 主角类"
    "GameScene 游戏场景" --> "Island 岛屿类"
    "GameScene 游戏场景" --> "对象池: 敌人/星星"
```

## 2. 技术说明

- 前端框架: Phaser 3.80+（游戏引擎）
- 语言: TypeScript（strict 模式）
- 构建工具: Vite 5+
- 无后端、无数据库
- 运行: `npm install && npm run dev`

## 3. 路由定义

| 场景 Key | 用途 |
|---------|------|
| MenuScene | 菜单场景，动态云朵背景，开始按钮 |
| GameScene | 主游戏场景，岛屿跳跃探险 |

## 4. 文件结构

```
├── index.html              # 入口HTML
├── main.ts                 # 游戏启动入口
├── package.json            # 依赖和脚本
├── vite.config.js          # Vite配置
├── tsconfig.json           # TypeScript配置
├── scene/
│   ├── MenuScene.ts        # 菜单场景
│   └── GameScene.ts        # 游戏场景
└── objects/
    ├── Player.ts           # 主角类
    └── Island.ts           # 岛屿类
```

## 5. 核心技术方案

### 5.1 游戏物理
- 使用 Phaser 内置 Arcade 物理引擎
- 重力值: 800
- 主角跳跃速度: -500
- 主角移动速度: 250

### 5.2 岛屿生成算法
- 从左到右依次生成岛屿
- 每个岛屿的水平间距 = 上一个岛屿宽度 * 0.8 + 随机偏移（确保可跳跃到达）
- 垂直位置在屏幕中间区域随机浮动
- 岛屿宽度: 80~200px 随机
- 岛屿高度: 固定 24px

### 5.3 对象池
- 敌人池: 预创建5个敌人，启用/禁用而非销毁/创建
- 星星池: 预创建10个星星，同样启用/禁用管理

### 5.4 碰撞检测
- 主角 vs 岛屿: 上方碰撞（落地）
- 主角 vs 星星: 重叠检测（收集）
- 主角 vs 敌人: 重叠检测（受伤）

### 5.5 移动端适配
- Phaser Scale Manager: FIT 模式自动缩放
- 虚拟按钮: 左下方向键 + 右下跳跃键
- 触摸事件映射到游戏输入

### 5.6 粒子特效
- 星星收集: 使用 Phaser 粒子发射器，黄色闪光粒子
- 得分文字: +10 文字向上飘出并淡出
