## 1. 架构设计

```mermaid
graph TD
    subgraph "前端 (React + TypeScript + Vite)"
        A["App.tsx - 主布局与状态管理"]
        B["MoodInput - 情绪输入组件"]
        C["Timeline - 心情时间线组件"]
        D["Player - 音乐播放器组件"]
        E["Heatmap - 心情热力图组件"]
        F["HistoryChart - 播放历史折线图"]
    end
    subgraph "后端 (Express + TypeScript)"
        G["server.ts - Express服务器"]
        H["RESTful API路由"]
    end
    subgraph "数据层 (JSON文件)"
        I["songs.json - 预设曲库"]
        J["moods.json - 心情记录存储"]
    end
    A -->|HTTP请求| H
    B -->|POST moods| H
    C -->|GET/DELETE moods| H
    D -->|GET songs by emotion| H
    E -->|GET weekly stats| H
    F -->|GET weekly stats| H
    H -->|读写| I
    H -->|读写| J
```

## 2. 技术栈说明

- **前端框架**：React 18 + TypeScript 5
- **构建工具**：Vite 5 + @vitejs/plugin-react
- **后端框架**：Express 4 + TypeScript + ts-node
- **图表库**：Recharts 2
- **图标库**：react-icons 5
- **数据存储**：本地JSON文件（songs.json, moods.json）
- **并发启动**：concurrently（同时启动前后端）
- **唯一ID**：uuid

## 3. 目录结构

```
auto33/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── server/
│   ├── server.ts
│   └── data/
│       ├── songs.json
│       └── moods.json
└── src/
    ├── App.tsx
    ├── styles.css
    └── components/
        ├── MoodInput.tsx
        ├── Timeline.tsx
        ├── Player.tsx
        ├── Heatmap.tsx
        └── HistoryChart.tsx
```

## 4. API 接口定义

### 4.1 类型定义

```typescript
interface Mood {
  id: string;
  emotion: 'happy' | 'calm' | 'sad' | 'angry' | 'anxious' | 'surprised' | 'bored' | 'tired';
  note: string;
  timestamp: number;
}

interface LyricLine {
  time: number;
  text: string;
}

interface Song {
  id: string;
  title: string;
  artist: string;
  cover: string;
  emotion: string;
  lyrics: LyricLine[];
  audioUrl?: string;
}

interface WeeklyStats {
  heatmap: { date: string; hour: number; emotion: string; count: number }[];
  playHistory: { date: string; count: number }[];
}
```

### 4.2 接口列表

| 方法 | 路径 | 请求体 | 响应 | 说明 |
|-----|------|--------|------|-----|
| GET | /api/moods | - | Mood[] | 获取所有心情记录 |
| POST | /api/moods | { emotion, note } | Mood | 添加心情记录 |
| DELETE | /api/moods/:id | - | { success: boolean } | 删除指定心情记录 |
| GET | /api/songs/:emotion | - | Song[] | 根据情绪返回推荐歌曲列表（≥20首） |
| GET | /api/stats/weekly | - | WeeklyStats | 返回一周热力图数据和播放统计 |

## 5. 后端架构

```mermaid
graph LR
    A["Express App"] --> B["路由层 Routes"]
    B --> C["/api/moods 路由"]
    B --> D["/api/songs 路由"]
    B --> E["/api/stats 路由"]
    C --> F["文件读写 fs/promises"]
    D --> F
    E --> F
    F --> G["data/moods.json"]
    F --> H["data/songs.json"]
```

## 6. 数据模型

### 6.1 ER图

```mermaid
erDiagram
    MOOD {
        string id PK
        string emotion
        string note
        number timestamp
    }
    SONG {
        string id PK
        string title
        string artist
        string cover
        string emotion
        json lyrics
    }
```

### 6.2 初始数据

- **songs.json**：8种情绪各≥20首歌曲，共≥160首，每首包含id、title、artist、cover、emotion、lyrics数组
- **moods.json**：初始空数组 `[]`
