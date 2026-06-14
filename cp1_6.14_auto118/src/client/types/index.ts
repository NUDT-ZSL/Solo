export interface CodeSnippet {
  id: string;
  title: string;
  code: string;
  language: string;
  tags: string[];
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  likes: number;
  status: 'pending' | 'approved' | 'changes_requested';
  createdAt: string;
  comments: Comment[];
}

export interface Comment {
  id: string;
  snippetId: string;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  content: string;
  lineNumber?: number;
  createdAt: string;
}

export interface HeatmapData {
  language: string;
  commentCount: number;
  snippetCount: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: '#f7df1e',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Go: '#00ADD8',
  Rust: '#dea584',
  Java: '#b07219',
  Cpp: '#f34b7d',
  CSS: '#563d7c',
  HTML: '#e34c26',
  SQL: '#e38c00',
};
