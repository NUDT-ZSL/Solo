import axios from 'axios';
import type { Project, Support, Comment, User, ThankYouLetter } from '../../server/models';

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
});

export interface ProjectWithCreator extends Project {
  creator?: User;
}

export interface CommentWithUser extends Comment {
  user?: User;
}

export interface PaginatedComments {
  comments: CommentWithUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export const fetchProjects = async (): Promise<Project[]> => {
  const response = await api.get<Project[]>('/projects');
  return response.data;
};

export const createProject = async (data: {
  title: string;
  description: string;
  goalAmount: number;
  creatorId: string;
  coverImage?: string;
  endDate?: string;
}): Promise<Project> => {
  const response = await api.post<Project>('/projects', data);
  return response.data;
};

export const fetchProjectById = async (id: string): Promise<Project> => {
  const response = await api.get<Project>(`/projects/${id}`);
  return response.data;
};

export const submitSupport = async (data: {
  projectId: string;
  supporterName: string;
  amount: number;
  message?: string;
}): Promise<{ support: Support; project: Project }> => {
  const response = await api.post('/support', data);
  return response.data;
};

export const fetchComments = async (
  projectId: string,
  page: number = 1,
  limit: number = 20
): Promise<PaginatedComments> => {
  const response = await api.get('/comments', {
    params: { projectId, page, limit },
  });

  const data = response.data as {
    comments: Comment[];
    pagination: { page: number; limit: number; total: number; hasMore: boolean };
  };

  const commentsWithUsers: CommentWithUser[] = await Promise.all(
    data.comments.map(async (comment) => {
      try {
        const userResponse = await api.get<User>(`/users/${comment.userId}`);
        return { ...comment, user: userResponse.data };
      } catch {
        return { ...comment, user: undefined };
      }
    })
  );

  return {
    comments: commentsWithUsers,
    pagination: data.pagination,
  };
};

export const postComment = async (data: {
  projectId: string;
  userId: string;
  text: string;
}): Promise<Comment> => {
  const response = await api.post<Comment>('/comments', data);
  return response.data;
};

export const fetchThankYouLetter = async (
  projectId: string
): Promise<ThankYouLetter> => {
  const response = await api.get<ThankYouLetter>(`/projects/${projectId}/thankyou`);
  return response.data;
};

export const createUser = async (data: {
  name: string;
  avatar?: string;
}): Promise<User> => {
  const response = await api.post<User>('/users', data);
  return response.data;
};

export const fetchUserById = async (id: string): Promise<User> => {
  const response = await api.get<User>(`/users/${id}`);
  return response.data;
};
