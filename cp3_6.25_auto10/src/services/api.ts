const BASE_URL = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export interface Project {
  id: string;
  name: string;
  description?: string;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
}

export interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

export interface Feature {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  order: number;
  likes: number;
  dislikes: number;
  tasks: Task[];
  comments: Comment[];
}

export function getProjects(): Promise<Project[]> {
  return request<Project[]>('/projects');
}

export function getFeatures(projectId: string): Promise<Feature[]> {
  return request<Feature[]>(`/projects/${projectId}/features`);
}

export function updateFeature(
  featureId: string,
  data: Partial<Pick<Feature, 'order' | 'likes' | 'dislikes'>>
): Promise<Feature> {
  return request<Feature>(`/features/${featureId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function addComment(
  featureId: string,
  author: string,
  content: string
): Promise<Comment> {
  return request<Comment>(`/features/${featureId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ author, content }),
  });
}

export function toggleTask(
  featureId: string,
  taskId: string
): Promise<Task> {
  return request<Task>(`/features/${featureId}/tasks/${taskId}/toggle`, {
    method: 'POST',
  });
}
