const API_BASE = '/api';

export interface GalleryItem {
  id: string;
  thumbnail_url: string;
  description: string | null;
  comment_count: number;
  created_at: string;
}

export interface GalleryList {
  items: GalleryItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface Comment {
  id: string;
  content: string;
  created_at: string;
}

export interface ImageDetail {
  id: string;
  image_url: string;
  description: string | null;
  short_url: string;
  comments: Comment[];
  created_at: string;
}

export interface UploadResult {
  id: string;
  short_url: string;
  image_url: string;
  description: string | null;
  created_at: string;
}

export async function fetchGallery(page: number = 1, pageSize: number = 20): Promise<GalleryList> {
  const res = await fetch(`${API_BASE}/gallery?page=${page}&page_size=${pageSize}`);
  if (!res.ok) throw new Error('获取画廊数据失败');
  return res.json();
}

export async function fetchImageDetail(imageId: string): Promise<ImageDetail> {
  const res = await fetch(`${API_BASE}/gallery/${imageId}`);
  if (!res.ok) throw new Error('获取图片详情失败');
  return res.json();
}

export async function uploadImage(file: File, description?: string): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  if (description) {
    formData.append('description', description);
  }
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || '上传失败');
  }
  return res.json();
}

export async function addComment(imageId: string, content: string): Promise<Comment> {
  const res = await fetch(`${API_BASE}/gallery/${imageId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || '评论失败');
  }
  return res.json();
}
