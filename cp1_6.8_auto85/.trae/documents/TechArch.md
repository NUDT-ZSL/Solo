## 1. 架构设计

```mermaid
graph TB
    subgraph "前端 (React + TypeScript + Vite)"
        A["SonicDome 声波穹顶页"] --> B["VinylRecord 圆盘组件"]
        A --> C["CardDetail 详情卡片"]
        A --> D["RecordModal 录制弹窗"]
        E["EmotionStats 情感图谱页"]
        F["AudioCapture 录音工具"]
        G["Zustand Store 状态管理"]
    end

    subgraph "后端 (FastAPI)"
        H["main.py API入口"]
        I["audio_storage.py 音频存储"]
    end

    A -->|"GET /api/messages"| H
    D -->|"POST /api/messages/upload"| H
    C -->|"POST /api/messages/:id/resonate"| H
    E -->|"GET /api/stats"| H
    H --> I
```

## 2. 技术说明

- 前端：React@18 + TypeScript + Vite + TailwindCSS + Zustand
- 初始化工具：vite-init（react-ts 模板）
- 后端：FastAPI + Uvicorn（Python）
- 数据库：JSON文件存储（无需额外数据库服务）
- 音频处理：Web Audio API（前端录音/播放/分析）
- 图表：自实现Canvas图表（饼图 + 折线图），避免额外依赖

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 声波穹顶首页，展示漂浮圆盘和底部导航 |
| /stats | 情感图谱统计页，展示饼图和折线图 |

## 4. API定义

### 4.1 数据类型

```typescript
interface Message {
  id: string;
  audio_url: string;
  duration: number;
  emotion: "happy" | "sad" | "calm" | "angry";
  emotion_label: string;
  created_at: string;
  resonance_count: number;
  parent_id: string | null;
  volume_data: number[];
}

interface EmotionStats {
  happy: number;
  sad: number;
  calm: number;
  angry: number;
  daily_counts: { date: string; count: number }[];
}
```

### 4.2 API端点

| 方法 | 路径 | 请求 | 响应 | 描述 |
|------|------|------|------|------|
| GET | /api/messages | - | Message[] | 获取所有留言列表 |
| POST | /api/messages/upload | FormData: audio(blob), emotion, duration, volume_data, parent_id? | Message | 上传新留言 |
| GET | /api/messages/{id}/audio | - | audio/wav | 获取留言音频 |
| POST | /api/messages/{id}/resonate | FormData: audio(blob), duration | Message | 共鸣混音 |
| GET | /api/stats | - | EmotionStats | 获取统计数据 |

## 5. 服务器架构图

```mermaid
graph LR
    A["FastAPI Router"] --> B["audio_storage.py"]
    B --> C["文件系统 (audio/ 目录)"]
    B --> D["messages.json 数据索引"]
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    Message {
        string id PK
        string audio_url
        float duration
        string emotion
        string created_at
        int resonance_count
        string parent_id FK
    }
    Message ||--o| Message : "parent_id"
```

### 6.2 数据存储

- 音频文件存储在 `backend/audio/` 目录，文件名为 `{id}.webm`
- 留言元数据存储在 `backend/messages.json`，包含所有留言的索引信息
- 启动时自动创建目录和文件（如不存在）
