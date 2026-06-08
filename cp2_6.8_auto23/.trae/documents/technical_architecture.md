## 1. 架构设计

```mermaid
flowchart LR
    A["React 客户端"] <-->|"WebSocket"| B["Express + ws WebSocket 服务"]
    B <--> C["内存数据存储"]
```

## 2. 技术说明

- 前端：React 18 + TypeScript + Vite
- 后端：Express + TypeScript + ws (WebSocket)
- 图表：Recharts
- 通信：WebSocket 实时双向通信
- 数据存储：内存存储（开发演示）

## 3. 项目结构

```
├── package.json          # 根目录，管理前后端依赖和启动脚本
├── index.html          # 入口页面
├── vite.config.js    # Vite 配置
├── tsconfig.json    # TypeScript 配置
├── server/
│   └── server.ts    # Express + WebSocket 服务端
└── client/
    └── src/
        ├── main.tsx    # React 入口
        ├── App.tsx    # 主应用
        └── VoteRoom.tsx  # 投票房间
```

## 4. WebSocket 消息定义

```typescript
// 客户端 -> 服务端
type ClientMessage =
  | { type: 'CREATE_POLL'; title: string; description: string; options: string[] }
  | { type: 'JOIN_POLL'; pollCode: string }
  | { type: 'VOTE'; pollCode: string; optionIndex: number }
  | { type: 'END_POLL'; pollCode: string };

// 服务端 -> 客户端
type ServerMessage =
  | { type: 'POLL_CREATED'; pollCode: string; poll: PollData }
  | { type: 'POLL_JOINED'; poll: PollData }
  | { type: 'POLL_NOT_FOUND' }
  | { type: 'VOTE_UPDATE'; poll: PollData }
  | { type: 'POLL_ENDED'; poll: PollData }
  | { type: 'ONLINE_COUNT'; count: number }
  | { type: 'NOTIFICATION'; message: string };

interface PollData {
  code: string;
  title: string;
  description: string;
  options: { text: string; votes: number }[];
  totalVotes: number;
  isEnded: boolean;
  createdAt: number;
  creatorId: string;
}
```

## 5. 服务端架构

```mermaid
flowchart TD
    A["WebSocket 连接管理"] --> B["消息处理器"]
    B --> C["投票数据管理（内存）"]
    C --> D["广播更新"]
    D --> E["所有连接客户端"]
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    POLL {
        string code PK "6位投票码"
        string title "标题"
        string description "描述"
        array options "选项列表"
        number totalVotes "总票数"
        boolean isEnded "是否结束"
        number createdAt "创建时间"
        string creatorId "创建者连接ID"
    }
```
