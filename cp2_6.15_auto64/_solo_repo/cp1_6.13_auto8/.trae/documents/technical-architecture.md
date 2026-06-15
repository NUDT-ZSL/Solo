## 1. 架构设计

```mermaid
graph TD
    A["前端 React + Vite"] --> B["API 调用层"]
    B --> C["Express 后端"]
    C --> D["nedb 数据存储"]
    
    A --> E["组件层"]
    E --> E1["App.tsx 主组件"]
    E --> E2["HabitCard 打卡按钮"]
    E --> E3["HabitModal 打卡弹窗"]
    E --> E4["WeeklyTimeline 周时间轴"]
```

## 2. 技术描述

- **前端**：React 18 + TypeScript + Vite 5
- **初始化工具**：Vite 脚手架
- **后端**：Express 4
- **数据库**：nedb-promises（嵌入式文档数据库）
- **工具库**：date-fns（日期处理）、uuid（唯一ID生成）

## 3. 路由定义

| 路由 | 用途 |
|-------|---------|
| / | 首页，习惯打卡主界面 |

## 4. API 定义

### 类型定义

```typescript
interface Habit {
  _id: string;
  name: string;
  targetFrequency: number; // 每周目标次数
  createdAt: string;
}

interface CheckIn {
  _id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  note?: string;
  createdAt: string;
}

interface DailyStats {
  date: string;
  totalHabits: number;
  completedHabits: number;
  completionRate: number;
}
```

### 接口定义

| 方法 | 路径 | 描述 | 请求参数 | 返回值 |
|------|------|------|----------|--------|
| GET | /api/habits | 获取所有习惯列表 | 无 | Habit[] |
| POST | /api/habits/:id/checkin | 为指定习惯打卡 | { note?: string } | CheckIn |
| GET | /api/habits/:id/stats | 获取习惯打卡统计数据 | 无 | { checkins: CheckIn[], streak: number } |
| GET | /api/stats/weekly | 获取近7天每日统计 | 无 | DailyStats[] |

## 5. 服务器架构图

```mermaid
graph TD
    A["Express 服务器"] --> B["路由层"]
    B --> B1["GET /api/habits"]
    B --> B2["POST /api/habits/:id/checkin"]
    B --> B3["GET /api/habits/:id/stats"]
    B --> B4["GET /api/stats/weekly"]
    
    B --> C["数据访问层"]
    C --> D["nedb 数据库"]
    D --> D1["habits 集合"]
    D --> D2["checkins 集合"]
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    HABIT {
        string _id "主键"
        string name "习惯名称"
        number targetFrequency "每周目标次数"
        string createdAt "创建时间"
    }
    
    CHECKIN {
        string _id "主键"
        string habitId "关联习惯ID"
        string date "打卡日期 YYYY-MM-DD"
        string note "备注（可选）"
        string createdAt "打卡时间"
    }
    
    HABIT ||--o{ CHECKIN : "has"
```

### 6.2 初始数据

数据库初始化时自动插入示例习惯数据：
- 晨间阅读（每周7次）
- 体育锻炼（每周3次）
- 冥想（每周5次）
- 健康饮食（每周7次）
