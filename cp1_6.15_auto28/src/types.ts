/**
 * src/types.ts
 *
 * 共享类型定义文件，被所有前端组件引用
 *
 * 数据流向：
 *   server/mockData.ts 定义同名接口 → server/server.ts 序列化为 JSON →
 *   前端 fetch 获取 → App.tsx 解析为这些类型 → 通过 props 分发给子组件
 */

export interface VoteOption {
  id: string;
  name: string;
  voteCount: number;
}

export interface VoteRecord {
  id: string;
  optionId: string;
  timestamp: number;
}

export interface VotingTopic {
  id: string;
  title: string;
  description: string;
  optionCount: number;
  totalVotes: number;
  startTime: number;
  endTime: number;
}

export interface VotingDetail extends VotingTopic {
  options: VoteOption[];
  records: VoteRecord[];
}

export type ChartType = 'bar' | 'radar';
