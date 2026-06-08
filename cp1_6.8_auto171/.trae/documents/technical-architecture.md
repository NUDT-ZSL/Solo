## 1. 架构设计

```mermaid
graph TB
    subgraph "前端 (React + TypeScript + Vite)"
        A["App.tsx 入口组件"] --> B["UILayer.tsx 交互层"]
        A --> C["LifeTreeEngine.ts 生命树引擎"]
        A --> D["MeditationRecorder.ts 冥想记录器"]
        A --> E["StatsDashboard.ts 统计面板"]
        B --> F["计时器 / 控制按钮"]
        B --> G["毛玻璃信息面板"]
        C --> H["Canvas 渲染层"]
        C --> I["生长算法"]
        C --> J["花朵交互"]
    end
    subgraph "后端 (FastAPI)"
        K["冥想记录 API"] --> L["SQLite 数据库"]
        M["统计聚合 API"] --> L
        N["鼓励语生成 API"] --> L
    end
    A -- "HTTP/REST" --> K
    A -- "HTTP/REST" --> M
    A -- "HTTP/REST" --> N
```

## 2. 技术说明
- 前端：React@18 + TypeScript + Vite + Tailwind CSS
- 初始化工具：vite-init（react-ts 模板）
- 后端：FastAPI (Python 3.10+)
- 数据库：SQLite（轻量本地存储，适合个人冥想记录）
- 状态管理：Zustand
- 图表：纯 CSS/SVG 实现（柱状图、饼图），不引入第三方图表库
- Canvas 渲染：原生 Canvas API（生命树、粒子效果）

## 3. 路由定义
| 路由 | 用途 |
|------|------|
| / | 生命树主页面，展示动态生命树和花朵交互 |
| /meditate | 冥想记录页面，计时器和情绪录入 |
| /stats | 统计面板页面，柱状图、饼图、连续天数 |

## 4. API 定义

### 4.1 数据类型
```typescript
interface MeditationRecord {
  id: string;
  duration: number;
  depth: number;
  emotion: 'calm' | 'joy' | 'anxiety';
  createdAt: string;
  encouragement: string;
}

interface MeditationSession {
  startTime: string;
  endTime?: string;
  isActive: boolean;
}

interface DailyStats {
  date: string;
  totalDuration: number;
  sessionCount: number;
}

interface EmotionDistribution {
  calm: number;
  joy: number;
  anxiety: number;
}

interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
}
```

### 4.2 API 端点
| 方法 | 路径 | 请求体 | 响应 |
|------|------|--------|------|
| GET | /api/meditations | - | MeditationRecord[] |
| POST | /api/meditations | { duration, depth, emotion } | MeditationRecord |
| GET | /api/stats/daily?days=7 | - | DailyStats[] |
| GET | /api/stats/emotions | - | EmotionDistribution |
| GET | /api/stats/streak | - | StreakInfo |
| GET | /api/encouragement?emotion={emotion} | - | { message: string } |

## 5. 服务端架构图

```mermaid
graph LR
    A["FastAPI Router"] --> B["MeditationController"]
    A --> C["StatsController"]
    A --> D["EncouragementController"]
    B --> E["MeditationService"]
    C --> F["StatsService"]
    D --> G["EncouragementService"]
    E --> H["SQLite (meditations)"]
    F --> H
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    "meditations" {
        string id PK
        integer duration
        integer depth
        string emotion
        string created_at
        string encouragement
    }
```

### 6.2 数据定义语言
```sql
CREATE TABLE meditations (
    id TEXT PRIMARY KEY,
    duration INTEGER NOT NULL,
    depth INTEGER NOT NULL CHECK(depth BETWEEN 1 AND 5),
    emotion TEXT NOT NULL CHECK(emotion IN ('calm', 'joy', 'anxiety')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    encouragement TEXT NOT NULL
);

CREATE INDEX idx_meditations_created_at ON meditations(created_at);
CREATE INDEX idx_meditations_emotion ON meditations(emotion);
```
