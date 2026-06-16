## 1. 架构设计

```mermaid
graph TD
    subgraph "前端层"
        A["React + TypeScript + Vite"] --> B["UI组件层"]
        B --> B1["Battlefield.tsx 战斗场地"]
        B --> B2["DiceRoller.tsx 骰子投掷"]
        B --> B3["CombatLog.tsx 战斗日志"]
        A --> C["业务逻辑层"]
        C --> C1["gameLogic.ts 游戏核心逻辑"]
        A --> D["状态管理层"]
        D --> D1["React useState 本地状态"]
    end
    
    subgraph "后端层"
        E["Express + TypeScript"] --> F["API接口层"]
        F --> F1["GET /api/characters 角色数据"]
        F --> F2["POST /api/battle/records 战斗记录存储"]
        F --> F3["GET /api/battle/records 战斗记录查询"]
    end
    
    subgraph "数据层"
        G["内存存储（模拟）"] --> G1["角色数据"]
        G --> G2["战斗记录"]
    end
    
    C1 --> F
    F --> G
```

## 2. 技术描述

- **前端**：React@18 + TypeScript + Vite@5
- **初始化工具**：Vite
- **后端**：Express@4 + TypeScript
- **状态管理**：React useState（本地组件状态）
- **数据存储**：内存模拟（无需数据库）
- **代码规范**：strict模式，target ES2020

## 3. 路由定义

| 路由 | 用途 |
|-------|---------|
| / | 主应用页面，包含队伍选择和战斗界面 |

## 4. API 定义

### 类型定义
```typescript
interface Character {
  id: string;
  name: string;
  maxHp: number;
  currentHp: number;
  attack: number;
  skillName: string;
  skillPower: number;
  avatar?: string;
}

interface DiceResult {
  dice: number[];
  total: number;
}

interface CombatLogEntry {
  id: string;
  timestamp: number;
  attacker: string;
  target: string;
  skillName: string;
  diceResult: DiceResult;
  damage: number;
  message: string;
}

interface BattleRecord {
  id: string;
  startTime: number;
  endTime: number;
  playerTeam: Character[];
  enemyTeam: Character[];
  logs: CombatLogEntry[];
  winner: 'player' | 'enemy';
}
```

### API 接口

#### GET /api/characters
- 描述：获取预设角色池数据
- 请求参数：无
- 响应：`Character[]` 角色列表

#### POST /api/battle/records
- 描述：存储战斗记录
- 请求体：`BattleRecord` 战斗记录对象
- 响应：`{ success: boolean; recordId: string }`

#### GET /api/battle/records
- 描述：获取历史战斗记录
- 请求参数：无
- 响应：`BattleRecord[]` 战斗记录列表

## 5. 服务器架构图

```mermaid
graph TD
    A["客户端请求"] --> B["Express服务器"]
    B --> C["CORS中间件"]
    C --> D["路由处理器"]
    D --> D1["GET /api/characters"]
    D --> D2["POST /api/battle/records"]
    D --> D3["GET /api/battle/records"]
    D1 --> E["返回预设角色数据"]
    D2 --> F["存储到内存数组"]
    D3 --> G["从内存数组读取"]
    F --> H["返回操作结果"]
    G --> I["返回记录列表"]
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    CHARACTER {
        string id "角色ID"
        string name "角色名称"
        number maxHp "最大生命值"
        number currentHp "当前生命值"
        number attack "攻击力"
        string skillName "技能名称"
        number skillPower "技能威力"
    }
    
    DICE_RESULT {
        number[] dice "骰子点数数组"
        number total "总点数"
    }
    
    COMBAT_LOG_ENTRY {
        string id "日志ID"
        number timestamp "时间戳"
        string attacker "攻击者名称"
        string target "目标名称"
        string skillName "技能名称"
        DICE_RESULT diceResult "骰子结果"
        number damage "伤害值"
        string message "日志消息"
    }
    
    BATTLE_RECORD {
        string id "战斗记录ID"
        number startTime "开始时间"
        number endTime "结束时间"
        CHARACTER[] playerTeam "玩家队伍"
        CHARACTER[] enemyTeam "敌方队伍"
        COMBAT_LOG_ENTRY[] logs "战斗日志"
        string winner "获胜方"
    }
```

### 6.2 初始数据

预设角色池数据（6个角色供选择）：

```typescript
const presetCharacters: Character[] = [
  {
    id: 'warrior',
    name: '狂战士',
    maxHp: 120,
    currentHp: 120,
    attack: 15,
    skillName: '重击',
    skillPower: 1.5,
  },
  {
    id: 'mage',
    name: '火焰法师',
    maxHp: 80,
    currentHp: 80,
    attack: 10,
    skillName: '火球术',
    skillPower: 2.0,
  },
  {
    id: 'archer',
    name: '精灵射手',
    maxHp: 90,
    currentHp: 90,
    attack: 12,
    skillName: '穿透箭',
    skillPower: 1.8,
  },
  {
    id: 'healer',
    name: '神圣牧师',
    maxHp: 70,
    currentHp: 70,
    attack: 8,
    skillName: '圣光打击',
    skillPower: 1.2,
  },
  {
    id: 'rogue',
    name: '暗影刺客',
    maxHp: 85,
    currentHp: 85,
    attack: 18,
    skillName: '背刺',
    skillPower: 2.2,
  },
  {
    id: 'knight',
    name: '圣骑士',
    maxHp: 150,
    currentHp: 150,
    attack: 10,
    skillName: '审判',
    skillPower: 1.4,
  },
];
```
