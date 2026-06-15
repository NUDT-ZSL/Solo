/**
 * server/mockData.ts
 *
 * 数据流向：本模块生成模拟投票数据 → 被 server.ts 导入调用 → 通过 RESTful API 返回给前端
 *
 * 提供三个预设投票主题：
 *   1. 最佳旅游目的地（10个选项，350条投票记录）
 *   2. 最受欢迎编程语言（12个选项，420条投票记录）
 *   3. 年度电影评选（8个选项，280条投票记录）
 *
 * 导出函数：
 *   - getTopics()       → 返回主题列表摘要，被 server.ts 的 GET /api/votings 调用
 *   - getDetailById(id) → 返回指定主题的详情（含选项和记录），被 server.ts 的 GET /api/votings/:id 调用
 */

import { v4 as uuidv4 } from 'uuid';

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

const TOPIC_CONFIGS: Array<{
  title: string;
  description: string;
  options: string[];
  recordCount: number;
  weightDistribution: number[];
}> = [
  {
    title: '最佳旅游目的地',
    description: '2026年度最受欢迎旅游目的地评选',
    options: [
      '京都', '巴厘岛', '巴黎', '马尔代夫', '冰岛',
      '新西兰', '瑞士', '圣托里尼', '布拉格', '北海道',
    ],
    recordCount: 350,
    weightDistribution: [0.16, 0.12, 0.14, 0.10, 0.08, 0.09, 0.07, 0.11, 0.06, 0.07],
  },
  {
    title: '最受欢迎编程语言',
    description: '2026年度开发者最喜爱编程语言评选',
    options: [
      'JavaScript', 'Python', 'TypeScript', 'Rust', 'Go',
      'Java', 'C++', 'Kotlin', 'Swift', 'C#', 'Ruby', 'PHP',
    ],
    recordCount: 420,
    weightDistribution: [0.18, 0.16, 0.14, 0.10, 0.09, 0.08, 0.05, 0.06, 0.05, 0.04, 0.03, 0.02],
  },
  {
    title: '年度电影评选',
    description: '2026年度最佳电影评选',
    options: [
      '星际穿越2', '黑客帝国5', '阿凡达3', '盗梦空间2', '沙丘3',
      '蝙蝠侠：暗夜', '侏罗纪世界4', '速度与激情11',
    ],
    recordCount: 280,
    weightDistribution: [0.20, 0.15, 0.18, 0.12, 0.13, 0.10, 0.06, 0.06],
  },
];

function generateRecords(
  optionIds: string[],
  weights: number[],
  totalCount: number,
  startTime: number,
  endTime: number,
): VoteRecord[] {
  const records: VoteRecord[] = [];
  const totalDuration = endTime - startTime;

  for (let i = 0; i < totalCount; i++) {
    const rand = Math.random();
    let cumulative = 0;
    let selectedIdx = 0;
    for (let j = 0; j < weights.length; j++) {
      cumulative += weights[j];
      if (rand <= cumulative) {
        selectedIdx = j;
        break;
      }
    }

    let timestamp: number;
    let attempts = 0;
    do {
      const randomOffset = Math.random() * totalDuration;
      timestamp = startTime + Math.floor(randomOffset);
      const hour = new Date(timestamp).getHours();
      const activityMultiplier =
        hour >= 9 && hour <= 12 ? 1.5 :
        hour >= 19 && hour <= 22 ? 1.8 :
        hour >= 0 && hour <= 6 ? 0.3 : 1.0;
      if (Math.random() < activityMultiplier / 1.8 || attempts > 20) break;
      attempts++;
    } while (true);

    records.push({
      id: uuidv4(),
      optionId: optionIds[selectedIdx],
      timestamp: Math.min(timestamp, endTime),
    });
  }

  return records.sort((a, b) => a.timestamp - b.timestamp);
}

function generateTopicData(config: typeof TOPIC_CONFIGS[number]): VotingDetail {
  const id = uuidv4();
  const now = Date.now();
  const startTime = now - 30 * 24 * 3600 * 1000;
  const endTime = now - 1 * 24 * 3600 * 1000;

  const options: VoteOption[] = config.options.map((name) => ({
    id: uuidv4(),
    name,
    voteCount: 0,
  }));

  const records = generateRecords(
    options.map((o) => o.id),
    config.weightDistribution,
    config.recordCount,
    startTime,
    endTime,
  );

  const voteCounts: Record<string, number> = {};
  for (const opt of options) {
    voteCounts[opt.id] = 0;
  }
  for (const rec of records) {
    voteCounts[rec.optionId] = (voteCounts[rec.optionId] || 0) + 1;
  }
  for (const opt of options) {
    opt.voteCount = voteCounts[opt.id] || 0;
  }

  return {
    id,
    title: config.title,
    description: config.description,
    optionCount: options.length,
    totalVotes: records.length,
    startTime,
    endTime,
    options,
    records,
  };
}

let cachedData: VotingDetail[] | null = null;

function ensureData(): VotingDetail[] {
  if (!cachedData) {
    cachedData = TOPIC_CONFIGS.map(generateTopicData);
  }
  return cachedData;
}

export function getTopics(): VotingTopic[] {
  return ensureData().map(({ options, records, ...topic }) => topic);
}

export function getDetailById(id: string): VotingDetail | null {
  return ensureData().find((t) => t.id === id) || null;
}

export function regenerateData(): void {
  cachedData = null;
}
