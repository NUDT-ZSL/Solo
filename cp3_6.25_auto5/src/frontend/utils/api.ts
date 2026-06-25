const BASE = '/api/v1';

async function request<T>(method: string, url: string, body?: any): Promise<T> {
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body && !(body instanceof FormData)) {
    opts.body = JSON.stringify(body);
  }
  if (body instanceof FormData) {
    delete (opts.headers as Record<string, string>)['Content-Type'];
    opts.body = body;
  }
  const res = await fetch(`${BASE}${url}`, opts);
  if (res.status === 204) return undefined as T;
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data as T;
}

export function get<T>(url: string): Promise<T> {
  return request<T>('GET', url);
}

export function post<T>(url: string, body?: any): Promise<T> {
  return request<T>('POST', url, body);
}

export function put<T>(url: string, body?: any): Promise<T> {
  return request<T>('PUT', url, body);
}

export function del<T>(url: string): Promise<T> {
  return request<T>('DELETE', url);
}

export function upload<T>(url: string, formData: FormData): Promise<T> {
  return request<T>('POST', url, formData);
}
