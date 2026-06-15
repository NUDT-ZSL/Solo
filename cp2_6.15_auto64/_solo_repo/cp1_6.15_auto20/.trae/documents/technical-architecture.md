## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端层"
        "App.tsx" --> "ScoreEditor.tsx"
        "App.tsx" --> "ScoreList.tsx"
        "App.tsx" --> "CommunityPage.tsx"
    end
    subgraph "数据层"
        "LocalStorage" --> "乐谱数据"
        "mockData.ts" --> "社区示例数据"
    end
    subgraph "音频层"
        "tone.js" --> "Web Audio API"
    end
    "ScoreEditor.tsx" --> "tone.js"
    "ScoreEditor.tsx" --> "LocalStorage"
    "ScoreList.tsx" --> "LocalStorage"
    "CommunityPage.tsx" --> "mockData.ts"
```

## 2. 技术说明

- 前端: React@18 + TypeScript + Vite
- 状态管理: React useState/useReducer（组件内状态）
- 样式: CSS-in-JS（内联样式）+ CSS动画
- 音频合成: tone.js（Web Audio API封装）
- 数据持久化: LocalStorage
- 初始化工具: vite-init（react-ts模板）
- 唯一标识: uuid库

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / (默认) | 应用主页，通过标签切换展示不同内容 |
| 标签: 新建乐谱 | 乐谱编辑器 |
| 标签: 我的乐谱 | 已保存乐谱列表 |
| 标签: 社区乐谱 | 社区示例乐谱 |

注：使用标签页切换而非路由，状态由App.tsx管理。

## 4. 数据模型

### 4.1 乐谱数据模型

```typescript
interface Note {
  pitch: number;       // 1-7
  octave: number;      // 0=低音, 1=中音, 2=高音
  sharp: boolean;      // 是否升号
  duration: 'whole' | 'half' | 'quarter' | 'eighth';
}

interface Score {
  id: string;          // UUID
  title: string;
  notes: (Note | null)[][]; // [小节][拍位]
  createdAt: number;   // 时间戳
  updatedAt: number;
}
```

### 4.2 音高映射

| 简谱 | 中音区MIDI | 频率参考 |
|------|-----------|----------|
| 1(C) | C4 | 261.63Hz |
| 2(D) | D4 | 293.66Hz |
| 3(E) | E4 | 329.63Hz |
| 4(F) | F4 | 349.23Hz |
| 5(G) | G4 | 392.00Hz |
| 6(A) | A4 | 440.00Hz |
| 7(B) | B4 | 493.88Hz |

低音区降一个八度(C3-B3)，高音区升一个八度(C5-B5)。

## 5. 文件结构

```
├── package.json
├── vite.config.js
├── tsconfig.json
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── App.css
│   ├── components/
│   │   ├── ScoreEditor.tsx
│   │   ├── ScoreList.tsx
│   │   └── CommunityPage.tsx
│   ├── mockData.ts
│   └── types.ts
```

## 6. 关键技术决策

1. **音频合成**: 使用tone.js的Synth进行实时音频合成，按音符序列顺序播放
2. **撤销重做**: 使用历史栈（past/future），最多保存20步状态快照
3. **动画**: CSS transition + keyframe animation，避免JavaScript动画以保持60fps
4. **数据存储**: LocalStorage存储JSON序列化的乐谱数据
5. **网格渲染**: 使用CSS Grid布局，每小节4列，最多16行（小节）
