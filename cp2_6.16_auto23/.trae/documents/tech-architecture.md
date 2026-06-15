## 1. 架构设计

```mermaid
graph TB
    subgraph "前端 (React + Vite)"
        "App.tsx<br/>路由管理+Tab切换"
        "MoodSubmit.tsx<br/>情绪提交组件"
        "Report.tsx<br/>报告展示组件"
        "App.tsx" --> "MoodSubmit.tsx"
        "App.tsx" --> "Report.tsx"
        "MoodSubmit.tsx" -->|"POST /api/mood"| "API层"
        "Report.tsx" -->|"GET /api/report"| "API层"
    end

    subgraph "后端 (Express + SQLite)"
        "API层<br/>server/index.ts"
        "SQLite数据库<br/>mood.db"
        "API层" --> "SQLite数据库"
        "SQLite数据库" --> "API层"
    end

    "Vite Dev Server" -->|"代理 /api → :3001"| "API层"
```

## 2. 技术说明

- 前端：React@18 + TypeScript + Vite（使用chart.js实现图表，自定义Canvas实现词云）
- 初始化工具：vite-init（react-express-ts模板）
- 后端：Express@4 + TypeScript（ESM格式）
- 数据库：SQLite3（文件存储，mood.db）

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 主页面，包含情绪提交和报告两个Tab视图 |

## 4. API定义

### 4.1 TypeScript类型定义

```typescript
type MoodType = 'happy' | 'calm' | 'neutral' | 'down' | 'anxious';

interface MoodSubmission {
  mood: MoodType;
  text: string;
}

interface MoodRecord extends MoodSubmission {
  id: string;
  createdAt: string;
}

interface DailyDistribution {
  happy: number;
  calm: number;
  neutral: number;
  down: number;
  anxious: number;
}

interface TrendPoint {
  date: string;
  avgScore: number;
}

interface WordFrequency {
  word: string;
  count: number;
}

interface ReportData {
  todayDistribution: DailyDistribution;
  weekTrend: TrendPoint[];
  wordCloud: WordFrequency[];
}
```

### 4.2 请求/响应模式

**POST /api/mood**
- 请求体：`MoodSubmission`
- 响应：`{ success: boolean, id: string }`

**GET /api/report**
- 响应：`ReportData`

## 5. 服务端架构图

```mermaid
graph LR
    "Controller<br/>路由处理" --> "Service<br/>业务逻辑" --> "Repository<br/>数据访问" --> "SQLite<br/>mood.db"
    "SQLite<br/>mood.db" --> "Repository<br/>数据访问" --> "Service<br/>业务逻辑" --> "Controller<br/>路由处理"
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    "mood_records" {
        "TEXT id" PK
        "TEXT mood" "happy/calm/neutral/down/anxious"
        "TEXT text" "文字描述"
        "TEXT createdAt" "ISO时间戳"
    }
```

### 6.2 数据定义语言

```sql
CREATE TABLE IF NOT EXISTS mood_records (
  id TEXT PRIMARY KEY,
  mood TEXT NOT NULL CHECK(mood IN ('happy', 'calm', 'neutral', 'down', 'anxious')),
  text TEXT DEFAULT '',
  createdAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mood_records_createdAt ON mood_records(createdAt);
CREATE INDEX IF NOT EXISTS idx_mood_records_mood ON mood_records(mood);
```
