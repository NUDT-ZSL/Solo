## 1. 架构设计

```mermaid
graph TD
    subgraph "前端 (React + Vite)"
        A["App.tsx (根组件)"]
        A --> B["BoosterPack.tsx (卡包组件)"]
        A --> C["CardGallery.tsx (卡片展示/收藏册)"]
        A --> D["Card.tsx (单个卡片组件)"]
        A --> E["ExchangeModal.tsx (交换市场弹窗)"]
        A --> F["PreviewModal.tsx (卡牌预览弹窗)"]
        A --> G["TopNav.tsx (顶部导航)"]
        A --> H["BottomBar.tsx (底部工具栏)"]
        A --> I["useCardStore.ts (Zustand状态管理)"]
        A --> J["cardUtils.ts (卡牌工具函数)"]
    end
    
    subgraph "后端 (Express)"
        K["server.ts (Express服务器)"]
        K --> L["/api/exchange (交换匹配接口)"]
    end
    
    subgraph "数据层"
        M["localStorage (持久化存储)"]
    end
    
    B --> I
    C --> I
    I --> M
    E --> K
```

## 2. 技术描述
- **前端框架**：React@18 + TypeScript@5
- **构建工具**：Vite@5 + @vitejs/plugin-react@4
- **状态管理**：Zustand@4（轻量级状态管理，替代 Context）
- **样式方案**：CSS Modules + CSS 变量（无需 Tailwind，使用自定义深色主题变量）
- **路由**：react-router-dom@6（单页应用，主要为功能 Tab 切换）
- **后端**：Express@4 + TypeScript
- **数据持久化**：localStorage 存储用户卡牌数据
- **图标**：lucide-react

## 3. 路由定义
| 路由 | 用途 |
|-----|-----|
| `/` | 主页面（开包 + 收藏册 + 工具栏） |
| `/exchange` | 交换市场（通过弹窗实现，非独立路由） |

## 4. API 定义

### 4.1 交换匹配接口
```typescript
// POST /api/exchange
interface ExchangeRequest {
  offeredCardId: string;
  userId: string;
}

interface ExchangeResponse {
  success: boolean;
  message: string;
  receivedCard?: Card;
  matchedUserId?: string;
}

interface Card {
  id: string;
  pattern: number; // 0-7 共8种图案
  bgColor: number; // 0-5 共6种背景色
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  createdAt: number;
}
```

## 5. 服务器架构

```mermaid
graph TD
    A["客户端发起交换请求"] --> B["POST /api/exchange"]
    B --> C["模拟延迟 (0.8-1.5s)"]
    C --> D["随机决定匹配结果"]
    D --> E{"成功？"}
    E -- "是 (70%概率)" --> F["生成随机对手卡牌"]
    F --> G["返回成功响应 + 获得的卡牌"]
    E -- "否 (30%概率)" --> H["返回失败响应"]
```

## 6. 数据模型

### 6.1 数据模型定义
```mermaid
erDiagram
    USER ||--o{ CARD : "拥有"
    CARD {
        string id PK
        number pattern
        number bgColor
        string rarity
        number createdAt
    }
    USER {
        string id PK
        number totalPacks
        number exchangeCount
    }
```

### 6.2 稀有度权重
| 稀有度 | 权重 | 概率 |
|-------|-----|-----|
| 普通 | 60 | 60% |
| 稀有 | 25 | 25% |
| 史诗 | 12 | 12% |
| 传说 | 3 | 3% |

## 7. 性能指标
- 开包响应延迟：< 200ms（本地生成，无需网络）
- 翻面动画帧率：稳定 60fps（CSS transform + opacity）
- 收藏册筛选渲染：< 500ms
- 交换响应：模拟 0.8-1.5s 延迟
