/**
 * ============================================================
 *  API 封装层 - 前端请求统一出口
 * ============================================================
 *
 *  调用关系:
 *    ├── 调用方 (上游):
 *    │   └── src/App.tsx 组件 (调用 fetchIdeas / createIdea)
 *    └── 被调用方 (下游):
 *        └── server/index.ts 的 RESTful API (通过 vite 代理 /api -> http://localhost:3001)
 *
 *  数据流向:
 *    前端组件 (App.tsx)
 *        │  调用 api 方法
 *        ▼
 *    request<T>() 内部 fetch 函数 (统一处理 headers / 错误)
 *        │  HTTP 请求
 *        ▼
 *    Vite 代理: /api/* -> http://localhost:3001/api/*
 *        │
 *        ▼
 *    Express 后端处理 -> 返回 JSON
 *        │
 *        ▼
 *    解析为 Promise<T> -> 组件更新 useState
 * ============================================================
 */

import type { Idea, CreateIdeaRequest, FilterType } from './types';

const API_BASE = '/api';

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const finalOptions: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  };

  const response = await fetch(`${API_BASE}${url}`, finalOptions);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { error?: string }).error ||
        `请求失败: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * 获取Idea列表 - 调用 GET /api/ideas
 * @param date 可选, 格式 YYYY-MM-DD, 用于过滤某一天的数据
 */
export function fetchIdeas(date?: string): Promise<Idea[]> {
  const url = date ? `/ideas?date=${encodeURIComponent(date)}` : '/ideas';
  return request<Idea[]>(url, { method: 'GET' });
}

/**
 * 创建新Idea - 调用 POST /api/ideas
 * @param data CreateIdeaRequest = { memberName, content, type, voiceBase64? }
 *             voiceBase64 为前端录制的语音 base64 字符串, 可选
 */
export function createIdea(data: CreateIdeaRequest): Promise<Idea> {
  return request<Idea>('/ideas', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 获取成员列表 - 调用 GET /api/members
 * 返回已提交过Idea的所有成员名(去重), 供姓名自动补齐使用
 */
export function fetchMembers(): Promise<string[]> {
  return request<string[]>('/members', { method: 'GET' });
}

/**
 * 本地按类型过滤 Idea (前端过滤, 不发请求)
 * @param ideas 原始列表
 * @param filter FilterType = 'all' | 'progress' | 'blocker' | 'plan'
 */
export function filterIdeasByType(ideas: Idea[], filter: FilterType): Idea[] {
  if (filter === 'all') {
    return ideas;
  }
  return ideas.filter((idea) => idea.type === filter);
}
