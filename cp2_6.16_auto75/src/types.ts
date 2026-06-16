export interface SkillData {
  codeContribution: number;
  issueManagement: number;
  codeReview: number;
  documentation: number;
  communityEngagement: number;
  projectManagement: number;
}

export interface TimelineEvent {
  id: string;
  type: string;
  date: string;
  description: string;
  isActive: boolean;
}

export interface Contributor {
  username: string;
  avatar: string;
  commits: number;
  linesAdded: number;
  linesDeleted: number;
  issues: number;
  pullRequests: number;
  prMerged: number;
  prMergeRate: number;
  skills: SkillData;
  timeline?: TimelineEvent[];
}

export interface RepoData {
  name: string;
  owner: string;
  totalCommits: number;
  contributors: Contributor[];
}

export type FilterDimension = 'all' | 'code' | 'issue' | 'pr';

export type SortBy = 'commits' | 'lines' | 'prMergeRate';

export const SKILL_LABELS: { key: keyof SkillData; label: string }[] = [
  { key: 'codeContribution', label: '代码贡献' },
  { key: 'issueManagement', label: 'Issue管理' },
  { key: 'codeReview', label: '代码审查' },
  { key: 'documentation', label: '文档编写' },
  { key: 'communityEngagement', label: '社区互动' },
  { key: 'projectManagement', label: '项目管理' }
];
