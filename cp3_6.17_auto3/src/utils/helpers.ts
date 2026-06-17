import dayjs from 'dayjs';
import { DimensionScores, ReviewSuggestion } from '../types';

export const DIMENSION_NAMES: Record<keyof DimensionScores, string> = {
  basic: '基础知识',
  logic: '逻辑分析',
  code: '代码理解',
  security: '安全规范',
  management: '项目管理',
};

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatDate(iso: string): string {
  return dayjs(iso).format('YYYY-MM-DD HH:mm');
}

export function generateReviewSuggestions(scores: DimensionScores): ReviewSuggestion[] {
  const entries = Object.entries(scores) as [keyof DimensionScores, number][];
  entries.sort((a, b) => a[1] - b[1]);
  
  const suggestionTemplates: Record<keyof DimensionScores, string[]> = {
    basic: [
      '建议系统回顾基础概念教材，夯实基础理论知识',
      '可通过思维导图梳理各知识点之间的关联',
      '加强基础概念的记忆与理解，每天复习1小时',
    ],
    logic: [
      '建议加强逻辑分析类题目的练习，多做推理题',
      '培养结构化思维，使用MECE原则分析问题',
      '尝试用流程图拆解复杂问题，理清逻辑关系',
    ],
    code: [
      '建议每天手写代码练习，加深语法和API的理解',
      '多阅读优秀开源代码，学习设计模式与最佳实践',
      '通过在线编程平台进行算法练习，提升编码能力',
    ],
    security: [
      '建议深入学习常见攻击原理与防御手段',
      '关注最新安全漏洞通报，了解行业趋势',
      '加强安全规范意识，编码时遵循安全最佳实践',
    ],
    management: [
      '建议系统学习项目管理知识体系，熟记过程组',
      '多分析实际项目案例，理论联系实际',
      '通过模拟题熟悉各类项目管理工具与技术',
    ],
  };

  return entries.slice(0, 3).map(([dim, score], i) => ({
    dimension: dim,
    dimensionName: DIMENSION_NAMES[dim],
    message: suggestionTemplates[dim][i % 3],
    priority: i + 1,
  }));
}

export function getScoreColor(score: number): string {
  if (score >= 90) return '#38a169';
  if (score >= 70) return '#3182ce';
  if (score >= 60) return '#d69e2e';
  return '#e53e3e';
}

export function getProgressGradient(percent: number): [string, string] {
  const stops: [number, [number, number, number]][] = [
    [0, [229, 62, 62]],
    [50, [214, 158, 46]],
    [100, [56, 161, 105]],
  ];
  let i = 0;
  while (i < stops.length - 1 && percent > stops[i + 1][0]) i++;
  const [p1, c1] = stops[i];
  const [p2, c2] = stops[Math.min(i + 1, stops.length - 1)];
  const t = (percent - p1) / (p2 - p1);
  const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
  const endColor = `rgb(${r},${g},${b})`;
  return ['#e53e3e', endColor];
}
