/**
 * ============================================================
 *  类型定义层 - 前后端共享类型
 * ============================================================
 *
 *  调用关系:
 *    ├── 前端导入:
 *    │   ├── src/api.ts       (使用 Idea / CreateIdeaRequest / FilterType)
 *    │   ├── src/App.tsx      (使用 Idea / FilterType / IdeaType)
 *    │   ├── src/components/TeamWall.tsx  (使用 Idea / FilterType / IdeaType)
 *    │   └── src/components/IdeaInput.tsx (使用 IdeaType)
 *    └── 后端导入:
 *        └── server/index.ts  (使用 Idea / IdeaType)
 *
 *  数据流向:
 *    Idea 类型对象通过 api.ts <-> server/index.ts 在前后端之间流转,
 *    确保两端数据结构完全一致, 避免类型不匹配的问题
 * ============================================================
 */

export type IdeaType = 'progress' | 'blocker' | 'plan';

export interface Idea {
  id: string;
  memberName: string;
  content: string;
  type: IdeaType;
  timestamp: number;
  voiceUrl?: string;
}

export interface CreateIdeaRequest {
  memberName: string;
  content: string;
  type: IdeaType;
  voiceBase64?: string;
}

export type FilterType = 'all' | IdeaType;
