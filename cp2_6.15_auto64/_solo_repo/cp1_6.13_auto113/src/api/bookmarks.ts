import axios from 'axios';

export interface BookmarkNode {
  _id: string;
  title: string;
  url: string;
  parentId: string | null;
  x: number;
  y: number;
  isRoot: boolean;
  createdAt: string;
  updatedAt: string;
  children?: BookmarkNode[];
}

export interface CreateBookmarkDto {
  title: string;
  url?: string;
  parentId?: string | null;
  x?: number;
  y?: number;
}

export interface UpdateBookmarkDto {
  title?: string;
  url?: string;
  parentId?: string | null;
  x?: number;
  y?: number;
}

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getBookmarks = async (): Promise<BookmarkNode[]> => {
  const response = await api.get<BookmarkNode[]>('/bookmarks');
  return response.data;
};

export const getBookmarksFlat = async (): Promise<BookmarkNode[]> => {
  const response = await api.get<BookmarkNode[]>('/bookmarks/flat');
  return response.data;
};

export const addBookmark = async (data: CreateBookmarkDto): Promise<BookmarkNode> => {
  const response = await api.post<BookmarkNode>('/bookmarks', data);
  return response.data;
};

export const updateBookmark = async (id: string, data: UpdateBookmarkDto): Promise<BookmarkNode> => {
  const response = await api.put<BookmarkNode>(`/bookmarks/${id}`, data);
  return response.data;
};

export const deleteBookmark = async (id: string): Promise<{ message: string; deletedId: string }> => {
  const response = await api.delete(`/bookmarks/${id}`);
  return response.data;
};

export const exportMarkdown = async (): Promise<string> => {
  const response = await api.get('/export', { responseType: 'text' });
  return response.data;
};
