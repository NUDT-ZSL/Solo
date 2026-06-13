import axios from 'axios';
import type { User, Meeting, Proposal, Vote, Comment, MeetingSummary } from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
});

export const userApi = {
  login: async (userId: string): Promise<User> => {
    const response = await api.get<User>(`/users/${userId}`);
    return response.data;
  },

  getUsers: async (): Promise<User[]> => {
    const response = await api.get<User[]>('/users');
    return response.data;
  },
};

export const meetingApi = {
  getMeetings: async (userId: string): Promise<Meeting[]> => {
    const response = await api.get<Meeting[]>('/meetings', { params: { userId } });
    return response.data;
  },

  getMeeting: async (meetingId: string): Promise<Meeting> => {
    const response = await api.get<Meeting>(`/meetings/${meetingId}`);
    return response.data;
  },

  getProposals: async (meetingId: string): Promise<Proposal[]> => {
    const response = await api.get<Proposal[]>(`/meetings/${meetingId}/proposals`);
    return response.data;
  },

  getSummary: async (meetingId: string): Promise<MeetingSummary[]> => {
    const response = await api.get<MeetingSummary[]>(`/meetings/${meetingId}/summary`);
    return response.data;
  },

  saveMeetingNote: async (meetingId: string, content: string): Promise<void> => {
    await api.post('/meeting-notes', { meetingId, content });
  },
};

export const proposalApi = {
  createProposal: async (meetingId: string, title: string, summary: string): Promise<Proposal> => {
    const response = await api.post<Proposal>('/proposals', { meetingId, title, summary });
    return response.data;
  },

  updateProposal: async (proposalId: string, title: string, summary: string): Promise<Proposal> => {
    const response = await api.put<Proposal>(`/proposals/${proposalId}`, { title, summary });
    return response.data;
  },

  getVotes: async (proposalId: string): Promise<Vote[]> => {
    const response = await api.get<Vote[]>(`/proposals/${proposalId}/votes`);
    return response.data;
  },

  getComments: async (proposalId: string, limit: number = 50): Promise<Comment[]> => {
    const response = await api.get<Comment[]>(`/proposals/${proposalId}/comments`, { params: { limit } });
    return response.data;
  },
};

export const voteApi = {
  submitVote: async (proposalId: string, userId: string, voteType: 'approve' | 'reject' | 'abstain'): Promise<Vote> => {
    const response = await api.post<Vote>('/votes', { proposalId, userId, voteType });
    return response.data;
  },
};

export const commentApi = {
  addComment: async (
    proposalId: string,
    userId: string,
    userName: string,
    userAvatar: string,
    content: string,
    parentId?: string
  ): Promise<Comment> => {
    const response = await api.post<Comment>('/comments', {
      proposalId,
      userId,
      userName,
      userAvatar,
      content,
      parentId,
    });
    return response.data;
  },
};
