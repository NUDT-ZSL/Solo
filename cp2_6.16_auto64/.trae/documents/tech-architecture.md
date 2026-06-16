## 1. 架构设计

```mermaid
graph TD
    subgraph "UI层 (React)"
        App["App.tsx<br/>全局状态管理"]
        Arena["Arena.tsx<br/>竞技场渲染"]
        HUD["HUD.tsx<br/>血蓝条/倒计时"]
        SpellPanel["SpellPanel.tsx<br/>法术选择"]
    end
    subgraph "逻辑层 (纯TypeScript)"
        Combat["combat.ts<br/>战斗模块"]
        GameLogic["gameLogic.ts<br/>核心逻辑"]
    end
    App --> "调用" --> Combat
    App --> "渲染" --> Arena
    App --> "渲染" --> HUD
    App --> "渲染" --> SpellPanel
    Combat --> "调用" --> GameLogic
    SpellPanel --> "用户操作" --> App
    App --> "战斗状态" --> Arena
    App --> "状态数据" --> HUD
```

数据流：用户操作 → SpellPanel通知App → App调用combat.ts → combat.ts调用gameLogic.ts计算 → 返回战斗状态 → App更新状态 → 子组件重新渲染

## 2. 技术说明

- **前端框架**：React@18 + TypeScript（严格模式） + Vite
- **构建工具**：Vite + @vitejs/plugin-react
- **动画方案**：CSS动画（过渡/关键帧）+ Canvas（粒子/光束/爆炸）+ requestAnimationFrame
- **状态管理**：React useState/useReducer，无外部状态库
- **样式方案**：CSS Modules + CSS变量（主题色）
- **无后端**：纯前端对战，双人同屏轮流操作

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 竞技场对战主页面（唯一页面） |

## 4. 模块职责

### 4.1 gameLogic.ts — 游戏核心逻辑

纯函数模块，不依赖DOM或React API：
- `CharacterState`：角色状态类型（HP、MP、颜色、位置）
- `calculateDamage(baseDamage, isCountered)`：伤害计算
- `checkElementAdvantage(attack, defend)`：元素克制判定
- `createCharacter(name, color)`：创建角色
- `checkVictory(characters)`：胜负判定
- `advanceTurn(state)`：回合流程控制

### 4.2 combat.ts — 战斗模块

调用gameLogic.ts，输出战斗状态给UI层：
- `SpellDefinition`：法术定义类型（名称、元素组合、耗蓝、冷却、基础伤害范围、颜色）
- `COMBO_SPELLS`：7种复合法术规则表
- `ELEMENT_ADVANTAGE`：元素克制关系表
- `CombatState`：战斗状态类型（角色、当前回合、冷却计时器、动画阶段）
- `selectElements(elements)`：选择元素并匹配可用法术
- `castSpell(state, spellId, casterIndex)`：施放法术（含冷却检查、蓝量检查、伤害结算）
- `updateCooldowns(state)`：更新冷却计时
- `getAvailableSpells(state, playerIndex)`：获取当前可用法术列表

### 4.3 Arena.tsx — 竞技场场景组件

接收战斗状态数据渲染视觉效果：
- 角色模型（身体圆球+头部光晕）
- 椭圆平台+边缘发光
- 浮动能量粒子（20个，Canvas渲染）
- 法术光束飞行动画
- 命中爆炸粒子效果（≥15粒子）
- 元素图标浮现动画
- 平台震动效果
- 被击红色闪烁
- 胜利旋转+金色光环

### 4.4 HUD.tsx — HUD组件

独立于竞技场逻辑，通过props获取状态：
- 血条（渐变#ff4444→#cc0000，180×16px圆角8px，0.3秒过渡动画）
- 蓝条（渐变#4488ff→#0044cc，180×16px圆角8px，0.3秒过渡动画）
- 回合数显示
- 圆形倒计时进度条（直径40px，15秒，5秒闪红）

### 4.5 SpellPanel.tsx — 法术选择面板

响应用户点击返回选中法术：
- 4元素按钮（直径50px，选中边框+放大1.1倍）
- 已选元素小圆框（直径30px）
- 复合法术列表卡片（200×60px，左边框主题色）
- 施法按钮（140×48px，#ff6b6b，悬浮缩放1.08+阴影）
- 冷却中法术灰显

### 4.6 App.tsx — 主应用组件

集成三组件，管理全局状态：
- 游戏状态（combat state）
- 动画状态（当前播放的动画阶段）
- 回合计时器
- 用户操作→调用combat→更新状态→重新渲染

## 5. 法术组合规则

| 法术名称 | 元素组合 | 耗蓝 | 冷却回合 | 基础伤害 | 法术颜色 |
|---------|---------|------|---------|---------|---------|
| 烈焰弹 | 火+火 | 10 | 1 | 15-18 | #ff6b35 |
| 冰霜箭 | 冰+冰 | 10 | 1 | 15-18 | #00d4ff |
| 雷电击 | 雷+雷 | 10 | 1 | 15-18 | #ffee00 |
| 狂风刃 | 风+风 | 10 | 1 | 15-18 | #44ff44 |
| 火焰风暴 | 火+风 | 20 | 2 | 18-22 | #ff8844 |
| 冰霜雷击 | 冰+雷 | 25 | 2 | 20-24 | #44eeff |
| 雷火风暴 | 雷+火 | 30 | 2 | 22-25 | #ffaa22 |
| 风冰漩涡 | 风+冰 | 25 | 2 | 20-24 | #22ffcc |
| 火雷爆裂 | 火+雷 | 35 | 3 | 23-25 | #ff4400 |
| 冰风寒潮 | 冰+风 | 20 | 2 | 18-22 | #66ffdd |

> 注：用户要求7种复合法术，上表列出10种供选择，实现时取7种（去掉3种双同元素法术或合并，最终保留7种差异化法术）。

## 6. 文件结构

```
├── package.json
├── index.html
├── vite.config.ts
├── tsconfig.json
└── src/
    ├── gameLogic.ts
    ├── combat.ts
    ├── components/
    │   ├── Arena.tsx
    │   ├── HUD.tsx
    │   └── SpellPanel.tsx
    └── App.tsx
```
