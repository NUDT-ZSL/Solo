import type { Topic, Report, DetailedReport, CreateTopicRequest, VoteRequest, VoteResponse } from './types';

const API_BASE = '/api';

export const api = {
  getTopics: async (): Promise<Topic[]> => {
    const response = await fetch(`${API_BASE}/topics`);
    if (!response.ok) {
      throw new Error('获取话题列表失败');
    }
    return response.json();
  },

  createTopic: async (data: CreateTopicRequest): Promise<Topic> => {
    const response = await fetch(`${API_BASE}/topics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '创建话题失败');
    }
    return response.json();
  },

  updateTopic: async (id: string, data: Partial<CreateTopicRequest>): Promise<Topic> => {
    const response = await fetch(`${API_BASE}/topics/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '更新话题失败');
    }
    return response.json();
  },

  deleteTopic: async (id: string): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/topics/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '删除话题失败');
    }
    return response.json();
  },

  submitVote: async (data: VoteRequest): Promise<VoteResponse> => {
    const response = await fetch(`${API_BASE}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '投票失败');
    }
    return response.json();
  },

  getReport: async (topicId: string): Promise<Report> => {
    const response = await fetch(`${API_BASE}/report/${topicId}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '获取报告失败');
    }
    return response.json();
  },

  fetchDetailedReport: async (topicId: string): Promise<DetailedReport> => {
    const response = await fetch(`${API_BASE}/detailed-report/${topicId}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '获取详细报告失败');
    }
    return response.json();
  },
};

export const getVoterId = (): string => {
  let voterId = localStorage.getItem('voterId');
  if (!voterId) {
    voterId = 'voter_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('voterId', voterId);
  }
  return voterId;
};
