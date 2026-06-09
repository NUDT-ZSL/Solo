import type {
  ApiResponse,
  UploadResponse,
  Tag,
  UploadedImage,
  ImageDetail,
  VeinData,
} from '@/types';

async function handleResponse<T>(res: Response): Promise<T> {
  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success) {
    throw new Error(json.error || '请求失败');
  }
  return json.data as T;
}

export async function uploadImage(
  file: File,
  plantName: string = '未知植物'
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('plantName', plantName);

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });
  return handleResponse<UploadResponse>(res);
}

export async function getImages(): Promise<UploadedImage[]> {
  const res = await fetch('/api/images');
  return handleResponse<UploadedImage[]>(res);
}

export async function getImageDetail(id: string): Promise<ImageDetail> {
  const res = await fetch(`/api/images/${id}`);
  return handleResponse<ImageDetail>(res);
}

export async function getTags(params?: {
  imageId?: string;
  plantName?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<Tag[]> {
  const query = new URLSearchParams();
  if (params?.imageId) query.set('imageId', params.imageId);
  if (params?.plantName) query.set('plantName', params.plantName);
  if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params?.dateTo) query.set('dateTo', params.dateTo);

  const url = `/api/tags${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url);
  return handleResponse<Tag[]>(res);
}

export async function createTag(payload: {
  veinDataId: string;
  nodeIndex: number;
  x: number;
  y: number;
  note: string;
  date: string;
  plantName: string;
}): Promise<Tag> {
  const res = await fetch('/api/tags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<Tag>(res);
}

export async function deleteTag(id: string): Promise<{ id: string }> {
  const res = await fetch(`/api/tags/${id}`, {
    method: 'DELETE',
  });
  return handleResponse<{ id: string }>(res);
}

export async function getVeinData(id: string): Promise<VeinData> {
  const res = await fetch(`/api/veins/${id}`);
  return handleResponse<VeinData>(res);
}
