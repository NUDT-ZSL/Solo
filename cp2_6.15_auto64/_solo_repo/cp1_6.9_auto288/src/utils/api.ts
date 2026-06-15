import type {
  SaveWeaveRequest,
  SaveWeaveResponse,
  WeaveWork,
  WeaveThumbnail
} from './types';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body && body.error) msg = body.error;
    } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export async function saveWeave(req: SaveWeaveRequest): Promise<SaveWeaveResponse> {
  const res = await fetch('/api/weave', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req)
  });
  return handleResponse<SaveWeaveResponse>(res);
}

export async function getWeave(id: string): Promise<WeaveWork> {
  const res = await fetch(`/api/weave/${encodeURIComponent(id)}`);
  return handleResponse<WeaveWork>(res);
}

export async function listWeaves(limit = 20): Promise<WeaveThumbnail[]> {
  const res = await fetch(`/api/weave/list?limit=${limit}`);
  return handleResponse<WeaveThumbnail[]>(res);
}
